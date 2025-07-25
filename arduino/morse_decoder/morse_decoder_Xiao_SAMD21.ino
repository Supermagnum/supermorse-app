/**
 * morse_decoder_Xiao_SAMD21.ino
 * Arduino firmware for detecting Morse code signals from a physical key
 * and sending dots and dashes to the browser via Serial
 *
 * Set up for Xiao SAMD21 board
 */

// Pin definitions for Xiao SAMD21
// On Xiao SAMD21, pins are labeled D0, D1, D2, etc.
// For this board, we're using physical pins D2, D3 and GND.
// The Yellow LED on the Xiao PCB is connected to D13.
// This LED is wired in an active-HIGH configuration (HIGH turns it ON, LOW turns it OFF).
// On any input on the two input pins, blink this led when the input is active.

// Map D2 and D3 pins to the correct GPIO numbers for Xiao SAMD21
// For SAMD21, D2 is digital pin 2
// For SAMD21, D3 is digital pin 3
// If this doesn't work, you may need to check the specific GPIO mapping for your board
const int PADDLE_DOT_PIN = 2;    // Connect paddle dot contact to D2 pin (digital pin 2), left paddle
const int PADDLE_DASH_PIN = 3;   // Connect paddle dash contact to D3 pin (digital pin 3), right paddle
const int YELLOW_LED_PIN = 13;   // D13 for the yellow LED on Xiao SAMD21

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
const unsigned long DEBOUNCE_DELAY = 200;      // Debounce time in milliseconds to prevent contact bounce
const unsigned long SIGNAL_REPEAT_DELAY = 300; // Minimum time between signals to prevent multiple signals from a single press

// State variables
unsigned long keyDownTime = 0;
unsigned long keyUpTime = 0;
unsigned long lastElementTime = 0;
unsigned long lastSignalTime = 0;     // Tracks when the last signal was sent
bool keyWasDown = false;
char lastSentElement = '\0';  // Tracks the last element sent (either '.' or '-')
unsigned long lastDebounceTime = 0;   // The last time the key state was toggled
bool lastKeyState = HIGH;             // Previous reading from the input pin

// LED diagnostic variables
bool ledIsOn = false;                   // Tracks if the diagnostic LED is currently on
bool inputActive = false;               // Flag to track if any input is currently active
unsigned long ledBlinkTime = 0;         // Next time to toggle the LED
const unsigned long BLINK_INTERVAL = 500 ;  // Toggle LED every 500ms (fast blink)

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
  pinMode(PADDLE_DOT_PIN, INPUT_PULLUP);
  pinMode(PADDLE_DASH_PIN, INPUT_PULLUP);
  
  // Set up LED pin as output for diagnostic feedback
  pinMode(YELLOW_LED_PIN, OUTPUT);
  digitalWrite(YELLOW_LED_PIN, LOW);  // Ensure LED starts off (LED is active-HIGH for SAMD21)
  
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
  
  // Handle LED blinking when input is active
  if (inputActive) {
    // Check if it's time to toggle the LED
    if (millis() >= ledBlinkTime) {
      // Toggle the LED - note that for SAMD21 the LED is active-HIGH
      ledIsOn = !ledIsOn;
      digitalWrite(YELLOW_LED_PIN, ledIsOn ? HIGH : LOW);
      // Set next toggle time
      ledBlinkTime = millis() + BLINK_INTERVAL;
    }
  } else if (ledIsOn) {
    // If no input is active but LED is on, turn it off
    digitalWrite(YELLOW_LED_PIN, LOW);  // LOW turns the LED off (active-HIGH)
    ledIsOn = false;
  }
}

/**
 * Set the input active flag for LED blinking
 * Called when input is detected on either input pin
 */
void setInputActive() {
  inputActive = true;
}

/**
 * Check for commands from the serial port
 */
void checkSerialCommands() {
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    
    // Process command
    switch (cmd) {
      case 'S': // For backward compatibility, map to Iambic A
      case 'P': // For backward compatibility, map to Iambic A
        currentKeyMode = PADDLE_IAMBIC_A;
        Serial.println("MODE:PADDLE_IAMBIC_A");
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
  
  // Only process if states are stable and enough time has passed since the last signal
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY && 
      (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
    // Check if squeeze was released
    if (!dotPressed && !dashPressed && (dotMemory || dashMemory)) {
      squeezeReleased = true;
    }
    
    // If either paddle is pressed now but wasn't before, set input active
    if ((dotPressed || dashPressed) && !(keyWasDown)) {
      setInputActive();
      keyWasDown = true;
    } else if (!dotPressed && !dashPressed) {
      keyWasDown = false;
      inputActive = false;
    }
    
    // If we're not currently sending an element
    if (currentIambicElement == '\0') {
      // Check if we have an element in memory to send
      if (dotMemory) {
        // Send a dot
        Serial.print(".");
        currentIambicElement = '.';
        lastSentElement = '.';  // Record the element we just sent
        lastSignalTime = millis(); // Record when this signal was sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        elementComplete = false;
        dotMemory = false;  // Clear dot memory
      } else if (dashMemory) {
        // Send a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        lastSignalTime = millis(); // Record when this signal was sent
        iambicTimer = millis() + DAH_THRESHOLD;  // Set timer for dash duration
        elementComplete = false;
        dashMemory = false;  // Clear dash memory
      } else if (dotPressed) {
        // Start sending a dot
        Serial.print(".");
        currentIambicElement = '.';
        lastSentElement = '.';  // Record the element we just sent
        lastSignalTime = millis(); // Record when this signal was sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        elementComplete = false;
      } else if (dashPressed) {
        // Start sending a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        lastSignalTime = millis(); // Record when this signal was sent
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
  
  // Only process if states are stable and enough time has passed since the last signal
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY && 
      (millis() - lastSignalTime) > SIGNAL_REPEAT_DELAY) {
    bool dotPressed = dotKeyState == LOW;
    bool dashPressed = dashKeyState == LOW;
    
    // If either paddle is pressed now but wasn't before, set input active
    if ((dotPressed || dashPressed) && !(keyWasDown)) {
      setInputActive();
      keyWasDown = true;
    } else if (!dotPressed && !dashPressed) {
      keyWasDown = false;
      inputActive = false;
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
        lastSignalTime = millis(); // Record when this signal was sent
        iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
        dotMemory = false;  // Clear dot memory
      } else if (dashMemory) {
        // Send a dash
        Serial.print("-");
        currentIambicElement = '-';
        lastSentElement = '-';  // Record the element we just sent
        lastSignalTime = millis(); // Record when this signal was sent
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