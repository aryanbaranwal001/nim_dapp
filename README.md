# 🎮 ETH Nim Staking Game

A decentralized two-player Nim game built on Ethereum where players stake real ETH and the winner takes all. Experience classic game theory with real financial stakes on the blockchain.

![Game Preview](https://img.shields.io/badge/Status-Live%20on%20Mainnet-green?style=for-the-badge)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18.2.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## 🎯 Game Overview

**Nim** is a mathematical strategy game where two players take turns removing matches from bunch of matches. In our **misère variant**, the player who takes the last stone **loses**. Each game requires both players to stake **0.0001 ETH**, and the winner takes the entire **0.0002 ETH** pot.

### 🏆 Game Rules
- 3 bunch of matches: **3, 5, 7** matches initially
- Players alternate turns removing **1 or more matches** from **any single bunch**
- The player who **empties all bunch of matches** (takes the last stone) **loses**
- Winner receives all staked ETH (**0.0002 ETH total**)
- Real-time multiplayer with instant updates

## 🚀 Live Game

**🔴 ZIRCUIT MAINNET DEPLOYMENT**
- **Contract Address**: `0x169F6de062528e501d3526Fe9d7603a01992d5DC`
- **Network**: Zircuit Mainnet
- **Zircuit Scan**: [View Contract](https://explorer.zircuit.com/address/0x169F6de062528e501d3526Fe9d7603a01992d5DC)

**⚠️ WARNING**: This uses **real ETH** on mainnet. Each game costs **0.0001 ETH** to play.

## 🏗️ Technology Stack

- **Smart Contract**: Solidity 0.8.19 (Deployed on Ethereum Mainnet)
- **Frontend**: React 18 + Ethers.js v6
- **Backend**: Node.js + Socket.io (Real-time multiplayer)
- **Deployment**: Foundry framework
- **Wallet**: MetaMask integration with automatic network detection
- **socket.io** : To enable p2p game.

## 📁 Project Structure

```
nim-staking-game/
├── contracts/
│   └── NimGame.sol                    # Main game contract
├── backend/
│   ├── server.js                      # Socket.io server for real-time updates
│   └── package.json                   # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js                     # Main React application
│   │   ├── components/
│   │   │   ├── ConnectWallet.js       # Wallet connection component
│   │   │   ├── WaitingRoom.js         # Matchmaking interface
│   │   │   ├── GameBoard.js           # Game interface
│   │   │   └── GameResult.js          # Win/lose screen
│   │   ├── utils/
│   │   │   └── contract.js            # Contract interaction utilities
│   │   └── config/
│   │       └── contract-config.js     # Contract address & ABI
│   └── public/
│       └── index.html                 # HTML template
└── README.md                          # This file
```

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js** 16+ and **npm**
- **Foundry** (for local blockchain)
- **MetaMask** browser extension
- **Git**

### Option 1: Local Testing with Foundry Anvil

```bash
# 1. Clone the repository
git clone https://github.com/aryanbaranwal001/nim_dapp.git
cd nim_dapp

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 6. Start backend server 
cd backend && npm run dev

# 7. Start frontend 
cd frontend && npm run dev

#Connect to Mainnet (Real ETH)
#Enjoy the game

# 1. Update frontend/src/config/contract-config.js:
export const CONTRACT_ADDRESS = "0x169F6de062528e501d3526Fe9d7603a01992d5DC";

## 🎮 How to Play

### For Players

1. **Connect Wallet**: Click "Connect MetaMask" and approve the connection
2. **Network Check**: App automatically switches to the correct network
3. **Start/Join Game**: 
   - If no games available: Creates new game (0.0001 ETH stake)
   - If game waiting: Joins existing game (0.0001 ETH stake)
4. **Play Nim**: Take turns removing matches from bunch of matches
5. **Win Condition**: Force opponent to take the last stone
6. **Collect Winnings**: Winner automatically receives 0.0002 ETH

### Game Flow
```
Player 1: Connect → Stake 0.0001 ETH → Wait for opponent
Player 2: Connect → Stake 0.0001 ETH → Game starts!
Both: Take turns removing matches
Winner: Receives 0.0002 ETH automatically
```

### Backend Configuration
The backend runs on `http://localhost:3001` by default. Update `backend/server.js` to change port:

Frontend runs on `http://localhost:5173` by default.

```javascript
const PORT = process.env.PORT || 3001;
```

## 🔒 Security Features

- **Trustless Gameplay**: All game logic enforced by smart contract
- **Automatic Payouts**: Winner receives funds immediately upon game completion
- **Fair Matchmaking**: First-come-first-served game joining
- **Immutable Rules**: Game rules cannot be changed after deployment
- **Transparent**: All transactions visible on blockchain

## 💰 Economic Model

- **Entry Fee**: 0.0001 ETH per player
- **Prize Pool**: 0.0002 ETH total (winner takes all)

## 🧪 Smart Contract Details

### Key Functions
- `createGame()`: Start new game with 0.0001 ETH stake
- `joinGame()`: Join waiting game with 0.0001 ETH stake  
- `getGame(gameId)`: Get current game state
- `getPlayerGame(address)`: Check if player has active game

### Events
- `GameCreated`: New game waiting for players
- `GameStarted`: Both players joined, game begins
- `GameFinished`: Game completed, winner determined

### Game States
- `WaitingForPlayer`: Game created, waiting for second player
- `InProgress`: Both players joined, game active
- `Finished`: Game completed, funds distributed

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**This software is for educational and entertainment purposes. Users are responsible for:**
- Understanding Ethereum transaction costs and risks
- Securing their private keys and MetaMask accounts  
- Complying with local laws regarding online gaming
- Understanding that ETH stakes can be lost


