/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Elements
    const startMonitoringBtn = document.getElementById('startMonitoring');
    const stopMonitoringBtn = document.getElementById('stopMonitoring');
    const monitoringStatus = document.getElementById('monitoringStatus');
    const monitoredDirectory = document.getElementById('monitoredDirectory');
    const totalFiles = document.getElementById('totalFiles');
    const suspiciousEvents = document.getElementById('suspiciousEvents');
    const lastBlock = document.getElementById('lastBlock');
    const eventsLogged = document.getElementById('eventsLogged');
    const activityLog = document.getElementById('activityLog');
    
    // Check if we're on the dashboard page
    const isDashboard = window.location.href.includes('dashboard.html');
    
    // Initialize WebSocket for real-time updates if available
    let socket = null;
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent);
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            directoryModal = new bootstrap.Modal(document.getElementById('directoryModal'));
            
            // Set up event listeners for dashboard
            setupDashboardListeners();
            
            // Load initial data
            loadDashboardData();
        } catch (e) {
            console.error('Error initializing dashboard:', e);
        }
    }
    
    // Set up event listeners for the dashboard page
    function setupDashboardListeners() {
        if (startMonitoringBtn) {
            startMonitoringBtn.addEventListener('click', function() {
                showDirectoryModal();
            });
        }
        
        if (stopMonitoringBtn) {
            stopMonitoringBtn.addEventListener('click', function() {
                stopMonitoring();
            });
        }
        
        // Directory modal confirm button
        const confirmDirectoryBtn = document.getElementById('confirmDirectory');
        if (confirmDirectoryBtn) {
            confirmDirectoryBtn.addEventListener('click', function() {
                const directoryPath = document.getElementById('directoryPath').value.trim();
                if (directoryPath) {
                    directoryModal.hide();
                    startMonitoring(directoryPath);
                } else {
                    alert('Please enter a valid directory path');
                }
            });
        }
        
        // Add click handlers for IPFS and blockchain links
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('ipfs-link')) {
                e.preventDefault();
                const ipfsHash = e.target.getAttribute('title');
                alert(`IPFS Hash: ${ipfsHash}\nThis would open the IPFS gateway in a production environment.`);
            } else if (e.target.classList.contains('tx-link')) {
                e.preventDefault();
                const txHash = e.target.getAttribute('title');
                const network = document.getElementById('networkStatus').textContent;
                let explorerUrl = 'https://sepolia.etherscan.io/tx/';
                if (network.toLowerCase().includes('goerli')) {
                    explorerUrl = 'https://goerli.etherscan.io/tx/';
                }
                window.open(explorerUrl + txHash, '_blank');
            }
        });
    }
    
    // Show directory selection modal
    function showDirectoryModal() {
        if (directoryModal) {
            directoryModal.show();
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Make API request to start monitoring
        fetch('http://localhost:5000/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // If API call fails, try to use demo mode
            if (typeof startMonitoringDemo === 'function') {
                startMonitoringDemo(path);
            }
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Make API request to stop monitoring
        fetch('http://localhost:5000/api/monitor/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update UI for inactive monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Inactive';
                monitoringStatus.className = 'status-badge bg-secondary';
                startMonitoringBtn.disabled = false;
                stopMonitoringBtn.disabled = true;
            } else {
                // Handle error
                alert(`Error: ${data.message}`);
                stopMonitoringBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error stopping monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            stopMonitoringBtn.disabled = false;
            
            // If API call fails, try to use demo mode
            if (typeof stopMonitoringDemo === 'function') {
                stopMonitoringDemo();
            }
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Load activity logs
        fetch('http://localhost:5000/api/logs')
            .then(response => response.json())
            .then(logs => {
                updateActivityLog(logs);
                updateEventCounters(logs);
            })
            .catch(error => {
                console.error('Error loading logs:', error);
            });
        
        // Load blockchain status
        fetch('http://localhost:5000/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('http://localhost:5000/api/backup/status')
            .then(response => response.json())
            .then(status => {
                // Update backup stats if needed
            })
            .catch(error => {
                console.error('Error loading backup status:', error);
            });
    }
    
    // Update activity log table
    function updateActivityLog(logs) {
        if (!activityLog) return;
        
        // Clear existing logs
        activityLog.innerHTML = '';
        
        // Sort logs by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        const row = document.createElement('tr');
        
        // Add risk class
        if (log.risk_level === 'high') {
            row.classList.add('risk-high');
        } else if (log.risk_level === 'medium') {
            row.classList.add('risk-medium');
        } else {
            row.classList.add('risk-low');
        }
        
        // Format timestamp
        const timestamp = new Date(log.timestamp);
        const formattedTime = timestamp.toLocaleString();
        
        // Get file name from path
        const fileName = log.file_path ? log.file_path.split(/[\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table
        activityLog.prepend(row);
    }
    
    // Update event counters
    function updateEventCounters(logs) {
        if (!totalFiles || !suspiciousEvents || !eventsLogged) return;
        
        // Count unique files
        const uniqueFiles = new Set();
        let suspiciousCount = 0;
        let loggedCount = 0;
        
        logs.forEach(log => {
            if (log.file_path) {
                uniqueFiles.add(log.file_path);
            }
            
            if (log.risk_level === 'high' || log.risk_level === 'medium') {
                suspiciousCount++;
            }
            
            if (log.blockchain_tx) {
                loggedCount++;
            }
        });
        
        // Update counters
        totalFiles.textContent = uniqueFiles.size;
        suspiciousEvents.textContent = suspiciousCount;
        eventsLogged.textContent = loggedCount;
    }
    
    // Update blockchain status
    function updateBlockchainStatus(status) {
        if (!lastBlock || !eventsLogged) return;
        
        // Update network status
        const networkStatus = document.getElementById('networkStatus');
        if (networkStatus) {
            networkStatus.textContent = status.network || 'Unknown';
        }
        
        // Update block number
        if (status.blockNumber) {
            lastBlock.textContent = status.blockNumber;
        }
        
        // Update events logged
        if (status.eventCount) {
            eventsLogged.textContent = status.eventCount;
        }
    }
    
    // Handle security events from WebSocket
    function handleSecurityEvent(event) {
        console.log('Security event received:', event);
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Play alert sound for high-risk events
        if (event.risk_level === 'high') {
            playAlertSound();
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        try {
            const audio = new Audio('../static/js/alert.mp3');
            audio.play().catch(err => console.log('Could not play alert sound:', err));
        } catch (e) {
            console.log('Error playing alert sound:', e);
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});