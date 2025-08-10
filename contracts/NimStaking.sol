import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../services/useGameStore';

const NimGame = ({ wallet, gameData, onMove, onBackToLobby, gameId }) => {
  // Local state for UI interactions only
  const [selectedPile, setSelectedPile] = useState(null);
  const [selectedStones, setSelectedStones] = useState(1);
  const [socket, setSocket] = useState(null);
  const [gameStatus, setGameStatus] = useState('loading');
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  
  // Game state from backend - single source of truth
  const [gameState, setGameState] = useState(null);
  
  const { game } = useGameStore();

  // Initialize socket connection
  useEffect(() => {
    console.log("Initial game data:", game);

    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('waiting-for-opponent', () => {
      console.log('Waiting for opponent...');
      setGameStatus('waiting');
    });

    newSocket.on('game-ready', (data) => {
      console.log('Game ready:', data);
      setGameStatus('active');
      if (data.gameState) {
        setGameState(data.gameState);
      }
    });

    newSocket.on('game-update', (data) => {
      console.log('Game update received:', data);
      setGameState(data.gameState);
      setSelectedPile(null); // Reset selection after move
      setSelectedStones(1);
    });

    newSocket.on('game-finished', (data) => {
      console.log('Game finished:', data);
      setGameStatus('finished');
      setGameState(data.gameState);
    });

    newSocket.on('opponent-disconnected', () => {
      console.log('Opponent disconnected');
      setOpponentDisconnected(true);
    });

    newSocket.on('invalid-move', (data) => {
      console.error('Invalid move:', data.reason);
      alert(`Invalid move: ${data.reason}`);
    });

    newSocket.on('game-state', (data) => {
      console.log('Received game state:', data);
      setGameState(data.gameState);
      setGameStatus('active');
    });

    newSocket.on('game-not-found', (data) => {
      console.log('Game not found:', data);
      setGameStatus('waiting');
    });

    // Join game room if gameId is provided
    if (gameId && wallet?.address) {
      // First try to get existing game state
      newSocket.emit('get-game-state', { gameId });
      
      setTimeout(() => {
        if (gameData?.isWaiting) {
          // Player is waiting for opponent
          newSocket.emit('player-waiting', {
            playerAddress: wallet.address,
            gameId: gameId
          });
        } else {
          // Game has been paired or player joining existing game
          newSocket.emit('game-paired', {
            playerAddress: wallet.address,
            gameId: gameId
          });
        }
      }, 100);
    }

    return () => {
      newSocket.close();
    };
  }, [gameId, wallet?.address, gameData?.isWaiting]);

  const handleMove = async () => {
    if (!gameState || !isMyTurn() || selectedPile === null || selectedStones < 1) {
      return;
    }

    const pileStones = gameState.piles[selectedPile];
    if (selectedStones > pileStones) {
      alert("You can't take more stones than available in the pile!");
      return;
    }

    try {
      // Call parent onMove function if needed for blockchain integration
      if (onMove) {
        await onMove({ pile: selectedPile, stones: selectedStones });
      }
      
      // Emit move to socket for real-time updates
      if (socket && gameId) {
        socket.emit('move-made', {
          gameId: gameId,
          player: wallet.address,
          pile: selectedPile,
          stonesTaken: selectedStones
        });
      }
    } catch (error) {
      console.error('Move failed:', error);
      alert('Move failed. Please try again.');
    }
  };

  const isMyTurn = () => {
    if (!gameState || !wallet?.address) return false;
    return gameState.currentPlayer?.toLowerCase() === wallet.address.toLowerCase();
  };

  const isGameOver = () => {
    if (!gameState) return false;
    return gameState.piles.every(pile => pile === 0);
  };

  const getWinner = () => {
    if (!gameState || !isGameOver()) return null;
    return gameState.winner;
  };

  const getTotalStones = () => {
    if (!gameState) return 0;
    return gameState.piles.reduce((sum, pile) => sum + pile, 0);
  };

  const renderPile = (stones, pileIndex) => {
    const isSelected = selectedPile === pileIndex;
    const canSelect = isMyTurn() && stones > 0 && gameStatus === 'active';
    
    return (
      <div
        key={pileIndex}
        className={`bg-black/30 backdrop-blur-lg rounded-lg p-6 border transition-all duration-300 cursor-pointer ${
          isSelected 
            ? 'border-amber-400 bg-amber-400/10 shadow-amber-400/30 shadow-lg scale-105' 
            : canSelect 
              ? 'border-gray-600 hover:border-amber-300 hover:bg-amber-400/5' 
              : 'border-gray-700 opacity-60'
        }`}
        onClick={() => canSelect && setSelectedPile(pileIndex)}
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-amber-400">Pile {pileIndex + 1}</h3>
          <p className="text-2xl font-bold text-white">{stones} stones</p>
        </div>
        
        {/* Visual representation of stones */}
        <div className="flex flex-wrap justify-center gap-2 min-h-[60px]">
          {Array.from({ length: stones }, (_, i) => (
            <div
              key={i}
              className="relative flex items-center justify-center transform hover:scale-110 transition-transform duration-200"
            >
              {/* Matchstick body */}
              <div className="w-1 h-12 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 rounded-sm shadow-md relative">
                {/* Wood grain lines */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 w-full h-0.5 top-1"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-20 w-full h-0.5 top-6"></div>
              </div>
              {/* Match head */}
              <div className="absolute -top-1 w-1.5 h-3 bg-gradient-to-b from-red-500 via-red-600 to-red-700 rounded-full shadow-sm"></div>
            </div>
          ))}
        </div>
        
        {isSelected && (
          <div className="mt-4 text-center">
            <p className="text-amber-400 font-semibold">Selected!</p>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mb-4 mx-auto"></div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-center max-w-md">
          <div className="bg-black/30 backdrop-blur-lg rounded-xl p-8 border border-amber-500/30">
            <div className="text-6xl mb-6">⏳</div>
            <h2 className="text-2xl font-bold mb-4 text-amber-400">Waiting for Opponent</h2>
            <p className="text-gray-300 mb-6">
              Share your game ID with a friend or wait for someone to join:
            </p>
            <div className="bg-black/50 p-4 rounded-lg mb-6 border border-gray-600">
              <p className="text-sm text-gray-400 mb-1">Game ID:</p>
              <p className="font-mono text-amber-400 text-lg break-all">{gameId}</p>
            </div>
            <div className="flex justify-center gap-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <button
              onClick={onBackToLobby}
              className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300"
            >
              ← Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Opponent disconnected
  if (opponentDisconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-center max-w-md">
          <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-8 border border-red-500/50">
            <div className="text-6xl mb-6">💔</div>
            <h2 className="text-2xl font-bold mb-4 text-red-400">Opponent Disconnected</h2>
            <p className="text-gray-300 mb-6">
              Your opponent has left the game. The match has been terminated.
            </p>
            <button
              onClick={onBackToLobby}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              ← Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mb-4 mx-auto"></div>
          <p>Initializing game...</p>
        </div>
      </div>
    );
  }

  const opponent = gameState.player1.toLowerCase() === wallet.address.toLowerCase() 
    ? gameState.player2 
    : gameState.player1;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-red-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
            🔥 Multi-Pile Nim Game
          </h1>
          <div className="bg-black/30 backdrop-blur-lg rounded-lg p-4 inline-block border border-amber-500/30">
            <p className="text-xl font-semibold">
              <span className="text-amber-400">{getTotalStones()}</span> stones remaining across {gameState.piles.length} piles
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Pick one pile • Take any number of stones • Last stone wins!
            </p>
          </div>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameState.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn() 
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">🎮 You (Player 1)</h3>
            <p className="text-xs font-mono break-all text-gray-300">{wallet.address}</p>
            {gameState.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
          </div>
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameState.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn() 
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">🤖 Opponent (Player 2)</h3>
            <p className="text-xs font-mono break-all text-gray-300">{opponent}</p>
            {gameState.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
            {!isMyTurn() && gameState.currentPlayer && gameState.currentPlayer.toLowerCase() === opponent.toLowerCase() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-yellow-400 font-semibold">Their Turn</p>
              </div>
            )}
          </div>
        </div>

        {/* Last Move Info */}
        {gameState.lastMove && (
          <div className="text-center mb-6">
            <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-3 inline-block backdrop-blur-sm">
              <p className="text-blue-300">
                🔥 {gameState.lastMove.player.toLowerCase() === wallet.address.toLowerCase() ? 'You' : 'Opponent'} took {gameState.lastMove.stonesTaken} stone{gameState.lastMove.stonesTaken !== 1 ? 's' : ''} from Pile {gameState.lastMove.pile + 1}
              </p>
            </div>
          </div>
        )}

        {/* Game Piles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {gameState.piles.map((stones, index) => renderPile(stones, index))}
        </div>

        {/* Game Controls */}
        {isMyTurn() && !isGameOver() && (
          <div className="text-center">
            <div className="bg-black/30 backdrop-blur-lg rounded-lg p-6 mb-6 border border-amber-500/30">
              <h3 className="text-2xl font-semibold mb-4 text-amber-400">🔥 Your Turn</h3>
              
              {selectedPile === null ? (
                <p className="mb-6 text-gray-300">Select a pile to take stones from</p>
              ) : (
                <>
                  <p className="mb-4 text-gray-300">
                    Taking from <span className="text-amber-400 font-semibold">Pile {selectedPile + 1}</span> 
                    ({gameState.piles[selectedPile]} stones available)
                  </p>
                  
                  <div className="mb-6">
                    <label className="block text-sm text-gray-300 mb-2">Number of stones to take:</label>
                    <input
                      type="number"
                      min="1"
                      max={gameState.piles[selectedPile]}
                      value={selectedStones}
                      onChange={(e) => setSelectedStones(Math.max(1, Math.min(gameState.piles[selectedPile], parseInt(e.target.value) || 1)))}
                      className="bg-black/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-center text-lg font-semibold w-24"
                    />
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setSelectedPile(null)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMove}
                      disabled={selectedStones < 1 || selectedStones > gameState.piles[selectedPile]}
                      className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-600 hover:via-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      🔥 Take {selectedStones} Stone{selectedStones !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Waiting Message */}
        {!isMyTurn() && !isGameOver() && (
          <div className="text-center">
            <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
                <p className="text-yellow-300 text-lg">
                  Waiting for opponent's move...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Game Over */}
        {(isGameOver() || gameStatus === 'finished') && (
          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400 rounded-xl p-8 mb-6 backdrop-blur-sm">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Game Over!
              </h2>
              <p className="text-lg mb-4 text-gray-300">
                All stones have been taken!
              </p>
              {getWinner() && (
                <div className="mb-4">
                  <p className="text-xl font-semibold text-green-400">
                    {getWinner().toLowerCase() === wallet.address.toLowerCase() ? '🎉 You Won!' : '😔 You Lost!'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Winner: {getWinner().toLowerCase() === wallet.address.toLowerCase() ? 'You' : 'Opponent'}
                  </p>
                </div>
              )}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-400">
                <p className="text-xl font-semibold text-green-400">
                  💰 Winner gets 0.2 ETH!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBackToLobby}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 border border-gray-600 hover:border-gray-500"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default NimGame;