/**
 * De-Ransom WebSocket Client
 * --------------------------
 * This script handles real-time updates from the server using WebSockets.
 */

class DeRansomSocket {
    /**
     * Initialize the WebSocket connection
     * @param {string} url - WebSocket server URL
     * @param {function} onEventCallback - Callback for security events
     */
    constructor(url, onEventCallback) {
        this.url = url;
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.onEventCallback = onEventCallback;
        
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
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectDelay = 2000;
                
                // Send authentication if needed
                // this.socket.send(JSON.stringify({ type: 'auth', token: 'your-auth-token' }));
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(event);
            };
            
            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason);
                this.isConnected = false;
                
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

// For use in the browser
if (typeof window !== 'undefined') {
    window.DeRansomSocket = DeRansomSocket;
}