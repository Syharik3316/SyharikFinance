const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ScenarioEvent = sequelize.define(
  'ScenarioEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    scenarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dayIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'scenario_events',
    timestamps: false,
  }
);

module.exports = ScenarioEvent;
