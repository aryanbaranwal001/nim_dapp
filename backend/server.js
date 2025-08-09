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
const activeGames = new Map(); // gameId -> {player1, player2, sockets}
const waitingPlayers = new Map(); // gameId -> socket

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('player-waiting', (data) => {
        const { playerAddress, gameId } = data;
        console.log('Player waiting:', playerAddress, 'GameID:', gameId);
        
        socket.playerAddress = playerAddress;
        socket.gameId = gameId;
        
        // Store this waiting player
        waitingPlayers.set(gameId, socket);
        
        // Notify player they are waiting
        socket.emit('waiting-for-opponent');
    });

    socket.on('game-paired', (data) => {
        const { gameId, playerAddress } = data;
        console.log('Game paired notification:', gameId, playerAddress);
        
        socket.playerAddress = playerAddress;
        socket.gameId = gameId;
        
        // Check if game is already active (avoid duplicate processing)
        if (activeGames.has(gameId)) {
            console.log('Game already active:', gameId);
            socket.emit('game-ready', { gameId });
            return;
        }
        
        // Find the waiting player for this game
        const waitingSocket = waitingPlayers.get(gameId);
        
        if (waitingSocket) {
            // Move game to active games
            activeGames.set(gameId, {
                player1: waitingSocket.playerAddress,
                player2: playerAddress,
                sockets: [waitingSocket, socket]
            });
            
            // Remove from waiting
            waitingPlayers.delete(gameId);
            
            // Notify both players game is ready
            waitingSocket.emit('game-ready', { gameId });
            socket.emit('game-ready', { gameId });
            
            console.log('Game started:', gameId, waitingSocket.playerAddress, 'vs', playerAddress);
        } else {
            // No waiting player found, this might be a direct join
            console.log('No waiting player found for gameId:', gameId, 'marking as active');
            activeGames.set(gameId, {
                player1: 'unknown',
                player2: playerAddress,
                sockets: [socket]
            });
            socket.emit('game-ready', { gameId });
        }
    });
    
    socket.on('move-made', (data) => {
        const { gameId, player, stonesTaken, remainingStones } = data;
        console.log('Move made:', data);
        
        const game = activeGames.get(gameId);
        if (game) {
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
            game.sockets.forEach(s => {
                s.emit('game-finished', { winner });
            });
            activeGames.delete(gameId);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Clean up waiting player
        if (socket.gameId) {
            waitingPlayers.delete(socket.gameId);
            
            // Handle active game disconnection
            const game = activeGames.get(socket.gameId);
            if (game) {
                const otherSocket = game.sockets.find(s => s.id !== socket.id);
                if (otherSocket) {
                    otherSocket.emit('opponent-disconnected');
                }
                activeGames.delete(socket.gameId);
            }
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});