const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ScenarioChoice = sequelize.define(
  'ScenarioChoice',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    label: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    budgetDelta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'How this choice changes budget (can be negative)',
    },
    commentText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'scenario_choices',
    timestamps: false,
  }
);

module.exports = ScenarioChoice;
