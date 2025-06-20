const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const CharacterProgress = require('./CharacterProgress');
const Session = require('./Session');

class Progress extends Model {
  // Static method to update progress based on practice results
  static async updateProgress(userId, practiceData) {
    try {
      // Find or create progress document for user
      let [progress, created] = await this.findOrCreate({
        where: { userId },
        defaults: { userId }
      });
      
      // Update session data
      if (practiceData.sessionEnd) {
        // End the current session
        const currentSession = await Session.findOne({
          where: { progressId: progress.id },
          order: [['createdAt', 'DESC']]
        });
        
        if (currentSession) {
          currentSession.endTime = new Date();
          currentSession.duration = currentSession.endTime - new Date(currentSession.startTime);
          currentSession.overallAccuracy = practiceData.overallAccuracy || currentSession.overallAccuracy;
          await currentSession.save();
        }
      } else if (practiceData.sessionStart) {
        // Start a new session
        await Session.create({
          progressId: progress.id,
          startTime: new Date(),
          charactersStudied: practiceData.characters || []
        });
      }
      
      // Update character progress
      if (practiceData.characterResults) {
        for (const charResult of practiceData.characterResults) {
          // Find or create character progress
          let [charProgress, created] = await CharacterProgress.findOrCreate({
            where: {
              progressId: progress.id,
              character: charResult.character
            },
            defaults: {
              progressId: progress.id,
              character: charResult.character,
              accuracy: 0,
              timeSpent: 0,
              lastPracticed: new Date()
            }
          });
          
          // Update character progress (weighted average: 30% new, 70% existing)
          charProgress.accuracy = charProgress.accuracy * 0.7 + charResult.accuracy * 0.3;
          charProgress.timeSpent += charResult.timeSpent || 0;
          charProgress.lastPracticed = new Date();
          await charProgress.save();
          
          // Add to known characters if not already there
          const characterSet = getCharacterSet(charResult.character);
          if (characterSet) {
            const knownCharsField = `knownCharacters${characterSet.charAt(0).toUpperCase() + characterSet.slice(1)}`;
            if (progress[knownCharsField]) {
              const knownChars = progress[knownCharsField];
              if (!knownChars.includes(charResult.character)) {
                knownChars.push(charResult.character);
                progress[knownCharsField] = knownChars;
              }
            } else {
              progress[knownCharsField] = [charResult.character];
            }
          }
        }
      }
      
      // Update mastery levels
      await updateMasteryLevels(progress);
      
      // Check if features should be unlocked
      await checkFeatureUnlocking(userId, progress);
      
      // Save progress
      await progress.save();
      return progress;
    } catch (err) {
      console.error('Error updating progress:', err);
      throw err;
    }
  }
}

Progress.init({
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Overall mastery levels
  masteryLevelsInternationalMorse: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  },
  masteryLevelsProsigns: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  },
  masteryLevelsSpecialCharacters: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1
    }
  },
  // Character sets that have been introduced to the user
  knownCharactersInternationalMorse: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  knownCharactersProsigns: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  knownCharactersSpecialCharacters: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  // Current learning stage
  currentStage: {
    type: DataTypes.ENUM('internationalMorse', 'prosigns', 'specialCharacters', 'confusion'),
    defaultValue: 'internationalMorse'
  },
  // Current character being learned
  currentCharacter: {
    type: DataTypes.STRING,
    defaultValue: ''
  }
}, {
  sequelize,
  modelName: 'Progress'
});

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
async function updateMasteryLevels(progress) {
  // Calculate mastery level for each character set
  for (const set of ['internationalMorse', 'prosigns', 'specialCharacters']) {
    const knownCharsField = `knownCharacters${set.charAt(0).toUpperCase() + set.slice(1)}`;
    const masteryField = `masteryLevels${set.charAt(0).toUpperCase() + set.slice(1)}`;
    const characters = progress[knownCharsField] || [];
    
    if (characters.length === 0) {
      progress[masteryField] = 0;
      continue;
    }
    
    let totalAccuracy = 0;
    let characterCount = 0;
    
    // Get all character progress records for this progress
    const charProgressRecords = await CharacterProgress.findAll({
      where: {
        progressId: progress.id,
        character: characters
      }
    });
    
    for (const charProgress of charProgressRecords) {
      totalAccuracy += charProgress.accuracy;
      characterCount++;
    }
    
    progress[masteryField] = characterCount > 0 ? totalAccuracy / characterCount : 0;
  }
}

// Helper function to check if features should be unlocked
async function checkFeatureUnlocking(userId, progress) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;
    
    // Check if international Morse is mastered (100%)
    if (progress.masteryLevelsInternationalMorse >= 1 && !user.featuresUnlockedInternationalMorse) {
      await user.unlockFeature('internationalMorse');
    }
    
    // Check if prosigns are mastered (100%)
    if (progress.masteryLevelsProsigns >= 1 && !user.featuresUnlockedProsigns) {
      await user.unlockFeature('prosigns');
    }
    
    // Check if special characters are mastered (100%)
    if (progress.masteryLevelsSpecialCharacters >= 1 && !user.featuresUnlockedSpecialCharacters) {
      await user.unlockFeature('specialCharacters');
    }
    
    // Voice chat is automatically unlocked in the User model when all prerequisites are met
  } catch (err) {
    console.error('Error checking feature unlocking:', err);
  }
}

module.exports = Progress;