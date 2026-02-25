const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Scenario = sequelize.define(
  'Scenario',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('savings', 'budget', 'quiz', 'business', 'invest'),
      allowNull: false,
    },
    baseBudget: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'pro'),
      allowNull: false,
      defaultValue: 'beginner',
    },
  },
  {
    tableName: 'scenarios',
    timestamps: false,
  }
);

module.exports = Scenario;
