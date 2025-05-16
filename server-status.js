document.addEventListener('DOMContentLoaded', function() {
    // Create and initialize WebSocket connection for server status updates
    const room = new WebsimSocket();
    let adminKey = localStorage.getItem('centural-admin-key');
    let isAdmin = false;
    let currentUser = null;
    
    // User credit system
    const userCredits = {
        credits: 0,
        verifications: 0,
        username: '',
        lastUpdated: null
    };
    
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
                
                <!-- User Credit Panel -->
                <div class="credit-panel">
                    <div class="credit-info" id="credit-info">
                        <div class="credits-icon">💰</div>
                        <div class="credit-details">
                            <h3>Server Verification Rewards</h3>
                            <p>Help us verify server status and earn credits!</p>
                            <div id="user-credits-container" style="display: none;">
                                <div class="user-details">
                                    <div class="user-avatar">
                                        <img id="user-avatar" src="" alt="User Avatar">
                                    </div>
                                    <div class="user-stats">
                                        <p><strong>Username:</strong> <span id="username-display">Not logged in</span></p>
                                        <p><strong>Credits:</strong> <span id="credits-display">0</span></p>
                                        <p><strong>Verifications:</strong> <span id="verifications-display">0</span></p>
                                        <p><strong>Last Active:</strong> <span id="last-active-display">Never</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="credit-actions">
                        <a href="download.html" class="btn btn-primary">Download Monitor App</a>
                        <button id="rewards-info-btn" class="btn">How to Earn Credits</button>
                    </div>
                </div>
                
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
                
                <!-- Verification Leaderboard -->
                <div class="verification-leaderboard">
                    <h3>Top Verifiers</h3>
                    <div class="leaderboard-container" id="leaderboard-container">
                        <div class="leaderboard-loading">Loading leaderboard data...</div>
                    </div>
                </div>
                
                <div class="status-grid" id="status-grid">
                    <!-- Will be populated dynamically -->
                </div>
                
                <div class="status-download">
                    <h3>Monitor Servers & Earn Credits</h3>
                    <p>Download our server monitoring app to keep track of game servers and earn credits for your verifications.</p>
                    <div class="download-buttons">
                        <a href="server-monitor.zip" class="btn">Download for Windows</a>
                        <a href="server-monitor.zip" class="btn">Download for Mac</a>
                        <a href="server-monitor.zip" class="btn">Download for Linux</a>
                    </div>
                </div>
            </div>
            
            <!-- Modal for Rewards Info -->
            <div id="rewards-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h3>How to Earn Credits</h3>
                    <div class="rewards-info">
                        <div class="reward-item">
                            <div class="reward-icon">✅</div>
                            <div class="reward-details">
                                <h4>Server Verification</h4>
                                <p>Earn <strong>10 credits</strong> each time you verify a server's status</p>
                            </div>
                        </div>
                        <div class="reward-item">
                            <div class="reward-icon">🔄</div>
                            <div class="reward-details">
                                <h4>Continuous Monitoring</h4>
                                <p>Earn <strong>50 bonus credits</strong> for every hour your monitor app stays connected</p>
                            </div>
                        </div>
                        <div class="reward-item">
                            <div class="reward-icon">⚡</div>
                            <div class="reward-details">
                                <h4>First to Report Outage</h4>
                                <p>Earn <strong>100 bonus credits</strong> if you're the first to report a server outage</p>
                            </div>
                        </div>
                        <div class="reward-item">
                            <div class="reward-icon">🏆</div>
                            <div class="reward-details">
                                <h4>Leaderboard Rewards</h4>
                                <p>Top 3 verifiers each month receive <strong>500/300/100 bonus credits</strong></p>
                            </div>
                        </div>
                    </div>
                    <h3>How to Use Credits</h3>
                    <div class="credits-usage">
                        <ul>
                            <li><strong>Server Priority:</strong> 500 credits for 1 week of priority server access</li>
                            <li><strong>Reserved Slots:</strong> 1000 credits for 1 month of reserved server slots</li>
                            <li><strong>Premium Support:</strong> 300 credits for priority support ticket</li>
                            <li><strong>Server Discounts:</strong> 5000 credits for 10% off your next server purchase</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        statusSection.innerHTML = statusHtml;
        gamesSection.parentNode.insertBefore(statusSection, gamesSection.nextSibling);
        
        // Populate server status cards
        updateServerStatusGrid();
        
        // Setup admin functionality
        setupAdminFunctionality();
        
        // Setup rewards modal
        setupRewardsModal();
    }
    
    // Setup rewards modal functionality
    function setupRewardsModal() {
        const modal = document.getElementById('rewards-modal');
        const btn = document.getElementById('rewards-info-btn');
        const closeBtn = document.querySelector('.close-modal');
        
        if (!modal || !btn || !closeBtn) return;
        
        btn.addEventListener('click', function() {
            modal.style.display = 'block';
        });
        
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
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
                <div class="verifier-info">${server.verifier ? `Verified by: ${server.verifier}` : ''}</div>
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
    
    // Update the user credit display
    function updateUserCreditDisplay() {
        const userCreditsContainer = document.getElementById('user-credits-container');
        const usernameDisplay = document.getElementById('username-display');
        const creditsDisplay = document.getElementById('credits-display');
        const verificationsDisplay = document.getElementById('verifications-display');
        const lastActiveDisplay = document.getElementById('last-active-display');
        const userAvatar = document.getElementById('user-avatar');
        
        if (currentUser) {
            userCreditsContainer.style.display = 'block';
            usernameDisplay.textContent = currentUser.username;
            userAvatar.src = `https://images.websim.com/avatar/${currentUser.username}`;
            creditsDisplay.textContent = userCredits.credits;
            verificationsDisplay.textContent = userCredits.verifications;
            lastActiveDisplay.textContent = userCredits.lastUpdated ? formatTime(userCredits.lastUpdated) : 'Never';
        } else {
            userCreditsContainer.style.display = 'none';
        }
    }
    
    // Update the leaderboard display
    function updateLeaderboard(leaderboardData) {
        const leaderboardContainer = document.getElementById('leaderboard-container');
        
        if (!leaderboardData || leaderboardData.length === 0) {
            leaderboardContainer.innerHTML = '<div class="no-data">No verification data available yet</div>';
            return;
        }
        
        let leaderboardHTML = '<div class="leaderboard-table">';
        leaderboardHTML += '<div class="leaderboard-header">';
        leaderboardHTML += '<div class="rank-col">Rank</div>';
        leaderboardHTML += '<div class="user-col">User</div>';
        leaderboardHTML += '<div class="verifications-col">Verifications</div>';
        leaderboardHTML += '<div class="credits-col">Credits</div>';
        leaderboardHTML += '</div>';
        
        leaderboardData.forEach((user, index) => {
            const rankClass = index < 3 ? `rank-${index + 1}` : '';
            
            leaderboardHTML += `<div class="leaderboard-row ${rankClass}">`;
            leaderboardHTML += `<div class="rank-col">${index + 1}</div>`;
            leaderboardHTML += `<div class="user-col">`;
            leaderboardHTML += `<img class="user-avatar-small" src="https://images.websim.com/avatar/${user.username}" alt="${user.username}">`;
            leaderboardHTML += `<span>${user.username}</span>`;
            leaderboardHTML += `</div>`;
            leaderboardHTML += `<div class="verifications-col">${user.verifications}</div>`;
            leaderboardHTML += `<div class="credits-col">${user.credits}</div>`;
            leaderboardHTML += `</div>`;
        });
        
        leaderboardHTML += '</div>';
        leaderboardContainer.innerHTML = leaderboardHTML;
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
    
    // Load user credits from database
    async function loadUserCredits(username) {
        try {
            // Get the user's credits from the database
            const userCreditRecord = await room.collection('user_credits')
                .filter({ username: username })
                .getList();
                
            if (userCreditRecord && userCreditRecord.length > 0) {
                // Use the latest record if multiple exist
                const latestRecord = userCreditRecord[0];
                
                userCredits.username = username;
                userCredits.credits = latestRecord.credits || 0;
                userCredits.verifications = latestRecord.verifications || 0;
                userCredits.lastUpdated = latestRecord.created_at;
                
                // Update UI
                updateUserCreditDisplay();
                
                console.log('Loaded user credits:', userCredits);
            } else {
                // Create a new record for this user
                const newUserRecord = await room.collection('user_credits').create({
                    username: username,
                    credits: 0,
                    verifications: 0
                });
                
                userCredits.username = username;
                userCredits.credits = 0;
                userCredits.verifications = 0;
                userCredits.lastUpdated = newUserRecord.created_at;
                
                // Update UI
                updateUserCreditDisplay();
                
                console.log('Created new user credits record:', userCredits);
            }
        } catch (error) {
            console.error('Failed to load user credits:', error);
        }
    }
    
    // Load verification leaderboard from database
    async function loadLeaderboard() {
        try {
            // Get all user credits records
            const allUserCredits = await room.collection('user_credits').getList();
            
            if (allUserCredits && allUserCredits.length > 0) {
                // Sort by credits (highest first)
                const sortedUsers = allUserCredits.sort((a, b) => b.credits - a.credits);
                
                // Take top 10
                const leaderboardData = sortedUsers.slice(0, 10).map(user => ({
                    username: user.username,
                    credits: user.credits || 0,
                    verifications: user.verifications || 0
                }));
                
                // Update UI
                updateLeaderboard(leaderboardData);
            } else {
                updateLeaderboard([]);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            updateLeaderboard([]);
        }
    }
    
    // Record server verification and award credits
    async function recordVerification(username, serverId, status) {
        try {
            // Record the verification
            await room.collection('server_verifications').create({
                username: username,
                server_id: serverId,
                status: status
            });
            
            // Update the user's credits
            const userCreditRecords = await room.collection('user_credits')
                .filter({ username: username })
                .getList();
                
            if (userCreditRecords && userCreditRecords.length > 0) {
                const userRecord = userCreditRecords[0];
                
                // Calculate new values
                const newCredits = (userRecord.credits || 0) + 10; // 10 credits per verification
                const newVerifications = (userRecord.verifications || 0) + 1;
                
                // Update the record
                await room.collection('user_credits').update(userRecord.id, {
                    credits: newCredits,
                    verifications: newVerifications
                });
                
                // Update local state
                userCredits.credits = newCredits;
                userCredits.verifications = newVerifications;
                userCredits.lastUpdated = new Date().toISOString();
                
                // Update UI
                updateUserCreditDisplay();
                
                console.log(`Awarded 10 credits to ${username} for verifying ${serverId}`);
                
                // Reload leaderboard
                loadLeaderboard();
            }
        } catch (error) {
            console.error('Failed to record verification:', error);
        }
    }
    
    // Check if we should award first outage reporter bonus
    async function checkOutageBonus(username, serverId) {
        try {
            // Get recent verifications for this server
            const recentVerifications = await room.collection('server_verifications')
                .filter({ server_id: serverId })
                .getList();
                
            // Sort by timestamp (newest first)
            recentVerifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Check if this is the first offline report after an online period
            if (recentVerifications.length >= 2) {
                // First is current verification (offline)
                // Second should be the previous state
                const previousState = recentVerifications[1];
                
                if (previousState.status === 'online') {
                    // Award bonus for being first to report outage
                    const userCreditRecords = await room.collection('user_credits')
                        .filter({ username: username })
                        .getList();
                        
                    if (userCreditRecords && userCreditRecords.length > 0) {
                        const userRecord = userCreditRecords[0];
                        
                        // Calculate new values (100 bonus)
                        const newCredits = (userRecord.credits || 0) + 100; 
                        
                        // Update the record
                        await room.collection('user_credits').update(userRecord.id, {
                            credits: newCredits
                        });
                        
                        // Update local state
                        userCredits.credits = newCredits;
                        userCredits.lastUpdated = new Date().toISOString();
                        
                        // Update UI
                        updateUserCreditDisplay();
                        
                        console.log(`Awarded 100 BONUS credits to ${username} for being first to report ${serverId} outage!`);
                        
                        // Add notification
                        addNotification(`🏆 You earned 100 BONUS credits for being first to report ${serverStatusData[serverId].name} outage!`);
                        
                        // Reload leaderboard
                        loadLeaderboard();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check outage bonus:', error);
        }
    }
    
    // Add a notification message
    function addNotification(message) {
        // Create notification element if it doesn't exist
        let notificationArea = document.querySelector('.notification-area');
        
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.className = 'notification-area';
            document.body.appendChild(notificationArea);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Add to DOM
        notificationArea.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Initialize WebSocket connection
    async function initializeWebSocket() {
        try {
            await room.initialize();
            
            // Get current user info from peers
            currentUser = room.peers[room.clientId];
            
            if (currentUser) {
                console.log('Current user:', currentUser);
                
                // Load user credits
                await loadUserCredits(currentUser.username);
                
                // Load leaderboard
                await loadLeaderboard();
            }
            
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
                            serverStatusData[key].verifier = status.verifier;
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
        if (!data.isAuthenticated && !data.username) return;
        
        const updates = data.updates;
        let hasUpdates = false;
        
        // Update local state
        for (const [key, status] of Object.entries(updates)) {
            if (serverStatusData[key]) {
                // Check if status has changed
                const previousStatus = serverStatusData[key].status;
                const newStatus = status.status;
                
                serverStatusData[key].status = newStatus;
                serverStatusData[key].lastChecked = status.lastChecked || new Date().toISOString();
                serverStatusData[key].verifier = data.username || 'Anonymous';
                hasUpdates = true;
                
                // Record verification and award credits if we have a username
                if (data.username) {
                    recordVerification(data.username, key, newStatus);
                    
                    // Check for outage bonus
                    if (newStatus === 'offline' && previousStatus !== 'offline') {
                        checkOutageBonus(data.username, key);
                    }
                }
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
                        lastChecked: data.lastChecked,
                        verifier: data.verifier
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
            
            .verifier-info {
                font-size: 0.8rem;
                color: #666;
                margin-top: 0.5rem;
                font-style: italic;
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
            
            /* Credit Panel Styles */
            .credit-panel {
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                margin-bottom: 3rem;
                display: flex;
                flex-wrap: wrap;
                overflow: hidden;
            }
            
            .credit-info {
                flex: 1;
                min-width: 280px;
                padding: 2rem;
                display: flex;
                align-items: center;
                background: linear-gradient(to right, rgba(108, 92, 231, 0.05), transparent);
            }
            
            .credits-icon {
                font-size: 3rem;
                margin-right: 1.5rem;
                color: var(--primary-color);
            }
            
            .credit-details h3 {
                margin-bottom: 0.5rem;
                color: var(--primary-color);
            }
            
            .credit-actions {
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 2rem;
                background-color: white;
                min-width: 200px;
            }
            
            .credit-actions .btn {
                margin-bottom: 1rem;
            }
            
            .credit-actions .btn:last-child {
                margin-bottom: 0;
            }
            
            .user-details {
                margin-top: 1.5rem;
                display: flex;
                align-items: center;
                padding: 1rem;
                background-color: rgba(255, 255, 255, 0.7);
                border-radius: 8px;
            }
            
            .user-avatar {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                overflow: hidden;
                margin-right: 1rem;
                border: 2px solid var(--primary-color);
            }
            
            .user-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .user-stats {
                flex: 1;
            }
            
            .user-stats p {
                margin-bottom: 0.3rem;
                font-size: 0.9rem;
            }
            
            /* Leaderboard Styles */
            .verification-leaderboard {
                margin-bottom: 3rem;
            }
            
            .verification-leaderboard h3 {
                text-align: center;
                margin-bottom: 1.5rem;
                color: var(--primary-color);
            }
            
            .leaderboard-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                overflow: hidden;
            }
            
            .leaderboard-loading,
            .no-data {
                padding: 2rem;
                text-align: center;
                color: #666;
            }
            
            .leaderboard-table {
                width: 100%;
            }
            
            .leaderboard-header {
                display: flex;
                background-color: rgba(108, 92, 231, 0.1);
                padding: 1rem;
                font-weight: 600;
                color: var(--primary-color);
            }
            
            .leaderboard-row {
                display: flex;
                padding: 1rem;
                border-bottom: 1px solid #eee;
                transition: background-color 0.3s ease;
            }
            
            .leaderboard-row:last-child {
                border-bottom: none;
            }
            
            .leaderboard-row:hover {
                background-color: rgba(108, 92, 231, 0.05);
            }
            
            .rank-col {
                width: 60px;
                text-align: center;
                font-weight: 600;
            }
            
            .user-col {
                flex: 1;
                display: flex;
                align-items: center;
            }
            
            .verifications-col,
            .credits-col {
                width: 120px;
                text-align: center;
            }
            
            .user-avatar-small {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                margin-right: 10px;
            }
            
            .rank-1 {
                background-color: rgba(255, 215, 0, 0.1);
            }
            
            .rank-2 {
                background-color: rgba(192, 192, 192, 0.1);
            }
            
            .rank-3 {
                background-color: rgba(205, 127, 50, 0.1);
            }
            
            /* Modal Styles */
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 1000;
                overflow: auto;
            }
            
            .modal-content {
                background-color: white;
                margin: 10% auto;
                padding: 2rem;
                border-radius: 10px;
                box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                position: relative;
            }
            
            .close-modal {
                position: absolute;
                top: 1rem;
                right: 1.5rem;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
            }
            
            .close-modal:hover {
                color: var(--primary-color);
            }
            
            .rewards-info {
                margin: 1.5rem 0;
            }
            
            .reward-item {
                display: flex;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #eee;
            }
            
            .reward-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            
            .reward-icon {
                font-size: 2rem;
                margin-right: 1.5rem;
                color: var(--primary-color);
                min-width: 40px;
                text-align: center;
            }
            
            .reward-details h4 {
                margin-bottom: 0.5rem;
                color: var(--dark-color);
            }
            
            .credits-usage ul {
                list-style: disc;
                padding-left: 1.5rem;
                margin: 1rem 0;
            }
            
            .credits-usage li {
                margin-bottom: 0.5rem;
            }
            
            /* Notification Styles */
            .notification-area {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            
            .notification {
                background-color: var(--primary-color);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 10px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.2);
                transform: translateX(120%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            @media (max-width: 768px) {
                .credit-info, .credit-actions {
                    width: 100%;
                }
                
                .verifications-col, .credits-col {
                    width: 80px;
                }
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