import React from 'react';

function GameResult({ winner, account, onReset }) {
  const isWinner = winner.toLowerCase() === account.toLowerCase();
  
  const getPlayerAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="game-result">
      <div className="result-content">
        {isWinner ? (
          <div className="winner-section">
            <div className="trophy">🏆</div>
            <h2>Congratulations!</h2>
            <p className="win-message">You won the game!</p>
            <div className="prize-info">
              <span className="prize-amount">💰 0.2 ETH</span>
              <span className="prize-text">has been transferred to your wallet</span>
            </div>
          </div>
        ) : (
          <div className="loser-section">
            <div className="lose-icon">😞</div>
            <h2>Game Over</h2>
            <p className="lose-message">You took the last stone and lost!</p>
            <div className="winner-info">
              <span>Winner: {getPlayerAddress(winner)}</span>
              <span className="prize-lost">💸 Lost 0.1 ETH</span>
            </div>
          </div>
        )}
        
        <div className="game-summary">
          <h3>Game Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Stakes:</span>
              <span className="stat-value">0.2 ETH</span>
            </div>
            <div className="stat">
              <span className="stat-label">Winner:</span>
              <span className="stat-value">{getPlayerAddress(winner)}</span>
            </div>
          </div>
        </div>
        
        <button className="play-again-btn" onClick={onReset}>
          🎮 Play Again
        </button>
      </div>
    </div>
  );
}

export default GameResult;