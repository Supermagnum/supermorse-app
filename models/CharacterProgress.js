const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class CharacterProgress extends Model {}

CharacterProgress.init({
  character: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  },
  timeSpent: {
    type: DataTypes.INTEGER, // in milliseconds
    defaultValue: 0
  },
  lastPracticed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  progressId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Progresses', // Sequelize pluralizes table names by default
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'CharacterProgress'
});

module.exports = CharacterProgress;