/**
 * training-analytics-worker.js
 * Worker thread for analyzing Morse code training performance and progress
 * Handles CPU-intensive calculations to improve UI responsiveness
 */

const { parentPort, workerData } = require('worker_threads');

// Store cached training data for analysis
let userProgressCache = new Map();
let characterStatsCache = new Map();

// Track learning profiles and recommendations
let learningProfiles = new Map();

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  const { type, data, id } = message;
  
  try {
    let result;
    
    switch (type) {
      case 'analyze_user_progress':
        result = await analyzeUserProgress(data.userId, data.progress, data.stats);
        break;
        
      case 'evaluate_training_session':
        result = await evaluateTrainingSession(data.userId, data.sessionData);
        break;
        
      case 'calculate_mastery_levels':
        result = await calculateMasteryLevels(data.userId, data.progress, data.stats);
        break;
        
      case 'generate_learning_recommendation':
        result = await generateLearningRecommendation(data.userId, data.progress, data.stats);
        break;
        
      case 'analyze_error_patterns':
        result = await analyzeErrorPatterns(data.userId, data.characterStats);
        break;
        
      case 'calculate_optimal_speed':
        result = await calculateOptimalSpeed(data.userId, data.progress, data.stats);
        break;
        
      case 'predict_forgetting_curve':
        result = await predictForgettingCurve(data.userId, data.characterStats);
        break;
        
      case 'generate_training_plan':
        result = await generateTrainingPlan(data.userId, data.progress, data.stats);
        break;
        
      case 'clear_cache':
        clearCaches(data.userId);
        result = { success: true };
        break;
        
      default:
        result = { success: false, error: `Unknown operation type: ${type}` };
    }
    
    // Send result back to main thread
    parentPort.postMessage({ 
      type: `${type}_result`, 
      success: true, 
      data: result,
      id 
    });
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({ 
      type: `${type}_error`, 
      success: false, 
      error: error.message || 'Unknown error',
      id 
    });
  }
});

/**
 * Analyze user progress data to generate insights
 * @param {string} userId - User ID
 * @param {Object} progress - User progress data
 * @param {Array} stats - User character statistics
 * @returns {Object} - Analysis results
 */
async function analyzeUserProgress(userId, progress, stats) {
  // Cache the progress data
  userProgressCache.set(userId, progress);
  
  // Process learning rate and patterns
  const learnedCharacters = progress.learnedCharacters || [];
  const masteryLevels = progress.mastery || {};
  
  // Calculate learning velocity (characters per day)
  const learningVelocity = calculateLearningVelocity(userId, learnedCharacters, stats);
  
  // Identify strengths and weaknesses
  const { strengths, weaknesses } = identifyStrengthsWeaknesses(stats);
  
  // Calculate overall proficiency
  const overallProficiency = calculateOverallProficiency(masteryLevels, stats);
  
  // Determine optimal practice schedule
  const practiceSchedule = determineOptimalPracticeSchedule(userId, stats);
  
  // Return comprehensive analysis
  return {
    userId,
    learningVelocity,
    strengths,
    weaknesses,
    overallProficiency,
    practiceSchedule,
    recommendedFocus: weaknesses.slice(0, 3), // Top 3 characters to focus on
    timestamp: new Date().toISOString()
  };
}

/**
 * Evaluate a single training session
 * @param {string} userId - User ID
 * @param {Object} sessionData - Training session data
 * @returns {Object} - Evaluation results
 */
async function evaluateTrainingSession(userId, sessionData) {
  const { 
    characters, 
    correctGroups, 
    totalGroups, 
    duration, 
    wpm, 
    mistakes 
  } = sessionData;
  
  // Calculate accuracy
  const accuracy = (correctGroups / totalGroups) * 100;
  
  // Calculate effective speed (adjusting for accuracy)
  const effectiveSpeed = wpm * (accuracy / 100);
  
  // Analyze mistake patterns
  const mistakePatterns = analyzeMistakePatterns(mistakes);
  
  // Calculate concentration score
  const concentrationScore = calculateConcentrationScore(mistakes, duration);
  
  // Determine if the user should advance to next character
  const shouldAdvance = accuracy >= 90 && effectiveSpeed >= wpm * 0.8;
  
  // Generate personalized feedback
  const feedback = generatePersonalizedFeedback(
    userId, 
    accuracy, 
    effectiveSpeed, 
    mistakePatterns, 
    concentrationScore
  );
  
  return {
    userId,
    accuracy,
    effectiveSpeed,
    mistakePatterns,
    concentrationScore,
    shouldAdvance,
    feedback,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate mastery levels for all character sets
 * @param {string} userId - User ID
 * @param {Object} progress - User progress data
 * @param {Array} stats - User character statistics
 * @returns {Object} - Mastery levels for different character sets
 */
async function calculateMasteryLevels(userId, progress, stats) {
  // Define character sets
  const characterSets = {
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    numbers: '0123456789'.split(''),
    prosigns: ['AR', 'SK', 'BT', 'KN', 'CL', 'AS'],
    punctuation: ['.', ',', '?', '/', '=', '+', '-']
  };
  
  // Calculate mastery for each set
  const results = {};
  
  for (const [setName, characters] of Object.entries(characterSets)) {
    let totalMastery = 0;
    let charactersWithStats = 0;
    
    for (const char of characters) {
      // Find stats for this character
      const charStats = stats.find(s => s.character === char);
      
      if (charStats) {
        // Calculate mastery based on correct/incorrect ratio
        const total = charStats.correctCount + charStats.incorrectCount;
        const masteryPercentage = total > 0 
          ? (charStats.correctCount / total) * 100 
          : 0;
        
        totalMastery += masteryPercentage;
        charactersWithStats++;
      }
    }
    
    // Calculate average mastery for this set
    results[setName] = charactersWithStats > 0 
      ? totalMastery / charactersWithStats 
      : 0;
  }
  
  return {
    userId,
    masteryLevels: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate learning recommendations based on user data
 * @param {string} userId - User ID
 * @param {Object} progress - User progress data
 * @param {Array} stats - User character statistics
 * @returns {Object} - Learning recommendations
 */
async function generateLearningRecommendation(userId, progress, stats) {
  // Get character mastery levels
  const { masteryLevels } = await calculateMasteryLevels(userId, progress, stats);
  
  // Analyze error patterns
  const errorPatterns = await analyzeErrorPatterns(userId, stats);
  
  // Determine optimal practice duration
  const optimalDuration = determineOptimalDuration(userId, stats);
  
  // Calculate optimal speed based on current performance
  const optimalSpeed = await calculateOptimalSpeed(userId, progress, stats);
  
  // Generate a specific focus for the next session
  const nextFocus = determineNextFocus(progress, stats, errorPatterns);
  
  // Determine if user should take a break
  const shouldTakeBreak = shouldUserTakeBreak(userId, stats);
  
  return {
    userId,
    nextFocus,
    recommendedWPM: optimalSpeed,
    recommendedDuration: optimalDuration,
    shouldTakeBreak,
    masteryLevels,
    timestamp: new Date().toISOString()
  };
}

/**
 * Analyze error patterns to identify systematic mistakes
 * @param {string} userId - User ID
 * @param {Array} characterStats - Character statistics
 * @returns {Object} - Error pattern analysis
 */
async function analyzeErrorPatterns(userId, characterStats) {
  // Group similar characters
  const similarGroups = {
    similar_sounds: [
      ['E', 'I', 'S', 'H'], // Short dots
      ['T', 'M', 'O'],      // Dashes
      ['A', 'W', 'J'],      // Dot-dash patterns
      ['N', 'D', 'B']       // Dash-dot patterns
    ],
    reversals: [
      ['A', 'N'],   // .- and -.
      ['D', 'U'],   // -.. and ..-
      ['B', 'V'],   // -... and ...-
      ['F', 'L']    // ..-. and .-..
    ]
  };
  
  // Identify common mistakes
  const confusionMatrix = buildConfusionMatrix(characterStats);
  
  // Find characters with highest error rates
  const problemCharacters = characterStats
    .filter(stat => stat.correctCount + stat.incorrectCount > 10) // Only consider characters with enough attempts
    .map(stat => ({
      character: stat.character,
      errorRate: stat.incorrectCount / (stat.correctCount + stat.incorrectCount) * 100
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5); // Top 5 problem characters
  
  // Find pattern-based errors
  const patternErrors = identifyPatternErrors(similarGroups, confusionMatrix);
  
  return {
    userId,
    problemCharacters,
    patternErrors,
    confusionMatrix: confusionMatrix.slice(0, 10), // Top 10 confusions
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate optimal speed based on user performance
 * @param {string} userId - User ID
 * @param {Object} progress - User progress data
 * @param {Array} stats - User character statistics
 * @returns {Object} - Optimal speed recommendations
 */
async function calculateOptimalSpeed(userId, progress, stats) {
  // Get current performance metrics
  const currentSpeed = progress.currentSpeed || 15; // Default WPM
  const accuracyBySpeed = analyzeAccuracyBySpeed(stats);
  
  // Find the sweet spot where speed is maximized while maintaining good accuracy
  let optimalSpeed = currentSpeed;
  let optimalFarnsworth = null;
  
  // Start with current speed and test accuracy
  for (let testSpeed = currentSpeed; testSpeed <= 30; testSpeed += 2) {
    const projectedAccuracy = projectAccuracyAtSpeed(testSpeed, accuracyBySpeed);
    
    // If accuracy drops below 85%, we've gone too far
    if (projectedAccuracy < 85) {
      optimalSpeed = testSpeed - 2;
      break;
    }
    
    // If we reach 30 WPM with good accuracy, cap it there for now
    if (testSpeed === 30) {
      optimalSpeed = 30;
    }
  }
  
  // Calculate Farnsworth timing if needed
  if (optimalSpeed > 18) {
    // For higher speeds, use Farnsworth to maintain learning effectiveness
    // Farnsworth ratio increases as speed increases
    const baseRatio = 3;
    const farnsworthRatio = baseRatio + (optimalSpeed - 18) * 0.2;
    optimalFarnsworth = farnsworthRatio;
  }
  
  return {
    userId,
    optimalSpeed,
    optimalFarnsworth,
    projectedAccuracy: projectAccuracyAtSpeed(optimalSpeed, accuracyBySpeed),
    timestamp: new Date().toISOString()
  };
}

/**
 * Predict forgetting curve for learned characters
 * @param {string} userId - User ID
 * @param {Array} characterStats - Character statistics
 * @returns {Object} - Forgetting curve predictions
 */
async function predictForgettingCurve(userId, characterStats) {
  // Apply spaced repetition algorithm
  const predictions = characterStats.map(stat => {
    // Calculate strength of memory based on repetitions and success rate
    const repetitions = stat.correctCount + stat.incorrectCount;
    const successRate = repetitions > 0 ? stat.correctCount / repetitions : 0;
    
    // Apply the SM-2 spaced repetition algorithm formula (simplified)
    const easinessFactor = 2.5 + (0.1 - (5 - 5 * successRate) * (0.08 + (5 - 5 * successRate) * 0.02));
    const interval = repetitions === 1 ? 1 : Math.round(6 * easinessFactor);
    
    // Calculate next review date
    const lastPracticed = new Date(stat.updatedAt || stat.createdAt);
    const nextReview = new Date(lastPracticed);
    nextReview.setDate(nextReview.getDate() + interval);
    
    // Calculate predicted retention at different intervals
    const retention = {
      '1day': calculateRetention(successRate, 1),
      '7days': calculateRetention(successRate, 7),
      '30days': calculateRetention(successRate, 30)
    };
    
    return {
      character: stat.character,
      lastPracticed: lastPracticed.toISOString(),
      nextReview: nextReview.toISOString(),
      interval,
      retention
    };
  });
  
  // Sort by predicted retention (ascending, so characters most likely to be forgotten come first)
  predictions.sort((a, b) => a.retention['30days'] - b.retention['30days']);
  
  return {
    userId,
    predictions,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate a comprehensive training plan
 * @param {string} userId - User ID
 * @param {Object} progress - User progress data
 * @param {Array} stats - User character statistics
 * @returns {Object} - Training plan
 */
async function generateTrainingPlan(userId, progress, stats) {
  // Get recommendations for speed and focus
  const recommendations = await generateLearningRecommendation(userId, progress, stats);
  
  // Get forgetting curve predictions
  const forgettingPredictions = await predictForgettingCurve(userId, stats);
  
  // Analyze optimal time of day based on past performance
  const optimalTimeOfDay = analyzeOptimalTimeOfDay(stats);
  
  // Create sessions for the next week
  const sessionsPerDay = 2; // Recommended number of sessions per day
  const daysToSchedule = 7;
  const sessions = [];
  
  for (let day = 0; day < daysToSchedule; day++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + day);
    
    for (let session = 0; session < sessionsPerDay; session++) {
      // Determine focus for this session
      const sessionFocus = day % 2 === 0
        ? 'new_characters' // Focus on new characters on even days
        : 'review';        // Focus on review on odd days
      
      // Determine characters to practice
      let charactersToFocus;
      
      if (sessionFocus === 'new_characters') {
        // Focus on current character and next ones to learn
        charactersToFocus = [progress.currentCharacter];
        // Add characters from the logical next steps
        if (recommendations.nextFocus) {
          charactersToFocus = charactersToFocus.concat(recommendations.nextFocus);
        }
      } else {
        // Review characters most likely to be forgotten
        charactersToFocus = forgettingPredictions.predictions
          .slice(0, 5)
          .map(p => p.character);
      }
      
      // Create session plan
      sessions.push({
        day,
        date: sessionDate.toISOString(),
        session: session + 1,
        focus: sessionFocus,
        characters: charactersToFocus,
        duration: recommendations.recommendedDuration,
        speed: recommendations.recommendedWPM
      });
    }
  }
  
  return {
    userId,
    sessions,
    optimalTimeOfDay,
    recommendedDuration: recommendations.recommendedDuration,
    recommendedWPM: recommendations.recommendedWPM,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear cached data for a user
 * @param {string} userId - User ID
 */
function clearCaches(userId) {
  if (userId) {
    // Clear specific user data
    userProgressCache.delete(userId);
    characterStatsCache.delete(userId);
    learningProfiles.delete(userId);
  } else {
    // Clear all caches
    userProgressCache.clear();
    characterStatsCache.clear();
    learningProfiles.clear();
  }
}

/**
 * Calculate learning velocity based on character learning history
 * @param {string} userId - User ID
 * @param {Array} learnedCharacters - Array of learned characters
 * @param {Array} stats - Character statistics
 * @returns {number} - Learning velocity (characters per day)
 */
function calculateLearningVelocity(userId, learnedCharacters, stats) {
  if (!stats || stats.length === 0 || learnedCharacters.length === 0) {
    return 0;
  }
  
  // Get the earliest and latest character learning timestamps
  let earliestDate = new Date();
  let latestDate = new Date(0);
  
  stats.forEach(stat => {
    const createdDate = new Date(stat.createdAt);
    if (createdDate < earliestDate) {
      earliestDate = createdDate;
    }
    
    const updatedDate = new Date(stat.updatedAt);
    if (updatedDate > latestDate) {
      latestDate = updatedDate;
    }
  });
  
  // Calculate days between first and last character
  const daysDiff = (latestDate - earliestDate) / (1000 * 60 * 60 * 24);
  
  // If less than a day, return the number of characters learned
  if (daysDiff < 1) {
    return learnedCharacters.length;
  }
  
  // Calculate characters per day
  return learnedCharacters.length / daysDiff;
}

/**
 * Identify strengths and weaknesses based on character statistics
 * @param {Array} stats - Character statistics
 * @returns {Object} - Strengths and weaknesses
 */
function identifyStrengthsWeaknesses(stats) {
  if (!stats || stats.length === 0) {
    return { strengths: [], weaknesses: [] };
  }
  
  // Calculate accuracy for each character
  const characterAccuracy = stats.map(stat => {
    const total = stat.correctCount + stat.incorrectCount;
    const accuracy = total > 0 ? (stat.correctCount / total) * 100 : 0;
    
    return {
      character: stat.character,
      accuracy,
      attempts: total
    };
  });
  
  // Filter for characters with enough attempts
  const significantStats = characterAccuracy.filter(s => s.attempts >= 10);
  
  // Sort for strengths and weaknesses
  const sortedByAccuracy = [...significantStats].sort((a, b) => b.accuracy - a.accuracy);
  
  // Get top and bottom 5 characters
  const strengths = sortedByAccuracy.slice(0, 5).map(s => s.character);
  const weaknesses = sortedByAccuracy.slice(-5).reverse().map(s => s.character);
  
  return { strengths, weaknesses };
}

/**
 * Calculate overall proficiency based on mastery levels and stats
 * @param {Object} masteryLevels - Mastery levels for different character sets
 * @param {Array} stats - Character statistics
 * @returns {number} - Overall proficiency percentage
 */
function calculateOverallProficiency(masteryLevels, stats) {
  if (!masteryLevels || Object.keys(masteryLevels).length === 0) {
    // Calculate from stats directly
    if (!stats || stats.length === 0) {
      return 0;
    }
    
    // Calculate overall accuracy
    let totalCorrect = 0;
    let totalAttempts = 0;
    
    stats.forEach(stat => {
      totalCorrect += stat.correctCount;
      totalAttempts += stat.correctCount + stat.incorrectCount;
    });
    
    return totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
  }
  
  // Calculate weighted average of mastery levels
  const weights = {
    international: 0.6,
    prosigns: 0.2,
    special: 0.2
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [category, level] of Object.entries(masteryLevels)) {
    const weight = weights[category] || 0.1;
    weightedSum += level * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Determine optimal practice schedule based on user history
 * @param {string} userId - User ID
 * @param {Array} stats - Character statistics
 * @returns {Object} - Optimal practice schedule
 */
function determineOptimalPracticeSchedule(userId, stats) {
  // Default schedule (if no data available)
  const defaultSchedule = {
    sessionsPerDay: 2,
    sessionsPerWeek: 5,
    durationMinutes: 20,
    restDays: [0, 6] // Sunday and Saturday
  };
  
  if (!stats || stats.length === 0) {
    return defaultSchedule;
  }
  
  // Analyze learning patterns from stats
  // This is a simplified implementation that would be more complex in reality
  
  // Determine optimal session duration based on performance
  const optimalDuration = determineOptimalDuration(userId, stats);
  
  // For now, return an enhanced default schedule
  return {
    ...defaultSchedule,
    durationMinutes: optimalDuration
  };
}

/**
 * Analyze mistake patterns from session data
 * @param {Array} mistakes - Mistake data
 * @returns {Object} - Mistake pattern analysis
 */
function analyzeMistakePatterns(mistakes) {
  if (!mistakes || mistakes.length === 0) {
    return { patterns: [], mostCommonError: null };
  }
  
  // Count error occurrences
  const errorCounts = {};
  
  mistakes.forEach(mistake => {
    const errorKey = `${mistake.expected}->${mistake.actual}`;
    errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
  });
  
  // Find most common errors
  const sortedErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [expected, actual] = key.split('->');
      return { expected, actual, count };
    });
  
  // Group by pattern types
  const patterns = [];
  
  // Check for reversals (e.g., confusing A with N)
  const reversalErrors = sortedErrors.filter(error => {
    const reverseKey = `${error.actual}->${error.expected}`;
    return Object.keys(errorCounts).includes(reverseKey);
  });
  
  if (reversalErrors.length > 0) {
    patterns.push({
      type: 'reversal',
      description: 'Confusing characters with reversed patterns',
      examples: reversalErrors.slice(0, 3)
    });
  }
  
  // Check for timing errors (likely confusing short/long elements)
  const timingErrors = sortedErrors.filter(error => {
    // Characters with similar timing profiles
    const shortDotChars = 'EISH'.split('');
    const longDashChars = 'TMO'.split('');
    
    return (shortDotChars.includes(error.expected) && shortDotChars.includes(error.actual)) ||
           (longDashChars.includes(error.expected) && longDashChars.includes(error.actual));
  });
  
  if (timingErrors.length > 0) {
    patterns.push({
      type: 'timing',
      description: 'Confusing characters with similar timing patterns',
      examples: timingErrors.slice(0, 3)
    });
  }
  
  return {
    patterns,
    mostCommonError: sortedErrors.length > 0 ? sortedErrors[0] : null
  };
}

/**
 * Calculate concentration score based on mistakes and duration
 * @param {Array} mistakes - Mistake data
 * @param {number} duration - Session duration in seconds
 * @returns {number} - Concentration score (0-100)
 */
function calculateConcentrationScore(mistakes, duration) {
  if (!mistakes || duration <= 0) {
    return 50; // Default score
  }
  
  // Calculate mistake density (mistakes per minute)
  const mistakesPerMinute = (mistakes.length / duration) * 60;
  
  // Calculate mistake distribution (are mistakes clustered or spread out?)
  let mistakeDistribution = 1; // Default: evenly distributed
  
  if (mistakes.length >= 3) {
    // Check for mistake clustering
    // This would be a more complex calculation in a real implementation
    // For now, use a simplified approach
    mistakeDistribution = 1; // Placeholder
  }
  
  // Calculate concentration score
  // Lower mistake density and more evenly distributed mistakes = higher concentration
  const baseScore = 100 - (mistakesPerMinute * 5);
  const adjustedScore = baseScore * mistakeDistribution;
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, adjustedScore));
}

/**
 * Generate personalized feedback based on session performance
 * @param {string} userId - User ID
 * @param {number} accuracy - Session accuracy percentage
 * @param {number} effectiveSpeed - Effective WPM
 * @param {Object} mistakePatterns - Mistake pattern analysis
 * @param {number} concentrationScore - Concentration score
 * @returns {Array} - Array of feedback items
 */
function generatePersonalizedFeedback(userId, accuracy, effectiveSpeed, mistakePatterns, concentrationScore) {
  const feedback = [];
  
  // Accuracy feedback
  if (accuracy >= 95) {
    feedback.push({
      type: 'positive',
      aspect: 'accuracy',
      message: 'Excellent accuracy! You\'re ready to increase your speed.'
    });
  } else if (accuracy >= 85) {
    feedback.push({
      type: 'positive',
      aspect: 'accuracy',
      message: 'Good accuracy. Keep practicing at this speed to build confidence.'
    });
  } else if (accuracy >= 70) {
    feedback.push({
      type: 'neutral',
      aspect: 'accuracy',
      message: 'Acceptable accuracy, but focus on precision before increasing speed.'
    });
  } else {
    feedback.push({
      type: 'improvement',
      aspect: 'accuracy',
      message: 'Try reducing speed to improve accuracy. Focus on each character carefully.'
    });
  }
  
  // Speed feedback
  if (effectiveSpeed >= 20) {
    feedback.push({
      type: 'positive',
      aspect: 'speed',
      message: 'Great speed! You\'re making excellent progress.'
    });
  } else if (effectiveSpeed >= 15) {
    feedback.push({
      type: 'positive',
      aspect: 'speed',
      message: 'Good speed. You\'re approaching proficient levels.'
    });
  } else {
    feedback.push({
      type: 'neutral',
      aspect: 'speed',
      message: 'Steady speed. As your accuracy improves, you can gradually increase speed.'
    });
  }
  
  // Mistake pattern feedback
  if (mistakePatterns.patterns && mistakePatterns.patterns.length > 0) {
    const pattern = mistakePatterns.patterns[0];
    
    if (pattern.type === 'reversal') {
      feedback.push({
        type: 'improvement',
        aspect: 'pattern',
        message: `Focus on distinguishing between reversed patterns like ${pattern.examples[0].expected} and ${pattern.examples[0].actual}.`
      });
    } else if (pattern.type === 'timing') {
      feedback.push({
        type: 'improvement',
        aspect: 'pattern',
        message: 'Work on timing precision to distinguish between similar characters.'
      });
    }
  }
  
  // Concentration feedback
  if (concentrationScore >= 90) {
    feedback.push({
      type: 'positive',
      aspect: 'concentration',
      message: 'Excellent focus throughout the session!'
    });
  } else if (concentrationScore >= 70) {
    feedback.push({
      type: 'positive',
      aspect: 'concentration',
      message: 'Good concentration. Your focus was consistent.'
    });
  } else if (concentrationScore >= 50) {
    feedback.push({
      type: 'neutral',
      aspect: 'concentration',
      message: 'Moderate concentration. Consider shorter, more focused sessions.'
    });
  } else {
    feedback.push({
      type: 'improvement',
      aspect: 'concentration',
      message: 'Try shorter practice sessions to maintain better concentration.'
    });
  }
  
  return feedback;
}

/**
 * Build a confusion matrix from character statistics
 * @param {Array} characterStats - Character statistics
 * @returns {Array} - Confusion matrix entries
 */
function buildConfusionMatrix(characterStats) {
  if (!characterStats || !characterStats[0] || !characterStats[0].confusions) {
    // If confusion data isn't available, return empty matrix
    return [];
  }
  
  const confusionEntries = [];
  
  // Extract confusion data from statistics
  characterStats.forEach(stat => {
    if (stat.confusions) {
      Object.entries(stat.confusions).forEach(([wrongChar, count]) => {
        confusionEntries.push({
          expected: stat.character,
          confused: wrongChar,
          count
        });
      });
    }
  });
  
  // Sort by count (descending)
  return confusionEntries.sort((a, b) => b.count - a.count);
}

/**
 * Identify pattern-based errors from confusion data
 * @param {Object} similarGroups - Groups of similar characters
 * @param {Array} confusionMatrix - Confusion matrix data
 * @returns {Array} - Pattern-based error groups
 */
function identifyPatternErrors(similarGroups, confusionMatrix) {
  const patternErrors = [];
  
  // Check for within-group confusions
  Object.entries(similarGroups).forEach(([groupType, groups]) => {
    groups.forEach(group => {
      // Find confusions within this group
      const withinGroupConfusions = confusionMatrix.filter(entry => 
        group.includes(entry.expected) && group.includes(entry.confused)
      );
      
      if (withinGroupConfusions.length > 0) {
        patternErrors.push({
          type: groupType,
          characters: group,
          confusions: withinGroupConfusions
        });
      }
    });
  });
  
  return patternErrors;
}

/**
 * Analyze accuracy at different speeds
 * @param {Array} stats - Character statistics
 * @returns {Object} - Accuracy by speed data
 */
function analyzeAccuracyBySpeed(stats) {
  if (!stats || !stats[0] || !stats[0].speedPerformance) {
    // If speed performance data isn't available, return default
    return {
      curve: [
        { speed: 10, accuracy: 95 },
        { speed: 15, accuracy: 90 },
        { speed: 20, accuracy: 85 },
        { speed: 25, accuracy: 75 },
        { speed: 30, accuracy: 65 }
      ]
    };
  }
  
  // Collect speed-accuracy data points
  const dataPoints = [];
  
  stats.forEach(stat => {
    if (stat.speedPerformance) {
      Object.entries(stat.speedPerformance).forEach(([speed, perf]) => {
        dataPoints.push({
          speed: parseInt(speed, 10),
          accuracy: perf.accuracy,
          character: stat.character
        });
      });
    }
  });
  
  // Group by speed and calculate average accuracy
  const speedGroups = {};
  dataPoints.forEach(point => {
    if (!speedGroups[point.speed]) {
      speedGroups[point.speed] = { total: 0, count: 0 };
    }
    speedGroups[point.speed].total += point.accuracy;
    speedGroups[point.speed].count += 1;
  });
  
  // Calculate average accuracy for each speed
  const accuracyBySpeed = Object.entries(speedGroups).map(([speed, data]) => ({
    speed: parseInt(speed, 10),
    accuracy: data.total / data.count
  })).sort((a, b) => a.speed - b.speed);
  
  return { curve: accuracyBySpeed };
}

/**
 * Project accuracy at a given speed based on performance curve
 * @param {number} speed - Target speed (WPM)
 * @param {Object} accuracyData - Accuracy by speed data
 * @returns {number} - Projected accuracy percentage
 */
function projectAccuracyAtSpeed(speed, accuracyData) {
  const { curve } = accuracyData;
  
  // If no curve data or empty curve, return default
  if (!curve || curve.length === 0) {
    // Simple default formula: accuracy drops 2% for each WPM above 15
    return 95 - Math.max(0, (speed - 15) * 2);
  }
  
  // If speed is below the lowest or above the highest in our data, extrapolate
  if (speed <= curve[0].speed) {
    return curve[0].accuracy;
  }
  
  if (speed >= curve[curve.length - 1].speed) {
    return curve[curve.length - 1].accuracy;
  }
  
  // Find the two closest speeds in our data
  let lower = curve[0];
  let higher = curve[curve.length - 1];
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].speed <= speed && curve[i + 1].speed >= speed) {
      lower = curve[i];
      higher = curve[i + 1];
      break;
    }
  }
  
  // Linear interpolation between the two points
  const speedRange = higher.speed - lower.speed;
  const accuracyRange = higher.accuracy - lower.accuracy;
  const speedOffset = speed - lower.speed;
  
  return lower.accuracy + (speedOffset / speedRange) * accuracyRange;
}

/**
 * Determine optimal session duration based on user data
 * @param {string} userId - User ID
 * @param {Array} stats - Character statistics
 * @returns {number} - Optimal session duration in minutes
 */
function determineOptimalDuration(userId, stats) {
  // Default duration
  const defaultDuration = 20; // minutes
  
  if (!stats || stats.length === 0) {
    return defaultDuration;
  }
  
  // In a real implementation, this would analyze:
  // - User's performance curve over time within sessions
  // - Point of diminishing returns in session length
  // - Signs of fatigue in longer sessions
  
  // For now, return a reasonable default
  return defaultDuration;
}

/**
 * Determine what to focus on in the next training session
 * @param {Object} progress - User progress data
 * @param {Array} stats - Character statistics
 * @param {Object} errorPatterns - Error pattern analysis
 * @returns {Array} - Characters to focus on
 */
function determineNextFocus(progress, stats, errorPatterns) {
  // Default to current character
  const focusChars = progress.currentCharacter ? [progress.currentCharacter] : [];
  
  // Add characters with high error rates that need review
  if (stats && stats.length > 0) {
    // Find characters with many attempts but low success rate
    const needsReview = stats
      .filter(stat => {
        const total = stat.correctCount + stat.incorrectCount;
        const successRate = total > 0 ? stat.correctCount / total : 0;
        // Characters with at least 20 attempts and less than 80% success
        return total >= 20 && successRate < 0.8;
      })
      .sort((a, b) => {
        const successRateA = a.correctCount / (a.correctCount + a.incorrectCount);
        const successRateB = b.correctCount / (b.correctCount + b.incorrectCount);
        return successRateA - successRateB; // Sort by lowest success rate
      })
      .slice(0, 2) // Take top 2
      .map(stat => stat.character);
    
    // Add to focus list if not already included
    needsReview.forEach(char => {
      if (!focusChars.includes(char)) {
        focusChars.push(char);
      }
    });
  }
  
  // If we have error patterns, add the most problematic character pair
  if (errorPatterns && errorPatterns.patternErrors && errorPatterns.patternErrors.length > 0) {
    const firstPattern = errorPatterns.patternErrors[0];
    if (firstPattern.confusions && firstPattern.confusions.length > 0) {
      const { expected, confused } = firstPattern.confusions[0];
      
      if (!focusChars.includes(expected)) {
        focusChars.push(expected);
      }
      
      if (!focusChars.includes(confused)) {
        focusChars.push(confused);
      }
    }
  }
  
  // Limit to 5 characters total
  return focusChars.slice(0, 5);
}

/**
 * Determine if user should take a break based on learning patterns
 * @param {string} userId - User ID
 * @param {Array} stats - Character statistics
 * @returns {boolean} - Whether user should take a break
 */
function shouldUserTakeBreak(userId, stats) {
  // Default (when in doubt, don't suggest a break)
  const defaultShouldBreak = false;
  
  if (!stats || stats.length === 0) {
    return defaultShouldBreak;
  }
  
  // Check for declining performance
  // This would be a more sophisticated analysis in a real implementation
  
  // For now, return a default
  return defaultShouldBreak;
}

/**
 * Calculate predicted retention at a specific interval
 * @param {number} successRate - Success rate (0-1)
 * @param {number} days - Number of days since last practice
 * @returns {number} - Predicted retention percentage
 */
function calculateRetention(successRate, days) {
  // Apply a simplified Ebbinghaus forgetting curve
  // R = e^(-t/S) where S is strength of memory
  
  // Calculate memory strength based on success rate
  // Higher success rate = stronger memory
  const strength = 10 * (0.5 + successRate * 0.5);
  
  // Calculate retention
  const retention = Math.exp(-days / strength) * 100;
  
  return Math.max(0, Math.min(100, retention));
}

/**
 * Analyze optimal time of day for practice based on performance history
 * @param {Array} stats - Character statistics
 * @returns {Array} - Optimal time periods
 */
function analyzeOptimalTimeOfDay(stats) {
  // Default recommendation
  const defaultTimes = [
    { period: 'morning', start: '08:00', end: '10:00', score: 80 },
    { period: 'evening', start: '19:00', end: '21:00', score: 85 }
  ];
  
  if (!stats || !stats[0] || !stats[0].timePerformance) {
    return defaultTimes;
  }
  
  // In a real implementation, this would analyze:
  // - Performance metrics by time of day
  // - User's personal schedule and preferences
  // - Circadian rhythm research on cognitive performance
  
  // For now, return default recommendations
  return defaultTimes;
}

// Notify main thread that the worker is ready
// Use ID 0 for the ready message to ensure compatibility
parentPort.postMessage({ type: 'ready', success: true, id: 0 });