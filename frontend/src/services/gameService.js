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
    this.currentGameId = gameId;

    console.log("Game state after transaction:", {
      gameId,
      isActive: game.isActive,
      player1: game.player1,
      player2: game.player2,
      stones: game.stones.toString()
    });

    return {
      gameId,
      isActive: game.isActive,
      player1: game.player1,
      player2: game.player2,
      stones: game.stones.toString()
    };

    




    // Check if game is already active (player joined existing game)
    if (game.isActive && game.player2 !== "0x0000000000000000000000000000000000000000") {
      // Game is ready, both players joined
      console.log("Game is ready immediately!");
      this.emit("game-status", { status: "game-ready", gameId: gameId });
    } else {
      // Player created a new game, waiting for opponent
      console.log("Waiting for opponent, starting polling...");
      this.socket.emit("player-waiting", {
        playerAddress: wallet.address,
        gameId: gameId,
      });
      
      // Start polling for game state changes as backup
      this.startGamePolling();
    }
  }

  setupContractEventListeners() {
    contractService.subscribeToEvents((eventType, data) => {
      this.handleContractEvent(eventType, data);
    });
  }

  startGamePolling() {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        if (!this.currentGameId) return;

        const game = await contractService.getMyGame();
        console.log("Polling game state:", {
          gameId: game.gameId.toString(),
          isActive: game.isActive,
          player1: game.player1,
          player2: game.player2,
          stones: game.stones.toString()
        });

        // Check if game became active (second player joined)
        if (game.isActive && game.player2 !== "0x0000000000000000000000000000000000000000") {
          console.log("Game is now active! Stopping polling and starting game.");
          this.stopGamePolling();
          
          // Notify server about pairing
          this.socket.emit("game-paired", {
            gameId: game.gameId.toString(),
            playerAddress: this.wallet.address
          });
          
          // Transition to game state
          this.emit("game-status", { status: "game-ready", gameId: game.gameId.toString() });
        }
      } catch (error) {
        console.error("Error polling game state:", error);
      }
    }, 2000); // Poll every 2 seconds
  }

  stopGamePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
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
        // When a player joins, stop polling and transition to game state
        console.log("PlayerJoined event detected!");
        this.stopGamePolling();
        
        this.socket.emit("game-paired", {
          gameId: data.gameId,
          playerAddress: this.wallet.address
        });
        this.emit("game-status", { status: "game-ready", gameId: data.gameId });
        break;

      case "MoveMade":
        // Update current game state and emit update
        this.getCurrentGame().then(game => {
          this.currentGame = game;
          this.emit("game-update", {
            player: data.player,
            stonesTaken: parseInt(data.stonesTaken),
            remainingStones: parseInt(game.stones.toString())
          });
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
    this.currentGame = game;

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
    this.stopGamePolling();
    contractService.removeAllListeners();
  }
}

export const gameService = new GameService();
