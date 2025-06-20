const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Mumble/Murmur integration
  maidenheadGrid: {
    type: String,
    default: ''
  },
  preferredHfBand: {
    type: String,
    enum: ['', '160', '80', '60', '40', '30', '20', '17', '15', '10', '6'],
    default: ''
  },
  // Feature unlocking
  featuresUnlocked: {
    internationalMorse: {
      type: Boolean,
      default: false
    },
    prosigns: {
      type: Boolean,
      default: false
    },
    specialCharacters: {
      type: Boolean,
      default: false
    },
    voiceChat: {
      type: Boolean,
      default: false
    },
    hfSimulation: {
      type: Boolean,
      default: false
    }
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to check if password is valid
UserSchema.methods.isValidPassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (err) {
    throw err;
  }
};

// Method to check if all required features are unlocked for voice chat
UserSchema.methods.canUseVoiceChat = function() {
  return (
    this.featuresUnlocked.internationalMorse &&
    this.featuresUnlocked.prosigns &&
    this.featuresUnlocked.specialCharacters
  );
};

// Method to unlock a feature
UserSchema.methods.unlockFeature = async function(feature) {
  if (this.featuresUnlocked.hasOwnProperty(feature)) {
    this.featuresUnlocked[feature] = true;
    
    // If all prerequisites are unlocked, also unlock voice chat
    if (
      feature !== 'voiceChat' &&
      feature !== 'hfSimulation' &&
      this.canUseVoiceChat()
    ) {
      this.featuresUnlocked.voiceChat = true;
    }
    
    await this.save();
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', UserSchema);