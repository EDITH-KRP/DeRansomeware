// De-Ransom Admin Dashboard JavaScript
// This file handles the functionality of the admin dashboard

// Initialize Socket.IO connection
const socket = io();

// DOM Elements
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const mainContent = document.querySelector('.main-content');
const pageTitle = document.getElementById('page-title');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsDropdown = document.querySelector('.notifications-dropdown');
const profileBtn = document.getElementById('profile-btn');
const profileDropdown = document.querySelector('.profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const logoutDropdownBtn = document.getElementById('logout-dropdown-btn');
const navLinks = document.querySelectorAll('.sidebar-nav a');
const currentDatetime = document.getElementById('current-datetime');
const alertModal = document.getElementById('alert-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');

// Dashboard elements
const highRiskCount = document.getElementById('high-risk-count');
const protectedFilesCount = document.getElementById('protected-files-count');
const monitoredDirsCount = document.getElementById('monitored-dirs-count');
const activeUsersCount = document.getElementById('active-users-count');
const recentAlertsList = document.getElementById('recent-alerts-list');
const notificationsList = document.getElementById('notifications-list');
const alertsBadge = document.getElementById('alerts-badge');
const notificationsBadge = document.getElementById('notifications-badge');

// Blockchain status elements
const blockchainConnection = document.getElementById('blockchain-connection');
const blockchainNetwork = document.getElementById('blockchain-network');
const blockchainBlock = document.getElementById('blockchain-block');
const blockchainEvents = document.getElementById('blockchain-events');
const blockchainMode = document.getElementById('blockchain-mode');
const refreshBlockchainBtn = document.getElementById('refresh-blockchain');

// Chart elements
const threatActivityChart = document.getElementById('threat-activity-chart');
const chartTimeframe = document.getElementById('chart-timeframe');
const refreshChartBtn = document.getElementById('refresh-chart');

// Global variables
let currentUser = null;
let activityChart = null;
let alerts = [];
let notifications = [];
let monitoringStatus = {
    isMonitoring: false,
    monitoredDirectories: []
};

// Initialize the dashboard
async function initDashboard() {
    // Update current date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Get current user
    await getCurrentUser();
    
    // Load dashboard data
    await loadDashboardStats();
    
    // Load blockchain status
    await loadBlockchainStatus();
    
    // Initialize chart
    initThreatActivityChart();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up Socket.IO event listeners
    setupSocketListeners();
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    currentDatetime.textContent = now.toLocaleString();
}

// Get current authenticated user
async function getCurrentUser() {
    try {
        const response = await fetch('/api/auth/user', {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            document.getElementById('username').textContent = currentUser.username;
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error getting current user:', error);
        // Redirect to login on error
        window.location.href = '/login';
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard/stats', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Update stats cards
            highRiskCount.textContent = stats.event_stats.high_risk || 0;
            protectedFilesCount.textContent = stats.backup_count || 0;
            monitoredDirsCount.textContent = stats.monitored_directories.length || 0;
            
            // Update monitoring status
            monitoringStatus.isMonitoring = stats.is_monitoring;
            monitoringStatus.monitoredDirectories = stats.monitored_directories;
            
            // Load users count
            await loadUsersCount();
            
            // Load recent alerts
            loadRecentAlerts(stats.recent_events);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard statistics', 'error');
    }
}

// Load users count
async function loadUsersCount() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const users = await response.json();
            activeUsersCount.textContent = users.length || 0;
        }
    } catch (error) {
        console.error('Error loading users count:', error);
    }
}

// Load blockchain status
async function loadBlockchainStatus() {
    try {
        blockchainConnection.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
        
        const response = await fetch('/api/blockchain/status', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const status = await response.json();
            
            // Update blockchain status elements
            if (status.connected) {
                blockchainConnection.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
                blockchainConnection.className = 'status-value connected';
            } else {
                blockchainConnection.innerHTML = '<i class="fas fa-times-circle"></i> Disconnected';
                blockchainConnection.className = 'status-value disconnected';
            }
            
            blockchainNetwork.textContent = status.network || 'Unknown';
            blockchainBlock.textContent = status.blockNumber || 'N/A';
            blockchainEvents.textContent = status.eventCount || '0';
            
            if (status.simulation) {
                blockchainMode.textContent = 'Simulation';
                blockchainMode.className = 'status-value simulated';
            } else {
                blockchainMode.textContent = 'Production';
                blockchainMode.className = 'status-value connected';
            }
        } else {
            blockchainConnection.innerHTML = '<i class="fas fa-times-circle"></i> Error';
            blockchainConnection.className = 'status-value disconnected';
        }
    } catch (error) {
        console.error('Error loading blockchain status:', error);
        blockchainConnection.innerHTML = '<i class="fas fa-times-circle"></i> Error';
        blockchainConnection.className = 'status-value disconnected';
    }
}

// Initialize threat activity chart
function initThreatActivityChart() {
    const ctx = threatActivityChart.getContext('2d');
    
    // Create initial empty chart
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'High Risk',
                    data: [],
                    borderColor: 'rgb(255, 0, 51)',
                    backgroundColor: 'rgba(255, 0, 51, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Medium Risk',
                    data: [],
                    borderColor: 'rgb(255, 204, 0)',
                    backgroundColor: 'rgba(255, 204, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Low Risk',
                    data: [],
                    borderColor: 'rgb(0, 204, 102)',
                    backgroundColor: 'rgba(0, 204, 102, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e0e0e0'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8a9ab0'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8a9ab0'
                    }
                }
            }
        }
    });
    
    // Load chart data
    loadChartData();
}

// Load chart data based on selected timeframe
async function loadChartData() {
    const timeframe = chartTimeframe.value;
    
    try {
        // In a real app, this would fetch data from the API
        // For now, we'll generate random data
        
        let labels = [];
        let highRiskData = [];
        let mediumRiskData = [];
        let lowRiskData = [];
        
        const now = new Date();
        
        if (timeframe === 'day') {
            // Last 24 hours (hourly data)
            for (let i = 23; i >= 0; i--) {
                const hour = new Date(now);
                hour.setHours(now.getHours() - i);
                labels.push(hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                
                highRiskData.push(Math.floor(Math.random() * 5));
                mediumRiskData.push(Math.floor(Math.random() * 10));
                lowRiskData.push(Math.floor(Math.random() * 15));
            }
        } else if (timeframe === 'week') {
            // Last 7 days (daily data)
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now);
                day.setDate(now.getDate() - i);
                labels.push(day.toLocaleDateString([], { weekday: 'short' }));
                
                highRiskData.push(Math.floor(Math.random() * 10));
                mediumRiskData.push(Math.floor(Math.random() * 20));
                lowRiskData.push(Math.floor(Math.random() * 30));
            }
        } else if (timeframe === 'month') {
            // Last 30 days (weekly data)
            for (let i = 4; i >= 0; i--) {
                const week = new Date(now);
                week.setDate(now.getDate() - (i * 7));
                labels.push(`Week ${5-i}`);
                
                highRiskData.push(Math.floor(Math.random() * 20));
                mediumRiskData.push(Math.floor(Math.random() * 40));
                lowRiskData.push(Math.floor(Math.random() * 60));
            }
        }
        
        // Update chart data
        activityChart.data.labels = labels;
        activityChart.data.datasets[0].data = highRiskData;
        activityChart.data.datasets[1].data = mediumRiskData;
        activityChart.data.datasets[2].data = lowRiskData;
        activityChart.update();
        
    } catch (error) {
        console.error('Error loading chart data:', error);
        showNotification('Error loading chart data', 'error');
    }
}

// Load recent alerts
function loadRecentAlerts(events) {
    if (!events || events.length === 0) {
        recentAlertsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shield-check"></i>
                <p>No recent alerts</p>
            </div>
        `;
        return;
    }
    
    // Sort events by timestamp (newest first)
    alerts = events.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Update alerts badge
    const highRiskAlerts = alerts.filter(alert => alert.risk_level === 'high');
    alertsBadge.textContent = highRiskAlerts.length;
    
    // Update notifications badge
    notificationsBadge.textContent = highRiskAlerts.length;
    
    // Clear existing alerts
    recentAlertsList.innerHTML = '';
    
    // Add recent alerts (up to 5)
    const recentAlerts = alerts.slice(0, 5);
    
    recentAlerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.dataset.id = alert.timestamp;
        
        let iconClass = 'fas fa-exclamation-circle';
        let riskClass = 'low-risk';
        
        if (alert.risk_level === 'high') {
            iconClass = 'fas fa-virus';
            riskClass = 'high-risk';
        } else if (alert.risk_level === 'medium') {
            iconClass = 'fas fa-exclamation-triangle';
            riskClass = 'medium-risk';
        }
        
        const eventTime = new Date(alert.timestamp).toLocaleString();
        const fileName = alert.file_path ? alert.file_path.split(/[\/\\]/).pop() : 'Unknown';
        
        alertItem.innerHTML = `
            <div class="alert-icon ${riskClass}">
                <i class="${iconClass}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${getAlertTitle(alert)}</div>
                <div class="alert-message">${fileName}</div>
                <div class="alert-meta">
                    <span>${alert.event_type || 'Unknown'}</span>
                    <span>${eventTime}</span>
                </div>
            </div>
        `;
        
        // Add click event to show alert details
        alertItem.addEventListener('click', () => {
            showAlertDetails(alert);
        });
        
        recentAlertsList.appendChild(alertItem);
    });
    
    // Also update notifications list
    updateNotificationsList(highRiskAlerts);
}

// Update notifications list
function updateNotificationsList(alerts) {
    // Clear existing notifications
    notificationsList.innerHTML = '';
    
    if (!alerts || alerts.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    // Add notifications (up to 5)
    const recentNotifications = alerts.slice(0, 5);
    
    recentNotifications.forEach(alert => {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item unread';
        notificationItem.dataset.id = alert.timestamp;
        
        let iconClass = 'fas fa-virus';
        let riskClass = 'high-risk';
        
        const eventTime = new Date(alert.timestamp).toLocaleString();
        const fileName = alert.file_path ? alert.file_path.split(/[\/\\]/).pop() : 'Unknown';
        
        notificationItem.innerHTML = `
            <div class="notification-icon ${riskClass}">
                <i class="${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${getAlertTitle(alert)}</div>
                <div class="notification-message">${fileName}</div>
                <div class="notification-time">${eventTime}</div>
            </div>
        `;
        
        // Add click event to show alert details
        notificationItem.addEventListener('click', () => {
            showAlertDetails(alert);
            notificationItem.classList.remove('unread');
        });
        
        notificationsList.appendChild(notificationItem);
    });
}

// Get alert title based on event type and risk level
function getAlertTitle(alert) {
    if (alert.risk_level === 'high') {
        if (alert.event_type === 'created') {
            return 'Ransomware File Detected';
        } else if (alert.event_type === 'modified') {
            return 'File Encryption Detected';
        } else if (alert.event_type === 'rapid_operations') {
            return 'Mass File Operations Detected';
        } else {
            return 'Critical Security Alert';
        }
    } else if (alert.risk_level === 'medium') {
        if (alert.event_type === 'created') {
            return 'Suspicious File Created';
        } else if (alert.event_type === 'modified') {
            return 'Suspicious File Modification';
        } else {
            return 'Security Warning';
        }
    } else {
        return 'Activity Notification';
    }
}

// Show alert details in modal
function showAlertDetails(alert) {
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertFile = document.getElementById('alert-file');
    const alertType = document.getElementById('alert-type');
    const alertRisk = document.getElementById('alert-risk');
    const alertTime = document.getElementById('alert-time');
    const alertIcon = document.querySelector('.alert-details .alert-icon');
    
    // Set alert details
    alertTitle.textContent = getAlertTitle(alert);
    
    // Set message based on detection reasons or event type
    if (alert.detection_reasons && alert.detection_reasons.length > 0) {
        alertMessage.textContent = alert.detection_reasons.join(', ');
    } else {
        alertMessage.textContent = `${alert.event_type} event detected`;
    }
    
    alertFile.textContent = alert.file_path || 'Unknown';
    alertType.textContent = alert.event_type || 'Unknown';
    alertRisk.textContent = alert.risk_level ? alert.risk_level.toUpperCase() : 'Unknown';
    alertTime.textContent = new Date(alert.timestamp).toLocaleString();
    
    // Set icon class based on risk level
    alertIcon.className = 'alert-icon';
    if (alert.risk_level === 'high') {
        alertIcon.classList.add('high-risk');
        alertIcon.innerHTML = '<i class="fas fa-virus"></i>';
    } else if (alert.risk_level === 'medium') {
        alertIcon.classList.add('medium-risk');
        alertIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        alertIcon.classList.add('low-risk');
        alertIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
    }
    
    // Show modal
    alertModal.classList.add('show');
}

// Set up event listeners
function setupEventListeners() {
    // Sidebar toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });
    
    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(link => {
                link.parentElement.classList.remove('active');
            });
            
            // Add active class to clicked link
            link.parentElement.classList.add('active');
            
            // Update page title
            const sectionName = link.querySelector('span').textContent;
            pageTitle.textContent = sectionName;
            
            // Show corresponding section
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });
    
    // Notifications dropdown
    notificationsBtn.addEventListener('click', () => {
        notificationsDropdown.classList.toggle('show');
        profileDropdown.classList.remove('show');
    });
    
    // Profile dropdown
    profileBtn.addEventListener('click', () => {
        profileDropdown.classList.toggle('show');
        notificationsDropdown.classList.remove('show');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.notifications') && !e.target.closest('.user-profile')) {
            notificationsDropdown.classList.remove('show');
            profileDropdown.classList.remove('show');
        }
    });
    
    // Logout buttons
    logoutBtn.addEventListener('click', logout);
    logoutDropdownBtn.addEventListener('click', logout);
    
    // Close modal buttons
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alertModal.classList.remove('show');
        });
    });
    
    // Close modal when clicking outside
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            alertModal.classList.remove('show');
        }
    });
    
    // Refresh blockchain status
    refreshBlockchainBtn.addEventListener('click', loadBlockchainStatus);
    
    // Chart timeframe change
    chartTimeframe.addEventListener('change', loadChartData);
    
    // Refresh chart
    refreshChartBtn.addEventListener('click', loadChartData);
    
    // Mark all notifications as read
    document.getElementById('mark-all-read').addEventListener('click', () => {
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            item.classList.remove('unread');
        });
        
        // Reset badges
        notificationsBadge.textContent = '0';
    });
}

// Set up Socket.IO event listeners
function setupSocketListeners() {
    // Listen for ransomware alerts
    socket.on('ransomware_alert', (data) => {
        console.log('Received ransomware alert:', data);
        
        // Add to alerts
        alerts.unshift(data.event);
        
        // Update recent alerts list
        loadRecentAlerts(alerts);
        
        // Show notification
        showNotification(`${getAlertTitle(data.event)}: ${data.event.file_path}`, 'alert');
        
        // Show alert modal for high risk events
        if (data.event.risk_level === 'high') {
            showAlertDetails(data.event);
        }
    });
    
    // Listen for monitoring status changes
    socket.on('monitoring_started', (data) => {
        console.log('Monitoring started:', data);
        monitoringStatus.isMonitoring = true;
        
        if (!monitoringStatus.monitoredDirectories.includes(data.directory)) {
            monitoringStatus.monitoredDirectories.push(data.directory);
        }
        
        // Update monitored directories count
        monitoredDirsCount.textContent = monitoringStatus.monitoredDirectories.length;
        
        // Show notification
        showNotification(`Monitoring started for: ${data.directory}`, 'info');
    });
    
    socket.on('monitoring_stopped', (data) => {
        console.log('Monitoring stopped:', data);
        monitoringStatus.isMonitoring = false;
        
        // Show notification
        showNotification('Monitoring stopped', 'info');
    });
    
    // Listen for file restoration events
    socket.on('file_restored', (data) => {
        console.log('File restored:', data);
        
        // Show notification
        showNotification(`File restored from backup: ${data.output_path}`, 'success');
    });
}

// Show a specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(`${sectionId}-section`);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.classList.add(type);
    
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-times-circle';
    if (type === 'alert') icon = 'fas fa-exclamation-triangle';
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
        <button class="close-notification">&times;</button>
    `;
    
    // Add to notifications container (create if it doesn't exist)
    let notificationsContainer = document.querySelector('.notifications-container');
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
    
    notificationsContainer.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('hiding');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            showNotification('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showNotification('Logout failed', 'error');
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
    }
    
    .notification {
        background-color: var(--card-bg);
        border-left: 4px solid var(--info);
        border-radius: 4px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        padding: 15px;
        display: flex;
        align-items: center;
        animation: slide-in 0.3s ease-out;
        transition: all 0.3s;
    }
    
    .notification.hiding {
        opacity: 0;
        transform: translateX(100%);
    }
    
    .notification i {
        font-size: 20px;
        margin-right: 15px;
        color: var(--info);
    }
    
    .notification span {
        flex: 1;
    }
    
    .notification .close-notification {
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 18px;
        cursor: pointer;
        padding: 0 5px;
    }
    
    .notification.success {
        border-left-color: var(--success);
    }
    
    .notification.success i {
        color: var(--success);
    }
    
    .notification.error {
        border-left-color: var(--danger);
    }
    
    .notification.error i {
        color: var(--danger);
    }
    
    .notification.alert {
        border-left-color: var(--warning);
    }
    
    .notification.alert i {
        color: var(--warning);
    }
    
    @keyframes slide-in {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

document.head.appendChild(style);