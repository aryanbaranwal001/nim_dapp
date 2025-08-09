import React from 'react';

function ConnectWallet({ onConnect, onStart }) {
  return (
    <div className="connect-wallet">
      <div className="game-intro">
        <h2>Welcome to ETH Nim Staking Game!</h2>
        <div className="game-rules">
          <h3>How to Play:</h3>
          <ul>
            <li>🎯 Remove stones from piles (1+ from any single pile)</li>
            <li>⚠️ Player who takes the LAST stone loses!</li>
            <li>💰 Winner takes all staked ETH (0.2 ETH total)</li>
            <li>🔒 Each player stakes 0.1 ETH to play</li>
          </ul>
        </div>
      </div>
      
      <div className="connect-section">
        <button className="connect-btn" onClick={onConnect}>
          🦊 Connect MetaMask Wallet
        </button>
        <p className="connect-info">
          You need to connect your wallet and stake 0.1 ETH to play
        </p>
      </div>
      
      <button className="start-btn" onClick={onStart}>
        🚀 Start Game (0.1 ETH)
      </button>
    </div>
  );
}

export default ConnectWallet;