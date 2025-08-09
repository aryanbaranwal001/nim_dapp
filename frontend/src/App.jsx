import React, { useState, useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import GameLobby from './components/GameLobby';
import NimGame from './components/NimGame';
import LoadingScreen from './components/LoadingScreen';
import { gameService } from './services/gameService';

function App() {
  const [wallet, setWallet] = useState(null);
  const [gameState, setGameState] = useState('connect'); // connect, lobby, waiting, game, finished
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Setup game service event listeners
    gameService.on('game-status', (data) => {
      console.log('Game status:', data);
      if (data.status === 'waiting') {
        setGameState('waiting');
      } else if (data.status === 'waiting-for-player') {
        setGameState('waiting');
      } else if (data.status === 'game-ready') {
        setGameState('game');
        setGameData(prev => ({ ...prev, gameId: data.gameId }));
      }
    });

    gameService.on('game-update', (data) => {
      setGameData(prev => ({
        ...prev,
        stones: data.remainingStones,
        lastMove: { player: data.player, stonesTaken: data.stonesTaken }
      }));
    });

    gameService.on('game-finished', (data) => {
      setGameData(prev => ({ ...prev, winner: data.winner }));
      setGameState('finished');
      setTimeout(() => {
        setGameState('lobby');
        setGameData(null);
      }, 5000);
    });

    return () => {
      gameService.removeAllListeners();
    };
  }, []);

  const handleWalletConnect = (walletData) => {
    setWallet(walletData);
    setGameState('lobby');
  };

  const handleStartGame = async () => {
    setLoading(true);
    try {
      await gameService.createOrJoinGame(wallet);
      setGameState('waiting');
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGameMove = async (stonesTaken) => {
    try {
      await gameService.makeMove(gameData.gameId, stonesTaken);
    } catch (error) {
      console.error('Failed to make move:', error);
      alert('Failed to make move: ' + error.message);
    }
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
    setGameData(null);
  };

  if (loading) {
    return <LoadingScreen message="Processing transaction..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      {gameState === 'connect' && (
        <WalletConnect onConnect={handleWalletConnect} />
      )}
      
      {gameState === 'lobby' && (
        <GameLobby 
          wallet={wallet} 
          onStartGame={handleStartGame}
        />
      )}
      
      {gameState === 'waiting' && (
        <LoadingScreen message="Waiting for another player..." />
      )}
      
      {gameState === 'game' && (
        <NimGame 
          wallet={wallet}
          gameData={gameData}
          onMove={handleGameMove}
          onBackToLobby={handleBackToLobby}
        />
      )}
      
      {gameState === 'finished' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <p className="text-xl mb-4">
              Winner: {gameData?.winner === wallet?.address ? 'You!' : 'Opponent'}
            </p>
            <p className="text-lg">Returning to lobby in 5 seconds...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;