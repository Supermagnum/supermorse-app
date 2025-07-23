# Farnsworth Timing Implementation Changes

## Overview

This document details changes made to the Supermorse app to fix and improve the Farnsworth timing implementation, replacing the dual-speed approach with a ratio-based approach.

## What is Farnsworth Timing?

Farnsworth timing is a technique used in Morse code training that sends individual characters at a faster speed while increasing the spacing between characters. This approach helps beginners recognize the sound patterns of characters at full speed while giving them more time to process each character before the next one arrives.

## The Bug in the Original Implementation

The original implementation had a bug where the Farnsworth mode wasn't properly increasing the spacing between characters (including between K and M):

- It used two separate speed values:
  - `wpm` (13 WPM) - Overall text speed
  - `farnsworthWpm` (18 WPM) - Character speed

- However, the logs showed that inter-character spacing was identical (276.9ms) in both Farnsworth and non-Farnsworth modes, indicating the spacing wasn't being adjusted correctly.

## Changes Made

### 1. Morse Audio Module (`morse-audio.js`)

- Updated the `calculateTiming` method to use a direct ratio approach rather than calculating from two WPM values
- Modified the `playMorseCode` method to accept a Farnsworth ratio parameter
- Added explicit logging of Farnsworth mode settings
- For standard timing, the ratio between inter-character spacing and dit duration is 3:1
- For Farnsworth timing, this ratio is increased (default 6.5:1)

### 2. Training Module (`training.js`)

- Added a `farnsworthRatio` property (default 6.5) to store the ratio value
- Updated how `playMorseCode` is called to pass the Farnsworth ratio
- Changed the wpm parameter description to "character speed" instead of "overall text speed"

### 3. Settings Module (`settings.js`)

- Changed `farnsworthRatio` to store the actual ratio value (6.5) instead of character speed (18)
- Updated how settings are applied to use the ratio directly
- Added formatting to display the ratio with decimal places

### 4. User Interface (`index.html`)

- Changed the Farnsworth settings label from "Farnsworth Character Speed: [value] WPM" to "Farnsworth Spacing Ratio: [value]:1"
- Modified the range input to use ratio values (3.0-10.0) instead of WPM values (13-30)
- Updated the hint text to explain the ratio concept more clearly

## Timing Calculations and Constraints

### Standard Timing at 20 WPM (Without Farnsworth)
- Dit Duration: 60 ms
- Dah Duration: 180 ms (3 × Dit)
- Intra-character Spacing (between elements in a character): 60 ms (same as Dit)
- Inter-character Spacing (between characters): 180 ms (3 × Dit)

### Farnsworth Timing at 20 WPM with Ratio 6.5
- Dit Duration: 60 ms
- Dah Duration: 180 ms (3 × Dit)
- Intra-character Spacing (between elements in a character): 60 ms (same as Dit)
- Inter-character Spacing (between characters): 390 ms (6.5 × Dit)

### Enforced Constraints
- Minimum Morse Speed: 13 WPM (enforced minimum)
- Recommended Morse Speed: 15+ WPM (for optimal learning)
- Minimum Farnsworth Ratio: 6.0 (enforced minimum)
- Recommended Farnsworth Ratio Range: 6.0-10.0 (higher values better for beginners)

## Benefits of the Ratio-Based Approach

1. **More Intuitive**: The ratio directly represents the relationship between character spacing and dit duration, making it easier to understand
2. **More Flexible**: Allows for fine-tuning the spacing without changing the character speed
3. **Better Learning Progression**: Enables smoother transitions from beginner to advanced speeds
4. **Improved Character Distinction**: Particularly helps with distinguishing similar-sounding characters like K (-.-) and M (--)

## Impact on K and M Characters

With this fix, there is now a significant difference in the pause between characters K and M when Farnsworth mode is enabled:

- **Without Farnsworth** (standard timing at 13 WPM): 276.9ms pause between characters
- **With Farnsworth** (ratio 6.5 at 13 WPM): 600.0ms pause between characters

This increased spacing allows beginners to more easily distinguish between these characters during training sessions.