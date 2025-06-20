const express = require('express');
const Progress = require('../models/Progress');
const CharacterProgress = require('../models/CharacterProgress');
const User = require('../models/User');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Not authenticated'
  });
};

// Get user progress
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Find progress for the current user
    let [progress, created] = await Progress.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id }
    });
    
    // Get character progress and sessions
    const characterProgress = await CharacterProgress.findAll({
      where: { progressId: progress.id }
    });
    
    // Format response
    const formattedProgress = {
      ...progress.toJSON(),
      characterProgress
    };
    
    return res.status(200).json({
      success: true,
      progress: formattedProgress
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving progress',
      error: err.message
    });
  }
});

// Get character progress
router.get('/character/:char', isAuthenticated, async (req, res) => {
  try {
    const { char } = req.params;
    
    // Find progress for the current user
    const progress = await Progress.findOne({
      where: { userId: req.user.id }
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this user'
      });
    }
    
    // Find character progress
    const charProgress = await CharacterProgress.findOne({
      where: {
        progressId: progress.id,
        character: char
      }
    });
    
    if (!charProgress) {
      return res.status(404).json({
        success: false,
        message: `No progress found for character '${char}'`
      });
    }
    
    return res.status(200).json({
      success: true,
      characterProgress: charProgress
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving character progress',
      error: err.message
    });
  }
});

// Update progress manually (for non-socket updates)
router.post('/update', isAuthenticated, async (req, res) => {
  try {
    const practiceData = req.body;
    
    // Update progress using the static method
    const progress = await Progress.updateProgress(req.user.id, practiceData);
    
    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      progress
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: err.message
    });
  }
});

// Get learning recommendations
router.get('/recommendations', isAuthenticated, async (req, res) => {
  try {
    // Find progress for the current user
    const progress = await Progress.findOne({
      where: { userId: req.user.id }
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this user'
      });
    }
    
    // Generate recommendations based on current progress
    const recommendations = generateRecommendations(progress);
    
    return res.status(200).json({
      success: true,
      recommendations
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: err.message
    });
  }
});

// Get session history
router.get('/sessions', isAuthenticated, async (req, res) => {
  try {
    // Find progress for the current user
    const progress = await Progress.findOne({
      where: { userId: req.user.id }
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this user'
      });
    }
    
    // Get session history from Session model
    const Session = require('../models/Session');
    const sessions = await Session.findAll({
      where: { progressId: progress.id },
      order: [['startTime', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving session history',
      error: err.message
    });
  }
});

// Get mastery levels
router.get('/mastery', isAuthenticated, async (req, res) => {
  try {
    // Find progress for the current user
    const progress = await Progress.findOne({
      where: { userId: req.user.id }
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress found for this user'
      });
    }
    
    // Get mastery levels
    const masteryLevels = {
      internationalMorse: progress.masteryLevelsInternationalMorse,
      prosigns: progress.masteryLevelsProsigns,
      specialCharacters: progress.masteryLevelsSpecialCharacters
    };
    
    // Get user's unlocked features
    const user = await User.findByPk(req.user.id);
    const featuresUnlocked = {
      internationalMorse: user.featuresUnlockedInternationalMorse,
      prosigns: user.featuresUnlockedProsigns,
      specialCharacters: user.featuresUnlockedSpecialCharacters,
      voiceChat: user.featuresUnlockedVoiceChat,
      hfSimulation: user.featuresUnlockedHfSimulation
    };
    
    return res.status(200).json({
      success: true,
      masteryLevels,
      featuresUnlocked
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving mastery levels',
      error: err.message
    });
  }
});

// Helper function to generate learning recommendations
function generateRecommendations(progress) {
  const recommendations = {
    nextCharacters: [],
    reviewCharacters: [],
    suggestedStage: progress.currentStage
  };
  
  // Determine which character set to focus on
  let characterSet;
  switch (progress.currentStage) {
    case 'internationalMorse':
      characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      break;
    case 'prosigns':
      characterSet = ['AR', 'SK', 'BT', 'KN'];
      break;
    case 'specialCharacters':
      characterSet = '.,:;?!\'"/()&=+-_@$';
      break;
    case 'confusion':
      // Characters that are often confused with each other
      characterSet = 'ETIANMSURWDKGOHVF0L9P2J5Z7Q8Y3B6X4C';
      break;
    default:
      characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }
  
  // Convert string to array if needed
  if (typeof characterSet === 'string') {
    characterSet = characterSet.split('');
  }
  
  // Find characters not yet learned or with low accuracy
  const knownCharsField = `knownCharacters${progress.currentStage.charAt(0).toUpperCase() + progress.currentStage.slice(1)}`;
  const knownChars = progress[knownCharsField] || [];
  
  // Suggest new characters to learn (up to 3)
  for (const char of characterSet) {
    if (!knownChars.includes(char) && recommendations.nextCharacters.length < 3) {
      recommendations.nextCharacters.push(char);
    }
  }
  
  // Find characters to review (accuracy < 0.7) - need to fetch from CharacterProgress model
  // This is a placeholder - in a real implementation, you would fetch this from the database
  // For now, we'll just return an empty array
  recommendations.reviewCharacters = [];
  
  // Limit review characters to 5
  recommendations.reviewCharacters = recommendations.reviewCharacters.slice(0, 5);
  
  // Suggest next stage if current stage is mastered
  const masteryField = `masteryLevels${progress.currentStage.charAt(0).toUpperCase() + progress.currentStage.slice(1)}`;
  if (progress[masteryField] >= 0.9) {
    if (progress.currentStage === 'internationalMorse') {
      recommendations.suggestedStage = 'prosigns';
    } else if (progress.currentStage === 'prosigns') {
      recommendations.suggestedStage = 'specialCharacters';
    } else if (progress.currentStage === 'specialCharacters') {
      recommendations.suggestedStage = 'confusion';
    }
  }
  
  return recommendations;
}

module.exports = router;