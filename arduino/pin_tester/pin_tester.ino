/**
 * pin_tester.ino
 * A diagnostic tool for Arduino boards to detect which pins 
 * are receiving signals from a morse paddle
 * 
 * This helps determine the correct GPIO pins to use in the morse_decoder.ino sketch
 * Supports: Xiao ESP32-C6, Xiao SAMD21, Arduino Micro, and Arduino Nano
 */

// Board type enum
enum BoardType {
  ESP32_C6,
  SAMD21,
  ARDUINO_MICRO,
  ARDUINO_NANO
};

// Current board type
BoardType currentBoard = ESP32_C6;

// Number of pins to test for each board type
#define NUM_PINS_ESP32C6 11
#define NUM_PINS_SAMD21 11
#define NUM_PINS_MICRO 11
#define NUM_PINS_NANO 11

// Define the GPIO pins to test for ESP32-C6
// Pins are mapped: D0-D10 = GPIO 0, 1, 2, 21, 22, 23, 16, 18, 20, 19, 17
int pinsToTestESP32C6[NUM_PINS_ESP32C6] = {0, 1, 2, 21, 22, 23, 16, 18, 20, 19, 17};

// Define the GPIO pins to test for SAMD21
// For SAMD21, pins D0-D10 map directly to digital pins 0-10
int pinsToTestSAMD21[NUM_PINS_SAMD21] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// Define the GPIO pins to test for Arduino Micro
// For Arduino Micro, pins D0-D10 map directly to digital pins 0-10
int pinsToTestMicro[NUM_PINS_MICRO] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// Define the GPIO pins to test for Arduino Nano
// For Arduino Nano, pins D0-D10 map directly to digital pins 0-10
int pinsToTestNano[NUM_PINS_NANO] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

// Active pins array that will be populated based on selected board
int* pinsToTest;
int numPins;

// Arrays to store previous pin states
int previousPinStatesESP32C6[NUM_PINS_ESP32C6];
int previousPinStatesSAMD21[NUM_PINS_SAMD21];
int previousPinStatesMicro[NUM_PINS_MICRO];
int previousPinStatesNano[NUM_PINS_NANO];
int* previousPinStates;

// Time tracking for debounce
unsigned long lastDebounceTimeESP32C6[NUM_PINS_ESP32C6] = {0};
unsigned long lastDebounceTimeSAMD21[NUM_PINS_SAMD21] = {0};
unsigned long lastDebounceTimeMicro[NUM_PINS_MICRO] = {0};
unsigned long lastDebounceTimeNano[NUM_PINS_NANO] = {0};
unsigned long* lastDebounceTime;
const unsigned long debounceDelay = 50; // 50ms debounce time

/**
 * Setup pins based on the current board type
 */
void setupPins() {
  for (int i = 0; i < numPins; i++) {
    pinMode(pinsToTest[i], INPUT_PULLUP);
    previousPinStates[i] = HIGH; // Initialize with pulled-up state
  }
}

/**
 * Print the active pins being monitored
 */
void printActivePins() {
  if (currentBoard == ESP32_C6) {
    Serial.println("\n*** ACTIVE MODE: ESP32-C6 ***");
  } else if (currentBoard == SAMD21) {
    Serial.println("\n*** ACTIVE MODE: SAMD21 ***");
  } else if (currentBoard == ARDUINO_MICRO) {
    Serial.println("\n*** ACTIVE MODE: ARDUINO MICRO ***");
  } else if (currentBoard == ARDUINO_NANO) {
    Serial.println("\n*** ACTIVE MODE: ARDUINO NANO ***");
  }
  
  Serial.println("Monitoring the following pins for signals:");
  for (int i = 0; i < numPins; i++) {
    if (currentBoard == ESP32_C6) {
      Serial.print("GPIO ");
    } else {
      Serial.print("PIN ");
    }
    Serial.println(pinsToTest[i]);
  }
}

/**
 * Switch to the specified board type
 */
void switchToBoard(BoardType board) {
  currentBoard = board;
  
  if (board == ESP32_C6) {
    pinsToTest = pinsToTestESP32C6;
    previousPinStates = previousPinStatesESP32C6;
    lastDebounceTime = lastDebounceTimeESP32C6;
    numPins = NUM_PINS_ESP32C6;
  } else if (board == SAMD21) {
    pinsToTest = pinsToTestSAMD21;
    previousPinStates = previousPinStatesSAMD21;
    lastDebounceTime = lastDebounceTimeSAMD21;
    numPins = NUM_PINS_SAMD21;
  } else if (board == ARDUINO_MICRO) {
    pinsToTest = pinsToTestMicro;
    previousPinStates = previousPinStatesMicro;
    lastDebounceTime = lastDebounceTimeMicro;
    numPins = NUM_PINS_MICRO;
  } else if (board == ARDUINO_NANO) {
    pinsToTest = pinsToTestNano;
    previousPinStates = previousPinStatesNano;
    lastDebounceTime = lastDebounceTimeNano;
    numPins = NUM_PINS_NANO;
  }
}

void setup() {
  // Default to ESP32-C6 board
  switchToBoard(ESP32_C6);
  
  // Initialize serial communication
  Serial.begin(9600);
  
  // Wait for serial connection to be established
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  // Setup pins as inputs with pull-up resistors based on current board
  setupPins();
  
  // Print header
  Serial.println("\n\n=== Paddle Pin Tester for Arduino Boards ===");
  Serial.println("Press your paddle and watch which pins detect the signal");
  Serial.println("Connect your paddle to GND and try different pins until you find the right ones");
  Serial.println("When a pin goes LOW, it means it's detecting a connection to GND\n");
  
  // Print pin mapping information for all board types
  Serial.println("=== ESP32-C6 Pin Mapping ===");
  Serial.println("GPIO Pin | Label | Function");
  Serial.println("-------------------------");
  Serial.println("GPIO 0   | D0    | BOOT (might not work reliably)");
  Serial.println("GPIO 1   | D1    | TX");
  Serial.println("GPIO 2   | D2    | ");
  Serial.println("GPIO 21  | D3    | ");
  Serial.println("GPIO 22  | D4    | ");
  Serial.println("GPIO 23  | D5    | ");
  Serial.println("GPIO 16  | D6    | ");
  Serial.println("GPIO 18  | D7    | ");
  Serial.println("GPIO 20  | D8    | ");
  Serial.println("GPIO 19  | D9    | ");
  Serial.println("GPIO 17  | D10   | ");
  
  Serial.println("\n=== SAMD21 Pin Mapping ===");
  Serial.println("GPIO Pin | Label | Function");
  Serial.println("-------------------------");
  Serial.println("PIN 0    | D0    | ");
  Serial.println("PIN 1    | D1    | ");
  Serial.println("PIN 2    | D2    | ");
  Serial.println("PIN 3    | D3    | ");
  Serial.println("PIN 4    | D4    | ");
  Serial.println("PIN 5    | D5    | ");
  Serial.println("PIN 6    | D6    | ");
  Serial.println("PIN 7    | D7    | ");
  Serial.println("PIN 8    | D8    | ");
  Serial.println("PIN 9    | D9    | ");
  Serial.println("PIN 10   | D10   | ");
  
  Serial.println("\n=== Arduino Micro Pin Mapping ===");
  Serial.println("GPIO Pin | Label | Function");
  Serial.println("-------------------------");
  Serial.println("PIN 0    | D0    | RX");
  Serial.println("PIN 1    | D1    | TX");
  Serial.println("PIN 2    | D2    | ");
  Serial.println("PIN 3    | D3    | ");
  Serial.println("PIN 4    | D4    | ");
  Serial.println("PIN 5    | D5    | ");
  Serial.println("PIN 6    | D6    | ");
  Serial.println("PIN 7    | D7    | ");
  Serial.println("PIN 8    | D8    | ");
  Serial.println("PIN 9    | D9    | ");
  Serial.println("PIN 10   | D10   | ");
  
  Serial.println("\n=== Arduino Nano Pin Mapping ===");
  Serial.println("GPIO Pin | Label | Function");
  Serial.println("-------------------------");
  Serial.println("PIN 0    | D0    | RX");
  Serial.println("PIN 1    | D1    | TX");
  Serial.println("PIN 2    | D2    | ");
  Serial.println("PIN 3    | D3    | ");
  Serial.println("PIN 4    | D4    | ");
  Serial.println("PIN 5    | D5    | ");
  Serial.println("PIN 6    | D6    | ");
  Serial.println("PIN 7    | D7    | ");
  Serial.println("PIN 8    | D8    | ");
  Serial.println("PIN 9    | D9    | ");
  Serial.println("PIN 10   | D10   | ");
  Serial.println("-------------------------\n");
  
  // Print current board and active pins
  printActivePins();

  // Print commands
  Serial.println("\nCommands:");
  Serial.println("'e' - Switch to ESP32-C6 board mode");
  Serial.println("'s' - Switch to SAMD21 board mode");
  Serial.println("'m' - Switch to Arduino Micro board mode");
  Serial.println("'n' - Switch to Arduino Nano board mode");
  
  Serial.println("\nResults will appear below when signals are detected:");
  Serial.println("=================================================\n");
}

void loop() {
  // Check for board selection commands
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    
    // Process command
    switch (cmd) {
      case 'e': // Switch to ESP32-C6
        if (currentBoard != ESP32_C6) {
          switchToBoard(ESP32_C6);
          setupPins();
          printActivePins();
        }
        break;
      case 's': // Switch to SAMD21
        if (currentBoard != SAMD21) {
          switchToBoard(SAMD21);
          setupPins();
          printActivePins();
        }
        break;
      case 'm': // Switch to Arduino Micro
        if (currentBoard != ARDUINO_MICRO) {
          switchToBoard(ARDUINO_MICRO);
          setupPins();
          printActivePins();
        }
        break;
      case 'n': // Switch to Arduino Nano
        if (currentBoard != ARDUINO_NANO) {
          switchToBoard(ARDUINO_NANO);
          setupPins();
          printActivePins();
        }
        break;
    }
  }

  // Check each pin for changes
  for (int i = 0; i < numPins; i++) {
    // Read the current state
    int currentState = digitalRead(pinsToTest[i]);
    
    // Check if the state has changed
    if (currentState != previousPinStates[i]) {
      // Reset the debounce timer
      lastDebounceTime[i] = millis();
    }
    
    // If the state has been stable for longer than the debounce delay
    if ((millis() - lastDebounceTime[i]) > debounceDelay) {
      // If the debounced state is different from the previous state
      if (currentState != previousPinStates[i]) {
        // Update the previous state
        previousPinStates[i] = currentState;
        
        // If the pin went LOW, report it (paddle pressed)
        if (currentState == LOW) {
          if (currentBoard == ESP32_C6) {
            Serial.print("Signal detected on GPIO ");
          } else {
            Serial.print("Signal detected on PIN ");
          }
          Serial.print(pinsToTest[i]);
          Serial.println(" (paddle pressed)");
        } 
        // If the pin went HIGH, report it (paddle released)
        else {
          if (currentBoard == ESP32_C6) {
            Serial.print("Signal ended on GPIO ");
          } else {
            Serial.print("Signal ended on PIN ");
          }
          Serial.print(pinsToTest[i]);
          Serial.println(" (paddle released)");
        }
      }
    }
  }
  
  // Add a small delay to reduce CPU usage
  delay(5);
}