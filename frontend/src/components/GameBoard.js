import React, { useState } from 'react';

function GameBoard({ gameData, account, isPlayerTurn, onMove }) {
  const [selectedPile, setSelectedPile] = useState(null);
  const [stonesToRemove, setStonesToRemove] = useState(1);

  const handlePileClick = (pileIndex) => {
    if (!isPlayerTurn || gameData.piles[pileIndex] === 0) return;
    setSelectedPile(pileIndex);
    setStonesToRemove(1);
  };

  const handleMove = () => {
    if (selectedPile === null || stonesToRemove < 1 || stonesToRemove > gameData.piles[selectedPile]) {
      alert('Invalid move!');
      return;
    }
    
    onMove(selectedPile, stonesToRemove);
    setSelectedPile(null);
    setStonesToRemove(1);
  };

  const renderPile = (stones, pileIndex) => {
    const isSelected = selectedPile === pileIndex;
    const canSelect = isPlayerTurn && stones > 0;
    
    return (
      <div 
        key={pileIndex}
        className={`pile ${isSelected ? 'selected' : ''} ${canSelect ? 'selectable' : ''}`}
        onClick={() => handlePileClick(pileIndex)}
      >
        <div className="pile-header">
          <span className="pile-label">Pile {pileIndex + 1}</span>
          <span className="stone-count">{stones} stones</span>
        </div>
        <div className="stones-container">
          {Array.from({ length: stones }).map((_, i) => (
            <div key={i} className="stone">🟤</div>
          ))}
        </div>
      </div>
    );
  };

  const getPlayerAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isPlayer1 = gameData.player1.toLowerCase() === account.toLowerCase();
  const opponent = isPlayer1 ? gameData.player2 : gameData.player1;

  return (
    <div className="game-board">
      <div className="game-header">
        <div className="players-info">
          <div className={`player-info ${isPlayer1 ? 'you' : ''}`}>
            <span className="player-label">Player 1</span>
            <span className="player-address">{getPlayerAddress(gameData.player1)}</span>
            {isPlayer1 && <span className="you-badge">YOU</span>}
          </div>
          
          <div className="vs-divider">
            <span>VS</span>
            <div className="prize-pool">
              <span>💰 Prize Pool</span>
              <span>0.2 ETH</span>
            </div>
          </div>
          
          <div className={`player-info ${!isPlayer1 ? 'you' : ''}`}>
            <span className="player-label">Player 2</span>
            <span className="player-address">{getPlayerAddress(gameData.player2)}</span>
            {!isPlayer1 && <span className="you-badge">YOU</span>}
          </div>
        </div>
        
        <div className="turn-indicator">
          {isPlayerTurn ? (
            <div className="your-turn">🎯 Your Turn!</div>
          ) : (
            <div className="opponent-turn">
              ⏳ Waiting for {getPlayerAddress(opponent)}
            </div>
          )}
        </div>
      </div>

      <div className="piles-container">
        {gameData.piles.map((stones, index) => renderPile(Number(stones), index))}
      </div>

      {selectedPile !== null && (
        <div className="move-controls">
          <div className="move-info">
            <span>Remove from Pile {selectedPile + 1}:</span>
            <input
              type="number"
              min="1"
              max={gameData.piles[selectedPile]}
              value={stonesToRemove}
              onChange={(e) => setStonesToRemove(parseInt(e.target.value) || 1)}
            />
            <span>stones</span>
          </div>
          <div className="move-buttons">
            <button className="confirm-btn" onClick={handleMove}>
              ✅ Confirm Move
            </button>
            <button className="cancel-btn" onClick={() => setSelectedPile(null)}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      <div className="game-rules-mini">
        <p>⚠️ <strong>Don't take the last stone!</strong> The player who empties all piles loses.</p>
      </div>
    </div>
  );
}

export default GameBoard;