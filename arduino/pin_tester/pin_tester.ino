/**
 * pin_tester.ino
 * A diagnostic tool for the Xiao ESP32-C6 to detect which pins 
 * are receiving signals from a morse paddle
 * 
 * This helps determine the correct GPIO pins to use in the morse_decoder.ino sketch
 */

// Number of pins to test
#define NUM_PINS 10

// Define the GPIO pins to test
// These are potential GPIO pins on the Xiao ESP32-C6 that might be connected to your paddle
// We'll test GPIO 0-9 to cover most possibilities
int pinsToTest[NUM_PINS] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};

// Array to store previous pin states
int previousPinStates[NUM_PINS];

// Time tracking for debounce
unsigned long lastDebounceTime[NUM_PINS] = {0};
const unsigned long debounceDelay = 50; // 50ms debounce time

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Wait for serial connection to be established
  while (!Serial) {
    ; // Wait for serial port to connect
  }
  
  // Setup pins as inputs with pull-up resistors
  for (int i = 0; i < NUM_PINS; i++) {
    pinMode(pinsToTest[i], INPUT_PULLUP);
    previousPinStates[i] = HIGH; // Initialize with pulled-up state
  }
  
  // Print header
  Serial.println("\n\n=== Paddle Pin Tester for Xiao ESP32-C6 ===");
  Serial.println("Press your paddle and watch which pins detect the signal");
  Serial.println("Connect your paddle to GND and try different pins until you find the right ones");
  Serial.println("When a pin goes LOW, it means it's detecting a connection to GND\n");
  
  // Print pin mapping information
  Serial.println("GPIO Pin | Label | Function");
  Serial.println("-------------------------");
  Serial.println("GPIO 0   | D0    | BOOT (might not work reliably)");
  Serial.println("GPIO 1   | D1    | TX");
  Serial.println("GPIO 2   | D2    | ");
  Serial.println("GPIO 3   | D3    | ");
  Serial.println("GPIO 4   | D4    | ");
  Serial.println("GPIO 5   | D5    | ");
  Serial.println("GPIO 6   | D6    | ");
  Serial.println("GPIO 7   | D7    | ");
  Serial.println("GPIO 8   | D8    | ");
  Serial.println("GPIO 9   | D9    | ");
  Serial.println("-------------------------\n");
  
  // Print active pins
  Serial.println("Monitoring the following pins for signals:");
  for (int i = 0; i < NUM_PINS; i++) {
    Serial.print("GPIO ");
    Serial.println(pinsToTest[i]);
  }
  
  Serial.println("\nResults will appear below when signals are detected:");
  Serial.println("=================================================\n");
}

void loop() {
  // Check each pin for changes
  for (int i = 0; i < NUM_PINS; i++) {
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
          Serial.print("Signal detected on GPIO ");
          Serial.print(pinsToTest[i]);
          Serial.println(" (paddle pressed)");
        } 
        // If the pin went HIGH, report it (paddle released)
        else {
          Serial.print("Signal ended on GPIO ");
          Serial.print(pinsToTest[i]);
          Serial.println(" (paddle released)");
        }
      }
    }
  }
  
  // Add a small delay to reduce CPU usage
  delay(5);
}