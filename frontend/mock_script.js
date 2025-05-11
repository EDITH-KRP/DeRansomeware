/**
 * De-Ransom Mock Script
 * --------------------
 * This script handles the main functionality of the De-Ransom application frontend
 * with mock data for demonstration purposes.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom application initialized with mock data support');
    
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
    const mockModeIndicator = document.getElementById('mockModeIndicator');
    
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
    
    // Start monitoring a directory with mock data
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
                    Starting mock monitoring for path: ${path}...
                </td>
            `;
            activityLog.appendChild(row);
        }
        
        // Show mock mode indicator if it exists
        if (mockModeIndicator) {
            mockModeIndicator.style.display = 'inline-block';
        }
        
        // Use mock data for demonstration
        console.log("Starting mock monitoring for path:", path);
        
        // Store the current monitored path globally
        window.currentMonitoredPath = path;
        
        // Make API request to start monitoring with mock data
        fetch('/api/monitor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                path: path,
                use_mock: true  // Use mock data
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Clear the loading message
                if (activityLog) {
                    activityLog.innerHTML = '';
                }
                
                // Update UI for active monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active (Mock)';
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
                        <span class="badge bg-success">Mock Monitoring Started</span>
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
        
        // Make API request to stop monitoring
        fetch('/api/monitor/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: window.currentMonitoredPath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // Update UI for inactive monitoring
                monitoringStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Inactive';
                monitoringStatus.className = 'status-badge bg-secondary';
                startMonitoringBtn.disabled = false;
                stopMonitoringBtn.disabled = true;
                
                // Hide the mock mode indicator if it exists
                if (mockModeIndicator) {
                    mockModeIndicator.style.display = 'none';
                }
                
                // Hide the test alert button
                const testAlertBtn = document.getElementById('testAlertBtn');
                if (testAlertBtn) {
                    testAlertBtn.style.display = 'none';
                }
                
                // Add a "monitoring stopped" message to the log
                const stopRow = document.createElement('tr');
                stopRow.innerHTML = `
                    <td>${new Date().toLocaleString()}</td>
                    <td colspan="5" class="text-center">
                        <span class="badge bg-secondary">Monitoring Stopped</span>
                    </td>
                `;
                if (activityLog) {
                    activityLog.appendChild(stopRow);
                }
            } else {
                // Handle error
                monitoringStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error';
                monitoringStatus.className = 'status-badge bg-danger';
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
    
    // Load dashboard data
    function loadDashboardData() {
        // Only load data if we're on the dashboard page
        if (!isDashboard) return;
        
        // Check monitoring status
        fetch('/api/monitor/status')
            .then(response => response.json())
            .then(data => {
                updateMonitoringStatus(data);
            })
            .catch(error => {
                console.error('Error fetching monitoring status:', error);
            });
        
        // Get blockchain status
        fetch('/api/blockchain/status')
            .then(response => response.json())
            .then(data => {
                updateBlockchainStatus(data);
            })
            .catch(error => {
                console.error('Error fetching blockchain status:', error);
            });
        
        // Get backup status
        fetch('/api/backup/status')
            .then(response => response.json())
            .then(data => {
                updateBackupStatus(data);
            })
            .catch(error => {
                console.error('Error fetching backup status:', error);
            });
        
        // Get dashboard stats
        fetch('/api/dashboard/stats')
            .then(response => response.json())
            .then(data => {
                updateDashboardStats(data);
            })
            .catch(error => {
                console.error('Error fetching dashboard stats:', error);
            });
        
        // Get activity logs
        fetch('/api/logs')
            .then(response => response.json())
            .then(data => {
                updateActivityLog(data);
            })
            .catch(error => {
                console.error('Error fetching activity logs:', error);
            });
    }
    
    // Update monitoring status UI
    function updateMonitoringStatus(status) {
        if (!monitoringStatus) return;
        
        if (status.is_monitoring) {
            monitoringStatus.innerHTML = '<i class="bi bi-circle-fill pulse"></i> Active' + (status.mock_mode ? ' (Mock)' : '');
            monitoringStatus.className = 'status-badge bg-success';
            
            if (startMonitoringBtn) startMonitoringBtn.disabled = true;
            if (stopMonitoringBtn) stopMonitoringBtn.disabled = false;
            
            if (monitoredDirectory && status.directories && status.directories.length > 0) {
                monitoredDirectory.textContent = status.directories[0];
                window.currentMonitoredPath = status.directories[0];
            }
            
            // Show mock mode indicator if it exists and we're in mock mode
            if (mockModeIndicator && status.mock_mode) {
                mockModeIndicator.style.display = 'inline-block';
            }
        } else {
            monitoringStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Inactive';
            monitoringStatus.className = 'status-badge bg-secondary';
            
            if (startMonitoringBtn) startMonitoringBtn.disabled = false;
            if (stopMonitoringBtn) stopMonitoringBtn.disabled = true;
            
            // Hide mock mode indicator
            if (mockModeIndicator) {
                mockModeIndicator.style.display = 'none';
            }
        }
    }
    
    // Update blockchain status UI
    function updateBlockchainStatus(status) {
        const networkStatus = document.getElementById('networkStatus');
        const contractStatus = document.getElementById('contractStatus');
        const accountStatus = document.getElementById('accountStatus');
        
        if (networkStatus) {
            networkStatus.textContent = status.network || 'Not connected';
            networkStatus.className = status.connected ? 'text-success' : 'text-danger';
        }
        
        if (contractStatus) {
            contractStatus.textContent = status.contractConnected ? 'Connected' : 'Not connected';
            contractStatus.className = status.contractConnected ? 'text-success' : 'text-danger';
        }
        
        if (accountStatus) {
            accountStatus.textContent = status.accountConnected ? 'Connected' : 'Not connected';
            accountStatus.className = status.accountConnected ? 'text-success' : 'text-danger';
        }
        
        if (lastBlock) {
            lastBlock.textContent = status.blockNumber || 'Unknown';
        }
        
        if (eventsLogged) {
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
        
        // Play alert sound for high risk events
        if (event.risk_level === 'high') {
            playAlertSound();
            
            // Show browser notification if permission granted
            showNotification('High Risk Security Event', `Detected: ${event.file_path}`);
        }
        
        // Add to activity log
        addEventToActivityLog(event);
        
        // Update counters
        updateCounters();
    }
    
    // Play alert sound
    function playAlertSound() {
        try {
            const alertSound = document.getElementById('alertSound');
            if (alertSound) {
                alertSound.volume = 0.5;  // Set volume to 50%
                alertSound.play().catch(e => {
                    console.log('Could not play alert sound:', e);
                });
            }
        } catch (e) {
            console.error('Error playing alert sound:', e);
        }
    }
    
    // Show browser notification
    function showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: '/static/images/shield-icon.png'
            });
            
            // Close the notification after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }
    
    // Add event to activity log
    function addEventToActivityLog(event) {
        if (!activityLog) return;
        
        const row = document.createElement('tr');
        row.className = event.risk_level === 'high' ? 'table-danger' : 
                        event.risk_level === 'medium' ? 'table-warning' : 'table-light';
        
        // Format the timestamp
        const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleString() : new Date().toLocaleString();
        
        // Get the filename from the path
        const filename = event.file_path.split(/[\/\\]/).pop();
        
        // Create the row HTML
        row.innerHTML = `
            <td>${timestamp}</td>
            <td>
                <span class="badge ${event.risk_level === 'high' ? 'bg-danger' : 
                                    event.risk_level === 'medium' ? 'bg-warning text-dark' : 'bg-info text-dark'}">
                    ${event.risk_level.toUpperCase()}
                </span>
            </td>
            <td>${event.event_type}</td>
            <td title="${event.file_path}">${filename}</td>
            <td>
                ${event.detection_reasons ? event.detection_reasons.join('<br>') : ''}
            </td>
            <td>
                ${event.ipfs_hash ? `<a href="#" class="ipfs-link" title="${event.ipfs_hash}"><i class="bi bi-cloud-check"></i> IPFS</a>` : ''}
                ${event.blockchain_tx ? `<a href="#" class="tx-link" title="${event.blockchain_tx}"><i class="bi bi-link-45deg"></i> TX</a>` : ''}
            </td>
        `;
        
        // Add to the top of the table
        if (activityLog.firstChild) {
            activityLog.insertBefore(row, activityLog.firstChild);
        } else {
            activityLog.appendChild(row);
        }
    }
    
    // Update activity log from API data
    function updateActivityLog(events) {
        if (!activityLog) return;
        
        // Clear existing log
        activityLog.innerHTML = '';
        
        // Add each event to the log
        events.forEach(event => {
            addEventToActivityLog(event);
        });
        
        // Update counters
        updateCounters();
    }
    
    // Update dashboard stats
    function updateDashboardStats(stats) {
        if (totalFiles) {
            totalFiles.textContent = stats.total_events || '0';
        }
        
        if (suspiciousEvents) {
            suspiciousEvents.textContent = (stats.high_risk_events || 0) + (stats.medium_risk_events || 0);
        }
    }
    
    // Update backup status
    function updateBackupStatus(status) {
        const backupStatus = document.getElementById('backupStatus');
        if (backupStatus) {
            backupStatus.textContent = `${status.total || 0} files backed up (${status.high_risk || 0} high risk)`;
        }
    }
    
    // Update counters based on activity log
    function updateCounters() {
        if (!activityLog) return;
        
        // Count total events
        const totalEvents = activityLog.querySelectorAll('tr').length;
        if (totalFiles) {
            totalFiles.textContent = totalEvents;
        }
        
        // Count suspicious events (high and medium risk)
        const highRiskEvents = activityLog.querySelectorAll('tr.table-danger').length;
        const mediumRiskEvents = activityLog.querySelectorAll('tr.table-warning').length;
        if (suspiciousEvents) {
            suspiciousEvents.textContent = highRiskEvents + mediumRiskEvents;
        }
    }
    
    // Refresh dashboard data periodically
    if (isDashboard) {
        setInterval(loadDashboardData, 30000);  // Refresh every 30 seconds
    }
});

// Add a mock mode indicator to the dashboard
document.addEventListener('DOMContentLoaded', function() {
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        const mockIndicator = document.createElement('div');
        mockIndicator.id = 'mockModeIndicator';
        mockIndicator.className = 'status-badge bg-info';
        mockIndicator.innerHTML = '<i class="bi bi-info-circle"></i> Mock Mode';
        mockIndicator.style.display = 'none';
        mockIndicator.style.marginLeft = '10px';
        dashboardHeader.appendChild(mockIndicator);
    }
});