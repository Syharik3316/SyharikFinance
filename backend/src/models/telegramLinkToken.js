const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TelegramLinkToken = sequelize.define(
  'TelegramLinkToken',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'telegram_link_tokens',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  }
);

module.exports = TelegramLinkToken;
