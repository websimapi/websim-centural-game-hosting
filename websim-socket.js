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
        this.clientId = 'client-' + Math.random().toString(36).substring(2, 9);
        this.peers = {};
        this.collections = {};

        // Demo leaderboard data
        this.demoLeaderboard = [
            { username: 'dragonslayer92', credits: 1250, verifications: 145 },
            { username: 'servermaster', credits: 980, verifications: 98 },
            { username: 'gamehostpro', credits: 720, verifications: 72 },
            { username: 'minecraftfan', credits: 510, verifications: 51 },
            { username: 'hostingwizard', credits: 320, verifications: 32 }
        ];
    }

    async initialize() {
        this.isConnected = true;
        console.log('WebSocket initialized (simulated)");

        // Initialize demo client information
        this.peers[this.clientId] = {
            username: 'player' + Math.floor(Math.random() * 1000),
            avatarUrl: 'https://images.websim.com/avatar/player',
            id: this.clientId
        };

        // Set up demo server data
        this.roomState.serverStatus = {
            'minecraft': { status: 'online', lastChecked: new Date().toISOString(), verifier: 'dragonslayer92' },
            'runescape': { status: 'online', lastChecked: new Date().toISOString(), verifier: 'servermaster' },
            'rct': { status: 'offline', lastChecked: new Date().toISOString(), verifier: 'servermaster' },
            'sims': { status: 'unknown', lastChecked: new Date().toISOString(), verifier: null },
            'minetest': { status: 'online', lastChecked: new Date().toISOString(), verifier: 'minecraftfan' },
            'gtav': { status: 'offline', lastChecked: new Date().toISOString(), verifier: 'gamehostpro' },
            'dontstarve': { status: 'online', lastChecked: new Date().toISOString(), verifier: 'hostingwizard' },
            'ark': { status: 'unknown', lastChecked: new Date().toISOString(), verifier: null },
            'dayz': { status: 'online', lastChecked: new Date().toISOString(), verifier: 'dragonslayer92' }
        };

        return true;
    }

    updatePresence(presence) {
        this.presence = { ...this.presence, ...presence };
        console.log('Presence updated:', presence);
        return true;
    }

    subscribeRoomState(callback) {
        // Call callback with initial state
        callback(this.roomState);

        // Simulate periodic status changes for demo purposes
        setInterval(() => {
            const servers = Object.keys(this.roomState.serverStatus);
            const randomServer = servers[Math.floor(Math.random() * servers.length)];
            const statuses = ['online', 'offline', 'unknown'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const verifiers = ['dragonslayer92', 'servermaster', 'gamehostpro', 'minecraftfan', 'hostingwizard', null];
            const randomVerifier = verifiers[Math.floor(Math.random() * verifiers.length)];

            this.roomState.serverStatus[randomServer] = {
                status: randomStatus,
                lastChecked: new Date().toISOString(),
                verifier: randomVerifier
            };

            callback(this.roomState);
        }, 8000);

        return () => {}; // Return unsubscribe function
    }

    updateRoomState(newState) {
        this.roomState = { ...this.roomState, ...newState };
        console.log('Room state updated:', newState);
        return true;
    }

    subscribePresence(callback) {
        // Call callback with initial presence
        callback(this.presence);
        return () => {}; // Return unsubscribe function
    }

    disconnect() {
        this.isConnected = false;
        console.log('WebSocket disconnected (simulated)');
        return true;
    }

    // Database collection simulation
    collection(name) {
        if (!this.collections[name]) {
            this.collections[name] = new Collection(name, this);
        }
        return this.collections[name];
    }
}

// Collection simulation for database functionality
class Collection {
    constructor(name, socket) {
        this.name = name;
        this.socket = socket;
        this.records = [];
        this.filterCriteria = {};

        // Initialize with demo data for user credits collection
        if (name === 'user_credits') {
            this.records = socket.demoLeaderboard.map((user, index) => ({
                id: 'record-' + index,
                username: user.username,
                credits: user.credits,
                verifications: user.verifications,
                created_at: new Date(Date.now() - Math.random() * 10000000).toISOString()
            }));
        }

        // Initialize with demo data for server verifications
        if (name === 'server_verifications') {
            const servers = ['minecraft', 'runescape', 'rct', 'sims', 'minetest', 'gtav', 'dontstarve', 'ark', 'dayz'];
            const users = socket.demoLeaderboard.map(u => u.username);
            const statuses = ['online', 'offline', 'unknown'];

            // Generate 50 random verification records
            for (let i = 0; i < 50; i++) {
                this.records.push({
                    id: 'verification-' + i,
                    username: users[Math.floor(Math.random() * users.length)],
                    server_id: servers[Math.floor(Math.random() * servers.length)],
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    created_at: new Date(Date.now() - Math.random() * 10000000).toISOString()
                });
            }
        }
    }

    filter(criteria) {
        const filteredCollection = new Collection(this.name, this.socket);
        filteredCollection.filterCriteria = criteria;
        return filteredCollection;
    }

    async getList() {
        // Apply filters if any
        let results = [...this.records];

        if (Object.keys(this.filterCriteria).length > 0) {
            results = results.filter(record => {
                for (const [key, value] of Object.entries(this.filterCriteria)) {
                    if (record[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }

        // Sort by creation date, newest first
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return results;
    }

    async create(data) {
        const record = {
            ...data,
            id: 'record-' + Math.random().toString(36).substring(2, 9),
            username: data.username || this.socket.peers[this.socket.clientId].username,
            created_at: new Date().toISOString()
        };

        this.records.push(record);
        console.log(`Created ${this.name} record:`, record);

        // If this is a user_credits record for the current user, add to leaderboard
        if (this.name === 'user_credits' && record.username === this.socket.peers[this.socket.clientId].username) {
            const existingIndex = this.socket.demoLeaderboard.findIndex(u => u.username === record.username);
            if (existingIndex === -1) {
                this.socket.demoLeaderboard.push({
                    username: record.username,
                    credits: record.credits || 0,
                    verifications: record.verifications || 0
                });
            }
        }

        // If this is a server verification, update the user's credits
        if (this.name === 'server_verifications') {
            const username = record.username;

            // Find the user in the user_credits collection
            const userCreditsCollection = this.socket.collection('user_credits');
            const userCreditRecords = await userCreditsCollection.filter({ username }).getList();

            if (userCreditRecords.length > 0) {
                const userRecord = userCreditRecords[0];

                // Update credits and verifications
                await userCreditsCollection.update(userRecord.id, {
                    credits: (userRecord.credits || 0) + 10, // 10 credits per verification
                    verifications: (userRecord.verifications || 0) + 1
                });
            }
        }

        return record;
    }

    async update(id, data) {
        const recordIndex = this.records.findIndex(r => r.id === id);

        if (recordIndex !== -1) {
            const record = this.records[recordIndex];

            // Update the record
            this.records[recordIndex] = {
                ...record,
                ...data,
                id: record.id, // Preserve ID
                username: record.username, // Preserve username
                created_at: record.created_at // Preserve creation date
            };

            console.log(`Updated ${this.name} record:`, this.records[recordIndex]);

            // If this is a user_credits update, update the leaderboard
            if (this.name === 'user_credits') {
                const username = record.username;
                const existingIndex = this.socket.demoLeaderboard.findIndex(u => u.username === username);

                if (existingIndex !== -1) {
                    this.socket.demoLeaderboard[existingIndex] = {
                        ...this.socket.demoLeaderboard[existingIndex],
                        credits: data.credits !== undefined ? data.credits : this.socket.demoLeaderboard[existingIndex].credits,
                        verifications: data.verifications !== undefined ? data.verifications : this.socket.demoLeaderboard[existingIndex].verifications
                    };
                }
            }

            return this.records[recordIndex];
        }

        throw new Error(`Record with ID ${id} not found`);
    }

    async delete(id) {
        const recordIndex = this.records.findIndex(r => r.id === id);

        if (recordIndex !== -1) {
            const record = this.records[recordIndex];
            this.records.splice(recordIndex, 1);

            console.log(`Deleted ${this.name} record:`, record);
            return true;
        }

        throw new Error(`Record with ID ${id} not found`);
    }

    subscribe(callback) {
        // Initial call with current data
        this.getList().then(callback);

        // Return unsubscribe function
        return () => {};
    }
}

// Make it globally available
window.WebsimSocket = WebsimSocket;