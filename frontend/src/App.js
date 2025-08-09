import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import io from 'socket.io-client';
import ConnectWallet from './components/ConnectWallet';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import GameResult from './components/GameResult';
import { getContract } from './utils/contract';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [provider, setSigner] = useState(null);
  const [gameState, setGameState] = useState('connect'); // connect, waiting, playing, finished
  const [gameId, setGameId] = useState(0);
  const [gameData, setGameData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [winner, setWinner] = useState('');
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('game-ready', (data) => {
        console.log('Game ready:', data);
        setGameState('playing');
        fetchGameData();
      });

      socket.on('move-update', (data) => {
        console.log('Move update:', data);
        fetchGameData();
      });

      socket.on('game-over', (data) => {
        console.log('Game over:', data);
        setWinner(data.winner);
        setGameState('finished');
      });

      return () => {
        socket.off('game-ready');
        socket.off('move-update');
        socket.off('game-over');
      };
    }
  }, [socket, contract]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const contractInstance = await getContract(signer);
        
        setAccount(address);
        setSigner(provider);
        setContract(contractInstance);
        
        // Check if player is already in a game
        const existingGameId = await contractInstance.getPlayerGame(address);
        if (existingGameId > 0) {
          setGameId(existingGameId);
          const game = await contractInstance.getGame(existingGameId);
          
          if (game.state === 0) { // WaitingForPlayer
            setGameState('waiting');
          } else if (game.state === 1) { // InProgress
            setGameState('playing');
            setGameData(game);
          }
        }
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting wallet: ' + error.message);
    }
  };

  const startGame = async () => {
    try {
      // Check if there are waiting games to join
      const waitingCount = await contract.getWaitingGamesCount();
      
      let tx;
      if (waitingCount > 0) {
        // Join existing game
        tx = await contract.joinGame({ value: ethers.parseEther('0.1') });
        await tx.wait();
        
        const newGameId = await contract.getPlayerGame(account);
        setGameId(newGameId);
        
        // Notify backend that game started
        const game = await contract.getGame(newGameId);
        socket.emit('game-started', {
          gameId: newGameId.toString(),
          player1: game.player1,
          player2: game.player2
        });
        
      } else {
        // Create new game
        tx = await contract.createGame({ value: ethers.parseEther('0.1') });
        await tx.wait();
        
        const newGameId = await contract.getPlayerGame(account);
        setGameId(newGameId);
        setGameState('waiting');
        
        // Join waiting room
        socket.emit('join-waiting', {
          address: account,
          gameId: newGameId.toString()
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Error starting game: ' + error.message);
    }
  };

  const fetchGameData = async () => {
    if (contract && gameId > 0) {
      try {
        const game = await contract.getGame(gameId);
        setGameData(game);
        setIsPlayerTurn(game.currentPlayer.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error('Error fetching game data:', error);
      }
    }
  };

  const makeMove = async (pile, stones) => {
    try {
      const tx = await contract.makeMove(pile, stones);
      await tx.wait();
      
      // Emit move to backend
      socket.emit('move-made', {
        gameId: gameId.toString(),
        player: account,
        pile,
        stones
      });
      
      // Check if game is finished
      const game = await contract.getGame(gameId);
      if (game.state === 2) { // Finished
        socket.emit('game-finished', {
          gameId: gameId.toString(),
          winner: game.winner
        });
      }
      
    } catch (error) {
      console.error('Error making move:', error);
      alert('Error making move: ' + error.message);
    }
  };

  const resetGame = () => {
    setGameState('connect');
    setGameId(0);
    setGameData(null);
    setWinner('');
    setIsPlayerTurn(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎮 ETH Nim Staking Game</h1>
        {account && (
          <p className="account-info">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </p>
        )}
      </header>

      <main className="App-main">
        {gameState === 'connect' && (
          <ConnectWallet onConnect={connectWallet} onStart={startGame} />
        )}
        
        {gameState === 'waiting' && (
          <WaitingRoom gameId={gameId} />
        )}
        
        {gameState === 'playing' && gameData && (
          <GameBoard 
            gameData={gameData}
            account={account}
            isPlayerTurn={isPlayerTurn}
            onMove={makeMove}
          />
        )}
        
        {gameState === 'finished' && (
          <GameResult 
            winner={winner}
            account={account}
            onReset={resetGame}
          />
        )}
      </main>
    </div>
  );
}

export default App;