import React, { useState } from 'react';

const WalletConnect = ({ onConnect }) => {
  const [connecting, setConnecting] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to play this game!');
      return;
    }

    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Switch to Sepolia testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'SEP',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      onConnect({
        address: accounts[0],
        provider: window.ethereum,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto px-6">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Nim Staking Game
        </h1>
        <p className="text-xl mb-8 text-gray-300">
          Challenge other players in the classic game of Nim!
          <br />
          Stake 0.0001 ETH and winner takes all.
        </p>
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">How to Play:</h3>
          <ul className="text-left text-sm space-y-2">
            <li>• Start with 21 stones</li>
            <li>• Take 1-3 stones per turn</li>
            <li>• Player who takes the last stone loses</li>
            <li>• Winner gets all staked ETH (0.0002 ETH total)</li>
          </ul>
        </div>
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet & Play'}
        </button>
      </div>
    </div>
  );
};


export default WalletConnect;