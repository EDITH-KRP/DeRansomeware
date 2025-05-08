# De-Ransom Standalone Mode

This is a completely standalone version of the De-Ransom application that doesn't require any external Python packages. It's perfect for demonstrations and testing when you can't install dependencies.

## Features

- **Zero Dependencies**: Uses only Python's standard library
- **Automatic Directory Monitoring**: Automatically detects and monitors common directories on your system
- **Complete Simulation**: Simulates file monitoring, blockchain interactions, and IPFS backups
- **Full UI Experience**: Provides the same user interface as the full version
- **Easy to Run**: Just one command to start

## How to Run

### Windows

Double-click the `run_standalone.bat` file or run:

```
python standalone.py
```

### Linux/Mac

Run:

```bash
chmod +x run_standalone.sh
./run_standalone.sh
```

Or directly:

```bash
python3 standalone.py
```

## How It Works

The standalone server:

1. Automatically detects common directories on your system to monitor
2. Serves the frontend files (HTML, CSS, JavaScript)
3. Provides simulated API endpoints that mimic the real backend
4. Generates random events based on real files in your system
5. Opens your default web browser to the application

## Monitored Directories

The application automatically monitors:

- Your home directory
- Documents, Desktop, Downloads, and Pictures folders
- Drive roots (on Windows)
- Common system directories (on Linux/Mac)

You can add additional directories through the UI if needed.

## Limitations

Since this is a simulation:

- No actual file monitoring occurs (files are not modified)
- No real blockchain transactions are made
- No files are backed up to IPFS
- All security events are simulated based on real files

## Next Steps

When you're ready to deploy the full version with real functionality:

1. Install the required dependencies (see PRODUCTION.md)
2. Configure your environment variables in the `.env` file
3. Deploy the smart contract to Ethereum Sepolia testnet
4. Run the full application with `python run.py`