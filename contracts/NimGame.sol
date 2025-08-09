// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract NimGame {
    uint256 public constant STAKE_AMOUNT = 0.1 ether;
    uint256 private gameCounter = 0;
    
    enum GameState { WaitingForPlayer, InProgress, Finished }
    
    struct Game {
        address player1;
        address player2;
        address currentPlayer;
        address winner;
        GameState state;
        uint256[4] piles; // 4 piles with different number of stones
        uint256 totalStake;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerToGame;
    uint256[] public waitingGames;
    
    event GameCreated(uint256 gameId, address player1);
    event GameStarted(uint256 gameId, address player1, address player2);
    event MoveMade(uint256 gameId, address player, uint256 pile, uint256 stones);
    event GameFinished(uint256 gameId, address winner, uint256 prize);
    
    function createGame() external payable {
        require(msg.value == STAKE_AMOUNT, "Must stake exactly 0.1 ETH");
        require(playerToGame[msg.sender] == 0, "Already in a game");
        
        gameCounter++;
        games[gameCounter] = Game({
            player1: msg.sender,
            player2: address(0),
            currentPlayer: address(0),
            winner: address(0),
            state: GameState.WaitingForPlayer,
            piles: [uint256(3), uint256(5), uint256(7), uint256(9)], // Classic Nim setup
            totalStake: STAKE_AMOUNT
        });
        
        playerToGame[msg.sender] = gameCounter;
        waitingGames.push(gameCounter);
        
        emit GameCreated(gameCounter, msg.sender);
    }
    
    function joinGame() external payable {
        require(msg.value == STAKE_AMOUNT, "Must stake exactly 0.1 ETH");
        require(playerToGame[msg.sender] == 0, "Already in a game");
        require(waitingGames.length > 0, "No games available");
        
        uint256 gameId = waitingGames[waitingGames.length - 1];
        waitingGames.pop();
        
        Game storage game = games[gameId];
        require(game.state == GameState.WaitingForPlayer, "Game not available");
        require(game.player1 != msg.sender, "Cannot join your own game");
        
        game.player2 = msg.sender;
        game.currentPlayer = game.player1; // Player1 starts
        game.state = GameState.InProgress;
        game.totalStake += STAKE_AMOUNT;
        
        playerToGame[msg.sender] = gameId;
        
        emit GameStarted(gameId, game.player1, game.player2);
    }
    
    function makeMove(uint256 pile, uint256 stones) external {
        uint256 gameId = playerToGame[msg.sender];
        require(gameId != 0, "Not in a game");
        
        Game storage game = games[gameId];
        require(game.state == GameState.InProgress, "Game not in progress");
        require(game.currentPlayer == msg.sender, "Not your turn");
        require(pile < 4, "Invalid pile");
        require(stones > 0 && stones <= game.piles[pile], "Invalid number of stones");
        
        game.piles[pile] -= stones;
        
        emit MoveMade(gameId, msg.sender, pile, stones);
        
        // Check if game is over (all piles empty)
        bool gameOver = true;
        for (uint i = 0; i < 4; i++) {
            if (game.piles[i] > 0) {
                gameOver = false;
                break;
            }
        }
        
        if (gameOver) {
            // Last player to move loses (misère variant)
            game.winner = (msg.sender == game.player1) ? game.player2 : game.player1;
            game.state = GameState.Finished;
            
            // Transfer winnings
            payable(game.winner).transfer(game.totalStake);
            
            // Clear player mappings
            delete playerToGame[game.player1];
            delete playerToGame[game.player2];
            
            emit GameFinished(gameId, game.winner, game.totalStake);
        } else {
            // Switch turn
            game.currentPlayer = (game.currentPlayer == game.player1) ? game.player2 : game.player1;
        }
    }
    
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    function getPlayerGame(address player) external view returns (uint256) {
        return playerToGame[player];
    }
    
    function getWaitingGamesCount() external view returns (uint256) {
        return waitingGames.length;
    }
    
    function leaveGame() external {
        uint256 gameId = playerToGame[msg.sender];
        require(gameId != 0, "Not in a game");
        
        Game storage game = games[gameId];
        require(game.state == GameState.WaitingForPlayer, "Cannot leave active game");
        require(game.player1 == msg.sender, "Only creator can leave waiting game");
        
        // Remove from waiting list
        for (uint i = 0; i < waitingGames.length; i++) {
            if (waitingGames[i] == gameId) {
                waitingGames[i] = waitingGames[waitingGames.length - 1];
                waitingGames.pop();
                break;
            }
        }
        
        // Refund stake
        payable(msg.sender).transfer(STAKE_AMOUNT);
        
        // Clear mappings
        delete playerToGame[msg.sender];
        delete games[gameId];
    }
}