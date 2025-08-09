const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let waitingPlayers = new Map();
let activeGames = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-waiting', (data) => {
    const { address, gameId } = data;
    waitingPlayers.set(address, { socketId: socket.id, gameId });
    socket.join(`game-${gameId}`);
    
    console.log(`Player ${address} waiting for game ${gameId}`);
  });
  
  socket.on('game-started', (data) => {
    const { gameId, player1, player2 } = data;
    
    // Remove from waiting
    waitingPlayers.delete(player1);
    waitingPlayers.delete(player2);
    
    // Add to active games
    activeGames.set(gameId, { player1, player2 });
    
    // Notify both players
    io.to(`game-${gameId}`).emit('game-ready', {
      gameId,
      player1,
      player2
    });
    
    console.log(`Game ${gameId} started between ${player1} and ${player2}`);
  });
  
  socket.on('move-made', (data) => {
    const { gameId, player, pile, stones, gameState } = data;
    
    // Broadcast move to both players
    io.to(`game-${gameId}`).emit('move-update', {
      player,
      pile,
      stones,
      gameState
    });
  });
  
  socket.on('game-finished', (data) => {
    const { gameId, winner } = data;
    
    // Notify both players
    io.to(`game-${gameId}`).emit('game-over', {
      winner
    });
    
    // Clean up
    activeGames.delete(gameId);
    
    console.log(`Game ${gameId} finished. Winner: ${winner}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up waiting players
    for (let [address, data] of waitingPlayers.entries()) {
      if (data.socketId === socket.id) {
        waitingPlayers.delete(address);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});