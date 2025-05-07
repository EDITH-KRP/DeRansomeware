"""
De-Ransom Filebase Integration
-----------------------------
This module handles file uploads to Filebase (IPFS) for decentralized storage
of potentially vulnerable files before they can be encrypted by ransomware.
"""

import os
import hashlib
import time

# Try to import boto3, but provide fallback if not available
try:
    import boto3
    BOTO3_AVAILABLE = True
except ImportError:
    print("boto3 library not available. Filebase features will be simulated.")
    BOTO3_AVAILABLE = False

# Try to load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not available. Using environment variables directly.")

class FilebaseUploader:
    """
    A class to handle file uploads to Filebase's IPFS storage.
    """
    
    def __init__(self):
        """Initialize the Filebase uploader with credentials from environment variables."""
        self.access_key = os.getenv('FILEBASE_ACCESS_KEY')
        self.secret_key = os.getenv('FILEBASE_SECRET_KEY')
        self.bucket_name = os.getenv('FILEBASE_BUCKET', 'deransom-backups')
        self.endpoint_url = 'https://s3.filebase.com'
        self.client = None
        self.simulation_mode = not BOTO3_AVAILABLE
        
        # Try to set up the S3 client
        if BOTO3_AVAILABLE:
            self._setup_client()
        else:
            print("Running in Filebase simulation mode")
    
    def _setup_client(self):
        """Set up the S3 client for Filebase."""
        if not BOTO3_AVAILABLE:
            return
            
        try:
            if not self.access_key or not self.secret_key:
                print("Filebase credentials not found in environment variables")
                self.simulation_mode = True
                return
            
            self.client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key
            )
            
            # Check if bucket exists, create if it doesn't
            self._ensure_bucket_exists()
            
            print(f"Filebase client initialized for bucket: {self.bucket_name}")
        
        except Exception as e:
            print(f"Error setting up Filebase client: {str(e)}")
            self.client = None
            self.simulation_mode = True
    
    def _ensure_bucket_exists(self):
        """Check if the bucket exists and create it if it doesn't."""
        if not BOTO3_AVAILABLE or self.simulation_mode:
            return
            
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except:
            # Bucket doesn't exist, create it
            self.client.create_bucket(Bucket=self.bucket_name)
            print(f"Created new bucket: {self.bucket_name}")
    
    def upload_file(self, file_path):
        """
        Upload a file to Filebase (IPFS).
        
        Args:
            file_path (str): Path to the file to upload
            
        Returns:
            str: IPFS hash (CID) of the uploaded file, or None if upload failed
        """
        if self.simulation_mode:
            # Simulate IPFS upload
            file_hash = self._calculate_file_hash(file_path)
            ipfs_cid = f"Qm{file_hash[:38]}"
            print(f"[SIMULATION] File uploaded to IPFS. CID: {ipfs_cid}")
            return ipfs_cid
            
        if not BOTO3_AVAILABLE or not self.client:
            print("Filebase client not initialized")
            return None
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            print(f"File not found: {file_path}")
            return None
        
        try:
            # Generate a unique object key based on file hash and name
            file_hash = self._calculate_file_hash(file_path)
            file_name = os.path.basename(file_path)
            object_key = f"{file_hash[:10]}_{file_name}"
            
            # Upload the file
            with open(file_path, 'rb') as file_data:
                self.client.upload_fileobj(
                    file_data,
                    self.bucket_name,
                    object_key,
                    ExtraArgs={'ContentType': 'application/octet-stream'}
                )
            
            # Get the IPFS hash (CID)
            response = self.client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            # Filebase stores the IPFS CID in the ETag header
            ipfs_cid = response.get('ETag', '').strip('"')
            
            print(f"File uploaded to IPFS. CID: {ipfs_cid}")
            return ipfs_cid
        
        except Exception as e:
            print(f"Error uploading file to Filebase: {str(e)}")
            return None
    
    def download_file(self, ipfs_cid, output_path):
        """
        Download a file from Filebase (IPFS) using its CID.
        
        Args:
            ipfs_cid (str): IPFS CID of the file to download
            output_path (str): Path where the downloaded file should be saved
            
        Returns:
            bool: True if download was successful, False otherwise
        """
        if self.simulation_mode:
            # Simulate file download
            try:
                with open(output_path, 'wb') as f:
                    f.write(b'Simulated IPFS file content')
                print(f"[SIMULATION] File downloaded from IPFS to {output_path}")
                return True
            except Exception as e:
                print(f"[SIMULATION] Error writing file: {str(e)}")
                return False
                
        if not BOTO3_AVAILABLE or not self.client:
            print("Filebase client not initialized")
            return False
        
        try:
            # In Filebase, you can access files directly by their CID
            self.client.download_file(
                self.bucket_name,
                ipfs_cid,
                output_path
            )
            
            print(f"File downloaded from IPFS to {output_path}")
            return True
        
        except Exception as e:
            print(f"Error downloading file from Filebase: {str(e)}")
            return False
    
    def _calculate_file_hash(self, file_path, block_size=65536):
        """
        Calculate SHA-256 hash of a file.
        
        Args:
            file_path (str): Path to the file
            block_size (int): Size of blocks to read
            
        Returns:
            str: Hex digest of file hash
        """
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return hashlib.sha256(str(time.time()).encode()).hexdigest()
            
        try:
            hasher = hashlib.sha256()
            with open(file_path, 'rb') as file:
                buf = file.read(block_size)
                while len(buf) > 0:
                    hasher.update(buf)
                    buf = file.read(block_size)
            return hasher.hexdigest()
        except (PermissionError, OSError):
            # Can't read the file, generate a random hash
            return hashlib.sha256(str(time.time()).encode()).hexdigest()