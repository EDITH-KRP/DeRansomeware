import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Print Flask settings
print(f"FLASK_HOST: {os.getenv('FLASK_HOST')}")
print(f"FLASK_PORT: {os.getenv('FLASK_PORT')}")
print(f"DEBUG: {os.getenv('DEBUG')}")

# Print Blockchain settings
print(f"BLOCKCHAIN_NETWORK: {os.getenv('BLOCKCHAIN_NETWORK')}")
print(f"CONTRACT_ADDRESS: {os.getenv('CONTRACT_ADDRESS')}")
print(f"WEB3_PROVIDER_URI: {os.getenv('WEB3_PROVIDER_URI')}")
print(f"INFURA_API_KEY: {os.getenv('INFURA_API_KEY')}")
print(f"ETHEREUM_PRIVATE_KEY: {os.getenv('ETHEREUM_PRIVATE_KEY')}")

# Print Filebase settings
print(f"FILEBASE_ACCESS_KEY: {os.getenv('FILEBASE_ACCESS_KEY')}")
print(f"FILEBASE_SECRET_KEY: {os.getenv('FILEBASE_SECRET_KEY')}")
print(f"FILEBASE_BUCKET: {os.getenv('FILEBASE_BUCKET')}")