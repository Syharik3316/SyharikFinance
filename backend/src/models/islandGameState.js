const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IslandGameState = sequelize.define(
  'IslandGameState',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
    },
    difficulty: {
      type: DataTypes.ENUM('novice', 'expert'),
      allowNull: false,
      defaultValue: 'novice',
    },
    dayCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    gameOver: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'null = playing, else reason: hunger, bankruptcy, pirates, etc.',
    },
    state: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'resources, buildings, assignment, lastReport, debt, event',
    },
  },
  {
    tableName: 'island_game_states',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

module.exports = IslandGameState;
