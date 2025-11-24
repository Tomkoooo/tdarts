import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GenerateRandomHash = (num: number) => {
    return Math.random().toString(36).substring(2, 2 + num);
}

export const roundRobin = (numPlayers: number) => {
    const matches: { player1: number; player2: number; scorer: number }[] = [];
    
    switch (numPlayers) {
        case 3:
            matches.push(
                { player1: 1, player2: 2, scorer: 3 },
                { player1: 3, player2: 1, scorer: 2 },
                { player1: 2, player2: 3, scorer: 1 }
            );
            break;
        case 4:
            matches.push(
                { player1: 1, player2: 2, scorer: 3 },
                { player1: 3, player2: 4, scorer: 1 },
                { player1: 1, player2: 3, scorer: 2 },
                { player1: 2, player2: 4, scorer: 3 },
                { player1: 1, player2: 4, scorer: 2 },
                { player1: 2, player2: 3, scorer: 4 }
            );
            break;
        case 5:
            matches.push(
                { player1: 1, player2: 2, scorer: 3 },
                { player1: 3, player2: 4, scorer: 5 },
                { player1: 5, player2: 1, scorer: 2 },
                { player1: 2, player2: 3, scorer: 4 },
                { player1: 4, player2: 5, scorer: 1 },
                { player1: 1, player2: 3, scorer: 2 },
                { player1: 2, player2: 4, scorer: 3 },
                { player1: 3, player2: 5, scorer: 1 },
                { player1: 4, player2: 1, scorer: 5 },
                { player1: 5, player2: 2, scorer: 4 }
            );
            break;
        case 6:
            matches.push(
                { player1: 1, player2: 2, scorer: 3 },
                { player1: 3, player2: 4, scorer: 5 },
                { player1: 5, player2: 6, scorer: 1 },
                { player1: 1, player2: 3, scorer: 2 },
                { player1: 2, player2: 4, scorer: 6 },
                { player1: 3, player2: 5, scorer: 4 },
                { player1: 4, player2: 6, scorer: 1 },
                { player1: 1, player2: 5, scorer: 2 },
                { player1: 2, player2: 6, scorer: 3 },
                { player1: 1, player2: 4, scorer: 5 },
                { player1: 2, player2: 3, scorer: 6 },
                { player1: 4, player2: 5, scorer: 1 },
                { player1: 3, player2: 6, scorer: 2 },
                { player1: 1, player2: 6, scorer: 4 },
                { player1: 2, player2: 5, scorer: 3 }
            );
            break;
        default:
            // Fallback to dynamic generation for other numbers of players
            if (numPlayers < 2) return [];

            // Create an array of player indices [1, 2, ..., numPlayers]
            const players = Array.from({ length: numPlayers }, (_, i) => i + 1);

            // If odd number of players, add a dummy player (0) for byes
            if (numPlayers % 2 !== 0) {
                players.push(0);
            }

            const n = players.length;
            const rounds = n - 1;
            const half = n / 2;

            for (let r = 0; r < rounds; r++) {
                for (let i = 0; i < half; i++) {
                    const p1 = players[i];
                    const p2 = players[n - 1 - i];

                    // If neither player is the dummy, schedule a match
                    if (p1 !== 0 && p2 !== 0) {
                        let scorer = 0;
                        if (numPlayers % 2 !== 0) {
                            // Find who is sitting out this round (paired with 0)
                            for (let j = 0; j < half; j++) {
                                const sp1 = players[j];
                                const sp2 = players[n - 1 - j];
                                if (sp1 === 0) scorer = sp2;
                                if (sp2 === 0) scorer = sp1;
                            }
                        } else {
                            // Even number of players. Simple heuristic for scorer.
                            for (let k = 1; k <= numPlayers; k++) {
                                if (k !== p1 && k !== p2) {
                                    scorer = k;
                                    break;
                                }
                            }
                        }

                        matches.push({ player1: p1, player2: p2, scorer });
                    }
                }

                // Rotate players array (keep first player fixed, rotate the rest)
                const first = players[0];
                const rest = players.slice(1);
                const last = rest.pop();
                if (last) rest.unshift(last);
                players.length = 0;
                players.push(first, ...rest);
            }
            break;
    }

    return matches;
}