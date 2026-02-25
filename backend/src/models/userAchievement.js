const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAchievement = sequelize.define(
  'UserAchievement',
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    achievementId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    tableName: 'user_achievements',
    timestamps: false,
  }
);

module.exports = UserAchievement;
