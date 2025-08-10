import { create } from 'zustand';

const useGameStore = create((set) => ({
  game: {
    gameId: null,
    isActive: false,
    player1: '',
    player2: '',
    stones: ''
  },

  setGame: (newGame) => set({ game: newGame })
}));

export default useGameStore;
