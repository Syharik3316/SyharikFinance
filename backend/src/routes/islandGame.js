const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { User, IslandGameState } = require('../models');

const router = express.Router();

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
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { difficulty, dayCount, gameOver, state } = req.body;
    const [row] = await IslandGameState.upsert(
      {
        userId: req.user.id,
        difficulty: difficulty || 'novice',
        dayCount: dayCount ?? 1,
        gameOver: gameOver || null,
        state: state || null,
      },
      { returning: true }
    );
    const record = Array.isArray(row) ? row[0] : row;
    res.json({
      difficulty: record.difficulty,
      dayCount: record.dayCount,
      gameOver: record.gameOver,
      state: record.state,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save island game' });
  }
});

module.exports = router;
