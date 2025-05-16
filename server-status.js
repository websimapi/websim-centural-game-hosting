document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize WebSocket connection for server status updates
    const room = new WebsimSocket();
    let adminKey = localStorage.getItem('centural-admin-key');
    let isAdmin = false;
    
    // Server status data
    const serverStatusData = {
        'minecraft': { name: 'Minecraft', status: 'unknown', lastChecked: null, ip: 'mc.centural.com' },
        'runescape': { name: 'Runescape\'s Dragonwilds', status: 'unknown', lastChecked: null, ip: 'rs.centural.com' },
        'rct': { name: 'Open Roller Coaster Tycoon', status: 'unknown', lastChecked: null, ip: 'rct.centural.com' },
        'sims': { name: 'Free Sims Online', status: 'unknown', lastChecked: null, ip: 'sims.centural.com' },
        'minetest': { name: 'Minetest', status: 'unknown', lastChecked: null, ip: 'minetest.centural.com' },
        'gtav': { name: 'GTA V', status: 'unknown', lastChecked: null, ip: 'gtav.centural.com' },
        'dontstarve': { name: 'Don\'t Starve', status: 'unknown', lastChecked: null, ip: 'ds.centural.com' },
        'ark': { name: 'Ark', status: 'unknown', lastChecked: null, ip: 'ark.centural.com' },
        'dayz': { name: 'DayZ', status: 'unknown', lastChecked: null, ip: 'dayz.centural.com' }
    };
    
    // Create server status section
    function createServerStatusSection() {
        // Create the section after games section
        const gamesSection = document.getElementById('games');
        
        const statusSection = document.createElement('section');
        statusSection.id = 'server-status';
        statusSection.className = 'server-status';
        
        const statusHtml = `
            <div class="container">
                <h2 class="section-title">Server Status</h2>
                <div class="status-info">
                    <p>Real-time server status for all Centural game servers.</p>
                    <p id="last-updated">Last updated: Never</p>
                    <div id="admin-panel" style="display: none;">
                        <p>You are logged in as an admin. Client monitoring apps will connect to your dashboard.</p>
                        <button id="admin-logout" class="btn">Logout</button>
                    </div>
                    <div id="admin-login" style="margin-top: 20px;">
                        <input type="password" id="admin-key" placeholder="Admin Key" class="admin-input">
                        <button id="admin-login-btn" class="btn">Login as Admin</button>
                    </div>
                </div>
                <div class="status-grid" id="status-grid">
                    <!-- Will be populated dynamically -->
                </div>
                <div class="status-download">
                    <h3>Monitor Your Servers</h3>
                    <p>Download our server monitoring app to keep track of your game servers.</p>
                    <div class="download-buttons">
                        <a href="server-monitor.zip" class="btn">Download for Windows</a>
                        <a href="server-monitor.zip" class="btn">Download for Mac</a>
                        <a href="server-monitor.zip" class="btn">Download for Linux</a>
                    </div>
                </div>
            </div>
        `;
        
        statusSection.innerHTML = statusHtml;
        gamesSection.parentNode.insertBefore(statusSection, gamesSection.nextSibling);
        
        // Populate server status cards
        updateServerStatusGrid();
        
        // Setup admin login functionality
        setupAdminFunctionality();
    }
    
    // Update the server status grid with current data
    function updateServerStatusGrid() {
        const statusGrid = document.getElementById('status-grid');
        statusGrid.innerHTML = '';
        
        for (const [key, server] of Object.entries(serverStatusData)) {
            const statusClass = getStatusClass(server.status);
            const statusCard = document.createElement('div');
            statusCard.className = `status-card ${statusClass}`;
            statusCard.dataset.server = key;
            
            statusCard.innerHTML = `
                <h3>${server.name}</h3>
                <div class="server-ip">${server.ip}</div>
                <div class="status-indicator">
                    <span class="status-dot"></span>
                    <span class="status-text">${formatStatus(server.status)}</span>
                </div>
                <div class="last-checked">${server.lastChecked ? 'Last checked: ' + formatTime(server.lastChecked) : 'Not checked yet'}</div>
            `;
            
            statusGrid.appendChild(statusCard);
        }
        
        // Update the last updated timestamp
        const lastUpdated = document.getElementById('last-updated');
        lastUpdated.textContent = 'Last updated: ' + formatTime(new Date());
    }
    
    // Format status for display
    function formatStatus(status) {
        switch(status) {
            case 'online': return 'Online';
            case 'offline': return 'Offline';
            case 'unknown': return 'Unknown';
            default: return 'Checking...';
        }
    }
    
    // Get CSS class based on status
    function getStatusClass(status) {
        switch(status) {
            case 'online': return 'status-online';
            case 'offline': return 'status-offline';
            case 'unknown': 
            default: return 'status-unknown';
        }
    }
    
    // Format time for display
    function formatTime(time) {
        if (!time) return 'Never';
        
        const date = new Date(time);
        return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
    }
    
    // Setup admin functionality
    function setupAdminFunctionality() {
        const adminPanel = document.getElementById('admin-panel');
        const adminLogin = document.getElementById('admin-login');
        const adminKey = document.getElementById('admin-key');
        const adminLoginBtn = document.getElementById('admin-login-btn');
        const adminLogoutBtn = document.getElementById('admin-logout');
        
        // Check if admin is already logged in
        if (localStorage.getItem('centural-admin-key')) {
            adminPanel.style.display = 'block';
            adminLogin.style.display = 'none';
            isAdmin = true;
        }
        
        // Admin login
        adminLoginBtn.addEventListener('click', function() {
            const keyValue = adminKey.value.trim();
            if (keyValue) {
                localStorage.setItem('centural-admin-key', keyValue);
                adminKey.value = '';
                adminPanel.style.display = 'block';
                adminLogin.style.display = 'none';
                isAdmin = true;
                initializeWebSocket(); // Reinitialize with admin privileges
            }
        });
        
        // Admin logout
        adminLogoutBtn.addEventListener('click', function() {
            localStorage.removeItem('centural-admin-key');
            adminPanel.style.display = 'none';
            adminLogin.style.display = 'block';
            isAdmin = false;
            initializeWebSocket(); // Reinitialize without admin privileges
        });
    }
    
    // Initialize WebSocket connection
    async function initializeWebSocket() {
        try {
            await room.initialize();
            
            // Set up event handler for incoming messages
            room.onmessage = (event) => {
                const data = event.data;
                
                if (data.type === 'server-status-update') {
                    handleServerStatusUpdate(data);
                }
            };
            
            // Subscribe to room state to receive updates
            room.subscribeRoomState((currentRoomState) => {
                if (currentRoomState.serverStatus) {
                    // Update local state from room state
                    for (const [key, status] of Object.entries(currentRoomState.serverStatus)) {
                        if (serverStatusData[key]) {
                            serverStatusData[key].status = status.status;
                            serverStatusData[key].lastChecked = status.lastChecked;
                        }
                    }
                    updateServerStatusGrid();
                }
            });
            
            // If admin, update presence to indicate admin status
            if (isAdmin) {
                room.updatePresence({
                    isAdmin: true,
                    adminKey: localStorage.getItem('centural-admin-key')
                });
            }
            
            console.log('WebSocket connection established successfully');
        } catch (error) {
            console.error('Failed to initialize WebSocket connection:', error);
        }
    }
    
    // Handle server status updates from monitoring clients
    function handleServerStatusUpdate(data) {
        // Only process updates from authenticated sources
        if (!data.isAuthenticated) return;
        
        const updates = data.updates;
        let hasUpdates = false;
        
        // Update local state
        for (const [key, status] of Object.entries(updates)) {
            if (serverStatusData[key]) {
                serverStatusData[key].status = status.status;
                serverStatusData[key].lastChecked = status.lastChecked || new Date().toISOString();
                hasUpdates = true;
            }
        }
        
        if (hasUpdates) {
            // Update the UI
            updateServerStatusGrid();
            
            // If admin, update room state
            if (isAdmin) {
                const roomStateUpdate = {};
                for (const [key, data] of Object.entries(serverStatusData)) {
                    roomStateUpdate[key] = {
                        status: data.status,
                        lastChecked: data.lastChecked
                    };
                }
                
                room.updateRoomState({
                    serverStatus: roomStateUpdate
                });
            }
        }
    }
    
    // Add CSS for server status
    function addServerStatusStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .server-status {
                padding: 5rem 0;
                background-color: var(--bg-color);
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 2rem;
                margin-bottom: 3rem;
            }
            
            .status-card {
                background: white;
                border-radius: 10px;
                padding: 1.5rem;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                transition: transform 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .status-card:hover {
                transform: translateY(-5px);
            }
            
            .status-card h3 {
                margin-bottom: 0.5rem;
                font-size: 1.3rem;
            }
            
            .server-ip {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 1rem;
            }
            
            .status-indicator {
                display: flex;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 8px;
            }
            
            .status-online .status-dot {
                background-color: var(--success-color);
                box-shadow: 0 0 8px var(--success-color);
            }
            
            .status-offline .status-dot {
                background-color: var(--danger-color);
                box-shadow: 0 0 8px var(--danger-color);
            }
            
            .status-unknown .status-dot {
                background-color: var(--warning-color);
                box-shadow: 0 0 8px var(--warning-color);
            }
            
            .status-text {
                font-weight: 600;
            }
            
            .status-online .status-text {
                color: var(--success-color);
            }
            
            .status-offline .status-text {
                color: var(--danger-color);
            }
            
            .status-unknown .status-text {
                color: var(--warning-color);
            }
            
            .last-checked {
                font-size: 0.8rem;
                color: #999;
                margin-top: 0.5rem;
            }
            
            .status-info {
                text-align: center;
                max-width: 600px;
                margin: 0 auto 3rem;
            }
            
            #last-updated {
                font-size: 0.9rem;
                color: #666;
                margin-top: 0.5rem;
            }
            
            .status-download {
                text-align: center;
                margin-top: 3rem;
                padding: 2rem;
                background-color: rgba(108, 92, 231, 0.05);
                border-radius: 10px;
            }
            
            .status-download h3 {
                margin-bottom: 1rem;
            }
            
            .download-buttons {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 1rem;
                margin-top: 1.5rem;
            }
            
            .admin-input {
                padding: 0.7rem 1rem;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-right: 0.5rem;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Initialize everything
    function initialize() {
        addServerStatusStyles();
        createServerStatusSection();
        initializeWebSocket();
    }
    
    // Start everything
    initialize();
});