import { ethers } from 'ethers';

// This will be populated after contract deployment
const CONTRACT_ABI = [
  "function createGame() external payable",
  "function joinGame() external payable",
  "function makeMove(uint256 pile, uint256 stones) external",
  "function getGame(uint256 gameId) external view returns (tuple(address player1, address player2, address currentPlayer, address winner, uint8 state, uint256[4] piles, uint256 totalStake))",
  "function getPlayerGame(address player) external view returns (uint256)",
  "function getWaitingGamesCount() external view returns (uint256)",
  "function leaveGame() external",
  "event GameCreated(uint256 gameId, address player1)",
  "event GameStarted(uint256 gameId, address player1, address player2)",
  "event MoveMade(uint256 gameId, address player, uint256 pile, uint256 stones)",
  "event GameFinished(uint256 gameId, address winner, uint256 prize)"
];

// Default localhost deployment address - will be updated after deployment
let CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const getContract = async (signer) => {
  try {
    // Try to load deployed contract config
    const contractConfig = await import('../contract-config.json');
    CONTRACT_ADDRESS = contractConfig.address;
    return new ethers.Contract(CONTRACT_ADDRESS, contractConfig.abi, signer);
  } catch (error) {
    // Fallback to default ABI if config file doesn't exist
    console.log('Using default contract configuration');
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }
};

export const formatAddress = (address) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};