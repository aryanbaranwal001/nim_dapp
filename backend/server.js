const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Game state management
const waitingPlayers = new Map(); // address -> socket
const activeGames = new Map(); // gameId -> {player1, player2, sockets}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-lobby', (playerAddress) => {
        console.log('Player joining lobby:', playerAddress);
        socket.playerAddress = playerAddress;
        
        // Add to waiting players
        waitingPlayers.set(playerAddress, socket);
        
        // Emit waiting status
        socket.emit('game-status', { status: 'waiting' });
        
        // Notify about waiting players count
        io.emit('waiting-count', waitingPlayers.size);
    });
    
    socket.on('game-created', (data) => {
        const { gameId, player1 } = data;
        console.log('Game created:', gameId, player1);
        
        // Remove from waiting if they were waiting
        if (waitingPlayers.has(player1)) {
            waitingPlayers.delete(player1);
        }
        
        // Store game info
        activeGames.set(gameId, {
            player1,
            player2: null,
            sockets: [socket]
        });
        
        socket.emit('game-status', { status: 'waiting-for-player' });
        io.emit('waiting-count', waitingPlayers.size);
    });
    
    socket.on('game-joined', (data) => {
        const { gameId, player2 } = data;
        console.log('Game joined:', gameId, player2);
        
        // Remove from waiting players
        if (waitingPlayers.has(player2)) {
            waitingPlayers.delete(player2);
        }
        
        // Update game info
        const game = activeGames.get(gameId);
        if (game) {
            game.player2 = player2;
            game.sockets.push(socket);
            
            // Notify both players that game is ready
            game.sockets.forEach(s => {
                s.emit('game-status', { status: 'game-ready', gameId });
            });
        }
        
        io.emit('waiting-count', waitingPlayers.size);
    });
    
    socket.on('move-made', (data) => {
        const { gameId, player, stonesTaken, remainingStones } = data;
        console.log('Move made:', data);
        
        const game = activeGames.get(gameId);
        if (game) {
            // Broadcast move to both players
            game.sockets.forEach(s => {
                s.emit('game-update', {
                    player,
                    stonesTaken,
                    remainingStones
                });
            });
        }
    });
    
    socket.on('game-ended', (data) => {
        const { gameId, winner } = data;
        console.log('Game ended:', data);
        
        const game = activeGames.get(gameId);
        if (game) {
            // Notify both players
            game.sockets.forEach(s => {
                s.emit('game-finished', { winner });
            });
            
            // Clean up
            activeGames.delete(gameId);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove from waiting players
        if (socket.playerAddress) {
            waitingPlayers.delete(socket.playerAddress);
            io.emit('waiting-count', waitingPlayers.size);
        }
        
        // Handle game disconnection
        for (const [gameId, game] of activeGames.entries()) {
            const socketIndex = game.sockets.indexOf(socket);
            if (socketIndex !== -1) {
                game.sockets.splice(socketIndex, 1);
                
                // Notify remaining player
                if (game.sockets.length > 0) {
                    game.sockets[0].emit('player-disconnected');
                }
                
                // Clean up if no players left
                if (game.sockets.length === 0) {
                    activeGames.delete(gameId);
                }
                break;
            }
        }
    });
    // Add this new event handler after the existing socket events:

socket.on('check-game-status', async (data) => {
    const { gameId, playerAddress } = data;
    console.log('Checking game status for:', gameId, playerAddress);
    
    // Find if this player has an active game
    const game = activeGames.get(gameId);
    if (game && game.player1 && game.player2) {
        // Game is ready with both players
        game.sockets.forEach(s => {
            s.emit('game-status', { status: 'game-ready', gameId });
        });
    }
});

// Also modify the 'game-joined' event to be more robust:
socket.on('game-joined', (data) => {
    const { gameId, player2 } = data;
    console.log('Game joined:', gameId, player2);
    
    // Remove from waiting players
    if (waitingPlayers.has(player2)) {
        waitingPlayers.delete(player2);
    }
    
    // Update game info
    let game = activeGames.get(gameId);
    if (game) {
        game.player2 = player2;
        game.sockets.push(socket);
    } else {
        // Create game entry if it doesn't exist (fallback)
        game = {
            player1: null, // Will be set when player1 reconnects
            player2: player2,
            sockets: [socket]
        };
        activeGames.set(gameId, game);
    }
    
    // Immediately notify both players that game is ready
    game.sockets.forEach(s => {
        s.emit('game-status', { status: 'game-ready', gameId });
    });
    
    io.emit('waiting-count', waitingPlayers.size);
});
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});