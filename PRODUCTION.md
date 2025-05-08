# De-Ransom Production Deployment Guide

This guide explains how to deploy De-Ransom in a production environment.

## Prerequisites

- Python 3.8+
- Node.js and npm (for smart contract deployment)
- Nginx (for reverse proxy)
- Ethereum wallet with Sepolia ETH
- Alchemy API key
- Filebase account

## Step 1: Install Dependencies

### Windows

Run the `production_setup.bat` script:

```
production_setup.bat
```

### Linux/Mac

Run the `production_setup.sh` script:

```bash
chmod +x production_setup.sh
./production_setup.sh
```

## Step 2: Configure Environment Variables

Edit the `.env` file with your actual credentials:

```
# Generate a secure random key
FLASK_SECRET_KEY=your_secure_random_key

# Blockchain settings
ALCHEMY_API_KEY=your_actual_alchemy_key
ETHEREUM_PRIVATE_KEY=your_actual_private_key

# Filebase settings
FILEBASE_ACCESS_KEY=your_actual_filebase_key
FILEBASE_SECRET_KEY=your_actual_filebase_secret
```

## Step 3: Deploy the Smart Contract

### Windows

Run the `deploy_contract.bat` script:

```
deploy_contract.bat
```

### Linux/Mac

Run the `deploy_contract.sh` script:

```bash
chmod +x deploy_contract.sh
./deploy_contract.sh
```

After deployment, copy the contract address to your `.env` file:

```
CONTRACT_ADDRESS=0x...  # Your deployed contract address
```

## Step 4: Set Up Nginx (Linux)

1. Copy the `nginx.conf` file to your Nginx configuration directory:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/deransom
```

2. Edit the file to update paths and domain name:

```bash
sudo nano /etc/nginx/sites-available/deransom
```

3. Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/deransom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: Set Up Systemd Service (Linux)

1. Copy the service file:

```bash
sudo cp deransom.service /etc/systemd/system/
```

2. Edit the file to update paths:

```bash
sudo nano /etc/systemd/system/deransom.service
```

3. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable deransom
sudo systemctl start deransom
```

## Step 6: Run the Application

### Windows

For development:
```
python run.py
```

For production:
```
python production.py
```

### Linux/Mac

For development:
```bash
python run.py
```

For production:
```bash
python production.py
```

## Monitoring and Maintenance

- Check service status: `sudo systemctl status deransom`
- View logs: `sudo journalctl -u deransom`
- Restart service: `sudo systemctl restart deransom`

## Security Considerations

1. **Secure your private keys**: Never expose your Ethereum private key
2. **Firewall configuration**: Only expose necessary ports
3. **Regular updates**: Keep all dependencies updated
4. **Backup configuration**: Regularly backup your `.env` file and logs
5. **Monitor disk space**: Ensure sufficient space for logs and backups