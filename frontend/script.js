/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});/**
 * De-Ransom Main Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized');
    
    // Request notification permission
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
    
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
    const realTimeIndicator = document.getElementById('realTimeIndicator');
    
    try {
        if (typeof DeRansomSocket !== 'undefined') {
            // Create WebSocket connection
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
            
            socket = new DeRansomSocket(wsUrl, handleSecurityEvent, {
                onConnect: () => {
                    // Show real-time indicator when connected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'inline-block';
                    }
                },
                onDisconnect: () => {
                    // Hide real-time indicator when disconnected
                    if (realTimeIndicator) {
                        realTimeIndicator.style.display = 'none';
                    }
                }
            });
            socket.connect();
        }
    } catch (e) {
        console.log('WebSocket not available:', e);
        // Make sure indicator is hidden
        if (realTimeIndicator) {
            realTimeIndicator.style.display = 'none';
        }
    }
    
    // Initialize modal if on dashboard
    let directoryModal = null;
    if (isDashboard) {
        try {
            // Make sure the modal element exists before initializing
            const modalElement = document.getElementById('directoryModal');
            if (modalElement) {
                directoryModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static',  // Prevent closing when clicking outside
                    keyboard: false      // Prevent closing with keyboard
                });
            } else {
                console.error('Modal element not found in the DOM');
            }
            
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
                    try {
                        if (directoryModal) {
                            directoryModal.hide();
                            
                            // Remove modal backdrop manually if it's still present
                            const backdrop = document.querySelector('.modal-backdrop');
                            if (backdrop) {
                                backdrop.remove();
                            }
                            
                            // Make sure body doesn't have modal-open class
                            document.body.classList.remove('modal-open');
                            document.body.style.overflow = '';
                            document.body.style.paddingRight = '';
                        }
                        
                        startMonitoring(directoryPath);
                    } catch (error) {
                        console.error('Error hiding modal:', error);
                        // Try to continue with monitoring anyway
                        startMonitoring(directoryPath);
                    }
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
        try {
            if (directoryModal) {
                directoryModal.show();
            } else {
                // If modal wasn't initialized properly, try to initialize it now
                const modalElement = document.getElementById('directoryModal');
                if (modalElement) {
                    directoryModal = new bootstrap.Modal(modalElement, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    directoryModal.show();
                } else {
                    console.error('Modal element not found');
                    alert('Could not open directory selection. Please try again or refresh the page.');
                }
            }
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('An error occurred. Please refresh the page and try again.');
        }
    }
    
    // Start monitoring a directory
    function startMonitoring(path) {
        if (!path) return;
        
        // Update UI to show loading state
        startMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Connecting...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Clear existing logs and reset counters
        if (activityLog) {
            activityLog.innerHTML = '';
        }
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Show a message in the activity log table
        if (activityLog) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Starting monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Real mode is always used - demo mode disabled
        console.log("Starting real monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active';
                monitoringStatus.className = 'status-badge bg-success';
                monitoredDirectory.textContent = path;
                startMonitoringBtn.disabled = true;
                stopMonitoringBtn.disabled = false;
                
                // Show the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'inline-block';
                }
                
                // Show the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'inline-block';
                }
                
                // Play a test alert sound to ensure audio is working
                // This also helps with browsers that require user interaction before playing audio
                setTimeout(() => {
                    playAlertSound();
                }, 500);
                
                // Add a "monitoring started" message to the log
                const startRow = document.createElement('tr');
                startRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-success">Monitoring Started</span>
                        Watching directory: ${path}
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(startRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
                alert(`Error: ${data.message}`);
                startMonitoringBtn.disabled = false;
                
                // Clear the loading message and show error
                if (activityLog) {
                    activityLog.innerHTML = '';
                    const errorRow = document.createElement('tr');
                    errorRow.innerHTML = `
                        <td colspan="6" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error starting monitoring: ${data.message || 'Unknown error'}
                        </td>
                    `;
                    activityLog.appendChild(errorRow);
                }
            }
        })
        .catch(error => {
            console.error('Error starting monitoring:', error);
            monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
            monitoringStatus.className = 'status-badge bg-danger';
            startMonitoringBtn.disabled = false;
            
            // Clear the loading message and show error
            if (activityLog) {
                activityLog.innerHTML = '';
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td colspan="6" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to connect to server. Please check if the server is running.
                    </td>
                `;
                activityLog.appendChild(errorRow);
            }
            
            // API call failed - show error to user
            alert("Failed to start monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Stop monitoring
    function stopMonitoring() {
        // Update UI to show loading state
        stopMonitoringBtn.disabled = true;
        monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Stopping...';
        monitoringStatus.className = 'status-badge bg-warning';
        
        // Real mode is always used - demo mode disabled
        console.log("Stopping real monitoring");
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
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
                
                // Hide the real-time indicator and test alert button
                const realTimeIndicator = document.getElementById('realTimeIndicator');
                if (realTimeIndicator) {
                    realTimeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                if (activityLog) {
                    const stopRow = document.createElement('tr');
                    stopRow.innerHTML = `
                        <td>${new Date().toLocaleString()}</td>
                        <td colspan="5" class="text-center">
                            <span class="badge bg-secondary">Monitoring Stopped</span>
                            Directory: ${monitoredDirectory.textContent}
                        </td>
                    `;
                    activityLog.appendChild(stopRow);
                    
                    // Scroll to the bottom of the table to show the latest entry
                    const tableContainer = activityLog.closest('.table-responsive');
                    if (tableContainer) {
                        tableContainer.scrollTop = tableContainer.scrollHeight;
                    }
                }
                
                // Clear the monitored path
                window.currentMonitoredPath = null;
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
            
            // API call failed - show error to user
            alert("Failed to stop monitoring. Please check if the server is running and try again.");
        });
    }
    
    // Load initial dashboard data
    function loadDashboardData() {
        // Always load data from real API
        console.log("Loading initial dashboard data from API");
        
        // Initialize empty activity log
        if (activityLog) {
            activityLog.innerHTML = '';
            
            // Add a placeholder message
            const placeholderRow = document.createElement('tr');
            placeholderRow.id = 'placeholderRow';
            placeholderRow.innerHTML = `
                <td colspan="6" class="text-center py-5">
                    <div class="mb-3">
                        <i class="bi bi-shield-lock text-muted" style="font-size: 3rem;"></i>
                    </div>
                    <h5 class="text-muted">No Security Events</h5>
                    <p class="text-muted mb-3">Click "Start Monitoring" to begin watching for security events.</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('startMonitoring').click()">
                        <i class="bi bi-play-fill"></i> Start Monitoring
                    </button>
                </td>
            `;
            activityLog.appendChild(placeholderRow);
        }
        
        // Reset counters
        if (totalFiles) totalFiles.textContent = '0';
        if (suspiciousEvents) suspiciousEvents.textContent = '0';
        if (eventsLogged) eventsLogged.textContent = '0';
        
        // Load blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(status => {
                updateBlockchainStatus(status);
            })
            .catch(error => {
                console.error('Error loading blockchain status:', error);
            });
        
        // Load backup status
        fetch('/api/backup/status')
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
        
        // Sort logs by timestamp (oldest first for chronological display)
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Add logs to table
        logs.forEach(log => {
            addLogEntry(log);
        });
        
        // Scroll to the bottom of the table to show the latest entries
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }
    
    // Add a single log entry to the table
    function addLogEntry(log) {
        if (!activityLog) return;
        
        // Remove placeholder row if it exists
        const placeholderRow = document.getElementById('placeholderRow');
        if (placeholderRow) {
            placeholderRow.remove();
        }
        
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
        const fileName = log.file_path ? log.file_path.split(/[\\\/]/).pop() : 'Unknown';
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${log.file_path || ''}">${fileName}</td>
            <td>${log.event_type || 'Unknown'}</td>
            <td><span class="badge bg-${log.risk_level === 'high' ? 'danger' : (log.risk_level === 'medium' ? 'warning' : 'success')}">${log.risk_level || 'low'}</span></td>
            <td>${log.ipfs_hash ? `<a href="#" class="ipfs-link" title="${log.ipfs_hash}">${log.ipfs_hash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${log.blockchain_tx ? `<a href="#" class="tx-link" title="${log.blockchain_tx}">${log.blockchain_tx.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table (append to show in chronological order)
        activityLog.appendChild(row);
        
        // Scroll to the bottom of the table to show the latest entry
        const tableContainer = activityLog.closest('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
        
        // Only process events if monitoring is active
        if (!monitoringStatus || monitoringStatus.textContent.includes('Inactive')) {
            console.log('Ignoring event because monitoring is inactive');
            return;
        }
        
        // Only process events for the currently monitored path
        if (window.currentMonitoredPath && event.file_path) {
            // Check if the event file path is within the monitored directory
            const normalizedMonitoredPath = window.currentMonitoredPath.replace(/\\/g, '/').toLowerCase();
            const normalizedEventPath = event.file_path.replace(/\\/g, '/').toLowerCase();
            
            if (!normalizedEventPath.startsWith(normalizedMonitoredPath)) {
                console.log(`Ignoring event for file outside monitored directory: ${event.file_path}`);
                return;
            }
        }
        
        // Add to activity log
        addLogEntry(event);
        
        // Update counters
        const currentSuspicious = parseInt(suspiciousEvents.textContent) || 0;
        const currentLogged = parseInt(eventsLogged.textContent) || 0;
        const currentTotalFiles = parseInt(totalFiles.textContent) || 0;
        
        // Update suspicious events counter
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            suspiciousEvents.textContent = currentSuspicious + 1;
        }
        
        // Update blockchain logged events counter
        if (event.blockchain_tx) {
            eventsLogged.textContent = currentLogged + 1;
        }
        
        // Update total files counter if this is a new file
        if (event.file_path) {
            // We'll increment this conservatively since we don't have the full list to check against
            totalFiles.textContent = currentTotalFiles + 1;
        }
        
        // Play alert sound for high-risk and medium-risk events
        if (event.risk_level === 'high' || event.risk_level === 'medium') {
            playAlertSound();
            
            // Also show a browser notification if supported
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    const notification = new Notification('De-Ransomware Alert', {
                        body: `${event.risk_level.toUpperCase()} RISK: ${event.event_type} detected in ${event.file_path}`,
                        icon: window.shieldIconPath || '../static/img/shield-icon.png'
                    });
                    
                    // Close the notification after 5 seconds
                    setTimeout(() => notification.close(), 5000);
                } 
                else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
            }
        }
        
        // Flash the security activity log section to draw attention
        const activityLogCard = activityLog.closest('.card');
        if (activityLogCard) {
            activityLogCard.style.transition = 'background-color 0.5s';
            activityLogCard.style.backgroundColor = event.risk_level === 'high' ? 'rgba(255, 0, 51, 0.2)' : 
                                                   (event.risk_level === 'medium' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)');
            
            setTimeout(() => {
                activityLogCard.style.backgroundColor = '';
            }, 1000);
        }
    }
    
    // Play alert sound
    function playAlertSound() {
        // Use the global playAlertSound function from alert_sound.js if available
        if (window.playAlertSound) {
            window.playAlertSound();
        } else {
            // Fallback to the original implementation
            try {
                const audio = new Audio('../static/js/alert.mp3');
                audio.volume = 1.0;
                audio.play().catch(err => console.error('Could not play alert sound:', err));
            } catch (e) {
                console.error('Error playing alert sound:', e);
            }
        }
    }
    
    // Expose functions for demo mode
    window.startMonitoringReal = startMonitoring;
    window.stopMonitoringReal = stopMonitoring;
    window.addLogEntry = addLogEntry;
    window.updateBlockchainStatus = updateBlockchainStatus;
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                