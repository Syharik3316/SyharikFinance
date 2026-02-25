const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define(
  'Achievement',
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
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'achievements',
    timestamps: false,
  }
);

module.exports = Achievement;
