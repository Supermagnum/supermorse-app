const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');

class User extends Model {
  // Method to check if password is valid
  async isValidPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (err) {
      throw err;
    }
  }

  // Method to check if all required features are unlocked for voice chat
  canUseVoiceChat() {
    return (
      this.featuresUnlockedInternationalMorse &&
      this.featuresUnlockedProsigns &&
      this.featuresUnlockedSpecialCharacters
    );
  }

  // Method to unlock a feature
  async unlockFeature(feature) {
    const featureMap = {
      'internationalMorse': 'featuresUnlockedInternationalMorse',
      'prosigns': 'featuresUnlockedProsigns',
      'specialCharacters': 'featuresUnlockedSpecialCharacters',
      'voiceChat': 'featuresUnlockedVoiceChat',
      'hfSimulation': 'featuresUnlockedHfSimulation'
    };

    const sequelizeField = featureMap[feature];
    
    if (sequelizeField) {
      this[sequelizeField] = true;
      
      // If all prerequisites are unlocked, also unlock voice chat
      if (
        feature !== 'voiceChat' &&
        feature !== 'hfSimulation' &&
        this.canUseVoiceChat()
      ) {
        this.featuresUnlockedVoiceChat = true;
      }
      
      await this.save();
      return true;
    }
    return false;
  }
}

User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Mumble/Murmur integration
  maidenheadGrid: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  preferredHfBand: {
    type: DataTypes.ENUM('', '160', '80', '60', '40', '30', '20', '17', '15', '10', '6'),
    defaultValue: ''
  },
  // Feature unlocking (flattened from nested object in MongoDB)
  featuresUnlockedInternationalMorse: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featuresUnlockedProsigns: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featuresUnlockedSpecialCharacters: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featuresUnlockedVoiceChat: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featuresUnlockedHfSimulation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'User',
  hooks: {
    // Hash password before saving
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

module.exports = User;