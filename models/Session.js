const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Session extends Model {}

Session.init({
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in milliseconds
    defaultValue: 0
  },
  charactersStudied: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  overallAccuracy: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
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
  modelName: 'Session'
});

module.exports = Session;