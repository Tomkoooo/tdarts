export const GenerateRandomHash = (num: number) => {
    return Math.random().toString(36).substring(2, 2 + num);
}

export const roundRobin = (num: number) => {
    switch (num) {
        case 3:
            return [{player1: 1, player2: 2, scorer: 3}, {player1: 1, player2: 3, scorer: 2}, {player1: 2, player2: 3, scorer: 1}]
        case 4:
            return [{player1: 1, player2: 2, scorer: 3}, {player1: 3, player2: 4, scorer: 2}, {player1: 1, player2: 3, scorer: 4}, {player1: 2, player2: 4, scorer: 3}, {player1: 1, player2: 4, scorer: 2}, {player1: 2, player2: 3, scorer: 1}]
        case 5:
            return [{player1: 1, player2: 2, scorer: 5}, {player1: 3, player2: 4, scorer: 2}, {player1: 1, player2: 5, scorer: 4}, {player1: 3, player2: 2, scorer: 5}, {player1: 1, player2: 4, scorer: 3}, {player1: 2, player2: 5, scorer: 4}, {player1: 1, player2: 3, scorer: 2}, {player1: 4, player2: 5, scorer: 1}, {player1: 2, player2: 4, scorer: 3}, {player1: 3, player2: 5, scorer: 1}]
        case 6:
            return [{player1: 1, player2: 6, scorer: 3}, 
                    {player1: 2, player2: 5, scorer: 6}, 
                    {player1: 3, player2: 4, scorer: 2},
                    {player1: 1, player2: 5, scorer: 6}, 
                    {player1: 2, player2: 4, scorer: 1}, 
                    {player1: 3, player2: 5, scorer: 2}, 
                    {player1: 4, player2: 6, scorer: 5}, 
                    {player1: 1, player2: 3, scorer: 4}, 
                    {player1: 2, player2: 6, scorer: 3}, 
                    {player1: 4, player2: 5, scorer: 1},
                    {player1: 2, player2: 3, scorer: 5}, 
                    {player1: 1, player2: 4, scorer: 5},
                    {player1: 3, player2: 6, scorer: 4},
                    {player1: 1, player2: 2, scorer: 3},
                    {player1: 5, player2: 6, scorer: 2}
                ]
    }
}