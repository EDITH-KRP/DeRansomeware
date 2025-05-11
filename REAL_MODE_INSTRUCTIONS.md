# De-Ransom Real Mode Instructions

This document provides instructions on how to run De-Ransom in real mode with actual ransomware detection and blockchain integration.

## Prerequisites

Before running in real mode, make sure you have:

1. Python 3.7 or higher installed
2. All required Python packages installed (`pip install -r requirements.txt`)
3. A valid Ethereum wallet with some test ETH (for Sepolia testnet)
4. Infura or Alchemy API key for blockchain connectivity
5. Filebase account for IPFS storage

## Configuration

The application uses environment variables for configuration. These are stored in the `.env` file in the root directory.

Make sure the following variables are properly set in your `.env` file:

```
# Blockchain settings
BLOCKCHAIN_NETWORK=sepolia
CONTRACT_ADDRESS=0x54535516409169aAe0cD9587550c2682c5715605
INFURA_API_KEY=your_infura_api_key
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key
WEB3_PROVIDER_URI=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_api_key

# Filebase (IPFS) settings
FILEBASE_ACCESS_KEY=your_filebase_access_key
FILEBASE_SECRET_KEY=your_filebase_secret_key
FILEBASE_BUCKET=your_filebase_bucket
```

## Running in Real Mode

To run the application in real mode:

1. Double-click the `run_real_mode.bat` file, or
2. Open a command prompt and run:
   ```
   python run.py
   ```

3. Open a web browser and navigate to:
   ```
   http://localhost:5000
   ```

4. Log in with the default credentials:
   - Username: `admin`
   - Password: `admin123`

5. Navigate to the Dashboard and click "Start Monitoring"

6. Enter the path to the directory you want to monitor for ransomware activity

## How It Works

In real mode, the application:

1. Monitors the specified directory for file system changes
2. Analyzes file operations for suspicious patterns
3. Backs up suspicious files to IPFS via Filebase
4. Logs security events to the Ethereum blockchain
5. Provides real-time alerts for potential ransomware activity

## Troubleshooting

If you encounter issues:

1. Check the console output for error messages
2. Verify your `.env` configuration
3. Make sure your Ethereum wallet has enough test ETH
4. Check that your Filebase credentials are correct
5. Ensure the monitored directory is accessible

## Security Considerations

- This application is for educational and demonstration purposes
- Always use test networks (like Sepolia) for blockchain operations
- Do not use real private keys or sensitive data
- The ransomware detection is based on heuristics and may have false positives/negatives