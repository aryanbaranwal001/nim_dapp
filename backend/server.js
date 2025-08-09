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
    
    socket.on('player-ready', (data) => {
        const { playerAddress, gameId } = data;
        console.log('Player ready:', playerAddress, 'GameID:', gameId);
        
        socket.playerAddress = playerAddress;
        socket.gameId = gameId;
        
        // Check if there's already a waiting player
        let waitingSocket = null;
        for (const [socketId, s] of io.sockets.sockets) {
            if (s.isWaiting && s.gameId !== gameId) {
                waitingSocket = s;
                break;
            }
        }
        
        if (waitingSocket) {
            // Pair these two players
            const pairedGameId = Math.max(parseInt(waitingSocket.gameId), parseInt(gameId));
            
            // Mark both as no longer waiting
            socket.isWaiting = false;
            waitingSocket.isWaiting = false;
            
            // Store the game
            activeGames.set(pairedGameId.toString(), {
                player1: waitingSocket.playerAddress,
                player2: playerAddress,
                sockets: [waitingSocket, socket]
            });
            
            // Notify both players game is ready
            waitingSocket.emit('game-paired', { 
                gameId: pairedGameId.toString(),
                opponent: playerAddress 
            });
            socket.emit('game-paired', { 
                gameId: pairedGameId.toString(),
                opponent: waitingSocket.playerAddress 
            });
            
            console.log('Game paired:', pairedGameId, waitingSocket.playerAddress, 'vs', playerAddress);
        } else {
            // No waiting player, mark this player as waiting
            socket.isWaiting = true;
            socket.emit('waiting-for-opponent');
            console.log('Player waiting:', playerAddress);
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
        
        // Clean up waiting status
        socket.isWaiting = false;
        
        // Handle active game disconnection
        if (socket.gameId) {
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