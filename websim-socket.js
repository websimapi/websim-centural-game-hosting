/**
 * WebSim Socket Simulation Class
 * This is a placeholder for the real WebSocket implementation
 * In a real application, this would be replaced with actual WebSocket code
 */

class WebsimSocket {
    constructor() {
        this.isConnected = false;
        this.roomState = {
            serverStatus: {}
        };
        this.onmessage = null;
        this.presence = {};
    }

    async initialize() {
        this.isConnected = true;
        console.log('WebSocket initialized (simulated)');
        return true;
    }

    updatePresence(presence) {
        this.presence = presence;
        console.log('Presence updated:', presence);
        return true;
    }

    subscribeRoomState(callback) {
        // Initialize with default data
        this.roomState.serverStatus = {
            'minecraft': { status: 'online', lastChecked: new Date().toISOString() },
            'runescape': { status: 'online', lastChecked: new Date().toISOString() },
            'rct': { status: 'offline', lastChecked: new Date().toISOString() },
            'sims': { status: 'unknown', lastChecked: new Date().toISOString() },
            'minetest': { status: 'online', lastChecked: new Date().toISOString() },
            'gtav': { status: 'offline', lastChecked: new Date().toISOString() },
            'dontstarve': { status: 'online', lastChecked: new Date().toISOString() },
            'ark': { status: 'unknown', lastChecked: new Date().toISOString() },
            'dayz': { status: 'online', lastChecked: new Date().toISOString() }
        };
        
        // Call callback with initial state
        callback(this.roomState);
        
        // Simulate periodic status changes for demo purposes
        setInterval(() => {
            const servers = Object.keys(this.roomState.serverStatus);
            const randomServer = servers[Math.floor(Math.random() * servers.length)];
            const statuses = ['online', 'offline', 'unknown'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            this.roomState.serverStatus[randomServer] = {
                status: randomStatus,
                lastChecked: new Date().toISOString()
            };
            
            callback(this.roomState);
        }, 8000);
        
        return true;
    }

    updateRoomState(newState) {
        this.roomState = { ...this.roomState, ...newState };
        console.log('Room state updated:', newState);
        return true;
    }

    disconnect() {
        this.isConnected = false;
        console.log('WebSocket disconnected (simulated)');
        return true;
    }
}

// Make it globally available
window.WebsimSocket = WebsimSocket;