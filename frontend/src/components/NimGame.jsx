import React, { useState, useEffect } from 'react';
import { contractService } from '../services/contractService';

const NimGame = ({ wallet, gameData, onMove, onBackToLobby }) => {
  const [stones, setStones] = useState(21);
  const [selectedStones, setSelectedStones] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  useEffect(() => {
    fetchGameInfo();
  }, [gameData]);

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
      const game = await contractService.getCurrentGame();
      setGameInfo(game);
      setStones(parseInt(game.stones.toString()));
      setCurrentPlayer(game.currentPlayer);
      setIsMyTurn(game.currentPlayer.toLowerCase() === wallet.address.toLowerCase());
    } catch (error) {
      console.error('Failed to fetch game info:', error);
    }
  };

  const handleMove = async () => {
    if (!isMyTurn || selectedStones < 1 || selectedStones > 3 || selectedStones > stones) {
      return;
    }

    try {
      await onMove(selectedStones);
      setIsMyTurn(false);
    } catch (error) {
      console.error('Move failed:', error);
    }
  };

  const renderStones = () => {
    const stoneElements = [];
    for (let i = 0; i < stones; i++) {
      stoneElements.push(
        <div
          key={i}
          className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg nim-stone"
        />
      );
    }
    return stoneElements;
  };

  if (!gameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const opponent = gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() 
    ? gameInfo.player2 
    : gameInfo.player1;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto text-white">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Nim Game
          </h1>
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 inline-block">
            <p className="text-lg">
              <strong>{stones}</strong> stones remaining
            </p>
          </div>
        </div>

        {/* Player Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`bg-white/10 backdrop-blur-lg rounded-lg p-4 ${
            gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn ? 'ring-2 ring-green-400' : ''
          }`}>
            <h3 className="font-semibold mb-2">You</h3>
            <p className="text-xs font-mono break-all">{wallet.address}</p>
            {gameInfo.player1.toLowerCase() === wallet.address.toLowerCase() && isMyTurn && (
              <p className="text-green-400 font-semibold mt-2">Your Turn!</p>
            )}
          </div>
          <div className={`bg-white/10 backdrop-blur-lg rounded-lg p-4 ${
            gameInfo.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn ? 'ring-2 ring-green-400' : ''
          }`}>
            <h3 className="font-semibold mb-2">Opponent</h3>
            <p className="text-xs font-mono break-all">{opponent}</p>
            {gameInfo.player2.toLowerCase() === wallet.address.toLowerCase() && isMyTurn && (
              <p className="text-green-400 font-semibold mt-2">Your Turn!</p>
            )}
            {!isMyTurn && currentPlayer && currentPlayer.toLowerCase() === opponent.toLowerCase() && (
              <p className="text-yellow-400 font-semibold mt-2">Their Turn</p>
            )}
          </div>
        </div>

        {/* Last Move Info */}
        {lastMove && (
          <div className="text-center mb-6">
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3 inline-block">
              <p className="text-blue-300">
                {lastMove.player.toLowerCase() === wallet.address.toLowerCase() ? 'You' : 'Opponent'} took {lastMove.stonesTaken} stone{lastMove.stonesTaken !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Stones Display */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <div className="grid grid-cols-7 gap-3 justify-items-center">
            {renderStones()}
          </div>
        </div>

        {/* Game Controls */}
        {isMyTurn && stones > 0 && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Your Move</h3>
              <p className="mb-4">How many stones do you want to take?</p>
              
              <div className="flex justify-center gap-4 mb-6">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedStones(num)}
                    disabled={num > stones}
                    className={`w-16 h-16 rounded-lg font-bold text-lg transition-all duration-300 ${
                      selectedStones === num
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    } ${
                      num > stones ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                onClick={handleMove}
                disabled={selectedStones > stones}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
              >
                Take {selectedStones} Stone{selectedStones !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Waiting Message */}
        {!isMyTurn && stones > 0 && (
          <div className="text-center">
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-6">
              <p className="text-yellow-300 text-lg">
                Waiting for opponent's move...
              </p>
            </div>
          </div>
        )}

        {/* Game Over */}
        {stones === 0 && (
          <div className="text-center">
            <div className="bg-purple-500/20 border border-purple-500 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
              <p className="text-lg mb-4">
                The last stone has been taken!
              </p>
              <p className="text-xl font-semibold">
                Winner gets 0.2 ETH!
              </p>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBackToLobby}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default NimGame;