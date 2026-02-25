const sequelize = require('../config/database');
const User = require('./user');
const Scenario = require('./scenario');
const ScenarioEvent = require('./scenarioEvent');
const ScenarioChoice = require('./scenarioChoice');
const Progress = require('./progress');
const ScenarioRun = require('./scenarioRun');
const Achievement = require('./achievement');
const UserAchievement = require('./userAchievement');
const IslandGameState = require('./islandGameState');

// Associations
User.hasMany(Progress, { foreignKey: 'userId' });
Progress.belongsTo(User, { foreignKey: 'userId' });

Scenario.hasMany(ScenarioEvent, { foreignKey: 'scenarioId' });
ScenarioEvent.belongsTo(Scenario, { foreignKey: 'scenarioId' });

ScenarioEvent.hasMany(ScenarioChoice, { foreignKey: 'eventId' });
ScenarioChoice.belongsTo(ScenarioEvent, { foreignKey: 'eventId' });

Scenario.hasMany(Progress, { foreignKey: 'scenarioId' });
Progress.belongsTo(Scenario, { foreignKey: 'scenarioId' });

User.hasMany(ScenarioRun, { foreignKey: 'userId' });
ScenarioRun.belongsTo(User, { foreignKey: 'userId' });

Scenario.hasMany(ScenarioRun, { foreignKey: 'scenarioId' });
ScenarioRun.belongsTo(Scenario, { foreignKey: 'scenarioId' });

User.belongsToMany(Achievement, {
  through: UserAchievement,
  foreignKey: 'userId',
});
Achievement.belongsToMany(User, {
  through: UserAchievement,
  foreignKey: 'achievementId',
});

User.hasOne(IslandGameState, { foreignKey: 'userId' });
IslandGameState.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Scenario,
  ScenarioEvent,
  ScenarioChoice,
  Progress,
  ScenarioRun,
  Achievement,
  UserAchievement,
  IslandGameState,
};
