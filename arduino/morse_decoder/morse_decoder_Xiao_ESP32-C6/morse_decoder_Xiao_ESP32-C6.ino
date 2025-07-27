/**
 * morse_decoder_Xiao_ESP32-C6.ino
 * Arduino firmware for detecting Morse code signals from a physical key
 * and sending dots and dashes to the browser via Serial
 *
 * Set up for Xiao ESP32-C6 board
 */

// Include watchdog timer for ESP32 to recover from potential freezes
#include <esp_task_wdt.h>

// Pin definitions for Xiao ESP32-C6
// On Xiao ESP32-C6, pins are labeled D0, D1, D2, etc.
// But these correspond to different GPIO numbers in the ESP32-C6 chip
// For this board, we're using physical pins D2,D3 and GND.
// The Yellow LED on the Xiao PCB is connected to GPIO15.
// This LED is wired in an active-LOW configuration (LOW turns it ON, HIGH turns it OFF).
// On any input on the two input pins, blink this led when the input is active.

// Map D2 and D3 pins to the correct GPIO numbers for Xiao ESP32-C6
// D2 on Xiao ESP32-C6 is GPIO 2 (according to documentation)
// D3 on Xiao ESP32-C6 is GPIO 21 (according to documentation)
// Previous incorrect mapping: D0-D10 = GPIO 8, 9, 10, 11, 12, 13, 14, 6, 5, 4, 7
const int PADDLE_DOT_PIN = 2;     // Connect paddle dot contact to D2 pin (GPIO 2), left paddle
const int PADDLE_DASH_PIN = 21;   // Connect paddle dash contact to D3 pin (GPIO 21), right paddle
const int YELLOW_LED_PIN = 15;   // GPIO15 for the yellow LED on Xiao ESP32-C6

// Key mode definitions
enum KeyMode {
  PADDLE_IAMBIC_A,  // Paddle used in iambic mode A (Curtis A - true implementation)
  PADDLE_IAMBIC_B   // Paddle used in iambic mode B
};

// Current key mode
KeyMode currentKeyMode = PADDLE_IAMBIC_A;

// Timing constants (in milliseconds)
const unsigned long DIT_THRESHOLD = 150;      // Maximum duration for a dit
const unsigned long DAH_THRESHOLD = 450;      // Maximum duration for a dah
const unsigned long ELEMENT_THRESHOLD = 200;  // Maximum time between elements within a character
const unsigned long WORD_THRESHOLD = 1400;    // Maximum time between words
const unsigned long DEBOUNCE_DELAY = 450;     // Debounce time in milliseconds to prevent contact bounce

// State variables
unsigned long keyDownTime = 0;
unsigned long keyUpTime = 0;
unsigned long lastElementTime = 0;
bool keyWasDown = false;
char lastSentElement = '\0';  // Tracks the last element sent (either '.' or '-')
unsigned long lastDebounceTime = 0;   // The last time the key state was toggled
unsigned long lastSignalTime = 0;     // The last time a signal was sent
const unsigned long SIGNAL_REPEAT_DELAY = 300; // Minimum time between signals (ms)
bool lastKeyState = HIGH;             // Previous reading from the input pin

// LED diagnostic variables
bool ledIsOn = false;                    // Tracks if the diagnostic LED is currently on
bool inputActive = false;                // Flag to track if any input is currently active
unsigned long ledPulseEndTime = 0;       // When to turn off the LED pulse
const unsigned long LED_PULSE_DURATION = 400;  // LED pulses for 400ms per input

// Iambic keyer state
bool dotMemory = false;
bool dashMemory = false;
bool iambicState = false;
unsigned long iambicTimer = 0;
char currentIambicElement = '\0';  // Current element being sent ('.', '-', or '\0')
bool elementComplete = false;      // Flag to track if the current element is complete
bool squeezeReleased = false;      // Flag to track if the squeeze was released after element completion
unsigned long elementCompleteTime = 0; // Time when the current element completed

// Flag to enable debug messages - DISABLED by default, can be toggled with 'D' command
const bool DEBUG_MODE = false;

// Track last time we sent a debug message to avoid flooding
unsigned long lastDebugTime = 0;
const unsigned long DEBUG_INTERVAL = 10000;  // 10 seconds between status messages

// We don't need a safety timeout anymore since LED pulses automatically turn off

// Direct pin testing only happens when paddle is pressed to avoid console flooding
unsigned long lastPinTestTime = 0;
const unsigned long PIN_TEST_INTERVAL = 1000;  // 1000ms between checks when paddle is active

void setup() {
  // Initialize serial communication
  Serial.begin(115200);  // Higher baud rate for better responsiveness
  
  // Set up pins with internal pull-up resistors
  pinMode(PADDLE_DOT_PIN, INPUT_PULLUP);
  pinMode(PADDLE_DASH_PIN, INPUT_PULLUP);
  
  // Set up LED pin as output for diagnostic feedback
  pinMode(YELLOW_LED_PIN, OUTPUT);
  digitalWrite(YELLOW_LED_PIN, HIGH);  // Ensure LED starts off (LED is active-LOW)
  
  // Initialize watchdog timer with proper config structure for ESP32-C6
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 8000,            // 8 seconds timeout
    .idle_core_mask = 0,           // No idle cores to watch
    .trigger_panic = true          // Trigger panic on timeout
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);          // Add current task to watchdog
  
  // Wait for serial connection to be established with a timeout
  unsigned long serialTimeout = millis() + 5000;  // 5 second timeout
  while (!Serial && millis() < serialTimeout) {
    ; // Wait for serial port to connect or timeout
  }
  
  // Blink the LED several times at startup for visual confirmation
  for (int i = 0; i < 3; i++) {
    digitalWrite(YELLOW_LED_PIN, LOW);   // Turn LED on
    delay(100);
    digitalWrite(YELLOW_LED_PIN, HIGH);  // Turn LED off
    delay(100);
  }
  
  // Send startup message
  Serial.println("Morse Decoder Ready");
  
  // Force a full test of pins at startup
  Serial.println("TESTING DOT PIN (GPIO 2)...");
  if (digitalRead(PADDLE_DOT_PIN) == LOW) {
    Serial.println("DOT PIN IS PRESSED (LOW)");
  } else {
    Serial.println("DOT PIN IS RELEASED (HIGH)");
  }
  
  Serial.println("TESTING DASH PIN (GPIO 21)...");
  if (digitalRead(PADDLE_DASH_PIN) == LOW) {
    Serial.println("DASH PIN IS PRESSED (LOW)");
  } else {
    Serial.println("DASH PIN IS RELEASED (HIGH)");
  }
  
  // Ensure LED is off at startup
  setInputInactive();
}

void loop() {
  // Reset the watchdog timer to prevent reboot
  esp_task_wdt_reset();  // Keep the watchdog happy
  
  // First check pins directly for maximum responsiveness
  bool dotPinPressed = digitalRead(PADDLE_DOT_PIN) == LOW;
  bool dashPinPressed = digitalRead(PADDLE_DASH_PIN) == LOW;
  
  // Immediate LED pulse for each new input, if enough time has passed since last signal
  if ((dotPinPressed || dashPinPressed) && (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
    // Start a new LED pulse for this input
    startLedPulse();
    lastSignalTime = millis(); // Update last signal time
    
    // Send Morse signals immediately - completely separated from debug
    if (dotPinPressed) {
      Serial.println(); // Blank line for separation
      Serial.println("."); // Clean Morse signal only
    }
    
    if (dashPinPressed) {
      Serial.println(); // Blank line for separation
      Serial.println("-"); // Clean Morse signal only
    }
  }
  
  // Check if LED pulse needs to turn off
  checkLedPulseTimeout();
  
  // Check for commands from serial
  checkSerialCommands();
  
  // Handle key input based on current mode
  switch (currentKeyMode) {
    case PADDLE_IAMBIC_A:
      handleIambicPaddleModeA();
      break;
    case PADDLE_IAMBIC_B:
      handleIambicPaddleModeB();
      break;
  }
  
  // Check for word space (if key has been up for longer than WORD_THRESHOLD)
  if (millis() - lastElementTime > WORD_THRESHOLD && lastElementTime > 0) {
    Serial.print(" ");  // Add space between words
    lastElementTime = 0; // Reset to prevent continuous spaces
  }
  
  // Direct pin testing for troubleshooting - only run when a paddle is pressed or DEBUG_MODE is enabled
  if (DEBUG_MODE && (dotPinPressed || dashPinPressed) && (millis() - lastPinTestTime >= PIN_TEST_INTERVAL)) {
    lastPinTestTime = millis();
    
    // Only send debug messages when in DEBUG_MODE and a paddle is pressed
    Serial.println("DEBUG_MSG: PADDLE PRESS DETECTED");
    Serial.print("DEBUG_MSG: DOT PIN (GPIO ");
    Serial.print(PADDLE_DOT_PIN);
    Serial.print(") = ");
    Serial.println(dotPinPressed ? "PRESSED (LOW)" : "RELEASED (HIGH)");
    
    Serial.print("DEBUG_MSG: DASH PIN (GPIO ");
    Serial.print(PADDLE_DASH_PIN);
    Serial.print(") = ");
    Serial.println(dashPinPressed ? "PRESSED (LOW)" : "RELEASED (HIGH)");
  }
  
  // No need for safety reset timer anymore, pulses turn off automatically
}

/**
 * Start a new LED pulse for input feedback
 * Turns on the LED and sets a timer to turn it off after PULSE_DURATION
 */
void startLedPulse() {
  digitalWrite(YELLOW_LED_PIN, LOW);  // LOW turns the LED on (active-LOW)
  ledIsOn = true;
  inputActive = true;
  ledPulseEndTime = millis() + LED_PULSE_DURATION;  // Set when to turn off
}

/**
 * Check if it's time to turn off the LED pulse
 */
void checkLedPulseTimeout() {
  if (ledIsOn && millis() >= ledPulseEndTime) {
    digitalWrite(YELLOW_LED_PIN, HIGH);  // HIGH turns the LED off (active-LOW)
    ledIsOn = false;
    inputActive = false;
  }
}

/**
 * Set input as active - turns on LED and sets inputActive flag
 */
void setInputActive() {
  startLedPulse();  // This function already turns on LED and sets inputActive to true
}

/**
 * Set input as inactive - turns off LED and clears inputActive flag
 */
void setInputInactive() {
  digitalWrite(YELLOW_LED_PIN, HIGH);  // HIGH turns the LED off (active-LOW)
  ledIsOn = false;
  inputActive = false;
}

/**
 * Check for commands from the serial port
 */
void checkSerialCommands() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    
    // Reset ALL state when receiving commands to ensure clean operation
    setInputInactive();
    dotMemory = false;
    dashMemory = false;
    keyWasDown = false;
    currentIambicElement = '\0';
    elementComplete = false;
    squeezeReleased = false;
    
    // Process command
    switch (cmd) {
      case 'S': // For backward compatibility, map to Iambic mode A
      case 'P': // For backward compatibility, map to Iambic mode A
      case 'A': // Iambic paddle mode A (Curtis A)
        currentKeyMode = PADDLE_IAMBIC_A;
        Serial.println("MODE:PADDLE_IAMBIC_A");
        if (DEBUG_MODE) {
          Serial.println("DEBUG_MSG: Iambic mode A activated");
          Serial.println("DEBUG_MSG: Using GPIO " + String(PADDLE_DOT_PIN) + " for DOT");
          Serial.println("DEBUG_MSG: Using GPIO " + String(PADDLE_DASH_PIN) + " for DASH");
        }
        break;
      case 'B': // Iambic paddle mode B
        currentKeyMode = PADDLE_IAMBIC_B;
        Serial.println("MODE:PADDLE_IAMBIC_B");
        if (DEBUG_MODE) {
          Serial.println("DEBUG_MSG: Iambic mode B activated");
          Serial.println("DEBUG_MSG: Using GPIO " + String(PADDLE_DOT_PIN) + " for DOT");
          Serial.println("DEBUG_MSG: Using GPIO " + String(PADDLE_DASH_PIN) + " for DASH");
        }
        break;
      case 'D': // Debug toggle
        // Toggle debug mode
        if (DEBUG_MODE) {
        Serial.println("DEBUG_MSG: Debug mode disabled");
        } else {
          Serial.println("DEBUG_MSG: Debug mode enabled");
        }
        break;
      case 'T': // Test LED
        // Test LED by blinking it
        Serial.println("DEBUG_MSG: Testing LED...");
        for (int i = 0; i < 3; i++) {
          digitalWrite(YELLOW_LED_PIN, LOW);  // Turn LED on
          delay(100);
          digitalWrite(YELLOW_LED_PIN, HIGH); // Turn LED off
          delay(100);
        }
        Serial.println("DEBUG_MSG: LED test complete");
        break;
    }
  }
}


/**
 * Handle iambic paddle input in Mode A with debounce (Curtis A - true implementation)
 * In Mode A, if you release the paddles after the final element is sent but before
 * the next element begins, no additional elements are sent.
 */
void handleIambicPaddleModeA() {
  // Read the state of both paddle contacts
  bool dotKeyState = digitalRead(PADDLE_DOT_PIN);
  bool dashKeyState = digitalRead(PADDLE_DASH_PIN);
  
  // Simple debounce - if either state has changed, reset the debounce timer
  if ((dotKeyState != lastKeyState) || (dashKeyState != (lastKeyState == LOW))) {
    lastDebounceTime = millis();
  }
  
  // Save the dot state for next comparison (we'll just use this one for debounce)
  lastKeyState = dotKeyState;
  
  // Only process if states are stable and enough time has passed since last signal
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY && 
      (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
    // Check if squeeze was released
    if (!dotPressed && !dashPressed && (dotMemory || dashMemory)) {
      squeezeReleased = true;
    }
    
  // If either paddle is pressed, immediately pulse the LED
  if ((dotPressed || dashPressed) && !(keyWasDown)) {
    startLedPulse();
    keyWasDown = true;
    lastSignalTime = millis(); // Update last signal time
    
    // Send Morse output directly without blank lines
    if (dotPressed) {
      Serial.print(".");
    }
    
    if (dashPressed) {
      Serial.print("-");
    }
    
    // Only send debug message if DEBUG_MODE is enabled
    if (DEBUG_MODE) {
      Serial.println("DEBUG_MSG: DOT/DASH PRESSED");
    }
  }
  // If both paddles are released, handle LED
  else if (!dotPressed && !dashPressed && keyWasDown) {
    keyWasDown = false;
    // LED will turn off automatically after pulse duration
  }
    
    // If we're not currently sending an element
    if (currentIambicElement == '\0') {
      // Check if we have an element in memory to send
      if (dotMemory) {
        // Send a dot
        Serial.print(".");
        currentIambicElement = '.';
        lastSentElement = '.';  // Record the element we just sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        elementComplete = false;
        dotMemory = false;  // Clear dot memory
      } else if (dashMemory) {
        // Send a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        iambicTimer = millis() + DAH_THRESHOLD;  // Set timer for dash duration
        elementComplete = false;
        dashMemory = false;  // Clear dash memory
      } else if (dotPressed) {
        // Start sending a dot
        Serial.print(".");
        currentIambicElement = '.';
        lastSentElement = '.';  // Record the element we just sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        elementComplete = false;
      } else if (dashPressed) {
        // Start sending a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        iambicTimer = millis() + DAH_THRESHOLD;  // Set timer for dash duration
        elementComplete = false;
      }
      
      if (currentIambicElement != '\0') {
        lastElementTime = millis();
      }
    }
    
    // Check if current element is complete
    if (currentIambicElement != '\0' && millis() >= iambicTimer) {
      // Element is complete
      elementComplete = true;
      elementCompleteTime = millis();
      currentIambicElement = '\0';
      
      // In Mode A, we only set up the next element if the paddles are still pressed
      // This is the key difference from Mode B
      if (dotPressed || dashPressed) {
        // If both paddles are pressed, alternate between dot and dash
        if (dotPressed && dashPressed) {
          if (lastSentElement == '.') {
            dashMemory = true;
          } else {
            dotMemory = true;
          }
        } else if (dotPressed) {
          dotMemory = true;
        } else if (dashPressed) {
          dashMemory = true;
        }
      }
      
      // If the squeeze was released after the element completed, we don't queue another element
      // This is the key feature of the Curtis A chip that modern implementations get wrong
      if (squeezeReleased) {
        dotMemory = false;
        dashMemory = false;
        squeezeReleased = false;
      }
      
      // The LED will turn off automatically after pulse duration
      // Just reset other state when done
      if (!dotMemory && !dashMemory && !dotPressed && !dashPressed) {
        // Force reset all other state for clean slate
        elementComplete = false;
        squeezeReleased = false;
      }
    }
    
    // If no paddles are pressed and no elements are in memory, reset
    if (!dotPressed && !dashPressed && !dotMemory && !dashMemory && currentIambicElement == '\0') {
      // End of keying
      keyWasDown = false;
      squeezeReleased = false;
    }
  }
}

/**
 * Handle iambic paddle input in Mode B with debounce
 * In Mode B, if you release the paddles, the keyer completes the element in progress
 * and then sends one more alternating element.
 */
void handleIambicPaddleModeB() {
  // Read the state of both paddle contacts
  bool dotKeyState = digitalRead(PADDLE_DOT_PIN);
  bool dashKeyState = digitalRead(PADDLE_DASH_PIN);
  
  // Simple debounce - if either state has changed, reset the debounce timer
  if ((dotKeyState != lastKeyState) || (dashKeyState != (lastKeyState == LOW))) {
    lastDebounceTime = millis();
  }
  
  // Save the dot state for next comparison (we'll just use this one for debounce)
  lastKeyState = dotKeyState;
  
  // Only process if states are stable and enough time has passed since last signal
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY && 
      (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
    // If either paddle is pressed, immediately pulse the LED
    if ((dotPressed || dashPressed) && !(keyWasDown)) {
      startLedPulse();
      keyWasDown = true;
      lastSignalTime = millis(); // Update last signal time
    }
    // If both paddles are released, check if we should turn off LED
    else if (!dotPressed && !dashPressed && keyWasDown) {
      keyWasDown = false;
      // LED will turn off automatically after pulse duration
    }
    
    // Store paddle states in memory for proper iambic behavior
    if (dotPressed) dotMemory = true;
    if (dashPressed) dashMemory = true;
    
    // If we're not currently sending an element
    if (currentIambicElement == '\0') {
      // Check if we have an element in memory to send
      if (dotMemory) {
        // Send a dot
        Serial.print(".");
        currentIambicElement = '.';
        lastSentElement = '.';  // Record the element we just sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        dotMemory = false;  // Clear dot memory
      } else if (dashMemory) {
        // Send a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        iambicTimer = millis() + DAH_THRESHOLD;  // Set timer for dash duration
        dashMemory = false;  // Clear dash memory
      }
      
      if (currentIambicElement != '\0') {
        lastElementTime = millis();
      }
    }
    
    // Check if current element is complete
    if (currentIambicElement != '\0' && millis() >= iambicTimer) {
      // Element is complete
      currentIambicElement = '\0';
      
      // In Mode B, we always check for the next element to send
      // If both paddles are pressed, alternate between dot and dash
      if (dotPressed && dashPressed) {
        if (lastSentElement == '.') {
          dashMemory = true;
          dotMemory = false;
        } else {
          dotMemory = true;
          dashMemory = false;
        }
      } else if (dotPressed) {
        dotMemory = true;
      } else if (dashPressed) {
        dashMemory = true;
      }
      
      // Mode B: If paddles are released but we just finished an element,
      // we'll send one more alternating element
      if (!dotPressed && !dashPressed && !dotMemory && !dashMemory) {
        if (lastSentElement == '.') {
          dashMemory = true;  // Queue one more dash
        } else if (lastSentElement == '-') {
          dotMemory = true;   // Queue one more dot
        }
      } else if (!dotPressed && !dashPressed && !dotMemory && !dashMemory) {
      // LED turns off automatically after pulse
      // Force reset all other state for clean slate
      elementComplete = false;
      squeezeReleased = false;
      }
    }
    
    // If no paddles are pressed and no elements are in memory, reset ALL state
    if (!dotPressed && !dashPressed && !dotMemory && !dashMemory && currentIambicElement == '\0') {
      // End of keying - just reset state
      keyWasDown = false;
      // LED will turn off automatically
    }
  }
}

// No decode function needed as we're only sending dots and dashes

/**
 * Adaptive timing calibration (optional enhancement)
 * This function could be used to adapt to the user's keying speed
 */
void calibrateTiming() {
  // This would measure the user's average dit and dah durations
  // and adjust the thresholds accordingly
  // Not implemented in this basic version
}
