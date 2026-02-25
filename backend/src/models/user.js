const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    login: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verificationCodeHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verificationCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unlockedScenarios: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Scenario codes unlocked by purchase (first 2 are free by order)',
    },
    unlockedKatya: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    unlockedIlya: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    characterKey: {
      type: DataTypes.ENUM('katya', 'tolya', 'ilya'),
      allowNull: false,
      defaultValue: 'katya',
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    hooks: {
      beforeSave: (user) => {
        if (user.gems != null && user.gems < 0) user.gems = 0;
      },
    },
  }
);

module.exports = User;
