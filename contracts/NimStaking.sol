// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract NimStaking {
    uint256 public constant STAKE_AMOUNT = 0.0001 ether;

    struct Game {
        address player1;
        address player2;
        uint256 totalStake;
        bool isActive;
        address winner;
        uint256 stones;
        address currentPlayer;
        uint256 gameId;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerGame;

    uint256 public gameCounter;
    uint256 public waitingGameId;

    event GameCreated(uint256 gameId, address player1);
    event PlayerJoined(uint256 gameId, address player2);
    event MoveMade(uint256 gameId, address player, uint256 stonesTaken);
    event GameEnded(uint256 gameId, address winner, uint256 amount);

    modifier gameExists(uint256 gameId) {
        require(games[gameId].player1 != address(0), "Game does not exist");
        _;
    }

    modifier isPlayerInGame(uint256 gameId) {
        require(games[gameId].player1 == msg.sender || games[gameId].player2 == msg.sender, "Not a player in this game");
        _;
    }

    function createOrJoinGame() external payable {
        require(msg.value == STAKE_AMOUNT, "Must stake exactly 0.0001 ETH");
        require(playerGame[msg.sender] == 0, "Already in a game");

        if (waitingGameId != 0 && games[waitingGameId].player2 == address(0)) {
            // Join existing game
            uint256 gameId = waitingGameId;
            games[gameId].player2 = msg.sender;
            games[gameId].totalStake += msg.value;
            games[gameId].isActive = true;
            games[gameId].stones = 21; // Start with 21 stones
            games[gameId].currentPlayer = games[gameId].player1;

            playerGame[msg.sender] = gameId;
            waitingGameId = 0;

            emit PlayerJoined(gameId, msg.sender);
        } else {
            // Create new game
            gameCounter++;
            uint256 gameId = gameCounter;

            games[gameId] = Game({
                player1: msg.sender,
                player2: address(0),
                totalStake: msg.value,
                isActive: false,
                winner: address(0),
                stones: 0,
                currentPlayer: address(0),
                gameId: gameId
            });

            playerGame[msg.sender] = gameId;
            waitingGameId = gameId;

            emit GameCreated(gameId, msg.sender);
        }
    }

    function makeMove(uint256 gameId, uint256 stonesTaken) external gameExists(gameId) isPlayerInGame(gameId) {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(game.currentPlayer == msg.sender, "Not your turn");
        require(stonesTaken >= 1 && stonesTaken <= 3, "Can take 1-3 stones only");
        require(game.stones >= stonesTaken, "Not enough stones");

        game.stones -= stonesTaken;

        emit MoveMade(gameId, msg.sender, stonesTaken);

        if (game.stones == 0) {
            // Player who takes the last stone loses
            game.winner = (msg.sender == game.player1) ? game.player2 : game.player1;
            game.isActive = false;

            // Transfer winnings
            uint256 winnings = game.totalStake;
            game.totalStake = 0;

            // Clear player games
            delete playerGame[game.player1];
            delete playerGame[game.player2];

            payable(game.winner).transfer(winnings);

            emit GameEnded(gameId, game.winner, winnings);
        } else {
            // Switch turns
            game.currentPlayer = (msg.sender == game.player1) ? game.player2 : game.player1;
        }
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getMyGame() external view returns (Game memory) {
        uint256 gameId = playerGame[msg.sender];
        require(gameId != 0, "Not in any game");
        return games[gameId];
    }

    function leaveGame() external {
        uint256 gameId = playerGame[msg.sender];
        require(gameId != 0, "Not in any game");

        Game storage game = games[gameId];
        require(!game.isActive, "Cannot leave active game");

        if (game.player2 == address(0)) {
            // Refund if no second player joined
            payable(msg.sender).transfer(game.totalStake);
            delete games[gameId];
            if (waitingGameId == gameId) {
                waitingGameId = 0;
            }
        }

        delete playerGame[msg.sender];
    }

    function resetContract() external {
        // Delete all games
        for (uint256 i = 1; i <= gameCounter; i++) {
            delete games[i];
        }

        // Delete all playerGame entries
        // Note: Since playerGame keys are addresses and you don't track all players,
        // you can't easily delete all entries here. So let's just reset playerGame for all players
        // who currently have a game by iterating over games.

        for (uint256 i = 1; i <= gameCounter; i++) {
            Game memory g = games[i];
            if (g.player1 != address(0)) {
                delete playerGame[g.player1];
            }
            if (g.player2 != address(0)) {
                delete playerGame[g.player2];
            }
        }

        gameCounter = 0;
        waitingGameId = 0;
    }
}
