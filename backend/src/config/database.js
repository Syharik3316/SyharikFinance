const path = require('path');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// На случай если config подключают до server.js — те же пути поиска .env
const fs = require('fs');
const possibleEnvPaths = [
  path.join(__dirname, '..', '..', '..', '.env'),  // проект/.env (корень репозитория)
  path.join(__dirname, '..', '..', '.env'),        // backend/.env или site_root/.env
  path.join(__dirname, '..', '..', '..', 'frontend', '.env'), // frontend/.env
];
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    dialectOptions: {
      charset: 'utf8mb4',
    },
  }
);

module.exports = sequelize;
