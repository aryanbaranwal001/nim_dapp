import React, { useState, useEffect } from "react";
import WalletConnect from "./components/WalletConnect";
import GameLobby from "./components/GameLobby";
import NimGame from "./components/NimGame";
import LoadingScreen from "./components/LoadingScreen";
import { gameService } from "./services/gameService";
import useGameStore from './services/useGameStore.js';



function App() {
  const { setGame } = useGameStore();
  const [wallet, setWallet] = useState(null);
  const [gameState, setGameState] = useState("connect"); // connect, lobby, waiting, game, finished
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Setup game service event listeners
    gameService.on("game-status", (data) => {
      console.log("Game status:", data);
      if (data.status === "waiting") {
        setGameState("waiting");
      } else if (data.status === "waiting-for-player") {
        setGameState("waiting");
      } else if (data.status === "game-ready") {
        setGameState("game");
        setGameData((prev) => ({ ...prev, gameId: data.gameId }));
      }
    });

    gameService.on("game-update", (data) => {
      setGameData((prev) => ({
        ...prev,
        stones: data.remainingStones,
        lastMove: { player: data.player, stonesTaken: data.stonesTaken },
      }));
    });

    gameService.on("game-finished", (data) => {
      setGameData((prev) => ({ ...prev, winner: data.winner }));
      setGameState("finished");
      setTimeout(() => {
        setGameState("lobby");
        setGameData(null);
      }, 5000);
    });

    return () => {
      gameService.removeAllListeners();
    };
  }, []);

  const handleWalletConnect = (walletData) => {
    setWallet(walletData);
    setGameState("lobby");
  };

  const handleStartGame = async () => {
    setLoading(true);
    try {
      
      const gameData = await gameService.createOrJoinGame(wallet);
      setGame(gameData);

      setGameState("waiting");
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("Failed to start game: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGameMove = async (stonesTaken) => {
    try {
      await gameService.makeMove(gameData.gameId, stonesTaken);
    } catch (error) {
      console.error("Failed to make move:", error);
      alert("Failed to make move: " + error.message);
    }
  };

  const handleBackToLobby = () => {
    setGameState("lobby");
    setGameData(null);
  };

  const handleCheckGameStatus = async () => {
    setGameState("game");
    try {
      console.log("Manually checking game status...");
      const game = await gameService.getCurrentGame();
      console.log("Current game state:", game);

      if (
        game.isActive &&
        game.player2 !== "0x0000000000000000000000000000000000000000"
      ) {
        console.log("Game is ready! Transitioning to game state.");
        setGameState("game");
        setGameData({
          gameId: game.gameId.toString(),
          stones: parseInt(game.stones.toString()),
        });
      } else {
        alert("Still waiting for another player to join...");
      }
    } catch (error) {
      console.error("Error checking game status:", error);
      alert("Error checking game status: " + error.message);
    }
  };

  if (loading) {
    return <LoadingScreen message="Processing transaction..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      {gameState === "connect" && (
        <WalletConnect onConnect={handleWalletConnect} />
      )}

      {gameState === "lobby" && (
        <GameLobby wallet={wallet} onStartGame={handleStartGame} />
      )}

      {gameState === "waiting" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-xl mb-4">Waiting for another player...</p>
              <p className="text-sm text-gray-300 mb-6">
                The game will start automatically when someone joins
              </p>
            </div>
            <button
              onClick={handleCheckGameStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg mr-4"
            >
              Check Status
            </button>
            <button
              onClick={handleBackToLobby}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {gameState === "game" && (
        <NimGame
          wallet={wallet}
          gameData={gameData}
          onMove={handleGameMove}
          onBackToLobby={handleBackToLobby}
          gameId={1}
        />
      )}

      {gameState === "finished" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <p className="text-xl mb-4">
              Winner:{" "}
              {gameData?.winner === wallet?.address ? "You!" : "Opponent"}
            </p>
            <p className="text-lg">Returning to lobby in 5 seconds...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
