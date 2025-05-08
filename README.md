# De-Ransom: A Decentralized Ransomware Detection & Response System

De-Ransom is a real-time ransomware detection and response system that leverages blockchain technology and decentralized storage to protect files from encryption attacks.

## Features

- **Real-time File Monitoring**: Detects suspicious file operations that may indicate ransomware activity
- **Decentralized Backups**: Automatically backs up critical files to IPFS via Filebase
- **Blockchain Verification**: Logs security events immutably on the Ethereum blockchain
- **User-friendly Dashboard**: Monitor file activity and alerts in real-time

## Tech Stack

- **Frontend**: HTML5, CSS3, Bootstrap, Vanilla JavaScript
- **Backend**: Python (Flask)
- **Detection Engine**: Python (watchdog, hashlib, os, time)
- **Blockchain**: Solidity Smart Contract (Deployed on Sepolia)
- **Blockchain Interaction**: Web3.py
- **Decentralized Storage**: Filebase (IPFS-compatible S3 API)

## Quick Start

### Demo Mode (No Dependencies Required)

For a quick demonstration without installing dependencies:

1. Run `demo_mode.bat` (Windows) or `python frontend/static_server.py` (Unix/Linux/Mac)
2. Open your browser to the displayed URL
3. Navigate to the Dashboard to see simulated ransomware detection

### Full Installation

#### Prerequisites

- Python 3.8+
- Node.js and npm (for smart contract deployment)
- Ethereum wallet with Sepolia ETH
- Filebase account
- Alchemy API key

#### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/de-ransom.git
   cd de-ransom
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Alchemy API key, Ethereum private key, and Filebase credentials

4. Deploy the smart contract:
   ```
   cd contracts
   npm install
   npx hardhat run deploy.js --network sepolia
   ```

5. Update the contract address in your `.env` file

### Running the Application

#### Using the Batch File (Windows)

1. Simply double-click the `run_deransomeware.bat` file
2. The application will start and automatically open in your default browser
3. To stop the application, close the command prompt window that opens

#### Manual Start

1. Start the backend server:
   ```
   python run.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## How It Works

1. **Detection**: The system monitors file system events in real-time, looking for patterns that match known ransomware behavior.

2. **Backup**: When suspicious activity is detected, affected files are immediately backed up to IPFS via Filebase.

3. **Blockchain Logging**: High-risk events are logged to the Ethereum blockchain, creating an immutable record.

4. **Alert**: The user is notified through the dashboard with details about the event, risk level, and backup location.

### Blockchain Simulation Mode

If you don't have blockchain credentials or don't want to use real blockchain transactions, the application will automatically fall back to simulation mode. In this mode:

- Blockchain events are simulated with random transaction hashes
- No actual blockchain transactions are sent
- All other functionality works normally

To force the application to use real blockchain transactions, set `allow_fallback=False` in the BlockchainLogger initialization.

## Security Considerations

- The system only monitors directories specified by the user
- Private keys should be stored securely and never committed to version control
- For production use, implement proper authentication and authorization

## License

MIT

## Acknowledgements

- This project was created during a 24-hour hackathon
- Thanks to the Ethereum, IPFS, and Filebase communities for their excellent documentation