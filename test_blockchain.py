"""
Test script to verify blockchain integration.
"""

from backend.blockchain import BlockchainLogger
from backend.config import CONTRACT_ADDRESS, BLOCKCHAIN_NETWORK

def main():
    print("Testing blockchain integration...")
    
    # Initialize blockchain logger
    logger = BlockchainLogger(
        network=BLOCKCHAIN_NETWORK,
        contract_address=CONTRACT_ADDRESS,
        allow_fallback=True
    )
    
    # Get blockchain status
    status = logger.get_status()
    print("\nBlockchain Status:")
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    # Test logging an event
    if not status['simulation']:
        print("\nTesting blockchain transaction...")
        try:
            tx_hash = logger.log_event(
                file_path="test_file.txt",
                event_type="test_event",
                ipfs_hash="QmTest123456789"
            )
            print(f"Transaction successful! TX Hash: {tx_hash}")
            if 'etherscanUrl' in status:
                print(f"View on Etherscan: {status['etherscanUrl']}/tx/{tx_hash}")
        except Exception as e:
            print(f"Transaction failed: {str(e)}")
    else:
        print("\nRunning in simulation mode, skipping real transaction test.")
        tx_hash = logger.log_event(
            file_path="test_file.txt",
            event_type="test_event",
            ipfs_hash="QmTest123456789"
        )
        print(f"Simulated transaction. TX Hash: {tx_hash}")

if __name__ == "__main__":
    main()