# DeRansomeware Background Service

This document explains how to set up and use the DeRansomeware background service for continuous protection against ransomware attacks.

## Overview

The background service runs DeRansomeware in the background, monitoring your files for suspicious activity even when you're not actively using the application. It starts automatically when your computer boots up and runs silently in the background.

## Installation

### Prerequisites

- Windows operating system
- Python 3.8 or higher
- Administrator privileges

### Installation Steps

1. **Run the Background Service Manager**:
   - Double-click on `background_service.bat` in the DeRansomeware directory
   - Alternatively, select option 6 from the main menu in `run_deransomeware.bat`

2. **Install the Service**:
   - From the Background Service Manager menu, select option 1 (Install service)
   - The service will be installed and configured to start automatically when Windows boots

3. **Configure Monitored Directories**:
   - From the Background Service Manager menu, select option 6 (Configure monitored directories)
   - Add the directories you want to monitor, one per line
   - You can monitor specific directories or the entire system drive

4. **Start the Service**:
   - From the Background Service Manager menu, select option 2 (Start service)
   - The service will start running in the background

## Usage

Once installed and started, the service runs silently in the background. You don't need to do anything else to keep it running.

### Checking Status

To check if the service is running:
- From the Background Service Manager menu, select option 5 (Check service status)

### Stopping the Service

If you need to stop the service temporarily:
- From the Background Service Manager menu, select option 3 (Stop service)

### Removing the Service

If you want to completely remove the service:
- From the Background Service Manager menu, select option 4 (Remove service)

## Logs

The service logs all activity to a log file located at:
```
[DeRansomeware Directory]\logs\deransomeware_service.log
```

You can check this log file to see what the service has detected and any actions it has taken.

## Troubleshooting

### Service Won't Start

If the service won't start:
1. Check that you have administrator privileges
2. Make sure Python is installed and in your PATH
3. Check the log file for error messages
4. Try reinstalling the service

### High CPU or Memory Usage

If the service is using too much CPU or memory:
1. Reduce the number of directories being monitored
2. Avoid monitoring the entire system drive if possible
3. Focus on monitoring only important directories with sensitive files

### False Positives

If the service is detecting too many false positives:
1. Update to the latest version of DeRansomeware
2. Configure the monitored directories to exclude directories with frequent legitimate file changes

## Security Considerations

- The service runs with SYSTEM privileges, which is necessary to monitor files across the system
- It only monitors file activity and does not modify files unless a ransomware attack is detected
- All detected events are logged locally and optionally to the blockchain for immutable record-keeping