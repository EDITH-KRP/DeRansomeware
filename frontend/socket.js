/**
 * De-Ransom WebSocket Client
 * -------------------------
 * This script provides a WebSocket client for real-time communication with the server.
 */

class DeRansomSocket {
    /**
     * Initialize the WebSocket connection
     * @param {string} url - WebSocket server URL
     * @param {function} onEventCallback - Callback for security events
     * @param {object} options - Additional options and callbacks
     */
    constructor(url, onEventCallback, options = {}) {
        this.url = url;
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.onEventCallback = onEventCallback;
        this.options = options;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.reconnect = this.reconnect.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
    }
    
    /**
     * Connect to the WebSocket server
     */
    connect() {
        if (this.socket) {
            this.disconnect();
        }
        
        try {
            console.log(`Connecting to WebSocket at ${this.url}`);
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 2000;
                
                // Call onConnect callback if provided
                if (this.options.onConnect && typeof this.options.onConnect === 'function') {
                    this.options.onConnect();
                }
                
                // Send authentication if needed
                // this.socket.send(JSON.stringify({ type: 'auth', token: 'your-auth-token' }));
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(event);
            };
            
            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason);
                this.isConnected = false;
                
                // Call onDisconnect callback if provided
                if (this.options.onDisconnect && typeof this.options.onDisconnect === 'function') {
                    this.options.onDisconnect();
                }
                
                // Attempt to reconnect if not a normal closure
                if (event.code !== 1000) {
                    this.reconnect();
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.reconnect();
        }
    }
    
    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close(1000, 'Normal closure');
            this.socket = null;
            this.isConnected = false;
            
            // Call onDisconnect callback if provided
            if (this.options.onDisconnect && typeof this.options.onDisconnect === 'function') {
                this.options.onDisconnect();
            }
        }
    }
    
    /**
     * Attempt to reconnect to the WebSocket server
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`Reconnecting in ${this.reconnectDelay / 1000} seconds... (Attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
    }
    
    /**
     * Handle incoming WebSocket messages
     * @param {MessageEvent} event - WebSocket message event
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            // Handle different message types
            switch (data.type) {
                case 'security_event':
                    // Call the callback with the security event data
                    if (this.onEventCallback) {
                        this.onEventCallback(data.event);
                    }
                    break;
                    
                case 'ping':
                    // Respond to ping with pong
                    this.socket.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                case 'status_update':
                    // Handle status updates
                    if (this.options.onStatusUpdate) {
                        this.options.onStatusUpdate(data);
                    }
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    
    /**
     * Send a message to the WebSocket server
     * @param {object} message - Message to send
     */
    send(message) {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('Cannot send message: WebSocket not connected');
        }
    }
}