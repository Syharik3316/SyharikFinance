const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Progress = sequelize.define(
  'Progress',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scenarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('passed', 'failed', 'in_progress'),
      allowNull: false,
      defaultValue: 'in_progress',
    },
    bestResult: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    spent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'progress',
    timestamps: false,
  }
);

module.exports = Progress;
