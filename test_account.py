"""
Test script to check account structure.
"""

from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

def main():
    print("Testing account structure...")
    
    # Get provider URL from environment variables
    provider_url = os.getenv('WEB3_PROVIDER_URI')
    if not provider_url:
        alchemy_key = os.getenv('ALCHEMY_API_KEY')
        if alchemy_key:
            provider_url = f"https://eth-sepolia.g.alchemy.com/v2/{alchemy_key}"
        else:
            raise ValueError("ALCHEMY_API_KEY not found in environment variables")
    
    # Connect to Ethereum
    web3 = Web3(Web3.HTTPProvider(provider_url))
    
    # Set up account from private key
    private_key = os.getenv('ETHEREUM_PRIVATE_KEY')
    if not private_key:
        raise ValueError("ETHEREUM_PRIVATE_KEY not found in environment variables")
        
    account = web3.eth.account.from_key(private_key)
    
    # Print account structure
    print(f"Account address: {account.address}")
    print(f"Account key: {account.key}")
    print(f"Account type: {type(account)}")
    print(f"Account dir: {dir(account)}")
    
    # Try to sign a transaction
    tx = {
        'from': account.address,
        'to': account.address,
        'value': 0,
        'gas': 100000,
        'gasPrice': web3.eth.gas_price,
        'nonce': web3.eth.get_transaction_count(account.address),
        'chainId': web3.eth.chain_id,
        'data': '0x'
    }
    
    # Try different ways to sign
    try:
        print("\nTrying to sign with account.key...")
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=account.key)
        print(f"Signed transaction: {signed_tx}")
        print(f"Has rawTransaction: {'rawTransaction' in dir(signed_tx)}")
    except Exception as e:
        print(f"Error signing with account.key: {str(e)}")
    
    try:
        print("\nTrying to sign with private_key directly...")
        signed_tx = web3.eth.account.sign_transaction(tx, private_key=private_key)
        print(f"Signed transaction: {signed_tx}")
        print(f"Has rawTransaction: {'rawTransaction' in dir(signed_tx)}")
    except Exception as e:
        print(f"Error signing with private_key: {str(e)}")

if __name__ == "__main__":
    main()