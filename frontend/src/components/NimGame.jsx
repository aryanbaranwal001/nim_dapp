import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../services/useGameStore';

const NimGame = ({ wallet, gameData, onMove, onBackToLobby, gameId }) => {
  const [gameState, setGameState] = useState(null);
  const [selectedPile, setSelectedPile] = useState(null);
  const [selectedStones, setSelectedStones] = useState(1);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('loading'); // 'loading', 'waiting', 'active', 'finished'
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const { game } = useGameStore();

  // Initialize socket connection and game state
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('waiting-for-opponent', () => {
      console.log('Waiting for opponent...');
      setConnectionStatus('waiting');
    });

    newSocket.on('game-ready', (data) => {
      console.log('Game ready:', data);
      setConnectionStatus('active');
      setGameState(data.gameState);
    });

    newSocket.on('game-update', (data) => {
      console.log('Game update received:', data);
      setGameState(data.gameState);
      // Reset selection after any update
      setSelectedPile(null);
      setSelectedStones(1);
    });

    newSocket.on('game-finished', (data) => {
      console.log('Game finished:', data);
      setConnectionStatus('finished');
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

    // Join game room if gameId is provided
    if (gameId && wallet?.address) {
      if (gameData?.isWaiting) {
        // Player is waiting for opponent
        newSocket.emit('player-waiting', {
          playerAddress: wallet.address,
          gameId: gameId
        });
      } else {
        // Game has been paired
        newSocket.emit('game-paired', {
          playerAddress: wallet.address,
          gameId: gameId
        });
      }
    }

    return () => {
      newSocket.close();
    };
  }, [gameId, wallet?.address, gameData?.isWaiting]);

  // Initialize game state from useGameStore if available
  useEffect(() => {
    if (game && !gameState) {
      setGameState({
        player1: game.player1 || wallet?.address,
        player2: game.player2 || '0x7AF7A0c89E512E3B449cFf280a2B10677644241b',
        piles: game.piles || [3, 5, 7],
        currentPlayer: game.currentPlayer || game.player1 || wallet?.address,
        lastMove: game.lastMove || null,
        status: game.status || 'active',
        winner: game.winner || null,
        totalMoves: game.totalMoves || 0
      });
    }
  }, [game, gameState, wallet?.address]);

  const handleMove = async (pile, stones) => {
    if (!gameState || !isMyTurn() || stones < 1 || stones > gameState.piles[pile] || gameState.status !== 'active') {
      console.log('Move validation failed:', {
        gameState: !!gameState,
        isMyTurn: isMyTurn(),
        stones,
        availableStones: gameState?.piles[pile],
        gameStatus: gameState?.status
      });
      return;
    }

    try {
      console.log('Making move:', { pile, stones, gameId, player: wallet.address });
      
      // Emit move to socket for instant real-time updates (no blockchain)
      if (socket && gameId) {
        socket.emit('move-made', {
          gameId: gameId,
          player: wallet.address,
          pile: pile,
          stonesTaken: stones
        });
      }

      // Reset selection after move
      setSelectedPile(null);
      setSelectedStones(1);
      
    } catch (error) {
      console.error('Move failed:', error);
    }
  };

  const isMyTurn = () => {
    return gameState?.currentPlayer?.toLowerCase() === wallet?.address?.toLowerCase();
  };

  const getOpponent = () => {
    if (!gameState) return '';
    return gameState.player1.toLowerCase() === wallet?.address?.toLowerCase() 
      ? gameState.player2 
      : gameState.player1;
  };

  const renderPile = (pileIndex, stoneCount) => {
    const matchsticks = [];
    
    // Create vertical stack of matchsticks
    for (let i = 0; i < stoneCount; i++) {
      matchsticks.push(
        <div
          key={i}
          className={`relative transform transition-all duration-200 cursor-pointer mb-1 ${
            selectedPile === pileIndex && i >= stoneCount - selectedStones
              ? 'scale-110 opacity-60' 
              : 'hover:scale-105'
          }`}
          onClick={() => {
            if (isMyTurn() && gameState.status === 'active') {
              setSelectedPile(pileIndex);
              setSelectedStones(1); // Reset to 1 when selecting new pile
            }
          }}
        >
          {/* Matchstick body */}
          <div className="w-3 h-16 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 rounded-sm shadow-md relative mx-auto">
            {/* Wood grain lines */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 w-full h-0.5 top-2"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-20 w-full h-0.5 top-8"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 w-full h-0.5 top-12"></div>
          </div>
          {/* Match head */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-3 bg-gradient-to-b from-red-500 via-red-600 to-red-700 rounded-full shadow-sm"></div>
        </div>
      );
    }
    
    return (
      <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-6 border transition-all duration-300 ${
        selectedPile === pileIndex 
          ? 'border-amber-400 bg-amber-400/10 shadow-amber-400/20 shadow-lg' 
          : 'border-gray-600'
      } ${isMyTurn() && gameState.status === 'active' && stoneCount > 0 ? 'hover:border-amber-300' : ''}`}>
        <h3 className="text-center mb-4 text-lg font-semibold text-white">
          Pile {pileIndex + 1} ({stoneCount} matches)
        </h3>
        <div className="flex flex-col items-center min-h-[200px] justify-end">
          {stoneCount === 0 ? (
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💨</div>
              <p>Empty</p>
            </div>
          ) : (
            <div className="flex flex-col-reverse items-center">
              {matchsticks}
            </div>
          )}
        </div>
        {selectedPile === pileIndex && isMyTurn() && gameState.status === 'active' && stoneCount > 0 && (
          <div className="text-center mt-4">
            <p className="text-amber-400 text-sm font-semibold">Selected Pile</p>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (connectionStatus === 'loading') {
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
  if (connectionStatus === 'waiting') {
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

  const totalStones = gameState.piles.reduce((sum, pile) => sum + pile, 0);
  const opponent = getOpponent();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-red-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
            🔥 Nim: Multi-Pile Game
          </h1>
          <div className="bg-black/30 backdrop-blur-lg rounded-lg p-4 inline-block border border-amber-500/30">
            <p className="text-xl font-semibold">
              <span className="text-amber-400">{totalStones}</span> matchsticks remaining
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Take stones from ONE pile • Don't take the last stone!
            </p>
          </div>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameState.player1.toLowerCase() === wallet?.address?.toLowerCase() && isMyTurn()
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">
              {gameState.player1.toLowerCase() === wallet?.address?.toLowerCase() ? '🎮 You' : '🤖 Player 1'}
            </h3>
            <p className="text-xs font-mono break-all text-gray-300">{gameState.player1}</p>
            {gameState.player1.toLowerCase() === wallet?.address?.toLowerCase() && isMyTurn() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
            {gameState.currentPlayer?.toLowerCase() === gameState.player1.toLowerCase() && !isMyTurn() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-yellow-400 font-semibold">Their Turn</p>
              </div>
            )}
          </div>
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameState.player2.toLowerCase() === wallet?.address?.toLowerCase() && isMyTurn()
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">
              {gameState.player2.toLowerCase() === wallet?.address?.toLowerCase() ? '🎮 You' : '🤖 Player 2'}
            </h3>
            <p className="text-xs font-mono break-all text-gray-300">{gameState.player2}</p>
            {gameState.player2.toLowerCase() === wallet?.address?.toLowerCase() && isMyTurn() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
            {gameState.currentPlayer?.toLowerCase() === gameState.player2.toLowerCase() && !isMyTurn() && (
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
                🔥 {gameState.lastMove.player.toLowerCase() === wallet?.address?.toLowerCase() ? 'You' : 'Opponent'} took {gameState.lastMove.stonesTaken} matchstick{gameState.lastMove.stonesTaken !== 1 ? 's' : ''} from pile {gameState.lastMove.pile + 1}
              </p>
            </div>
          </div>
        )}

        {/* Game Piles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {gameState.piles.map((stoneCount, index) => renderPile(index, stoneCount))}
        </div>

        {/* Move Controls */}
        {isMyTurn() && gameState.status === 'active' && selectedPile !== null && gameState.piles[selectedPile] > 0 && (
          <div className="text-center mb-8">
            <div className="bg-black/30 backdrop-blur-lg rounded-lg p-6 border border-amber-500/30">
              <h3 className="text-2xl font-semibold mb-4 text-amber-400">🔥 Your Turn</h3>
              <p className="mb-4 text-gray-300">
                Selected Pile {selectedPile + 1} - How many stones to take?
              </p>
              
              <div className="flex justify-center gap-4 mb-6">
                {Array.from({ length: gameState.piles[selectedPile] }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedStones(num)}
                    className={`w-16 h-16 rounded-xl font-bold text-lg transition-all duration-300 flex flex-col items-center justify-center ${
                      selectedStones === num
                        ? 'bg-gradient-to-br from-amber-500 to-red-500 text-white shadow-lg shadow-amber-500/30 scale-110'
                        : 'bg-black/40 text-white hover:bg-black/60 border border-gray-600 hover:scale-105 cursor-pointer'
                    }`}
                  >
                    <span className="text-xs">🔥</span>
                    <span>{num}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleMove(selectedPile, selectedStones)}
                disabled={selectedStones > gameState.piles[selectedPile]}
                className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-600 hover:via-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                🔥 Take {selectedStones} Stone{selectedStones !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Pile Selection Instructions */}
        {isMyTurn() && gameState.status === 'active' && selectedPile === null && (
          <div className="text-center mb-8">
            <div className="bg-green-500/20 border border-green-400 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-2 text-green-400">🎯 Your Turn!</h3>
              <p className="text-green-300">
                Click on a pile to select it, then choose how many stones to take.
              </p>
            </div>
          </div>
        )}

        {/* Waiting Message */}
        {!isMyTurn() && gameState.status === 'active' && totalStones > 0 && (
          <div className="text-center mb-8">
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
        {(gameState.status === 'finished' || connectionStatus === 'finished') && (
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400 rounded-xl p-8 backdrop-blur-sm">
              <div className="text-6xl mb-4">
                {gameState.winner?.toLowerCase() === wallet?.address?.toLowerCase() ? '🏆' : '💔'}
              </div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Game Over!
              </h2>
              <p className="text-lg mb-4 text-gray-300">
                {gameState.winner?.toLowerCase() === wallet?.address?.toLowerCase() 
                  ? 'Congratulations! You won!' 
                  : 'You lost! Better luck next time.'}
              </p>
              <div className={`rounded-lg p-4 border ${
                gameState.winner?.toLowerCase() === wallet?.address?.toLowerCase()
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-400'
                  : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-400'
              }`}>
                <p className="text-xl font-semibold">
                  {gameState.winner?.toLowerCase() === wallet?.address?.toLowerCase() 
                    ? '💰 You get 0.2 ETH!' 
                    : '💸 Better luck next time!'}
                </p>
                <p className="text-sm mt-2 text-gray-400">
                  Winner: {gameState.winner === wallet?.address ? 'You' : 'Opponent'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Game Rules */}
        <div className="bg-black/20 backdrop-blur-lg rounded-lg p-6 mb-8 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-amber-400">📋 Game Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="mb-2">• Players take turns removing stones from piles</p>
              <p className="mb-2">• You can only take from ONE pile per turn</p>
              <p className="mb-2">• Take any number of stones from chosen pile</p>
            </div>
            <div>
              <p className="mb-2">• Player 1 always goes first</p>
              <p className="mb-2">• The player who takes the LAST stone LOSES</p>
              <p className="mb-2">• Force your opponent to take the final stone!</p>
            </div>
          </div>
        </div>

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