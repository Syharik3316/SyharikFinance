const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ScenarioRun = sequelize.define(
  'ScenarioRun',
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
      type: DataTypes.ENUM('active', 'finished'),
      allowNull: false,
      defaultValue: 'active',
    },
    dayIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    budget: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    state: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'scenario_runs',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

module.exports = ScenarioRun;

