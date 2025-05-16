#!/usr/bin/env node

/**
 * Centural Server Monitor
 * A Node.js application to monitor game server status and report to the Centural dashboard
 */

// Import required libraries
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const { program } = require('commander');
const io = require('socket.io-client');
const ping = require('ping');
const { exec } = require('child_process');
const winston = require('winston');
const dotenv = require('dotenv');

// Load environment variables from .env file if present
dotenv.config();

// Setup logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'monitor.log' })
    ]
});

// Configuration object
const config = {
    // Default servers to monitor - can be overridden with config file
    servers: [
        { id: 'minecraft', name: 'Minecraft', host: 'mc.centural.com', port: 25565, type: 'ping' },
        { id: 'runescape', name: 'Runescape\'s Dragonwilds', host: 'rs.centural.com', port: 43594, type: 'ping' },
        { id: 'rct', name: 'Open Roller Coaster Tycoon', host: 'rct.centural.com', port: 8080, type: 'ping' },
        { id: 'sims', name: 'Free Sims Online', host: 'sims.centural.com', port: 12000, type: 'ping' },
        { id: 'minetest', name: 'Minetest', host: 'minetest.centural.com', port: 30000, type: 'ping' },
        { id: 'gtav', name: 'GTA V', host: 'gtav.centural.com', port: 30120, type: 'ping' },
        { id: 'dontstarve', name: 'Don\'t Starve', host: 'ds.centural.com', port: 10999, type: 'ping' },
        { id: 'ark', name: 'Ark', host: 'ark.centural.com', port: 27015, type: 'ping' },
        { id: 'dayz', name: 'DayZ', host: 'dayz.centural.com', port: 2302, type: 'ping' }
    ],
    // Server-specific processes to check (for local monitoring)
    processes: {
        'minecraft': 'java',
        'runescape': 'java',
        'rct': 'openrct2', 
        'sims': 'freeso',
        'minetest': 'minetest',
        'gtav': 'fivem',
        'dontstarve': 'dontstarve_dedicated_server',
        'ark': 'ShooterGameServer',
        'dayz': 'DayZServer'
    },
    // WebSocket connection details
    socket: {
        url: 'https://centural.websim.ai',
        reconnectInterval: 5000, // 5 seconds
        adminKey: null
    },
    // Check settings
    monitoring: {
        interval: 60000, // 1 minute
        timeout: 5000 // 5 seconds
    },
    // File paths
    paths: {
        configFile: path.join(__dirname, 'config.json'),
        adminKeyFile: path.join(__dirname, '.adminkey')
    }
};

// State object to store server statuses
const state = {
    isRunning: false,
    isConnected: false,
    serverStatus: {},
    lastCheck: null
};

// Helper function to save configuration to file
const saveConfig = () => {
    try {
        const configToSave = { ...config };
        delete configToSave.paths; // Don't save paths
        
        fs.writeFileSync(
            config.paths.configFile, 
            JSON.stringify(configToSave, null, 2)
        );
        logger.info('Configuration saved to ' + config.paths.configFile);
        return true;
    } catch (error) {
        logger.error('Failed to save configuration: ' + error.message);
        return false;
    }
};

// Helper function to load configuration from file
const loadConfig = () => {
    try {
        if (fs.existsSync(config.paths.configFile)) {
            const loadedConfig = JSON.parse(
                fs.readFileSync(config.paths.configFile, 'utf8')
            );
            
            // Merge loaded config with default config
            Object.assign(config, loadedConfig);
            logger.info('Configuration loaded from ' + config.paths.configFile);
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to load configuration: ' + error.message);
        return false;
    }
};

// Helper function to load admin key from file
const loadAdminKey = () => {
    try {
        if (fs.existsSync(config.paths.adminKeyFile)) {
            config.socket.adminKey = fs.readFileSync(
                config.paths.adminKeyFile, 
                'utf8'
            ).trim();
            logger.info('Admin key loaded');
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to load admin key: ' + error.message);
        return false;
    }
};

// Helper function to save admin key to file
const saveAdminKey = (key) => {
    try {
        fs.writeFileSync(config.paths.adminKeyFile, key);
        config.socket.adminKey = key;
        logger.info('Admin key saved');
        return true;
    } catch (error) {
        logger.error('Failed to save admin key: ' + error.message);
        return false;
    }
};

// Initialize socket connection
let socket = null;

const connectSocket = () => {
    if (socket) {
        socket.disconnect();
    }
    
    logger.info('Connecting to WebSocket server...');
    
    socket = io(config.socket.url, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: config.socket.reconnectInterval
    });
    
    socket.on('connect', () => {
        state.isConnected = true;
        logger.info('Connected to WebSocket server');
        
        // Authenticate with admin key if available
        if (config.socket.adminKey) {
            socket.emit('authenticate', { adminKey: config.socket.adminKey });
        }
        
        // Send initial server status if available
        if (Object.keys(state.serverStatus).length > 0) {
            sendStatusUpdate();
        }
    });
    
    socket.on('disconnect', () => {
        state.isConnected = false;
        logger.info('Disconnected from WebSocket server');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
        logger.info(`Attempting to reconnect (${attemptNumber})...`);
    });
    
    socket.on('authenticate_result', (result) => {
        if (result.success) {
            logger.info('Successfully authenticated as admin');
        } else {
            logger.error('Failed to authenticate: ' + result.message);
        }
    });
    
    socket.on('error', (error) => {
        logger.error('Socket error: ' + error);
    });
    
    return socket;
};

// Function to disconnect socket
const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        state.isConnected = false;
        logger.info('Disconnected from WebSocket server');
    }
};

// Send status update to the server
const sendStatusUpdate = () => {
    if (!socket || !state.isConnected) {
        logger.warn('Cannot send status update: Not connected to server');
        return false;
    }
    
    try {
        socket.emit('server-status-update', {
            updates: state.serverStatus,
            adminKey: config.socket.adminKey,
            timestamp: new Date().toISOString()
        });
        
        logger.info('Status update sent to server');
        return true;
    } catch (error) {
        logger.error('Failed to send status update: ' + error.message);
        return false;
    }
};

// Check if a local process is running
const checkProcess = (processName) => {
    return new Promise((resolve) => {
        let command;
        
        if (process.platform === 'win32') {
            command = `tasklist /FI "IMAGENAME eq ${processName}*" /NH`;
        } else {
            command = `ps aux | grep -v grep | grep -i ${processName}`;
        }
        
        exec(command, (error, stdout) => {
            // Process is running if stdout contains results (ignoring error)
            resolve(stdout.trim().length > 0);
        });
    });
};

// Check server status using ping
const checkServerPing = async (server) => {
    try {
        const result = await ping.promise.probe(server.host, {
            timeout: config.monitoring.timeout / 1000 // ping uses seconds
        });
        
        return {
            isAlive: result.alive,
            time: result.time,
            output: result.output
        };
    } catch (error) {
        logger.error(`Ping failed for ${server.name}: ${error.message}`);
        return { isAlive: false, time: 0, output: error.message };
    }
};

// Check if a server port is open
const checkServerPort = (server) => {
    return new Promise((resolve) => {
        const net = require('net');
        const socket = new net.Socket();
        
        // Set timeout
        socket.setTimeout(config.monitoring.timeout);
        
        // Try to connect
        socket.connect(server.port, server.host, () => {
            socket.destroy();
            resolve({ isAlive: true, time: null, output: 'Port open' });
        });
        
        // Handle errors
        socket.on('error', () => {
            socket.destroy();
            resolve({ isAlive: false, time: null, output: 'Port closed' });
        });
        
        // Handle timeout
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ isAlive: false, time: null, output: 'Connection timeout' });
        });
    });
};

// Check a single server's status
const checkServer = async (server) => {
    logger.info(`Checking ${server.name} (${server.host})...`);
    
    try {
        let result;
        let processAlive = false;
        
        // Check if process is running (if we're checking local processes)
        if (config.processes[server.id]) {
            processAlive = await checkProcess(config.processes[server.id]);
            logger.info(`Process check for ${server.name}: ${processAlive ? 'Running' : 'Not running'}`);
        }
        
        // Perform network check based on server type
        if (server.type === 'ping') {
            result = await checkServerPing(server);
        } else if (server.type === 'port') {
            result = await checkServerPort(server);
        } else {
            // Default to ping
            result = await checkServerPing(server);
        }
        
        // If either the process is running or the server responds, consider it online
        const isOnline = processAlive || result.isAlive;
        
        // Update status
        state.serverStatus[server.id] = {
            status: isOnline ? 'online' : 'offline',
            lastChecked: new Date().toISOString()
        };
        
        logger.info(`${server.name} status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        return isOnline;
    } catch (error) {
        logger.error(`Failed to check ${server.name}: ${error.message}`);
        
        // Update status as unknown on error
        state.serverStatus[server.id] = {
            status: 'unknown',
            lastChecked: new Date().toISOString(),
            error: error.message
        };
        
        return false;
    }
};

// Check all servers
const checkAllServers = async () => {
    logger.info('Starting server check...');
    state.lastCheck = new Date();
    
    try {
        for (const server of config.servers) {
            await checkServer(server);
        }
        
        // After checking all servers, send the status update
        if (state.isConnected) {
            sendStatusUpdate();
        }
        
        logger.info('Server check completed');
        return true;
    } catch (error) {
        logger.error('Failed to check servers: ' + error.message);
        return false;
    }
};

// Start monitoring
const startMonitoring = () => {
    if (state.isRunning) {
        logger.warn('Monitoring is already running');
        return false;
    }
    
    state.isRunning = true;
    logger.info('Starting server monitoring...');
    
    // Connect to WebSocket server
    if (!state.isConnected) {
        connectSocket();
    }
    
    // Do an initial check immediately
    checkAllServers();
    
    // Set up interval for regular checks
    const intervalId = setInterval(() => {
        if (state.isRunning) {
            checkAllServers();
        } else {
            clearInterval(intervalId);
        }
    }, config.monitoring.interval);
    
    logger.info(`Monitoring interval set to ${config.monitoring.interval / 1000} seconds`);
    return true;
};

// Stop monitoring
const stopMonitoring = () => {
    if (!state.isRunning) {
        logger.warn('Monitoring is not running');
        return false;
    }
    
    state.isRunning = false;
    logger.info('Stopping server monitoring...');
    
    // Disconnect from WebSocket server
    disconnectSocket();
    
    return true;
};

// Display program header
const displayHeader = () => {
    console.log(chalk.blue(figlet.textSync('Centural', { horizontalLayout: 'full' })));
    console.log(chalk.yellow(figlet.textSync('Server Monitor', { horizontalLayout: 'full', font: 'small' })));
    console.log(chalk.green('\nVersion 1.0.0\n'));
    console.log(chalk.cyan('A tool to monitor game server status and report to the Centural dashboard'));
    console.log(chalk.cyan('------------------------------------------------------------------------------\n'));
};

// Define command-line interface
program
    .version('1.0.0')
    .description('Centural Server Monitor');

program
    .command('start')
    .description('Start monitoring servers')
    .option('-n, --no-auto-connect', 'Do not automatically connect to WebSocket server')
    .action((options) => {
        displayHeader();
        loadConfig();
        loadAdminKey();
        
        if (options.autoConnect === false) {
            console.log(chalk.yellow('Auto-connect is disabled. Will not connect to WebSocket server.'));
        } else {
            connectSocket();
        }
        
        startMonitoring();
        
        console.log(chalk.green('\nMonitoring started. Press Ctrl+C to exit.'));
    });

program
    .command('check')
    .description('Check server status once without starting monitoring')
    .action(async () => {
        displayHeader();
        loadConfig();
        
        await checkAllServers();
        
        // Display results
        console.log(chalk.cyan('\nServer Status:'));
        for (const [id, status] of Object.entries(state.serverStatus)) {
            const server = config.servers.find(s => s.id === id);
            if (!server) continue;
            
            const statusColor = status.status === 'online' ? chalk.green : 
                               status.status === 'offline' ? chalk.red : chalk.yellow;
            
            console.log(`${server.name} (${server.host}): ${statusColor(status.status.toUpperCase())}`);
        }
        
        process.exit(0);
    });

program
    .command('configure')
    .description('Configure monitor settings')
    .action(async () => {
        displayHeader();
        loadConfig();
        loadAdminKey();
        
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'websocketUrl',
                message: 'WebSocket server URL:',
                default: config.socket.url
            },
            {
                type: 'input',
                name: 'checkInterval',
                message: 'Check interval (seconds):',
                default: config.monitoring.interval / 1000,
                validate: value => !isNaN(value) ? true : 'Please enter a number'
            },
            {
                type: 'input',
                name: 'adminKey',
                message: 'Admin Key (leave empty to keep current):',
                default: ''
            }
        ]);
        
        // Update configuration
        config.socket.url = answers.websocketUrl;
        config.monitoring.interval = parseInt(answers.checkInterval) * 1000;
        
        if (answers.adminKey) {
            saveAdminKey(answers.adminKey);
        }
        
        // Save configuration
        saveConfig();
        
        console.log(chalk.green('\nConfiguration saved. Use \'start\' command to begin monitoring.'));
        process.exit(0);
    });

program
    .command('add-server')
    .description('Add a new server to monitor')
    .action(async () => {
        displayHeader();
        loadConfig();
        
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'id',
                message: 'Server ID (no spaces):',
                validate: value => value.trim().length > 0 ? true : 'Please enter a valid ID'
            },
            {
                type: 'input',
                name: 'name',
                message: 'Server Name:',
                validate: value => value.trim().length > 0 ? true : 'Please enter a valid name'
            },
            {
                type: 'input',
                name: 'host',
                message: 'Hostname or IP:',
                validate: value => value.trim().length > 0 ? true : 'Please enter a valid hostname'
            },
            {
                type: 'input',
                name: 'port',
                message: 'Port:',
                default: '25565',
                validate: value => !isNaN(value) ? true : 'Please enter a number'
            },
            {
                type: 'list',
                name: 'type',
                message: 'Check Type:',
                choices: ['ping', 'port'],
                default: 'ping'
            },
            {
                type: 'input',
                name: 'process',
                message: 'Process name (for local process check, optional):',
                default: ''
            }
        ]);
        
        // Add new server
        const newServer = {
            id: answers.id.trim(),
            name: answers.name,
            host: answers.host,
            port: parseInt(answers.port),
            type: answers.type
        };
        
        // Check if server with this ID already exists
        const existingIndex = config.servers.findIndex(s => s.id === newServer.id);
        if (existingIndex >= 0) {
            config.servers[existingIndex] = newServer;
            console.log(chalk.yellow(`Updated existing server with ID ${newServer.id}`));
        } else {
            config.servers.push(newServer);
            console.log(chalk.green(`Added new server ${newServer.name}`));
        }
        
        // Add process if provided
        if (answers.process) {
            config.processes[newServer.id] = answers.process;
        }
        
        // Save configuration
        saveConfig();
        
        console.log(chalk.green('\nServer added. Use \'start\' command to begin monitoring.'));
        process.exit(0);
    });

program
    .command('list')
    .description('List all configured servers')
    .action(() => {
        displayHeader();
        loadConfig();
        
        console.log(chalk.cyan('Configured Servers:'));
        
        if (config.servers.length === 0) {
            console.log(chalk.yellow('No servers configured.'));
        } else {
            config.servers.forEach((server, index) => {
                console.log(`${index + 1}. ${chalk.green(server.name)} (${server.host}:${server.port})`);
                console.log(`   Type: ${server.type}, ID: ${server.id}`);
                
                if (config.processes[server.id]) {
                    console.log(`   Local process: ${config.processes[server.id]}`);
                }
                
                console.log('');
            });
        }
        
        process.exit(0);
    });

// If no arguments, show help
if (process.argv.length === 2) {
    displayHeader();
    program.help();
}

// Parse command line arguments
program.parse(process.argv);