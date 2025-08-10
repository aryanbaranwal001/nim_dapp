const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Game state management
const activeGames = new Map(); // gameId -> {player1, player2, sockets, gameState}
const waitingPlayers = new Map(); // gameId -> socket
const playerSockets = new Map(); // playerAddress -> socket

// Game state structure for multi-pile Nim
const createGameState = (player1, player2) => ({
    player1,
    player2,
    piles: [3, 5, 7], // Three piles with 3, 5, and 7 stones respectively
    currentPlayer: player1, // Player 1 always starts
    lastMove: null,
    status: 'active',
    winner: null,
    totalMoves: 0
});

// Utility functions
const getOpponentAddress = (gameState, playerAddress) => {
    return gameState.player1.toLowerCase() === playerAddress.toLowerCase() 
        ? gameState.player2 
        : gameState.player1;
};

const isPlayerTurn = (gameState, playerAddress) => {
    return gameState.currentPlayer?.toLowerCase() === playerAddress.toLowerCase();
};

const isGameOver = (gameState) => {
    return gameState.piles.every(pile => pile === 0);
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('player-waiting', (data) => {
        const { playerAddress, gameId } = data;
        console.log('Player waiting:', playerAddress, 'GameID:', gameId);
        
        socket.playerAddress = playerAddress;
        socket.gameId = gameId;
        
        // Store player socket mapping
        playerSockets.set(playerAddress, socket);
        
        // Store this waiting player
        waitingPlayers.set(gameId, socket);
        
        // Notify player they are waiting
        socket.emit('waiting-for-opponent');
        
        console.log(`Player ${playerAddress} is waiting for game ${gameId}`);
    });

    socket.on('game-paired', (data) => {
        const { gameId, playerAddress } = data;
        console.log('Game paired notification:', gameId, playerAddress);
        
        socket.playerAddress = playerAddress;
        socket.gameId = gameId;
        
        // Store player socket mapping
        playerSockets.set(playerAddress, socket);
        
        // Check if game is already active
        if (activeGames.has(gameId)) {
            const existingGame = activeGames.get(gameId);
            console.log('Game already active:', gameId);
            
            // Add this socket to existing game if not already present
            if (!existingGame.sockets.some(s => s.id === socket.id)) {
                existingGame.sockets.push(socket);
            }
            
            socket.emit('game-ready', { 
                gameId,
                gameState: existingGame.gameState 
            });
            return;
        }
        
        // Find the waiting player for this game
        const waitingSocket = waitingPlayers.get(gameId);
        
        if (waitingSocket && waitingSocket.playerAddress !== playerAddress) {
            // Create initial game state
            const gameState = createGameState(waitingSocket.playerAddress, playerAddress);
            
            // Move game to active games
            activeGames.set(gameId, {
                player1: waitingSocket.playerAddress,
                player2: playerAddress,
                sockets: [waitingSocket, socket],
                gameState: gameState
            });
            
            // Remove from waiting
            waitingPlayers.delete(gameId);
            
            // Notify both players game is ready
            const gameReadyData = { gameId, gameState };
            waitingSocket.emit('game-ready', gameReadyData);
            socket.emit('game-ready', gameReadyData);
            
            console.log(`Game started: ${gameId} - ${waitingSocket.playerAddress} vs ${playerAddress}`);
        } else {
            // No waiting player found or same player rejoining
            console.log('No valid waiting player found for gameId:', gameId);
            
            // Check if this player was already in a game (reconnection scenario)
            const existingGame = Array.from(activeGames.values()).find(game => 
                game.player1.toLowerCase() === playerAddress.toLowerCase() || 
                game.player2.toLowerCase() === playerAddress.toLowerCase()
            );
            
            if (existingGame) {
                // Player reconnecting to existing game
                if (!existingGame.sockets.some(s => s.id === socket.id)) {
                    existingGame.sockets.push(socket);
                }
                socket.emit('game-ready', { 
                    gameId,
                    gameState: existingGame.gameState 
                });
                console.log(`Player ${playerAddress} reconnected to existing game`);
            } else {
                // Start waiting for this game
                waitingPlayers.set(gameId, socket);
                socket.emit('waiting-for-opponent');
                console.log(`Player ${playerAddress} is now waiting for game ${gameId}`);
            }
        }
    });
    
    socket.on('move-made', (data) => {
        const { gameId, player, pile, stonesTaken } = data;
        console.log('Move made:', data);
        
        const game = activeGames.get(gameId);
        if (!game) {
            console.error('Game not found for move:', gameId);
            socket.emit('invalid-move', { reason: 'Game not found' });
            return;
        }
        
        // Validate move
        if (!isPlayerTurn(game.gameState, player)) {
            console.error('Not player\'s turn:', player);
            socket.emit('invalid-move', { reason: 'Not your turn' });
            return;
        }
        
        // Validate pile selection
        if (pile < 0 || pile >= game.gameState.piles.length) {
            console.error('Invalid pile selection:', pile);
            socket.emit('invalid-move', { reason: 'Invalid pile selection' });
            return;
        }
        
        // Validate number of stones
        if (stonesTaken < 1 || stonesTaken > game.gameState.piles[pile]) {
            console.error('Invalid number of stones:', stonesTaken, 'Available:', game.gameState.piles[pile]);
            socket.emit('invalid-move', { reason: `Can only take 1-${game.gameState.piles[pile]} stones from pile ${pile + 1}` });
            return;
        }
        
        // Update game state
        game.gameState.piles[pile] -= stonesTaken;
        game.gameState.lastMove = { player, pile, stonesTaken };
        game.gameState.totalMoves += 1;
        
        // Check for game end BEFORE switching turns
        if (isGameOver(game.gameState)) {
            game.gameState.status = 'finished';
            // In Nim, the player who takes the last stone LOSES
            game.gameState.winner = getOpponentAddress(game.gameState, player);
        } else {
            // Switch turns only if game is not over
            game.gameState.currentPlayer = getOpponentAddress(game.gameState, player);
        }
        
        // Broadcast update to all players in the game
        const updateData = {
            gameState: game.gameState
        };
        
        game.sockets.forEach(s => {
            if (s.connected) {
                s.emit('game-update', updateData);
            }
        });
        
        console.log(`Move processed: ${player} took ${stonesTaken} stones from pile ${pile + 1}, piles now: [${game.gameState.piles.join(', ')}]`);
        
        // If game ended, emit game finished event
        if (game.gameState.status === 'finished') {
            setTimeout(() => {
                game.sockets.forEach(s => {
                    if (s.connected) {
                        s.emit('game-finished', { 
                            winner: game.gameState.winner,
                            gameState: game.gameState 
                        });
                    }
                });
                console.log(`Game finished: ${gameId}, Winner: ${game.gameState.winner}`);
            }, 1000); // Small delay to ensure move update is processed first
        }
    });
    
    socket.on('game-ended', (data) => {
        const { gameId, winner } = data;
        console.log('Game ended externally:', data);
        
        const game = activeGames.get(gameId);
        if (game) {
            game.gameState.status = 'finished';
            game.gameState.winner = winner;
            
            game.sockets.forEach(s => {
                if (s.connected) {
                    s.emit('game-finished', { 
                        winner,
                        gameState: game.gameState 
                    });
                }
            });
            
            // Clean up after a delay
            setTimeout(() => {
                activeGames.delete(gameId);
                console.log(`Game ${gameId} cleaned up after completion`);
            }, 30000); // Keep game state for 30 seconds for any late connections
        }
    });
    
    socket.on('get-game-state', (data) => {
        const { gameId } = data;
        const game = activeGames.get(gameId);
        
        if (game) {
            socket.emit('game-state', {
                gameId,
                gameState: game.gameState
            });
        } else {
            socket.emit('game-not-found', { gameId });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id, socket.playerAddress);
        
        // Clean up player socket mapping
        if (socket.playerAddress) {
            playerSockets.delete(socket.playerAddress);
        }
        
        // Clean up waiting player
        if (socket.gameId) {
            const waitingSocket = waitingPlayers.get(socket.gameId);
            if (waitingSocket && waitingSocket.id === socket.id) {
                waitingPlayers.delete(socket.gameId);
                console.log(`Removed waiting player for game ${socket.gameId}`);
            }
            
            // Handle active game disconnection
            const game = activeGames.get(socket.gameId);
            if (game) {
                // Remove disconnected socket from game
                game.sockets = game.sockets.filter(s => s.id !== socket.id);
                
                // Notify remaining players
                game.sockets.forEach(s => {
                    if (s.connected) {
                        s.emit('opponent-disconnected', {
                            disconnectedPlayer: socket.playerAddress
                        });
                    }
                });
                
                // If no sockets left, clean up the game after a delay
                if (game.sockets.length === 0) {
                    setTimeout(() => {
                        if (activeGames.has(socket.gameId)) {
                            activeGames.delete(socket.gameId);
                            console.log(`Game ${socket.gameId} cleaned up - no players remaining`);
                        }
                    }, 60000); // Keep game for 1 minute in case of reconnection
                }
            }
        }
    });
    
    // Heartbeat to detect disconnections
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeGames: activeGames.size,
        waitingPlayers: waitingPlayers.size,
        timestamp: new Date().toISOString()
    });
});

// Game statistics endpoint
app.get('/stats', (req, res) => {
    const gameStats = Array.from(activeGames.entries()).map(([gameId, game]) => ({
        gameId,
        player1: game.player1,
        player2: game.player2,
        piles: game.gameState.piles,
        status: game.gameState.status,
        currentPlayer: game.gameState.currentPlayer,
        totalMoves: game.gameState.totalMoves,
        connectedSockets: game.sockets.filter(s => s.connected).length
    }));
    
    res.json({
        activeGames: gameStats,
        waitingGames: Array.from(waitingPlayers.keys()),
        totalActiveGames: activeGames.size,
        totalWaitingPlayers: waitingPlayers.size
    });
});

// Cleanup inactive games periodically
setInterval(() => {
    const now = Date.now();
    let cleanedGames = 0;
    
    for (const [gameId, game] of activeGames.entries()) {
        // Remove games with no connected sockets that have been inactive
        const hasConnectedSockets = game.sockets.some(socket => socket.connected);
        
        if (!hasConnectedSockets) {
            activeGames.delete(gameId);
            cleanedGames++;
        }
    }
    
    if (cleanedGames > 0) {
        console.log(`Cleaned up ${cleanedGames} inactive games`);
    }
}, 300000); // Run every 5 minutes

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🔥 Nim Game Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Statistics: http://localhost:${PORT}/stats`);
});