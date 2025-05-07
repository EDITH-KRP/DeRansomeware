"""
De-Ransom API Module
------------------
This module defines the API endpoints for the De-Ransom application.
"""

from flask import Blueprint, request, jsonify
import os
import json
from datetime import datetime

# Import our custom modules
from backend.detector import FileMonitor
from backend.blockchain import BlockchainLogger
from backend.filebase_uploader import FilebaseUploader
from backend.config import ACTIVITY_LOG_FILE, CONTRACT_ADDRESS, BLOCKCHAIN_NETWORK

# Initialize Blueprint
api = Blueprint('api', __name__)

# Initialize components
file_monitor = None
blockchain_logger = BlockchainLogger(
    network=BLOCKCHAIN_NETWORK,
    contract_address=CONTRACT_ADDRESS
)
filebase_uploader = FilebaseUploader()

# Ensure log directory exists
os.makedirs(os.path.dirname(ACTIVITY_LOG_FILE), exist_ok=True)

# Load existing logs or create empty log file
if os.path.exists(ACTIVITY_LOG_FILE):
    try:
        with open(ACTIVITY_LOG_FILE, 'r') as f:
            activity_log = json.load(f)
    except json.JSONDecodeError:
        activity_log = []
else:
    activity_log = []
    with open(ACTIVITY_LOG_FILE, 'w') as f:
        json.dump(activity_log, f)


@api.route('/monitor', methods=['POST'])
def start_monitoring():
    """Start monitoring a directory for ransomware activity."""
    global file_monitor
    
    data = request.json
    directory = data.get('path')
    
    if not directory or not os.path.isdir(directory):
        return jsonify({'error': 'Invalid directory path'}), 400
    
    # Stop existing monitor if running
    if file_monitor and file_monitor.is_running:
        file_monitor.stop()
    
    # Create and start new file monitor
    file_monitor = FileMonitor(directory, on_suspicious_activity)
    file_monitor.start()
    
    return jsonify({
        'status': 'success',
        'message': f'Started monitoring {directory}',
        'timestamp': datetime.now().isoformat()
    })


@api.route('/monitor/stop', methods=['POST'])
def stop_monitoring():
    """Stop the file monitoring process."""
    global file_monitor
    
    if file_monitor and file_monitor.is_running:
        file_monitor.stop()
        return jsonify({
            'status': 'success',
            'message': 'Monitoring stopped',
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'No active monitoring to stop',
            'timestamp': datetime.now().isoformat()
        }), 400


@api.route('/logs', methods=['GET'])
def get_logs():
    """Retrieve the activity logs."""
    return jsonify(activity_log)


@api.route('/blockchain/status', methods=['GET'])
def blockchain_status():
    """Get the current blockchain connection status."""
    status = blockchain_logger.get_status()
    return jsonify(status)


@api.route('/backup/status', methods=['GET'])
def backup_status():
    """Get the status of IPFS backups."""
    # Count backups by risk level
    backup_stats = {
        'total': 0,
        'high_risk': 0,
        'medium_risk': 0,
        'low_risk': 0
    }
    
    for event in activity_log:
        if 'ipfs_hash' in event:
            backup_stats['total'] += 1
            risk_level = event.get('risk_level', 'low')
            if risk_level == 'high':
                backup_stats['high_risk'] += 1
            elif risk_level == 'medium':
                backup_stats['medium_risk'] += 1
            else:
                backup_stats['low_risk'] += 1
    
    return jsonify(backup_stats)


@api.route('/backup/restore', methods=['POST'])
def restore_backup():
    """Restore a file from IPFS backup."""
    data = request.json
    ipfs_hash = data.get('ipfs_hash')
    output_path = data.get('output_path')
    
    if not ipfs_hash or not output_path:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Ensure the output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Attempt to download the file
    success = filebase_uploader.download_file(ipfs_hash, output_path)
    
    if success:
        return jsonify({
            'status': 'success',
            'message': f'File restored to {output_path}',
            'timestamp': datetime.now().isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Failed to restore file',
            'timestamp': datetime.now().isoformat()
        }), 500


# Event handler for suspicious activity
def on_suspicious_activity(event):
    """
    Handle suspicious file activity detected by the monitor.
    
    Args:
        event (dict): Event data containing file path, event type, and risk level
    """
    print(f"Suspicious activity detected: {event}")
    
    # Add timestamp
    event['timestamp'] = datetime.now().isoformat()
    
    # For high-risk events, backup to IPFS and log to blockchain
    if event['risk_level'] in ['high', 'medium']:
        try:
            # Upload to IPFS via Filebase if file exists
            if os.path.exists(event['file_path']) and os.path.isfile(event['file_path']):
                ipfs_hash = filebase_uploader.upload_file(event['file_path'])
                event['ipfs_hash'] = ipfs_hash
                
                # Log high-risk events to blockchain
                if event['risk_level'] == 'high':
                    tx_hash = blockchain_logger.log_event(
                        file_path=event['file_path'],
                        event_type=event['event_type'],
                        ipfs_hash=ipfs_hash
                    )
                    event['blockchain_tx'] = tx_hash
        except Exception as e:
            print(f"Error processing suspicious activity: {str(e)}")
            event['error'] = str(e)
    
    # Add to activity log
    activity_log.append(event)
    
    # Save to log file (in a real app, we'd use a proper database)
    with open(ACTIVITY_LOG_FILE, 'w') as f:
        json.dump(activity_log, f, indent=2)