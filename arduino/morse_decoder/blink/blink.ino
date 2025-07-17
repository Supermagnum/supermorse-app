/*
  XIAO ESP32C6 Blink Example
  
  This example blinks the onboard yellow LED connected to GPIO15
  on the XIAO ESP32C6 board.
  
  The LED will turn on for 1 second, then turn off for 1 second, repeatedly.
*/

// Define the LED pin
const int LED_PIN = 15;  // Yellow LED on XIAO ESP32C6

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(115200);
  
  // Initialize the LED pin as an output
  pinMode(LED_PIN, OUTPUT);
  
  // Print a startup message
  Serial.println("XIAO ESP32C6 Blink Example Starting...");
  Serial.println("Yellow LED on GPIO15 should be blinking");
}

void loop() {
  // Turn the LED on
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  
  // Wait for 1 second
  delay(1000);
  
  // Turn the LED off
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  
  // Wait for 1 second
  delay(1000);
}
