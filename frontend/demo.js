/**
 * De-Ransom Demo Mode
 * ------------------
 * This script simulates the backend functionality for demo purposes.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('De-Ransom Demo Mode Activated');
    
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
    
    // Try to get the modal elements
    let directoryModal, confirmDirectoryBtn, directoryPathInput;
    try {
        directoryModal = new bootstrap.Modal(document.getElementById('directoryModal'));
        confirmDirectoryBtn = document.getElementById('confirmDirectory');
        directoryPathInput = document.getElementById('directoryPath');
    } catch (e) {
        console.log('Modal elements not found, demo will use default values');
    }
    
    // State
    let isMonitoring = false;
    let simulationInterval = null;
    let eventCount = 0;
    let suspiciousCount = 0;
    let fileCount = 0;
    let blockNumber = 12345678;
    let eventsLoggedCount = 0;
    
    // Event listeners
    if (startMonitoringBtn) {
        startMonitoringBtn.addEventListener('click', function() {
            // Get directories from API first
            fetch('/api/directories')
                .then(response => response.json())
                .then(data => {
                    if (data.directories && data.directories.length > 0) {
                        // Start monitoring with auto-detected directories
                        startMonitoring(data.directories.join(', '));
                    } else if (directoryModal) {
                        directoryModal.show();
                    } else {
                        startMonitoring('System Directories');
                    }
                })
                .catch(err => {
                    console.error('Error fetching directories:', err);
                    if (directoryModal) {
                        directoryModal.show();
                    } else {
                        startMonitoring('System Directories');
                    }
                });
        });
    }
    
    if (stopMonitoringBtn) {
        stopMonitoringBtn.addEventListener('click', function() {
            stopMonitoring();
        });
    }
    
    if (confirmDirectoryBtn) {
        confirmDirectoryBtn.addEventListener('click', function() {
            const path = directoryPathInput.value.trim() || 'System Directories';
            directoryModal.hide();
            startMonitoring(path);
        });
    }
    
    // Functions
    function startMonitoring(path) {
        isMonitoring = true;
        updateUI();
        monitoredDirectory.textContent = path;
        
        // Start simulation
        simulationInterval = setInterval(simulateActivity, 5000);
        
        console.log(`Started monitoring ${path} (Demo Mode)`);
    }
    
    function stopMonitoring() {
        isMonitoring = false;
        clearInterval(simulationInterval);
        updateUI();
        
        console.log('Stopped monitoring (Demo Mode)');
    }
    
    function updateUI() {
        if (isMonitoring) {
            monitoringStatus.textContent = 'Active';
            monitoringStatus.className = 'badge bg-success';
            startMonitoringBtn.disabled = true;
            stopMonitoringBtn.disabled = false;
        } else {
            monitoringStatus.textContent = 'Inactive';
            monitoringStatus.className = 'badge bg-secondary';
            startMonitoringBtn.disabled = false;
            stopMonitoringBtn.disabled = true;
        }
    }
    
    function simulateActivity() {
        // Simulate file count increasing
        fileCount += Math.floor(Math.random() * 5) + 1;
        totalFiles.textContent = fileCount;
        
        // Simulate blockchain activity
        blockNumber += Math.floor(Math.random() * 3) + 1;
        lastBlock.textContent = blockNumber;
        
        // Random event types for simulation
        const eventTypes = [
            { type: 'Created', risk: 'low' },
            { type: 'Modified', risk: 'low' },
            { type: 'Renamed', risk: 'medium' },
            { type: 'Multiple Renames', risk: 'high' },
            { type: 'Extension Changed', risk: 'high' },
            { type: 'Deleted', risk: 'medium' }
        ];
        
        // Random file extensions
        const extensions = ['.txt', '.docx', '.pdf', '.jpg', '.png', '.xlsx'];
        
        // Random directories
        const directories = [
            'C:\\Users\\Documents\\',
            'C:\\Users\\Desktop\\',
            'C:\\Users\\Downloads\\',
            'C:\\Projects\\',
            'D:\\Data\\'
        ];
        
        // Simulate a random event
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const fileName = 'file_' + Math.floor(Math.random() * 1000) + extensions[Math.floor(Math.random() * extensions.length)];
        const directory = directories[Math.floor(Math.random() * directories.length)];
        
        // For high risk events, sometimes use ransomware extensions
        let displayFileName = fileName;
        if (randomEvent.risk === 'high' && Math.random() > 0.5) {
            const ransomwareExts = ['.encrypted', '.locked', '.crypted', '.ransom'];
            const ext = ransomwareExts[Math.floor(Math.random() * ransomwareExts.length)];
            displayFileName = fileName + ext;
        }
        
        // Add to activity log
        addActivityLogEntry({
            timestamp: new Date(),
            fileName: displayFileName,
            filePath: directory + displayFileName,
            eventType: randomEvent.type,
            riskLevel: randomEvent.risk,
            ipfsHash: randomEvent.risk !== 'low' ? generateRandomHash('Qm') : '',
            txHash: randomEvent.risk === 'high' ? generateRandomHash('0x') : ''
        });
        
        // Update counters
        eventCount++;
        if (randomEvent.risk === 'high' || randomEvent.risk === 'medium') {
            suspiciousCount++;
            suspiciousEvents.textContent = suspiciousCount;
            
            if (randomEvent.risk === 'high') {
                eventsLoggedCount++;
                eventsLogged.textContent = eventsLoggedCount;
            }
        }
    }
    
    function addActivityLogEntry(event) {
        const row = document.createElement('tr');
        
        // Add risk class to row
        if (event.riskLevel === 'high') {
            row.classList.add('risk-high');
            // Add animation for high-risk events
            row.classList.add('alert-pulse');
            // Remove animation after 5 seconds
            setTimeout(() => {
                row.classList.remove('alert-pulse');
            }, 5000);
            
            // Play alert sound for high-risk events
            playAlertSound();
        } else if (event.riskLevel === 'medium') {
            row.classList.add('risk-medium');
        } else {
            row.classList.add('risk-low');
        }
        
        // Format timestamp
        const formattedTime = event.timestamp.toLocaleTimeString();
        
        // Create row content
        row.innerHTML = `
            <td>${formattedTime}</td>
            <td title="${event.filePath}">${event.fileName}</td>
            <td>${event.eventType}</td>
            <td><span class="badge bg-${event.riskLevel === 'high' ? 'danger' : (event.riskLevel === 'medium' ? 'warning' : 'success')}">${event.riskLevel}</span></td>
            <td>${event.ipfsHash ? `<a href="#" class="ipfs-link" title="${event.ipfsHash}">${event.ipfsHash.substring(0, 8)}...</a>` : '-'}</td>
            <td>${event.txHash ? `<a href="#" class="tx-link" title="${event.txHash}">${event.txHash.substring(0, 8)}...</a>` : '-'}</td>
        `;
        
        // Add to table
        if (activityLog) {
            activityLog.prepend(row);
            
            // Limit to 20 entries for demo
            if (activityLog.children.length > 20) {
                activityLog.removeChild(activityLog.lastChild);
            }
        }
    }
    
    // Helper function to generate random hashes for demo
    function generateRandomHash(prefix) {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
        let hash = prefix;
        for (let i = 0; i < 46; i++) {
            hash += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return hash;
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
    
    // Initialize with some sample data
    function initializeDemoData() {
        // Set initial values
        totalFiles.textContent = fileCount;
        suspiciousEvents.textContent = suspiciousCount;
        eventsLogged.textContent = eventsLoggedCount;
        lastBlock.textContent = blockNumber;
        
        // Add some initial events
        const initialEvents = [
            {
                timestamp: new Date(Date.now() - 60000),
                fileName: 'document1.docx',
                filePath: 'C:\\Users\\Documents\\document1.docx',
                eventType: 'Modified',
                riskLevel: 'low',
                ipfsHash: '',
                txHash: ''
            },
            {
                timestamp: new Date(Date.now() - 120000),
                fileName: 'presentation.pptx',
                filePath: 'C:\\Users\\Documents\\presentation.pptx',
                eventType: 'Renamed',
                riskLevel: 'medium',
                ipfsHash: generateRandomHash('Qm'),
                txHash: ''
            }
        ];
        
        initialEvents.forEach(event => addActivityLogEntry(event));
    }
    
    // Initialize demo
    initializeDemoData();
});