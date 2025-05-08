"""
De-Ransom Blockchain Integration
-------------------------------
This module handles interaction with the Ethereum blockchain for logging
security events and retrieving event history.
"""

import os
import json
import time
from datetime import datetime

# Try to import Web3, but provide fallback if not available
try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    WEB3_AVAILABLE = True
except ImportError:
    print("Web3 library not available. Blockchain features will be simulated.")
    WEB3_AVAILABLE = False

# Try to load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not available. Using environment variables directly.")

class BlockchainLogger:
    """
    A class to handle blockchain interactions for the De-Ransom system.
    """
    
    def __init__(self, network='sepolia', contract_address=None, allow_fallback=True):
        """
        Initialize the blockchain logger.
        
        Args:
            network (str): Ethereum network to connect to ('sepolia', 'goerli', etc.)
            contract_address (str): Address of the deployed DeRansom contract
            allow_fallback (bool): Whether to allow fallback to simulation mode if blockchain connection fails
        """
        self.network = network
        self.contract_address = contract_address
        self.web3 = None
        self.contract = None
        self.account = None
        self.simulation_mode = False  # Start with real blockchain mode
        self.allow_fallback = allow_fallback
        
        # Try to connect to the blockchain
        if WEB3_AVAILABLE:
            try:
                self._setup_connection()
                print(f"Successfully connected to {self.network} blockchain")
            except Exception as e:
                print(f"Error connecting to blockchain: {str(e)}")
                if self.allow_fallback:
                    print("Falling back to simulation mode")
                    self.simulation_mode = True
                else:
                    raise
        else:
            if self.allow_fallback:
                print("Web3 library not available. Running in simulation mode")
                self.simulation_mode = True
            else:
                raise ImportError("Web3 library is required for blockchain integration")
    
    def _setup_connection(self):
        """Set up the connection to the Ethereum blockchain."""
        if not WEB3_AVAILABLE:
            return
            
        # Get provider URL from environment variables
        provider_url = os.getenv('WEB3_PROVIDER_URI')
        if not provider_url:
            if self.network == 'sepolia':
                alchemy_key = os.getenv('ALCHEMY_API_KEY')
                if alchemy_key:
                    provider_url = f"https://eth-sepolia.g.alchemy.com/v2/{alchemy_key}"
                else:
                    raise ValueError("ALCHEMY_API_KEY not found in environment variables")
            else:
                raise ValueError(f"Unsupported network: {self.network}")
        
        # Connect to Ethereum
        self.web3 = Web3(Web3.HTTPProvider(provider_url))
        
        # Apply middleware for PoA networks like Sepolia
        self.web3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Check connection
        if not self.web3.is_connected():
            print(f"Failed to connect to {self.network}")
            raise ConnectionError(f"Could not connect to {self.network} network")
        
        print(f"Connected to {self.network}. Current block: {self.web3.eth.block_number}")
        
        # Set up account from private key (for sending transactions)
        private_key = os.getenv('ETHEREUM_PRIVATE_KEY')
        if not private_key:
            raise ValueError("ETHEREUM_PRIVATE_KEY not found in environment variables")
            
        self.account = self.web3.eth.account.from_key(private_key)
        print(f"Account set up: {self.account.address}")
        
        # Load contract ABI and connect to the contract
        if not self.contract_address:
            raise ValueError("CONTRACT_ADDRESS not found in environment variables")
            
        try:
            self._load_contract()
        except Exception as e:
            print(f"Warning: Contract loading failed: {str(e)}")
            print("You can still use the blockchain for transactions, but contract functions will not be available")
            if not self.allow_fallback:
                raise
    
    def _load_contract(self):
        """Load the DeRansom smart contract."""
        if not WEB3_AVAILABLE:
            return
            
        # Load contract ABI from file
        abi_path = os.path.join(os.path.dirname(__file__), '..', 'contracts', 'DeRansom.json')
        
        if os.path.exists(abi_path):
            with open(abi_path, 'r') as f:
                contract_json = json.load(f)
                abi = contract_json['abi']
        else:
            # Fallback to hardcoded ABI if file not found
            abi = [
                {
                    "inputs": [],
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {
                            "indexed": True,
                            "internalType": "address",
                            "name": "reporter",
                            "type": "address"
                        },
                        {
                            "indexed": False,
                            "internalType": "string",
                            "name": "fileHash",
                            "type": "string"
                        },
                        {
                            "indexed": False,
                            "internalType": "string",
                            "name": "eventType",
                            "type": "string"
                        },
                        {
                            "indexed": False,
                            "internalType": "string",
                            "name": "ipfsHash",
                            "type": "string"
                        },
                        {
                            "indexed": False,
                            "internalType": "uint256",
                            "name": "timestamp",
                            "type": "uint256"
                        }
                    ],
                    "name": "SecurityEvent",
                    "type": "event"
                },
                {
                    "inputs": [
                        {
                            "internalType": "string",
                            "name": "_fileHash",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "_eventType",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "_ipfsHash",
                            "type": "string"
                        }
                    ],
                    "name": "logSecurityEvent",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getEventCount",
                    "outputs": [
                        {
                            "internalType": "uint256",
                            "name": "",
                            "type": "uint256"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        
        # Create contract instance
        self.contract = self.web3.eth.contract(
            address=self.contract_address,
            abi=abi
        )
        
        # Verify contract connection by calling a view function
        try:
            event_count = self.contract.functions.getEventCount().call()
            print(f"Contract loaded at {self.contract_address}. Current event count: {event_count}")
        except Exception as e:
            print(f"Contract verification failed: {str(e)}")
            print(f"This could mean the contract at {self.contract_address} is not deployed or is not the DeRansom contract")
            raise ValueError(f"Contract verification failed: {str(e)}")
    
    def log_event(self, file_path, event_type, ipfs_hash):
        """
        Log a security event to the blockchain.
        
        Args:
            file_path (str): Path to the affected file
            event_type (str): Type of security event
            ipfs_hash (str): IPFS hash of the backed-up file
            
        Returns:
            str: Transaction hash if successful, None otherwise
        """
        # If in simulation mode, generate a fake transaction hash
        if self.simulation_mode:
            import hashlib
            import random
            tx_hash = "0x" + hashlib.sha256(f"{file_path}{event_type}{ipfs_hash}{random.random()}".encode()).hexdigest()
            print(f"[SIMULATION] Event logged to blockchain. TX Hash: {tx_hash}")
            return tx_hash
            
        if not WEB3_AVAILABLE or not self.web3 or not self.account:
            raise RuntimeError("Blockchain connection not properly set up")
        
        try:
            # Calculate file hash (just the filename for privacy)
            file_hash = self.web3.keccak(text=os.path.basename(file_path)).hex()
            
            # If contract is not available, create a direct transaction to log the event
            if not self.contract:
                # Create a direct transaction to the blockchain
                # This is a fallback when the contract is not available
                data = self.web3.keccak(text=f"SecurityEvent({file_hash},{event_type},{ipfs_hash})").hex()
                
                tx = {
                    'from': self.account.address,
                    'to': self.account.address,  # Send to self as a fallback
                    'value': 0,
                    'gas': 100000,
                    'gasPrice': self.web3.eth.gas_price,
                    'nonce': self.web3.eth.get_transaction_count(self.account.address),
                    'chainId': self.web3.eth.chain_id,
                    'data': data
                }
                
                # Sign and send transaction
                signed_tx = self.web3.eth.account.sign_transaction(tx, private_key=self.account.key)
                tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
                
                # Wait for transaction receipt
                receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                print(f"Event logged to blockchain (direct transaction). TX Hash: {receipt.transactionHash.hex()}")
                print(f"View transaction on Etherscan: https://{self.network}.etherscan.io/tx/{receipt.transactionHash.hex()}")
                return receipt.transactionHash.hex()
            else:
                # Use the contract if available
                tx = self.contract.functions.logSecurityEvent(
                    file_hash,
                    event_type,
                    ipfs_hash
                ).build_transaction({
                    'from': self.account.address,
                    'nonce': self.web3.eth.get_transaction_count(self.account.address),
                    'gas': 200000,
                    'gasPrice': self.web3.eth.gas_price,
                    'chainId': self.web3.eth.chain_id
                })
                
                # Sign and send transaction
                signed_tx = self.web3.eth.account.sign_transaction(tx, private_key=self.account.key)
                tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
                
                # Wait for transaction receipt
                receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                
                print(f"Event logged to blockchain via contract. TX Hash: {receipt.transactionHash.hex()}")
                print(f"View transaction on Etherscan: https://{self.network}.etherscan.io/tx/{receipt.transactionHash.hex()}")
                return receipt.transactionHash.hex()
        
        except Exception as e:
            print(f"Error logging event to blockchain: {str(e)}")
            if self.allow_fallback:
                print("Falling back to simulation mode for this transaction")
                import hashlib
                import random
                tx_hash = "0x" + hashlib.sha256(f"{file_path}{event_type}{ipfs_hash}{random.random()}".encode()).hexdigest()
                print(f"[SIMULATION] Event logged to blockchain. TX Hash: {tx_hash}")
                return tx_hash
            else:
                raise  # Re-raise the exception if fallback is not allowed
    
    def get_events(self, from_block=0):
        """
        Get all security events from the contract.
        
        Args:
            from_block (int): Block number to start fetching events from
            
        Returns:
            list: List of security events
        """
        # If in simulation mode, return empty list
        if self.simulation_mode:
            print("[SIMULATION] No events available in simulation mode")
            return []
            
        if not WEB3_AVAILABLE or not self.web3:
            raise RuntimeError("Blockchain connection not properly set up")
        
        # If contract is not available, return empty list
        if not self.contract:
            print("Contract not available, cannot fetch events")
            return []
        
        try:
            # Get events
            events = self.contract.events.SecurityEvent.get_logs(
                fromBlock=from_block
            )
            
            # Format events
            formatted_events = []
            for event in events:
                formatted_events.append({
                    'reporter': event.args.reporter,
                    'fileHash': event.args.fileHash,
                    'eventType': event.args.eventType,
                    'ipfsHash': event.args.ipfsHash,
                    'timestamp': event.args.timestamp,
                    'blockNumber': event.blockNumber,
                    'transactionHash': event.transactionHash.hex(),
                    'etherscanLink': f"https://{self.network}.etherscan.io/tx/{event.transactionHash.hex()}"
                })
            
            return formatted_events
        
        except Exception as e:
            print(f"Error getting events from blockchain: {str(e)}")
            if self.allow_fallback:
                return []
            else:
                raise  # Re-raise the exception if fallback is not allowed
    
    def get_status(self):
        """
        Get the current blockchain connection status.
        
        Returns:
            dict: Status information
        """
        # If in simulation mode, return simulated status
        if self.simulation_mode:
            import random
            return {
                'connected': True,
                'network': self.network,
                'blockNumber': 12345678 + random.randint(1, 100),
                'contractConnected': True,
                'accountConnected': True,
                'simulation': True,
                'etherscanUrl': f"https://{self.network}.etherscan.io",
                'eventCount': random.randint(0, 10),
                'message': "Running in simulation mode - using real blockchain network for reference only"
            }
        
        status = {
            'connected': False,
            'network': self.network,
            'blockNumber': None,
            'contractConnected': False,
            'accountConnected': False,
            'simulation': False,
            'etherscanUrl': f"https://{self.network}.etherscan.io"
        }
        
        if not WEB3_AVAILABLE or not self.web3:
            return status
        
        try:
            if self.web3.is_connected():
                status['connected'] = True
                status['blockNumber'] = self.web3.eth.block_number
                status['gasPrice'] = self.web3.eth.gas_price
                
                if self.contract:
                    status['contractConnected'] = True
                    status['contractAddress'] = self.contract_address
                    try:
                        # Try to call a view function to verify contract connection
                        event_count = self.contract.functions.getEventCount().call()
                        status['eventCount'] = event_count
                    except Exception as e:
                        status['contractError'] = str(e)
                else:
                    status['contractError'] = "Contract not loaded"
                
                if self.account:
                    status['accountConnected'] = True
                    status['accountAddress'] = self.account.address
                    status['balance'] = self.web3.eth.get_balance(self.account.address)
                    
                # Add a message about the real blockchain connection
                status['message'] = f"Connected to {self.network} blockchain - transactions will be recorded on-chain"
            
            return status
        except Exception as e:
            print(f"Error getting blockchain status: {str(e)}")
            status['error'] = str(e)
            return status