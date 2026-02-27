const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware } = require('../middleware/auth');
const { User, IslandGameState, Achievement } = require('../models');

const router = express.Router();

const ZONE_IDS = ['camp', 'food', 'wood', 'stone', 'market'];
const ZONES_CONFIG_PATH = path.join(__dirname, '..', 'data', 'island-zones.json');
const ZONES_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'island-zones');

function getDefaultZonesConfig() {
  return ZONE_IDS.reduce((acc, id) => {
    acc[id] = { imageUrl: '', instruction: '' };
    return acc;
  }, {});
}

function readZonesConfig() {
  try {
    const raw = fs.readFileSync(ZONES_CONFIG_PATH, 'utf8');
    const data = JSON.parse(raw);
    const zones = getDefaultZonesConfig();
    for (const id of ZONE_IDS) {
      if (data[id]) {
        if (typeof data[id].imageUrl === 'string') zones[id].imageUrl = data[id].imageUrl;
        if (typeof data[id].instruction === 'string') zones[id].instruction = data[id].instruction;
      }
    }
    return zones;
  } catch {
    return getDefaultZonesConfig();
  }
}

function writeZonesConfig(zones) {
  try {
    const dir = path.dirname(ZONES_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ZONES_CONFIG_PATH, JSON.stringify(zones, null, 2), 'utf8');
  } catch (err) {
    console.error('writeZonesConfig:', err);
    throw err;
  }
}

if (!fs.existsSync(ZONES_UPLOAD_DIR)) {
  fs.mkdirSync(ZONES_UPLOAD_DIR, { recursive: true });
}

const zonesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ZONES_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const zoneId = (req.body.zoneId || 'zone').replace(/[^a-z_]/gi, '') || 'zone';
      const ext = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(path.extname(file.originalname || '').toLowerCase())
        ? path.extname(file.originalname).toLowerCase()
        : '.jpg';
      cb(null, `${zoneId}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function awardAchievementIfNeeded(user, code) {
  const achievement = await Achievement.findOne({ where: { code } });
  if (!achievement) return;
  const existing = await user.getAchievements({
    where: { id: achievement.id },
    joinTableAttributes: [],
  });
  if (existing && existing.length > 0) return;
  await user.addAchievement(achievement);
}

const HAND_LIMIT_FULL = 60;
const WAREHOUSE_LIMIT_FULL = 200;

function isIsland100Percent(state) {
  if (!state || !state.buildings || !state.resources || !state.warehouse) return false;
  const buildings = state.buildings;
  const huts = typeof buildings.hut === 'number' ? buildings.hut : (buildings.hut === 2 ? 1 : 0);
  if (huts < 4 || buildings.warehouse !== 2 || buildings.workshop !== 2 || buildings.watchtower !== 2) return false;
  const res = state.resources;
  const wh = state.warehouse;
  const keys = ['food', 'wood', 'stone', 'coins'];
  for (const k of keys) {
    if ((res[k] || 0) < HAND_LIMIT_FULL || (wh[k] || 0) < WAREHOUSE_LIMIT_FULL) return false;
  }
  return true;
}

function getInitialState(difficulty) {
  return {
    resources: { food: 12, wood: 10, stone: 5, coins: 8 },
    warehouse: { food: 0, wood: 0, stone: 0, coins: 0 },
    protectedResourceType: null,
    eventLog: [],
    buildings: { hut: 0, warehouse: 0, workshop: 0, watchtower: 0 },
    buildingPlacement: {},
    settlers: [
      { id: 0, job: 'camp' },
      { id: 1, job: 'camp' },
      { id: 2, job: 'camp' },
      { id: 3, job: 'camp' },
    ],
    lastReport: null,
    debt: null,
    event: null,
    phase: 'assign',
    tipsSeen: {},
    sadPenalty: 0,
  };
}

// DELETE /api/island-game — удалить сохранение (после проигрыша)
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await IslandGameState.destroy({ where: { userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete island game' });
  }
});

// GET /api/island-game — загрузить текущее состояние (или null если нет)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const row = await IslandGameState.findOne({
      where: { userId: req.user.id },
    });
    if (!row) return res.json(null);
    res.json({
      difficulty: row.difficulty,
      dayCount: row.dayCount,
      gameOver: row.gameOver,
      state: row.state,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load island game' });
  }
});

// POST /api/island-game/start — начать новую игру (body: { difficulty })
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const difficulty = ['novice', 'expert'].includes(req.body.difficulty)
      ? req.body.difficulty
      : 'novice';
    const state = getInitialState(difficulty);

    const [row] = await IslandGameState.upsert(
      {
        userId: req.user.id,
        difficulty,
        dayCount: 1,
        gameOver: null,
        state,
        gemsAwardedUpToDay: 0,
      },
      { returning: true }
    );
    const record = Array.isArray(row) ? row[0] : row;
    res.status(201).json({
      difficulty: record.difficulty,
      dayCount: record.dayCount,
      gameOver: record.gameOver,
      state: record.state,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start island game' });
  }
});

// POST /api/island-game — сохранить состояние (body: full state)
// Алмазы за дни начисляются только здесь: не более +1 день за запрос, 1 алмаз за новый день.
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { difficulty, dayCount, gameOver, state } = req.body;
    const requestedDay = Math.max(1, Math.floor(Number(dayCount)) || 1);

    const existing = await IslandGameState.findOne({
      where: { userId: req.user.id },
    });

    // Разрешаем только шаг дня +0 или +1 от текущего сохранения (защита от фарма)
    const prevDay = existing ? existing.dayCount : 0;
    const allowedDay = existing ? Math.min(requestedDay, prevDay + 1) : requestedDay;
    if (existing && requestedDay > prevDay + 1) {
      return res.status(400).json({
        message: 'Day count can only advance by 0 or 1 per save. Play the game to earn gems.',
      });
    }

    const [row] = await IslandGameState.upsert(
      {
        userId: req.user.id,
        difficulty: difficulty || 'novice',
        dayCount: allowedDay,
        gameOver: gameOver || null,
        state: state || null,
      },
      { returning: true }
    );
    const record = Array.isArray(row) ? row[0] : row;

    // Начисление 1 алмаза за новый прожитый день (только на бэкенде, один раз за день)
    const gemsAwardedUpToDay = Number(record.gemsAwardedUpToDay) || 0;
    if (allowedDay > gemsAwardedUpToDay) {
      const user = await User.findByPk(req.user.id);
      if (user) {
        user.gems = Math.max(0, Math.round((user.gems || 0) + 1));
        await user.save();
      }
      record.gemsAwardedUpToDay = allowedDay;
      await record.save();
    }

    const meta = {};
    if (gameOver && (allowedDay || record.dayCount)) {
      const days = allowedDay || record.dayCount;
      const user = await User.findByPk(req.user.id);
      if (user) {
        const prevBest = user.islandBestDays || 0;
        const best = Math.max(days, prevBest);
        if (best > prevBest) {
          user.islandBestDays = best;
          await user.save();
          meta.bestDaysUpdated = true;
          meta.newBestDays = best;
        }
        const beforeCodes = (await user.getAchievements({ attributes: ['code'] })).map((a) => a.code);
        await awardAchievementIfNeeded(user, 'island_survivor');
        if (gameOver === 'victory' && isIsland100Percent(state || record.state)) {
          await awardAchievementIfNeeded(user, 'island_100');
        }
        await user.reload();
        const afterCodes = (await user.getAchievements({ attributes: ['code'] })).map((a) => a.code);
        const newCodes = afterCodes.filter((c) => !beforeCodes.includes(c));
        if (newCodes.length) meta.achievementsUnlocked = newCodes;
      }
    }

    res.json({
      difficulty: record.difficulty,
      dayCount: record.dayCount,
      gameOver: record.gameOver,
      state: record.state,
      ...meta,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save island game' });
  }
});

// GET /api/island-game/zones — конфиг картинок и инструкций по зонам (публичный)
router.get('/zones', (req, res) => {
  try {
    const zones = readZonesConfig();
    res.json({ zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load zones config' });
  }
});

// POST /api/island-game/zones/upload — загрузить картинку и/или инструкцию для зоны (auth)
router.post('/zones/upload', authMiddleware, zonesUpload.single('image'), (req, res) => {
  try {
    const zoneId = (req.body.zoneId || '').trim();
    if (!ZONE_IDS.includes(zoneId)) {
      return res.status(400).json({ message: 'Invalid zoneId. Use: camp, food, wood, stone, market' });
    }
    const zones = readZonesConfig();
    if (req.file) {
      zones[zoneId].imageUrl = `/api/uploads/island-zones/${req.file.filename}`;
    }
    if (typeof req.body.instruction === 'string') {
      zones[zoneId].instruction = req.body.instruction.trim();
    }
    writeZonesConfig(zones);
    res.json({ zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload zone' });
  }
});

// PATCH /api/island-game/zones — обновить только инструкцию для зоны (auth)
router.patch('/zones', authMiddleware, (req, res) => {
  try {
    const { zoneId, instruction } = req.body || {};
    if (!ZONE_IDS.includes(zoneId)) {
      return res.status(400).json({ message: 'Invalid zoneId. Use: camp, food, wood, stone, market' });
    }
    const zones = readZonesConfig();
    zones[zoneId].instruction = typeof instruction === 'string' ? instruction.trim() : zones[zoneId].instruction;
    writeZonesConfig(zones);
    res.json({ zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update zone' });
  }
});

module.exports = router;
