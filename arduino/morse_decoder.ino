/**
 * morse_decoder.ino
 * Arduino firmware for decoding Morse code from a physical key
 * and sending the decoded characters to the browser via Serial
 */

// Pin definitions
const int STRAIGHT_KEY_PIN = 2;  // Connect straight key to this pin (use internal pull-up)
const int PADDLE_DOT_PIN = 2;    // Connect paddle dot contact to this pin
const int PADDLE_DASH_PIN = 3;   // Connect paddle dash contact to this pin

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
const unsigned long CHAR_THRESHOLD = 600;     // Maximum time between characters
const unsigned long WORD_THRESHOLD = 1400;    // Maximum time between words

// Morse code mapping
const char* MORSE_TABLE[] = {
  ".-",      // A
  "-...",    // B
  "-.-.",    // C
  "-..",     // D
  ".",       // E
  "..-.",    // F
  "--.",     // G
  "....",    // H
  "..",      // I
  ".---",    // J
  "-.-",     // K
  ".-..",    // L
  "--",      // M
  "-.",      // N
  "---",     // O
  ".--.",    // P
  "--.-",    // Q
  ".-.",     // R
  "...",     // S
  "-",       // T
  "..-",     // U
  "...-",    // V
  ".--",     // W
  "-..-",    // X
  "-.--",    // Y
  "--..",    // Z
  "-----",   // 0
  ".----",   // 1
  "..---",   // 2
  "...--",   // 3
  "....-",   // 4
  ".....",   // 5
  "-....",   // 6
  "--...",   // 7
  "---..",   // 8
  "----."    // 9
};

// Regional characters
const char* REGIONAL_MORSE[] = {
  // Nordic characters
  ".-.-",    // Æ/Ä - Nordic AE
  "---.",    // Ø/Ö - Nordic OE
  ".--.-",   // Å - Nordic AA
  
  // Icelandic/Faroese characters
  "..-.",    // Ð - Eth (same as F)
  ".--.",    // Þ - Thorn
  
  // German characters
  "..--",    // Ü - German UE
  "...--..", // ß - German SS
  
  // French characters
  "..-..",   // É - French E acute
  ".-..-",   // È - French E grave
  "-.-..",   // Ç - French C cedilla
  ".--.-",   // À - French A grave (same as Å)
  
  // Spanish characters
  "--.--",   // Ñ - Spanish N tilde
  ".--.-",   // Á - Spanish A acute (same as Å)
  "..",      // Í - Spanish I acute (same as I)
  "---",     // Ó - Spanish O acute (same as O)
  
  // Other European characters
  "-.-...",  // Italian Ç
  "...-...", // Polish Ś
  "--..-.",  // Polish Ź
  "--..-"    // Polish Ż/Czech Ž
};

// Regional character mapping (index in REGIONAL_MORSE array to ASCII representation)
const char REGIONAL_CHARS[] = {
  'Æ', 'Ø', 'Å', 'Ð', 'Þ', 'Ü', 'ß', 'É', 'È', 'Ç', 'À', 'Ñ', 'Á', 'Í', 'Ó', 'Ć', 'Ś', 'Ź', 'Ž'
};

// Prosigns
const char* PROSIGNS[] = {
  ".-.-.",   // AR (End of message)
  "...-.-",  // SK (End of contact)
  "-...-",   // BT (Break/new paragraph)
  "-.--."    // KN (Go ahead, specific station)
};

// Punctuation and special characters
const char* SPECIAL_MORSE[] = {
  ".-.-.-",  // .
  "--..--",  // ,
  "..--..",  // ?
  "-.-.--",  // !
  "-..-.",   // /
  "-.--.",   // (
  "-.--.-",  // )
  ".-...",   // &
  "---...",  // :
  "-.-.-.",  // ;
  "-...-",   // =
  ".-.-.",   // +
  "-....-",  // -
  "..--.-",  // _
  ".-..-.",  // "
  "...-..-", // $
  ".--.-."   // @
};

// State variables
unsigned long keyDownTime = 0;
unsigned long keyUpTime = 0;
unsigned long lastElementTime = 0;
String currentMorseSequence = "";
bool keyWasDown = false;

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
  
  // Check for character completion (if key has been up for longer than CHAR_THRESHOLD)
  if (currentMorseSequence.length() > 0 && 
      (millis() - lastElementTime > CHAR_THRESHOLD)) {
    
    // Try to decode the Morse sequence
    char decodedChar = decodeMorse(currentMorseSequence);
    
    if (decodedChar != '\0') {
      Serial.print(decodedChar);
    }
    
    // Reset for next character
    currentMorseSequence = "";
    
    // Check for word space
    if (millis() - lastElementTime > WORD_THRESHOLD) {
      Serial.print(" ");  // Add space between words
    }
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
 * Handle straight key input
 */
void handleStraightKey() {
  // Read the state of the straight key (LOW when pressed, HIGH when released)
  bool keyIsDown = digitalRead(STRAIGHT_KEY_PIN) == LOW;
  
  // Key press detected
  if (keyIsDown && !keyWasDown) {
    keyDownTime = millis();
    keyWasDown = true;
  }
  
  // Key release detected
  if (!keyIsDown && keyWasDown) {
    keyUpTime = millis();
    unsigned long pressDuration = keyUpTime - keyDownTime;
    
    // Determine if it's a dit or dah
    if (pressDuration <= DIT_THRESHOLD) {
      currentMorseSequence += ".";
      Serial.print(".");  // Debug output
    } else if (pressDuration <= DAH_THRESHOLD) {
      currentMorseSequence += "-";
      Serial.print("-");  // Debug output
    }
    
    lastElementTime = keyUpTime;
    keyWasDown = false;
  }
}

/**
 * Handle single paddle input (one lever for dots or dashes)
 */
void handleSinglePaddle() {
  // Read the state of the paddle dot contact (LOW when pressed, HIGH when released)
  bool dotIsDown = digitalRead(PADDLE_DOT_PIN) == LOW;
  
  // Key press detected
  if (dotIsDown && !keyWasDown) {
    keyDownTime = millis();
    keyWasDown = true;
  }
  
  // Key release detected
  if (!dotIsDown && keyWasDown) {
    keyUpTime = millis();
    unsigned long pressDuration = keyUpTime - keyDownTime;
    
    // Determine if it's a dit or dah
    if (pressDuration <= DIT_THRESHOLD) {
      currentMorseSequence += ".";
      Serial.print(".");  // Debug output
    } else if (pressDuration <= DAH_THRESHOLD) {
      currentMorseSequence += "-";
      Serial.print("-");  // Debug output
    }
    
    lastElementTime = keyUpTime;
    keyWasDown = false;
  }
}

/**
 * Handle iambic paddle input in Mode A (Curtis A - true implementation)
 * In Mode A, if you release the paddles after the final element is sent but before
 * the next element begins, no additional elements are sent.
 */
void handleIambicPaddleModeA() {
  // Read the state of both paddle contacts
  bool dotPressed = digitalRead(PADDLE_DOT_PIN) == LOW;
  bool dashPressed = digitalRead(PADDLE_DASH_PIN) == LOW;
  
  // Check if squeeze was released
  if (!dotPressed && !dashPressed && (dotMemory || dashMemory)) {
    squeezeReleased = true;
  }
  
  // If we're not currently sending an element
  if (currentIambicElement == '\0') {
    // Check if we have an element in memory to send
    if (dotMemory) {
      // Send a dot
      currentMorseSequence += ".";
      Serial.print(".");  // Debug output
      currentIambicElement = '.';
      iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
      elementComplete = false;
      dotMemory = false;  // Clear dot memory
    } else if (dashMemory) {
      // Send a dash
      currentMorseSequence += "-";
      Serial.print("-");  // Debug output
      currentIambicElement = '-';
      iambicTimer = millis() + DAH_THRESHOLD;  // Set timer for dash duration
      elementComplete = false;
      dashMemory = false;  // Clear dash memory
    } else if (dotPressed) {
      // Start sending a dot
      currentMorseSequence += ".";
      Serial.print(".");  // Debug output
      currentIambicElement = '.';
      iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
      elementComplete = false;
    } else if (dashPressed) {
      // Start sending a dash
      currentMorseSequence += "-";
      Serial.print("-");  // Debug output
      currentIambicElement = '-';
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
        if (currentMorseSequence.endsWith(".")) {
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

/**
 * Handle iambic paddle input in Mode B
 * In Mode B, if you release the paddles, the keyer completes the element in progress
 * and then sends one more alternating element.
 */
void handleIambicPaddleModeB() {
  // Read the state of both paddle contacts
  bool dotPressed = digitalRead(PADDLE_DOT_PIN) == LOW;
  bool dashPressed = digitalRead(PADDLE_DASH_PIN) == LOW;
  
  // Store paddle states in memory for proper iambic behavior
  if (dotPressed) dotMemory = true;
  if (dashPressed) dashMemory = true;
  
  // If we're not currently sending an element
  if (currentIambicElement == '\0') {
    // Check if we have an element in memory to send
    if (dotMemory) {
      // Send a dot
      currentMorseSequence += ".";
      Serial.print(".");  // Debug output
      currentIambicElement = '.';
      iambicTimer = millis() + DIT_THRESHOLD;  // Set timer for dot duration
      dotMemory = false;  // Clear dot memory
    } else if (dashMemory) {
      // Send a dash
      currentMorseSequence += "-";
      Serial.print("-");  // Debug output
      currentIambicElement = '-';
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
      if (currentMorseSequence.endsWith(".")) {
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
      if (currentMorseSequence.endsWith(".")) {
        dashMemory = true;  // Queue one more dash
      } else if (currentMorseSequence.endsWith("-")) {
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

/**
 * Decode a Morse code sequence to a character
 * @param morseSequence The Morse code sequence to decode
 * @return The decoded character or '\0' if not recognized
 */
char decodeMorse(String morseSequence) {
  // Check standard letters and numbers (A-Z, 0-9)
  for (int i = 0; i < 36; i++) {
    if (morseSequence.equals(MORSE_TABLE[i])) {
      if (i < 26) {
        return 'A' + i;  // A-Z
      } else {
        return '0' + (i - 26);  // 0-9
      }
    }
  }
  
  // Check regional characters
  for (int i = 0; i < sizeof(REGIONAL_CHARS) / sizeof(REGIONAL_CHARS[0]); i++) {
    if (i < sizeof(REGIONAL_MORSE) / sizeof(REGIONAL_MORSE[0]) &&
        morseSequence.equals(REGIONAL_MORSE[i])) {
      return REGIONAL_CHARS[i];
    }
  }
  
  // Check prosigns (return as special codes)
  if (morseSequence.equals(PROSIGNS[0])) return '<';  // AR
  if (morseSequence.equals(PROSIGNS[1])) return '>';  // SK
  if (morseSequence.equals(PROSIGNS[2])) return '=';  // BT
  if (morseSequence.equals(PROSIGNS[3])) return '~';  // KN
  
  // Check punctuation and special characters
  const char specialChars[] = {'.', ',', '?', '!', '/', '(', ')', '&', ':', ';', '=', '+', '-', '_', '"', '$', '@'};
  for (int i = 0; i < 17; i++) {
    if (morseSequence.equals(SPECIAL_MORSE[i])) {
      return specialChars[i];
    }
  }
  
  // Not recognized
  return '\0';
}

/**
 * Adaptive timing calibration (optional enhancement)
 * This function could be used to adapt to the user's keying speed
 */
void calibrateTiming() {
  // This would measure the user's average dit and dah durations
  // and adjust the thresholds accordingly
  // Not implemented in this basic version
}