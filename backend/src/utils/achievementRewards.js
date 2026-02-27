/**
 * Начисление достижений и наград (алмазы + XP) только при первом получении.
 * Алмазы и опыт начисляются исключительно в момент добавления записи в user_achievements.
 * Повторное прохождение сценария не даёт алмазов.
 * Используется транзакция и блокировка строки пользователя, чтобы исключить двойное начисление при гонке запросов.
 */
const { sequelize, User, Achievement } = require('../models');

/** Коды достижений, за которые начисляются 25 алмазов и 50 XP один раз при первом получении. */
const GEMS_XP_ACHIEVEMENT_CODES = [
  'bike_no_spend',
  'smart_friend',
  'quiz_master',
  'lemonade_champion',
  'investment_champion',
];

const GEMS_AMOUNT = 25;
const XP_AMOUNT = 50;

/**
 * Выдать достижение пользователю, если у него его ещё нет.
 * При первом получении достижения из списка GEMS_XP_ACHIEVEMENT_CODES начисляет алмазы и XP.
 * Проверка и запись выполняются в транзакции с блокировкой пользователя — второй запрос не начислит награду повторно.
 * @param {import('../models').User} user — инстанс User (должен быть загружен из БД, используется user.id)
 * @param {string} achievementCode — код достижения
 * @returns {Promise<boolean>} true, если достижение было добавлено (в т.ч. начислены награды), иначе false
 */
async function awardAchievementIfNeeded(user, achievementCode) {
  const achievement = await Achievement.findOne({ where: { code: achievementCode } });
  if (!achievement) return false;

  const t = await sequelize.transaction();
  try {
    const u = await User.findByPk(user.id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!u) {
      await t.rollback();
      return false;
    }
    const existing = await u.getAchievements({
      where: { id: achievement.id },
      joinTableAttributes: [],
      transaction: t,
    });
    if (existing && existing.length > 0) {
      await t.rollback();
      return false;
    }
    await u.addAchievement(achievement, { transaction: t });
    if (GEMS_XP_ACHIEVEMENT_CODES.includes(achievementCode)) {
      u.gems = Math.round((u.gems || 0) + GEMS_AMOUNT);
      u.experience = (u.experience || 0) + XP_AMOUNT;
      await u.save({ transaction: t });
    }
    await t.commit();
    return true;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  awardAchievementIfNeeded,
  GEMS_XP_ACHIEVEMENT_CODES,
  GEMS_AMOUNT,
  XP_AMOUNT,
};
