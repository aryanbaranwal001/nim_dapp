import React, { useState, useEffect } from 'react';
import { gameService } from '../services/gameService';

const GameLobby = ({ wallet, onStartGame }) => {
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    gameService.on('waiting-count', setWaitingCount);
    
    return () => {
      gameService.removeAllListeners();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center text-white max-w-lg mx-auto">
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Game Lobby
        </h1>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Player Info</h3>
          <p className="text-sm text-gray-300 mb-2">Connected Wallet:</p>
          <p className="font-mono text-xs bg-black/20 p-2 rounded break-all">
            {wallet.address}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Game Rules</h3>
          <div className="text-left space-y-2 text-sm">
            <p>• Each player stakes <strong>0.0001 ETH</strong></p>
            <p>• Game starts with <strong>21 stones</strong></p>
            <p>• Take 1-3 stones on your turn</p>
            <p>• Player who takes the last stone <strong>loses</strong></p>
            <p>• Winner gets <strong>0.2 ETH total</strong></p>
          </div>
        </div>

        {waitingCount > 0 && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-300">
              {waitingCount} player{waitingCount !== 1 ? 's' : ''} waiting to play
            </p>
          </div>
        )}

        <button
          onClick={onStartGame}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
        >
          Stake 0.0001 ETH & Find Game
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Make sure you have enough ETH for gas fees + 0.0001 ETH stake
        </p>
      </div>
    </div>
  );
};

export default GameLobby;