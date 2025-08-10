import { ethers } from 'ethers';

// UPDATE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
const CONTRACT_ADDRESS = '0x7583D53Da6E88c13B86B642B28DD4139911a58e0'; // Replace with actual address

const CONTRACT_ABI = [
  "function createOrJoinGame() external payable",
  "function makeMove(uint256 gameId, uint256 stonesTaken) external",
  "function getMyGame() external view returns (tuple(address player1, address player2, uint256 totalStake, bool isActive, address winner, uint256 stones, address currentPlayer, uint256 gameId))",
  "function getGame(uint256 gameId) external view returns (tuple(address player1, address player2, uint256 totalStake, bool isActive, address winner, uint256 stones, address currentPlayer, uint256 gameId))",
  "function leaveGame() external",
  "event GameCreated(uint256 gameId, address player1)",
  "event PlayerJoined(uint256 gameId, address player2)",
  "event MoveMade(uint256 gameId, address player, uint256 stonesTaken)",
  "event GameEnded(uint256 gameId, address winner, uint256 amount)"
];

class ContractService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
  }

  async initialize(wallet) {
    this.provider = new ethers.BrowserProvider(wallet.provider);
    this.signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
  }

  async createOrJoinGame() {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.createOrJoinGame({
      value: ethers.parseEther('0.0001')
    });
    
    return await tx.wait();
  }

  async makeMove(gameId, stonesTaken) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.makeMove(gameId, stonesTaken);
    return await tx.wait();
  }

  async getMyGame() {
    if (!this.contract) throw new Error('Contract not initialized');
    return await this.contract.getMyGame();
  }

  async getGame(gameId) {
    if (!this.contract) throw new Error('Contract not initialized');
    return await this.contract.getGame(gameId);
  }

  subscribeToEvents(callback) {
    if (!this.contract) return;

    this.contract.on('GameCreated', (gameId, player1) => {
      callback('GameCreated', { gameId: gameId.toString(), player1 });
    });

    this.contract.on('PlayerJoined', (gameId, player2) => {
      callback('PlayerJoined', { gameId: gameId.toString(), player2 });
    });

    this.contract.on('MoveMade', (gameId, player, stonesTaken) => {
      callback('MoveMade', { gameId: gameId.toString(), player, stonesTaken: stonesTaken.toString() });
    });

    this.contract.on('GameEnded', (gameId, winner, amount) => {
      callback('GameEnded', { gameId: gameId.toString(), winner, amount: ethers.formatEther(amount) });
    });
  }

  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

export const contractService = new ContractService();