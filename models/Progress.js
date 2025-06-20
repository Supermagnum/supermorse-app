const mongoose = require('mongoose');
const User = require('./User');

const CharacterProgressSchema = new mongoose.Schema({
  character: {
    type: String,
    required: true
  },
  accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  timeSpent: {
    type: Number, // in milliseconds
    default: 0
  },
  lastPracticed: {
    type: Date,
    default: null
  }
});

const SessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in milliseconds
    default: 0
  },
  charactersStudied: [{
    type: String
  }],
  overallAccuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  }
});

const ProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  characterProgress: [CharacterProgressSchema],
  sessions: [SessionSchema],
  // Overall mastery levels
  masteryLevels: {
    internationalMorse: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    prosigns: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    specialCharacters: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    }
  },
  // Character sets that have been introduced to the user
  knownCharacters: {
    internationalMorse: [{
      type: String
    }],
    prosigns: [{
      type: String
    }],
    specialCharacters: [{
      type: String
    }]
  },
  // Current learning stage
  currentStage: {
    type: String,
    enum: ['internationalMorse', 'prosigns', 'specialCharacters', 'confusion'],
    default: 'internationalMorse'
  },
  // Current character being learned
  currentCharacter: {
    type: String,
    default: ''
  }
});

// Static method to update progress based on practice results
ProgressSchema.statics.updateProgress = async function(userId, practiceData) {
  try {
    // Find or create progress document for user
    let progress = await this.findOne({ user: userId });
    if (!progress) {
      progress = new this({ user: userId });
    }
    
    // Update session data
    if (practiceData.sessionEnd) {
      // End the current session
      if (progress.sessions.length > 0) {
        const currentSession = progress.sessions[progress.sessions.length - 1];
        currentSession.endTime = new Date();
        currentSession.duration = currentSession.endTime - currentSession.startTime;
        currentSession.overallAccuracy = practiceData.overallAccuracy || currentSession.overallAccuracy;
      }
    } else if (practiceData.sessionStart) {
      // Start a new session
      progress.sessions.push({
        startTime: new Date(),
        charactersStudied: practiceData.characters || []
      });
    }
    
    // Update character progress
    if (practiceData.characterResults) {
      for (const charResult of practiceData.characterResults) {
        // Find or create character progress
        let charProgress = progress.characterProgress.find(cp => cp.character === charResult.character);
        if (!charProgress) {
          charProgress = {
            character: charResult.character,
            accuracy: 0,
            timeSpent: 0,
            lastPracticed: new Date()
          };
          progress.characterProgress.push(charProgress);
        }
        
        // Update character progress (weighted average: 30% new, 70% existing)
        charProgress.accuracy = charProgress.accuracy * 0.7 + charResult.accuracy * 0.3;
        charProgress.timeSpent += charResult.timeSpent || 0;
        charProgress.lastPracticed = new Date();
        
        // Add to known characters if not already there
        const characterSet = getCharacterSet(charResult.character);
        if (characterSet && !progress.knownCharacters[characterSet].includes(charResult.character)) {
          progress.knownCharacters[characterSet].push(charResult.character);
        }
      }
    }
    
    // Update mastery levels
    updateMasteryLevels(progress);
    
    // Check if features should be unlocked
    await checkFeatureUnlocking(userId, progress);
    
    // Save progress
    await progress.save();
    return progress;
  } catch (err) {
    console.error('Error updating progress:', err);
    throw err;
  }
};

// Helper function to determine which character set a character belongs to
function getCharacterSet(character) {
  // International Morse (letters and numbers)
  if (/^[A-Z0-9]$/.test(character)) {
    return 'internationalMorse';
  }
  
  // Prosigns (procedural signals)
  if (['AR', 'SK', 'BT', 'KN'].includes(character)) {
    return 'prosigns';
  }
  
  // Special characters (punctuation and symbols)
  if (/^[.,:;?!'"/()&=+-_@$]$/.test(character)) {
    return 'specialCharacters';
  }
  
  return null;
}

// Helper function to update mastery levels
function updateMasteryLevels(progress) {
  // Calculate mastery level for each character set
  for (const set of ['internationalMorse', 'prosigns', 'specialCharacters']) {
    const characters = progress.knownCharacters[set];
    if (characters.length === 0) {
      progress.masteryLevels[set] = 0;
      continue;
    }
    
    let totalAccuracy = 0;
    let characterCount = 0;
    
    for (const char of characters) {
      const charProgress = progress.characterProgress.find(cp => cp.character === char);
      if (charProgress) {
        totalAccuracy += charProgress.accuracy;
        characterCount++;
      }
    }
    
    progress.masteryLevels[set] = characterCount > 0 ? totalAccuracy / characterCount : 0;
  }
}

// Helper function to check if features should be unlocked
async function checkFeatureUnlocking(userId, progress) {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    
    // Check if international Morse is mastered (100%)
    if (progress.masteryLevels.internationalMorse >= 1 && !user.featuresUnlocked.internationalMorse) {
      await user.unlockFeature('internationalMorse');
    }
    
    // Check if prosigns are mastered (100%)
    if (progress.masteryLevels.prosigns >= 1 && !user.featuresUnlocked.prosigns) {
      await user.unlockFeature('prosigns');
    }
    
    // Check if special characters are mastered (100%)
    if (progress.masteryLevels.specialCharacters >= 1 && !user.featuresUnlocked.specialCharacters) {
      await user.unlockFeature('specialCharacters');
    }
    
    // Voice chat is automatically unlocked in the User model when all prerequisites are met
  } catch (err) {
    console.error('Error checking feature unlocking:', err);
  }
}

module.exports = mongoose.model('Progress', ProgressSchema);