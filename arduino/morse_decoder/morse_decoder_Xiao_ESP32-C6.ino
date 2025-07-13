/**
 * morse_decoder_Xiao_ESP32.ino
 * Arduino firmware for detecting Morse code signals from a physical key
 * and sending dots and dashes to the browser via Serial
 * 
 * Set up for Xiao ESP32-C6 board
 */

// Pin definitions for Xiao ESP32-C6
// On Xiao ESP32-C6, pins are labeled D0, D1, D2, etc.
// But these correspond to different GPIO numbers in the ESP32-C6 chip
// For this board, we're using physical pins D2,D3 and GND

// Map D2 and D3 pins to the correct GPIO numbers for Xiao ESP32-C6
// D2 on Xiao ESP32-C6 is GPIO 2 (if it matches Arduino numbering)
// D3 on Xiao ESP32-C6 is GPIO 3 (if it matches Arduino numbering)
// If this doesn't work, you may need to check the specific GPIO mapping for your board
const int STRAIGHT_KEY_PIN = 2;  // Connect straight key to D2 pin (GPIO 2)
const int PADDLE_DOT_PIN = 2;    // Connect paddle dot contact to D2 pin (GPIO 2)
const int PADDLE_DASH_PIN = 3;   // Connect paddle dash contact to D3 pin (GPIO 3)

// Key mode definitions
enum KeyMode {
  STRAIGHT_KEY,     // Traditional straight key
  PADDLE_SINGLE,    // Paddle used as a single lever
  PADDLE_IAMBIC_A,  // Paddle used in iambic mode A (Curtis A - true implementation)
  PADDLE_IAMBIC_B   // Paddle used in iambic mode B
};

// Current key mode
KeyMode currentKeyMode = STRAIGHT_KEY;

// Timing constants (in milliseconds)
const unsigned long DIT_THRESHOLD = 150;      // Maximum duration for a dit
const unsigned long DAH_THRESHOLD = 450;      // Maximum duration for a dah
const unsigned long ELEMENT_THRESHOLD = 200;  // Maximum time between elements within a character
const unsigned long WORD_THRESHOLD = 1400;    // Maximum time between words
const unsigned long DEBOUNCE_DELAY = 20;      // Debounce time in milliseconds to prevent contact bounce

// State variables
unsigned long keyDownTime = 0;
unsigned long keyUpTime = 0;
unsigned long lastElementTime = 0;
bool keyWasDown = false;
char lastSentElement = '\0';  // Tracks the last element sent (either '.' or '-')
unsigned long lastDebounceTime = 0;   // The last time the key state was toggled
bool lastKeyState = HIGH;             // Previous reading from the input pin

// Iambic keyer state
bool dotMemory = false;
bool dashMemory = false;
bool iambicState = false;
unsigned long iambicTimer = 0;
char currentIambicElement = '\0';  // Current element being sent ('.', '-', or '\0')
bool elementComplete = false;      // Flag to track if the current element is complete
bool squeezeReleased = false;      // Flag to track if the squeeze was released after element completion
unsigned long elementCompleteTime = 0; // Time when the current element completed

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Set up pins with internal pull-up resistors
  pinMode(STRAIGHT_KEY_PIN, INPUT_PULLUP);
  pinMode(PADDLE_DOT_PIN, INPUT_PULLUP);
  pinMode(PADDLE_DASH_PIN, INPUT_PULLUP);
  
  // Wait for serial connection to be established
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  Serial.println("Morse Decoder Ready");
}

void loop() {
  // Check for commands from serial
  checkSerialCommands();
  
  // Handle key input based on current mode
  switch (currentKeyMode) {
    case STRAIGHT_KEY:
      handleStraightKey();
      break;
    case PADDLE_SINGLE:
      handleSinglePaddle();
      break;
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
}

/**
 * Check for commands from the serial port
 */
void checkSerialCommands() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    
    // Process command
    switch (cmd) {
      case 'S': // Straight key mode
        currentKeyMode = STRAIGHT_KEY;
        Serial.println("MODE:STRAIGHT");
        break;
      case 'P': // Single paddle mode
        currentKeyMode = PADDLE_SINGLE;
        Serial.println("MODE:PADDLE_SINGLE");
        break;
      case 'A': // Iambic paddle mode A (Curtis A)
        currentKeyMode = PADDLE_IAMBIC_A;
        Serial.println("MODE:PADDLE_IAMBIC_A");
        break;
      case 'B': // Iambic paddle mode B
        currentKeyMode = PADDLE_IAMBIC_B;
        Serial.println("MODE:PADDLE_IAMBIC_B");
        break;
    }
  }
}

/**
 * Handle straight key input with debounce
 */
void handleStraightKey() {
  // Read the state of the straight key (LOW when pressed, HIGH when released)
  bool currentKeyState = digitalRead(STRAIGHT_KEY_PIN);
  
  // Check if the state has changed
  if (currentKeyState != lastKeyState) {
    // Reset the debounce timer
    lastDebounceTime = millis();
  }
  
  // Only act on the state change if it's been stable for longer than the debounce delay
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    // If the key state has changed and is stable
    bool keyIsDown = currentKeyState == LOW;
    
    // Key press detected
    if (keyIsDown && !keyWasDown) {
      keyDownTime = millis();
      keyWasDown = true;
    }
    
    // Key release detected
    if (!keyIsDown && keyWasDown) {
      keyUpTime = millis();
      unsigned long pressDuration = keyUpTime - keyDownTime;
      
      // Determine if it's a dit or dah and send immediately
      if (pressDuration <= DIT_THRESHOLD) {
        Serial.print(".");
        lastSentElement = '.';
      } else if (pressDuration <= DAH_THRESHOLD) {
        Serial.print("-");
        lastSentElement = '-';
      }
      
      lastElementTime = keyUpTime;
      keyWasDown = false;
    }
  }
  
  // Save the current state for next comparison
  lastKeyState = currentKeyState;
}

/**
 * Handle single paddle input with debounce (one lever for dots or dashes)
 */
void handleSinglePaddle() {
  // Read the state of the paddle dot contact (LOW when pressed, HIGH when released)
  bool currentKeyState = digitalRead(PADDLE_DOT_PIN);
  
  // Check if the state has changed
  if (currentKeyState != lastKeyState) {
    // Reset the debounce timer
    lastDebounceTime = millis();
  }
  
  // Only act on the state change if it's been stable for longer than the debounce delay
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    // If the key state has changed and is stable
    bool dotIsDown = currentKeyState == LOW;
    
    // Key press detected
    if (dotIsDown && !keyWasDown) {
      keyDownTime = millis();
      keyWasDown = true;
    }
    
    // Key release detected
    if (!dotIsDown && keyWasDown) {
      keyUpTime = millis();
      unsigned long pressDuration = keyUpTime - keyDownTime;
      
      // Determine if it's a dit or dah and send immediately
      if (pressDuration <= DIT_THRESHOLD) {
        Serial.print(".");
        lastSentElement = '.';
      } else if (pressDuration <= DAH_THRESHOLD) {
        Serial.print("-");
        lastSentElement = '-';
      }
      
      lastElementTime = keyUpTime;
      keyWasDown = false;
    }
  }
  
  // Save the current state for next comparison
  lastKeyState = currentKeyState;
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
  
  // Only process if states are stable
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
    // Check if squeeze was released
    if (!dotPressed && !dashPressed && (dotMemory || dashMemory)) {
      squeezeReleased = true;
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
  
  // Only process if states are stable
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
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
      }
    }
    
    // If no paddles are pressed and no elements are in memory, reset
    if (!dotPressed && !dashPressed && !dotMemory && !dashMemory && currentIambicElement == '\0') {
      // End of keying
      keyWasDown = false;
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
