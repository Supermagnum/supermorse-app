const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'supermorse',
  process.env.DB_USER || 'supermorse',
  process.env.DB_PASSWORD || 'supermorse_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
    return false;
  }
};

// Initialize database
const initDatabase = async () => {
  try {
    // Import models
    const User = require('../models/User');
    const Progress = require('../models/Progress');
    const CharacterProgress = require('../models/CharacterProgress');
    const Session = require('../models/Session');

    // Define associations
    User.hasOne(Progress, { foreignKey: 'userId', as: 'progress' });
    Progress.belongsTo(User, { foreignKey: 'userId' });
    
    Progress.hasMany(CharacterProgress, { foreignKey: 'progressId', as: 'characterProgress' });
    CharacterProgress.belongsTo(Progress, { foreignKey: 'progressId' });
    
    Progress.hasMany(Session, { foreignKey: 'progressId', as: 'sessions' });
    Session.belongsTo(Progress, { foreignKey: 'progressId' });

    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  initDatabase
};