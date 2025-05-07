# De-Ransom Demo Mode

This is a simplified demo version of the De-Ransom application that doesn't require any external dependencies. It demonstrates the user interface and simulates the ransomware detection functionality.

## How to Run the Demo

1. Simply double-click the `demo_mode.bat` file in the root directory.
2. This will start a simple HTTP server and open your browser to the De-Ransom application.
3. Navigate to the Dashboard page to see the simulated ransomware detection in action.

## Demo Features

- **Simulated File Monitoring**: The demo will simulate file activity and ransomware detection
- **Interactive Dashboard**: You can start and stop the monitoring process
- **Real-time Alerts**: High-risk events will trigger visual alerts
- **No Dependencies Required**: The demo runs with just Python's standard library

## Note

This is a demonstration version only. In a real deployment, the application would:

1. Actually monitor your file system for suspicious activity
2. Upload backups to IPFS via Filebase
3. Log security events to the Ethereum blockchain

To run the full version with all features, you would need to install the required dependencies listed in `requirements.txt` and set up the necessary API keys in the `.env` file.

## Hackathon Project

De-Ransom was created as a 24-hour hackathon project to demonstrate how blockchain technology and decentralized storage can be used to protect against ransomware attacks.