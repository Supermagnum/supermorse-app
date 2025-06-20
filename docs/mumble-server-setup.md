# Supermorse Modified Mumble Server Deployment Guide for Ubuntu

This guide provides instructions for deploying the customized Mumble server (Murmur) on Ubuntu for use with the Supermorse application. This is not a standard Mumble server, but a modified version specifically designed for Supermorse with HF band simulation and propagation features.

## What is the Supermorse Mumble Server?

The Supermorse Mumble server is a customized version of Murmur (the Mumble server component) that includes special features for amateur radio simulation:

- HF band channels corresponding to amateur radio frequencies (160m, 80m, 40m, etc.)
- Propagation simulation based on Maidenhead grid locators
- Channel links to simulate propagation overlap between bands
- Custom metadata fields for grid locators and preferred bands

## Prerequisites

- Ubuntu 20.04 LTS or newer
- Sudo privileges
- Basic knowledge of Linux command line
- Open ports in your firewall (default: 64738 TCP and UDP)
- Git and build tools for compiling the modified server

## Installation

### 1. Update Package Lists and Install Dependencies

First, update your package lists and install the required dependencies:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install build-essential libqt5core5a libqt5network5 libqt5sql5 libqt5sql5-sqlite \
                 libqt5xml5 libssl-dev libprotobuf-dev protobuf-compiler \
                 libboost-dev libcap-dev libxi-dev libsndfile1-dev libspeechd-dev \
                 libzeroc-ice-dev libavahi-compat-libdnssd-dev libpoco-dev git -y
```

### 2. Clone and Build the Modified Mumble Server

Instead of using the standard Mumble server package, we need to clone and build the modified version for Supermorse:

```bash
# Create a directory for the source code
mkdir -p ~/murmur-src
cd ~/murmur-src

# Clone the modified Mumble repository
git clone https://github.com/yourusername/supermorse-mumble.git .

# Configure the build
qmake -recursive CONFIG+=no-client CONFIG+=no-ice

# Build the server component only
make

# Create a symbolic link to the binary
sudo ln -s ~/murmur-src/release/murmurd /usr/local/bin/murmur
```

> Note: Replace `https://github.com/yourusername/supermorse-mumble.git` with the actual repository URL for the modified Mumble server.

### 3. Configure the Server

Create a directory for the Supermorse Mumble server configuration:

```bash
sudo mkdir -p /etc/supermorse-mumble
```

Create the configuration file using the Supermorse-specific settings:

```bash
sudo nano /etc/supermorse-mumble/mumble-server.ini
```

Copy the following configuration, which includes the HF band channels and other Supermorse-specific settings:

```ini
; Murmur configuration file for SuperMorse
; This configuration sets up a Mumble server with channels for HF bands

; Database configuration
database=/etc/supermorse-mumble/supermorse.sqlite

; Welcome message
welcometext="Welcome to SuperMorse Mumble Server. This server is for Morse code practice and HF communication simulation."

; Server password (empty for no password)
serverpassword=

; Maximum number of users
users=100

; Default channel
defaultchannel=0

; Server port
port=64738

; Host to bind to (empty for all interfaces)
host=

; Password to join server as SuperUser
;superuser_password=

; Bandwidth limit in bits per second
bandwidth=72000

; Timeout in seconds for user inactivity
timeout=30

; Allow HTML in messages
allowhtml=true

; Send channel tree with welcome message
sendtree=true

; Log file location
logfile=/var/log/supermorse-mumble/murmur.log

; PID file location
pidfile=/var/run/supermorse-mumble/murmur.pid

; Auto-register users
autoregister=true

; SSL Certificate settings
sslCert=/etc/supermorse-mumble/cert.pem
sslKey=/etc/supermorse-mumble/key.pem

; Ice configuration (for external control)
;ice="tcp -h 127.0.0.1 -p 6502"
;icesecretread=
;icesecretwrite=

; Channel configuration
[channels]
; Root channel
0=Root

; HF Band channels
1=160m
2=80m
3=60m
4=40m
5=30m
6=20m
7=17m
8=15m
9=10m
10=6m

; Channel descriptions
[channel_description]
0=SuperMorse HF Communication Server
1=160 meter band (1.8-2.0 MHz)
2=80 meter band (3.5-4.0 MHz)
3=60 meter band (5.3-5.4 MHz)
4=40 meter band (7.0-7.3 MHz)
5=30 meter band (10.1-10.15 MHz)
6=20 meter band (14.0-14.35 MHz)
7=17 meter band (18.068-18.168 MHz)
8=15 meter band (21.0-21.45 MHz)
9=10 meter band (28.0-29.7 MHz)
10=6 meter band (50-54 MHz)

; Channel links (for propagation simulation)
[channel_links]
; Link channels that might have propagation overlap
1=2
2=1,3
3=2,4
4=3,5
5=4,6
6=5,7
7=6,8
8=7,9
9=8,10
10=9

; Custom user configuration
[users]
; Allow users to set custom metadata
allowcustommetadata=true

; Define custom metadata fields
[metadata_fields]
; Maidenhead grid locator
maidenheadgrid=text

; Preferred HF band
preferredhfband=select:160,80,60,40,30,20,17,15,10,6

; Access control configuration
[acl]
; Allow all users to enter any channel
0=@all:+enter,+traverse,+speak,+whisper,+textmessage

; Register name configuration
[register]
; Name format (allow alphanumeric and some special characters)
nameregex=[A-Za-z0-9_-]{3,20}

; Require email for registration
requireemail=true
```

Save the file and exit the editor.

Create directories for logs and PID file:

```bash
sudo mkdir -p /var/log/supermorse-mumble
sudo mkdir -p /var/run/supermorse-mumble
```

### 4. Generate SSL Certificates

Generate self-signed SSL certificates for the server:

```bash
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /etc/supermorse-mumble/key.pem \
  -out /etc/supermorse-mumble/cert.pem \
  -subj "/CN=supermorse-mumble-server"
```

Set proper permissions:

```bash
sudo chmod 600 /etc/supermorse-mumble/key.pem
```

### 5. Create a System Service

Create a systemd service file for the Supermorse Mumble server:

```bash
sudo nano /etc/systemd/system/supermorse-mumble.service
```

Add the following content:

```ini
[Unit]
Description=Supermorse Mumble Server
After=network.target

[Service]
Type=simple
User=nobody
ExecStart=/usr/local/bin/murmur -ini /etc/supermorse-mumble/mumble-server.ini
Restart=on-failure
LimitNOFILE=65535
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
```

Save the file and exit the editor.

### 6. Configure User Authentication

#### SuperUser Account

Create a SuperUser account to administer the server:

```bash
/usr/local/bin/murmur -ini /etc/supermorse-mumble/mumble-server.ini -supw your_superuser_password
```

#### Integration with Supermorse Authentication

Create a directory for the authentication script:

```bash
sudo mkdir -p /usr/local/bin/supermorse
```

Create the authentication script:

```bash
sudo nano /usr/local/bin/supermorse/mumble-auth.py
```

Add the following Python script:

```python
#!/usr/bin/env python3

import sys
import json
import requests

def authenticate(username, password):
    try:
        # Supermorse API endpoint for authentication
        response = requests.post('http://localhost:3030/api/auth/mumble-verify', 
                                json={'username': username, 'password': password})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('authenticated'):
                # Return user_id, username, groups
                return (data.get('user_id', 1), 
                        username, 
                        data.get('groups', []))
        return (-1, None, None)
    except Exception as e:
        print(f"Authentication error: {e}", file=sys.stderr)
        return (-2, None, None)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: mumble-auth.py <username> <password>")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    user_id, name, groups = authenticate(username, password)
    
    if user_id > 0:
        print(f"{user_id}:{name}:{','.join(groups)}")
        sys.exit(0)
    else:
        sys.exit(user_id)
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/supermorse/mumble-auth.py
```

Update the Mumble server configuration to use this script:

```bash
sudo nano /etc/supermorse-mumble/mumble-server.ini
```

Uncomment and modify these lines in the configuration:

```ini
; Ice configuration (for external control)
ice="tcp -h 127.0.0.1 -p 6502"
icesecretwrite=your_ice_secret
externalauth=/usr/local/bin/supermorse/mumble-auth.py
```

### 7. Start and Enable the Supermorse Mumble Server

Reload systemd to recognize the new service:

```bash
sudo systemctl daemon-reload
```

Start the server:

```bash
sudo systemctl start supermorse-mumble
```

Enable it to start on boot:

```bash
sudo systemctl enable supermorse-mumble
```

Check the status:

```bash
sudo systemctl status supermorse-mumble
```

### 8. Firewall Configuration

If you're using UFW (Ubuntu's default firewall), allow the Mumble port:

```bash
sudo ufw allow 64738/tcp
sudo ufw allow 64738/udp
```

### 9. Server Monitoring and Management

#### Check Server Logs

```bash
sudo tail -f /var/log/supermorse-mumble/murmur.log
```

#### Restart the Server

```bash
sudo systemctl restart supermorse-mumble
```

#### Stop the Server

```bash
sudo systemctl stop supermorse-mumble
```

## Integration with Supermorse Application

### 1. Update Supermorse Configuration

The Supermorse application needs to know where to find your Mumble server. Edit the configuration file:

```bash
nano /path/to/supermorse-app/config/mumble-server.ini
```

Update it with your server details:

```ini
[server]
host=your_server_ip_or_hostname
port=64738
username=supermorse_bot
password=your_bot_password
channel=Root
```

### 2. Configure Mumble Server Path in Supermorse

The Supermorse application can start and stop the Mumble server. Update the server path in the mumble.js route file:

```bash
nano /path/to/supermorse-app/routes/mumble.js
```

Find the line that defines `MUMBLE_SERVER_PATH` and update it to point to your Mumble server binary:

```javascript
const MUMBLE_SERVER_PATH = '/usr/local/bin/murmur';
```

### 3. Test the Integration

Start the Supermorse application and test the Mumble integration:

1. Log in to the Supermorse application
2. Navigate to the Mumble section
3. Click "Start Server" to start the Mumble server
4. Set your Maidenhead grid locator
5. Connect to the voice chat
6. Join an HF band channel

If everything is working correctly, you should be able to connect to the Mumble server and join channels.

## HF Propagation Simulation

The Supermorse Mumble server includes a simplified HF propagation simulation based on Maidenhead grid locators. This allows users to:

1. Set their own grid locator
2. Get recommendations for which HF band to use based on distance
3. Join channels corresponding to different HF bands
4. Experience simulated propagation between bands

The propagation model is based on distance calculations:
- Short distance (<500 km): 80m band
- Medium distance (500-1500 km): 40m band
- Medium-long distance (1500-3000 km): 20m band
- Long distance (>3000 km): 15m band

This is a simplified model and doesn't account for time of day, solar conditions, or other factors that affect real HF propagation.

## Security Considerations

1. **Use Strong Passwords**: Set strong passwords for both the server and SuperUser account.

2. **Use SSL Certificates**: For production, consider using proper SSL certificates from a trusted authority.

3. **Restrict Access**: Consider using a firewall to restrict access to your server.

4. **Regular Updates**: Keep your server updated with the latest security patches.

5. **Backup Configuration**: Regularly backup your server configuration and database:
   ```bash
   sudo cp /etc/supermorse-mumble/mumble-server.ini /etc/supermorse-mumble/mumble-server.ini.bak
   sudo cp /etc/supermorse-mumble/supermorse.sqlite /etc/supermorse-mumble/supermorse.sqlite.bak
   ```

## Troubleshooting

### Server Won't Start

Check the logs for errors:

```bash
sudo journalctl -u supermorse-mumble
```

Common issues include:
- Port already in use
- Invalid configuration file
- Missing SSL certificates
- Permission problems

### Connection Issues

1. Verify the server is running:
   ```bash
   sudo systemctl status supermorse-mumble
   ```

2. Check firewall settings:
   ```bash
   sudo ufw status
   ```

3. Verify the port is open:
   ```bash
   sudo netstat -tuln | grep 64738
   ```

4. Check if the server is listening on the correct interface:
   ```bash
   sudo lsof -i :64738
   ```

### Authentication Problems

1. Check the authentication script logs:
   ```bash
   sudo tail -f /var/log/supermorse-mumble/murmur.log | grep auth
   ```

2. Test the authentication script manually:
   ```bash
   /usr/local/bin/supermorse/mumble-auth.py test_user test_password
   ```

3. Verify the Supermorse API is running and accessible:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"username":"test_user","password":"test_password"}' \
     http://localhost:3030/api/auth/mumble-verify
   ```

### HF Simulation Issues

If the HF band simulation isn't working correctly:

1. Verify that your Maidenhead grid locator is set correctly
2. Check the browser console for errors in the propagation calculations
3. Verify that the channel links in the configuration file are set up correctly

## Additional Resources

- [Official Mumble Documentation](https://wiki.mumble.info/wiki/Main_Page)
- [Mumble Server Admin Guide](https://wiki.mumble.info/wiki/Murmur.ini)
- [Mumble Security Best Practices](https://wiki.mumble.info/wiki/Security)
- [Maidenhead Grid Locator System](https://en.wikipedia.org/wiki/Maidenhead_Locator_System)
- [HF Propagation Basics](https://www.arrl.org/files/file/Technology/tis/info/pdf/9211034.pdf)