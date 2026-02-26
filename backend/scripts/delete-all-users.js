/**
 * Скрипт удаления пользователей и связанных с ними данных.
 * Запуск из папки backend:
 *   node scripts/delete-all-users.js --confirm                 — удалить всех
 *   node scripts/delete-all-users.js --confirm --user=строка    — по логину/имени (подстрока)
 *   node scripts/delete-all-users.js --confirm --id=1           — один пользователь по ID
 *   node scripts/delete-all-users.js --confirm --id=1,5,9      — несколько по ID (через запятую)
 * Можно комбинировать --id= и --user= (выбор по ID и по имени).
 * Без --confirm только выводит, что будет сделано, и выходит.
 * Удаляет в порядке: токены Telegram, достижения, остров, прогоны сценариев, прогресс, пользователи.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const confirmed = process.argv.includes('--confirm');
const userArg = process.argv.find((a) => a.startsWith('--user='));
const userFilter = userArg ? userArg.replace(/^--user=/, '').trim() : null;
const idArg = process.argv.find((a) => a.startsWith('--id='));
const idFilter = idArg
  ? idArg
      .replace(/^--id=/, '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n))
  : null;

async function main() {
  const {
    sequelize,
    User,
    UserAchievement,
    TelegramLinkToken,
    IslandGameState,
    ScenarioRun,
    Progress,
  } = require('../src/models');
  const { Op } = require('sequelize');

  const where = {};
  if (idFilter && idFilter.length > 0) where.id = { [Op.in]: idFilter };
  if (userFilter) {
    where[Op.or] = [
      { login: { [Op.like]: `%${userFilter}%` } },
      { name: { [Op.like]: `%${userFilter}%` } },
    ];
  }

  const users = await User.findAll({ where, attributes: ['id', 'login', 'name'] });
  const count = users.length;

  if (count === 0) {
    const hint = idFilter?.length ? `с id ${idFilter.join(', ')}` : userFilter ? `по запросу "${userFilter}"` : '';
    console.log(hint ? `Пользователей ${hint} не найдено.` : 'Пользователей нет. Ничего не делаем.');
    await sequelize.close();
    process.exit(0);
    return;
  }

  const ids = users.map((u) => u.id);

  if (!confirmed) {
    const hint = idFilter?.length ? `id ${idFilter.join(', ')}` : userFilter ? `по запросу "${userFilter}"` : 'все';
    console.log(`Будет удалено пользователей: ${count} (${hint}).`);
    users.forEach((u) => console.log(`  id=${u.id} login=${u.login} name=${u.name}`));
    console.log('(и все связанные записи этих пользователей: прогресс, прогоны, остров, достижения, токены Telegram)');
    console.log('Для выполнения добавьте флаг: --confirm');
    process.exit(0);
    return;
  }

  const t = await sequelize.transaction();
  try {
    const d1 = await TelegramLinkToken.destroy({ where: { userId: { [Op.in]: ids } }, transaction: t });
    const d2 = await UserAchievement.destroy({ where: { userId: { [Op.in]: ids } }, transaction: t });
    const d3 = await IslandGameState.destroy({ where: { userId: { [Op.in]: ids } }, transaction: t });
    const d4 = await ScenarioRun.destroy({ where: { userId: { [Op.in]: ids } }, transaction: t });
    const d5 = await Progress.destroy({ where: { userId: { [Op.in]: ids } }, transaction: t });
    const d6 = await User.destroy({ where: { id: { [Op.in]: ids } }, transaction: t });

    await t.commit();
    console.log('Удалено пользователей:', d6, '—', users.map((u) => u.login).join(', '));
    console.log('Связанные записи: токены Telegram:', d1, ', достижения:', d2, ', остров:', d3, ', прогоны:', d4, ', прогресс:', d5);
  } catch (err) {
    await t.rollback();
    throw err;
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
