import { io } from "socket.io-client";
import { contractService } from "./contractService";

class GameService {
  constructor() {
    this.socket = io("http://localhost:3001");
    this.eventListeners = new Map();
    this.currentGame = null;
    this.wallet = null;

    this.setupSocketListeners();
  }

  // Add this method to the GameService class:
  async checkGameStatus() {
    try {
      const game = await contractService.getMyGame();
      if (
        game.isActive &&
        game.player1 !== "0x0000000000000000000000000000000000000000" &&
        game.player2 !== "0x0000000000000000000000000000000000000000"
      ) {
        this.socket.emit("check-game-status", {
          gameId: game.gameId.toString(),
          playerAddress: this.wallet.address,
        });
      }
    } catch (error) {
      console.log("No active game found or error checking status");
    }
  }

  setupSocketListeners() {
    this.socket.on("game-status", (data) => {
      this.emit("game-status", data);
    });

    this.socket.on("game-update", (data) => {
      this.emit("game-update", data);
    });

    this.socket.on("game-finished", (data) => {
      this.emit("game-finished", data);
    });

    this.socket.on("waiting-count", (count) => {
      this.emit("waiting-count", count);
    });

    this.socket.on("waiting-for-opponent", () => {
      this.emit("game-status", { status: "waiting" });
    });

    this.socket.on("game-ready", (data) => {
      this.emit("game-status", { status: "game-ready", gameId: data.gameId });
    });
  }

  async createOrJoinGame(wallet) {
    this.wallet = wallet;

    await contractService.initialize(wallet);

    // Set up contract event listeners
    this.setupContractEventListeners();

    // Create or join game on blockchain first
    const receipt = await contractService.createOrJoinGame();
    console.log("Transaction receipt:", receipt);

    // Get the current game to determine gameId
    const game = await contractService.getMyGame();
    const gameId = game.gameId.toString();

    // Check if game is already active (player joined existing game)
    if (game.isActive && game.player2 !== "0x0000000000000000000000000000000000000000") {
      // Game is ready, both players joined
      this.emit("game-status", { status: "game-ready", gameId: gameId });
    } else {
      // Player created a new game, waiting for opponent
      this.socket.emit("player-waiting", {
        playerAddress: wallet.address,
        gameId: gameId,
      });
    }
  }

  setupContractEventListeners() {
    contractService.subscribeToEvents((eventType, data) => {
      this.handleContractEvent(eventType, data);
    });
  }

  handleContractEvent(eventType, data) {
    console.log("Contract event:", eventType, data);

    switch (eventType) {
      case "GameCreated":
        if (data.player1.toLowerCase() === this.wallet?.address.toLowerCase()) {
          // This player created the game, now waiting for opponent
          this.emit("game-status", { status: "waiting" });
        }
        break;

      case "PlayerJoined":
        // When a player joins, both players should transition to game state
        this.emit("game-status", { status: "game-ready", gameId: data.gameId });
        break;

      case "MoveMade":
        this.emit("game-update", {
          player: data.player,
          stonesTaken: parseInt(data.stonesTaken),
          remainingStones: this.currentGame?.stones || 0
        });
        break;

      case "GameEnded":
        this.emit("game-finished", { winner: data.winner });
        break;
    }
  }

  async makeMove(gameId, stonesTaken) {
    const receipt = await contractService.makeMove(gameId, stonesTaken);

    // Get updated game state
    const game = await contractService.getGame(gameId);

    this.socket.emit("move-made", {
      gameId,
      player: this.wallet.address,
      stonesTaken,
      remainingStones: parseInt(game.stones.toString()),
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
      this.eventListeners.get(event).forEach((callback) => callback(data));
    }
  }

  removeAllListeners() {
    this.eventListeners.clear();
    contractService.removeAllListeners();
  }
}

export const gameService = new GameService();
