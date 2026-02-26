/**
 * Скрипт сброса алмазов у пользователей.
 * Запуск из папки backend:
 *   node scripts/reset-gems.js --confirm                 — обнулить алмазы всем
 *   node scripts/reset-gems.js --confirm --user=строка     — по логину/имени (подстрока)
 *   node scripts/reset-gems.js --confirm --id=1           — один пользователь по ID
 *   node scripts/reset-gems.js --confirm --id=1,5,9        — несколько по ID (через запятую)
 * Можно комбинировать --id= и --user= (выбор по ID и по имени).
 * Без --confirm только выводит, что будет сделано, и выходит.
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
  const { sequelize, User } = require('../src/models');
  const { Op } = require('sequelize');

  const where = {};
  if (idFilter && idFilter.length > 0) where.id = { [Op.in]: idFilter };
  if (userFilter) {
    where[Op.or] = [
      { login: { [Op.like]: `%${userFilter}%` } },
      { name: { [Op.like]: `%${userFilter}%` } },
    ];
  }

  const users = await User.findAll({ where, attributes: ['id', 'login', 'name', 'gems'] });
  const count = users.length;

  if (count === 0) {
    const hint = idFilter?.length ? `с id ${idFilter.join(', ')}` : userFilter ? `по запросу "${userFilter}"` : '';
    console.log(hint ? `Пользователей ${hint} не найдено.` : 'Пользователей нет. Ничего не делаем.');
    await sequelize.close();
    process.exit(0);
    return;
  }

  if (!confirmed) {
    const hint = idFilter?.length ? `id ${idFilter.join(', ')}` : userFilter ? `по запросу "${userFilter}"` : 'все';
    console.log(`Будет обнулено алмазов у ${count} пользователей (${hint}).`);
    users.forEach((u) => console.log(`  id=${u.id} login=${u.login} name=${u.name} gems=${u.gems}`));
    console.log('Для выполнения добавьте флаг: --confirm');
    process.exit(0);
    return;
  }

  const ids = users.map((u) => u.id);
  const [affected] = await User.update({ gems: 0 }, { where: { id: { [Op.in]: ids } } });
  console.log(`Алмазы обнулены у ${affected} пользователей: ${users.map((u) => u.login).join(', ')}`);
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
