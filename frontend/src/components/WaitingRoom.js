import React from 'react';

function WaitingRoom({ gameId }) {
  return (
    <div className="waiting-room">
      <div className="waiting-content">
        <div className="spinner"></div>
        <h2>Waiting for Opponent...</h2>
        <p>Game ID: #{gameId.toString()}</p>
        <p>💰 Your 0.1 ETH has been staked</p>
        <p>⏳ Waiting for another player to join and stake 0.1 ETH</p>
        
        <div className="waiting-info">
          <div className="info-box">
            <h3>🎮 Game Setup</h3>
            <p>Piles: 3, 5, 7, 9 stones</p>
            <p>Prize Pool: 0.2 ETH</p>
          </div>
          
          <div className="info-box">
            <h3>🏆 Victory Condition</h3>
            <p>Don't take the last stone!</p>
            <p>Force your opponent to clear all piles</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaitingRoom;