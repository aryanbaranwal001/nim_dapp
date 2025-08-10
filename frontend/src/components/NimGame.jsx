import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../services/useGameStore';



const NimGame = ({ wallet, gameData, onMove, onBackToLobby, gameId }) => {
  const [stones, setStones] = useState(21);
  const [selectedStones, setSelectedStones] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameStatus, setGameStatus] = useState('loading'); // 'loading', 'waiting', 'active', 'finished'
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const { game } = useGameStore();


  // Initialize socket connection
  useEffect(() => {
    setGameInfo(game);
    console.log("gameinfonimgaem", game);

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
      fetchGameInfo();
    });

    newSocket.on('game-update', (data) => {
      console.log('Game update received:', data);
      const { player, stonesTaken, remainingStones } = data;
      setStones(remainingStones);
      setLastMove({ player, stonesTaken });
      
      // Update turn based on blockchain state
      fetchGameInfo();
    });

    newSocket.on('game-finished', (data) => {
      console.log('Game finished:', data);
      setGameStatus('finished');
      fetchGameInfo();
    });

    newSocket.on('opponent-disconnected', () => {
      console.log('Opponent disconnected');
      setOpponentDisconnected(true);
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

  useEffect(() => {
    if (gameStatus === 'active') {
      fetchGameInfo();
    }
  }, [gameData, gameStatus]);

  useEffect(() => {
    if (gameData?.stones !== undefined) {
      setStones(gameData.stones);
    }
    if (gameData?.lastMove) {
      setLastMove(gameData.lastMove);
    }
  }, [gameData]);

  const fetchGameInfo = async () => {
    try {
      // Mock contract service call - replace with your actual implementation
      const game = {
        stones: gameData?.stones || stones,
        currentPlayer: gameData?.currentPlayer || currentPlayer,
        player1: gameData?.player1 || wallet?.address,
        player2: gameData?.player2 || 'opponent-address',
        gameActive: gameData?.gameActive !== false
      };
      
      console.log("gameinfo", game);
      setGameInfo(game);
      setStones(parseInt(game.stones.toString()));
      setCurrentPlayer(game.currentPlayer);
      setIsMyTurn(game.currentPlayer?.toLowerCase() === wallet?.address?.toLowerCase());
    } catch (error) {
      console.error('Failed to fetch game info:', error);
    }
  };

  const handleMove = async () => {
    if (!isMyTurn || selectedStones < 1 || selectedStones > 3 || selectedStones > stones) {
      return;
    }

    try {
      // Call the parent onMove function
      await onMove(selectedStones);
      
      // Emit move to socket for real-time updates
      if (socket && gameId) {
        socket.emit('move-made', {
          gameId: gameId,
          player: wallet.address,
          stonesTaken: selectedStones,
          remainingStones: stones - selectedStones
        });
      }
      
      setIsMyTurn(false);
      
      // Check if game ended
      if (stones - selectedStones === 0) {
        if (socket && gameId) {
          socket.emit('game-ended', {
            gameId: gameId,
            winner: wallet.address
          });
        }
        setGameStatus('finished');
      }
    } catch (error) {
      console.error('Move failed:', error);
    }
  };

  const renderMatchsticks = () => {
    const matchstickElements = [];
    const rows = Math.ceil(stones / 7); // Arrange in rows of 7
    
    for (let row = 0; row < rows; row++) {
      const sticksInRow = Math.min(7, stones - (row * 7));
      const rowElements = [];
      
      for (let i = 0; i < sticksInRow; i++) {
        rowElements.push(
          <div
            key={row * 7 + i}
            className="relative flex items-center justify-center transform hover:scale-110 transition-transform duration-200"
          >
            {/* Matchstick body */}
            <div className="w-1 h-16 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 rounded-sm shadow-md relative">
              {/* Wood grain lines */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 w-full h-0.5 top-2"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-20 w-full h-0.5 top-8"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 w-full h-0.5 top-12"></div>
            </div>
            {/* Match head */}
            <div className="absolute -top-2 w-2 h-4 bg-gradient-to-b from-red-500 via-red-600 to-red-700 rounded-full shadow-sm"></div>
          </div>
        );
      }
      
      matchstickElements.push(
        <div key={row} className="flex justify-center gap-4 mb-2">
          {rowElements}
        </div>
      );
    }
    
    return matchstickElements;
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

  if (!gameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-500 border-t-transparent mb-4 mx-auto"></div>
          <p>Initializing game...</p>
        </div>
      </div>
    );
  }

  const opponent = gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() 
    ? gameInfo.player2 
    : gameInfo.player1;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-red-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
            🔥 Nim: Matchstick Game
          </h1>
          <div className="bg-black/30 backdrop-blur-lg rounded-lg p-4 inline-block border border-amber-500/30">
            <p className="text-xl font-semibold">
              <span className="text-amber-400">{stones}</span> matchsticks remaining
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Take 1-3 matchsticks • Don't be the last to take!
            </p>
          </div>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn 
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">🎮 You</h3>
            <p className="text-xs font-mono break-all text-gray-300">{wallet.address}</p>
            {gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
          </div>
          <div className={`bg-black/30 backdrop-blur-lg rounded-lg p-4 border transition-all duration-300 ${
            gameInfo.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn 
              ? 'border-green-400 bg-green-400/10 shadow-green-400/20 shadow-lg' 
              : 'border-gray-600'
          }`}>
            <h3 className="font-semibold mb-2 text-lg">🤖 Opponent</h3>
            <p className="text-xs font-mono break-all text-gray-300">{opponent}</p>
            {gameInfo.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-green-400 font-semibold">Your Turn!</p>
              </div>
            )}
            {!isMyTurn && currentPlayer && currentPlayer.toLowerCase() === opponent.toLowerCase() && (
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
                <p className="text-yellow-400 font-semibold">Their Turn</p>
              </div>
            )}
          </div>
        </div>

        {/* Last Move Info */}
        {lastMove && (
          <div className="text-center mb-6">
            <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-3 inline-block backdrop-blur-sm">
              <p className="text-blue-300">
                🔥 {lastMove.player.toLowerCase() === wallet.address.toLowerCase() ? 'You' : 'Opponent'} burned {lastMove.stonesTaken} matchstick{lastMove.stonesTaken !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Matchsticks Display */}
        <div className="bg-black/40 backdrop-blur-lg rounded-lg p-8 mb-8 border border-gray-700">
          <div className="min-h-[120px] flex flex-col items-center justify-center">
            {stones > 0 ? renderMatchsticks() : (
              <div className="text-center">
                <div className="text-6xl mb-4">💨</div>
                <p className="text-gray-400 text-lg">All matchsticks burned!</p>
              </div>
            )}
          </div>
        </div>

        {/* Game Controls */}
        {isMyTurn && stones > 0 && (
          <div className="text-center">
            <div className="bg-black/30 backdrop-blur-lg rounded-lg p-6 mb-6 border border-amber-500/30">
              <h3 className="text-2xl font-semibold mb-4 text-amber-400">🔥 Your Turn</h3>
              <p className="mb-6 text-gray-300">How many matchsticks will you burn?</p>
              
              <div className="flex justify-center gap-4 mb-6">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedStones(num)}
                    disabled={num > stones}
                    className={`w-20 h-20 rounded-xl font-bold text-xl transition-all duration-300 flex flex-col items-center justify-center ${
                      selectedStones === num
                        ? 'bg-gradient-to-br from-amber-500 to-red-500 text-white shadow-lg shadow-amber-500/30 scale-110'
                        : 'bg-black/40 text-white hover:bg-black/60 border border-gray-600'
                    } ${
                      num > stones ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm">🔥</span>
                    <span>{num}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleMove}
                disabled={selectedStones > stones}
                className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 hover:from-red-600 hover:via-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                🔥 Burn {selectedStones} Matchstick{selectedStones !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Waiting Message */}
        {!isMyTurn && stones > 0 && (
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
        {(stones === 0 || gameStatus === 'finished') && (
          <div className="text-center">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400 rounded-xl p-8 mb-6 backdrop-blur-sm">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Game Over!
              </h2>
              <p className="text-lg mb-4 text-gray-300">
                The last matchstick has been burned!
              </p>
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