import { io } from 'socket.io-client';
import { contractService } from './contractService';

class GameService {
  constructor() {
    this.socket = io('http://localhost:3001');
    this.eventListeners = new Map();
    this.currentGame = null;
    this.wallet = null;
    
    this.setupSocketListeners();
  }

  // Add this method to the GameService class:
async checkGameStatus() {
    try {
        const game = await contractService.getMyGame();
        if (game.isActive && game.player1 !== '0x0000000000000000000000000000000000000000' && 
            game.player2 !== '0x0000000000000000000000000000000000000000') {
            this.socket.emit('check-game-status', {
                gameId: game.gameId.toString(),
                playerAddress: this.wallet.address
            });
        }
    } catch (error) {
        console.log('No active game found or error checking status');
    }
}

  setupSocketListeners() {
    this.socket.on('game-status', (data) => {
      this.emit('game-status', data);
    });

    this.socket.on('game-update', (data) => {
      this.emit('game-update', data);
    });

    this.socket.on('game-finished', (data) => {
      this.emit('game-finished', data);
    });

    this.socket.on('waiting-count', (count) => {
      this.emit('waiting-count', count);
    });
  }

  async createOrJoinGame(wallet) {
    this.wallet = wallet;
    
    // Initialize contract service
    await contractService.initialize(wallet);
    
    // Subscribe to contract events
    contractService.subscribeToEvents((eventType, data) => {
      this.handleContractEvent(eventType, data);
    });

    // Join lobby first
    this.socket.emit('join-lobby', wallet.address);
    
    // Create or join game on blockchain
    const receipt = await contractService.createOrJoinGame();
    console.log('Transaction receipt:', receipt);
  }

  handleContractEvent(eventType, data) {
    console.log('Contract event:', eventType, data);
    
    switch (eventType) {
      case 'GameCreated':
        if (data.player1.toLowerCase() === this.wallet?.address.toLowerCase()) {
          this.socket.emit('game-created', data);
        }
        break;
        
      case 'PlayerJoined':
        if (data.player2.toLowerCase() === this.wallet?.address.toLowerCase()) {
          this.socket.emit('game-joined', data);
        }
        break;
        
      case 'MoveMade':
        this.socket.emit('move-made', {
          ...data,
          stonesTaken: parseInt(data.stonesTaken)
        });
        break;
        
      case 'GameEnded':
        this.socket.emit('game-ended', data);
        break;
    }
  }

  async makeMove(gameId, stonesTaken) {
    const receipt = await contractService.makeMove(gameId, stonesTaken);
    
    // Get updated game state
    const game = await contractService.getGame(gameId);
    
    this.socket.emit('move-made', {
      gameId,
      player: this.wallet.address,
      stonesTaken,
      remainingStones: parseInt(game.stones.toString())
    });
    
    return receipt;
  }

  async getCurrentGame() {
    return await contractService.getMyGame();
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  removeAllListeners() {
    this.eventListeners.clear();
    contractService.removeAllListeners();
  }
}

export const gameService = new GameService();