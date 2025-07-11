// Using the global fetch API available in modern Node.js

// Environment variables
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOURNAMENT_CODE = process.env.TOURNAMENT_CODE || 'CE7B255E';
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || '6843dcd82c0d875fcf8aa9c1';

// Interfaces
interface Player {
  _id: string;
  name: string;
}

const players = [
  "Farkas Falvi Miklós",
  "Csikesz László",
  "Papp Renátó",
  "Varga László",
  "Zelizi Patrik",
  "Dancsiné Erika",
  "Dancsi Gyula",
  "Faddi István",
  "Baranyi Miklós",
  "Brindus Lajos",
  "Gulyás Ferenc",
  "Ifj. Gulyás Ferenc",
  "Behacker Norbert",
  "Gaál Dániel",
  "Palkó Ádám",
  "Schneider Tamás",
  "Lele Krisztián",
  "Schöffer Dániel",
  "Schöffer Zalán",
  "Mucska Attila",
  "Pálinkás László",
  "Farkas Balázs",
  "Simon András",
  "Schuck László",
  "Schuck Dominik",
  "Kovács Angéla",
  "Kovács Márti",
  "Tillinger Barna",
  "Knapp Ágoston",
  "Baráth Jámos Lafo",
  "Zsigmond László",
  "Czakó Balázs",
  "Horváth Dániel",
  "Csapó Etelka",
  "Krausz József",
  "Barócsi Zsolt",
  "Barócsi Vanessza",
  "Kiszl Csaba",
  "Paloka Csaba",
  "Kántor Tamás",
  "Solti Dénes",
  "Szanka Csaba",
  "Jeges Roland",
  "Szanka Dániel",
  "Henn Ármin",
  "Novek István",
  "Bősze András",
  "Gyuricza Illés",
  "Nagy Zoltán",
  "Mocsari Máté",
  "Mike Lőrinc",
  "Mike Ákos",
  "Mike Száva",
  "Cvikli Balázs",
  "Csuta Gellért",
  "Viczena Dávid",
  "Pálinkás Imre",
  "Azari Róbert Károly",
  "Nemes Kálmán",
  "Recsedényi József",
  "Szőts István",
  "Szanka Dominik",
  "Lázár Márk",
  "Gábor András",
  "Kántor Tibor",
  "Kiss Zoltán",
  "Bokor László",
  "Madár Péter",
  "Szabados Gábor",
  "Horváth Miklós",
  "Sebestyén Norbert",
  "Knapp Tibor",
  "Vargáné Oláh Andrea"
];
interface Match {
  _id: string;
  matchReference: {
    _id: string;
    player1: Player;
    player2: Player;
    stats: {
      player1: { legsWon: number; dartsThrown: number; average: number };
      player2: { legsWon: number; dartsThrown: number; average: number };
    };
    status: 'pending' | 'ongoing' | 'finished';
  } | null;
}

interface Tournament {
  _id: string;
  groups: {
    boardNumber: number;
    matches: Match[];
  }[];
  knockout: {
    rounds: {
      matches: Match[];
    }[];
  };
}

// Helper functions
async function addPlayer(name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/tournaments/${TOURNAMENT_CODE}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: name }),
  });
  if (!res.ok) {
    const error: any = await res.json();
    throw new Error(error.error || 'Failed to add player');
  }
}

async function generateGroups(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/tournaments/${TOURNAMENT_CODE}/assign-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error: any = await res.json();
    throw new Error(error.error || 'Failed to generate groups');
  }
}

async function fetchTournament(): Promise<Tournament> {
  const res = await fetch(`${BASE_URL}/api/tournaments/${TOURNAMENT_CODE}`);
  if (!res.ok) {
    const error: any = await res.json();
    throw new Error(error.error || 'Failed to fetch tournament');
  }
  const data: any = await res.json();
  return data.tournament;
}

async function fetchMatches(): Promise<Match[]> {
  const res: any = await fetch(`${BASE_URL}/api/matches?tournamentId=${TOURNAMENT_ID}`);
  if (!res.ok) {
    const error: any = await res.json();
    throw new Error(error.error || 'Failed to fetch matches');
  }
  return (await res.json()).matches || [];
}

async function simulateMatch(match: Match, useFinishApi: boolean): Promise<void> {
  if (!match.matchReference) {
    throw new Error(`Match ${match._id} has no matchReference`);
  }
  const { _id: matchId, player1, player2 } = match.matchReference;

  // Ensure player IDs are strings and log them for debugging
  const player1Id = player1._id.toString();
  const player2Id = player2._id.toString();
  console.log("Simulate match - Player IDs from matchReference:", { player1Id, player2Id });

  // Select winnerId and ensure it’s a string
  const winnerId = (Math.random() < 0.5 ? player1Id : player2Id).toString();
  const isPlayer1Winner = winnerId === player1Id;

  const simulatedData = {
    winnerId,
    player1LegsWon: isPlayer1Winner ? 3 : 1,
    player2LegsWon: isPlayer1Winner ? 1 : 3,
    stats: {
      player1: {
        legsWon: isPlayer1Winner ? 3 : 1,
        dartsThrown: 40,
        average: 60,
        highestCheckout: isPlayer1Winner ? 100 : 0,
        oneEighties: { count: isPlayer1Winner ? 2 : 0, darts: [] },

      },
      player2: {
        legsWon: isPlayer1Winner ? 1 : 3,
        dartsThrown: 40,
        average: 60,
        highestCheckout: isPlayer1Winner ? 0 : 100,
        oneEighties: { count: isPlayer1Winner ? 0 : 2, darts: [] },
      },
    },
    highestCheckout: {
      player1: isPlayer1Winner ? 100 : 0,
      player2: isPlayer1Winner ? 0 : 100,
    },
    oneEighties: {
      player1: { count: isPlayer1Winner ? 2 : 0, darts: [] },
      player2: { count: isPlayer1Winner ? 0 : 2, darts: [] },
    },
  };

  const payload = {
    winnerId: simulatedData.winnerId,
    player1LegsWon: simulatedData.player1LegsWon,
    player2LegsWon: simulatedData.player2LegsWon,
    stats: simulatedData.stats,
    highestCheckout: simulatedData.highestCheckout,
    oneEighties: simulatedData.oneEighties,
  };

  const endpoint = useFinishApi
    ? `${BASE_URL}/api/matches/${matchId}/${TOURNAMENT_ID}/finish`
    : `${BASE_URL}/api/matches/${matchId}/${TOURNAMENT_ID}/update-result`;
  const method = "PATCH";

  console.log(`Sending ${useFinishApi ? "finish" : "update-result"} request to ${endpoint}`, payload);

  const res = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error: any = await res.json();
    throw new Error(error.error || `Failed to ${useFinishApi ? "finish" : "update"} match ${matchId}`);
  }
}

async function generateKnockout(): Promise<void> {
  const statusRes = await fetch(`${BASE_URL}/api/tournaments/${TOURNAMENT_CODE}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'knockout' }),
  });
  if (!statusRes.ok) {
    const error: any = await statusRes.json();
    throw new Error(error.error || 'Failed to update tournament status');
  }

  const generateRes = await fetch(`${BASE_URL}/api/tournaments/${TOURNAMENT_CODE}/generate-knockout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!generateRes.ok) {
    const error: any = await generateRes.json();
    throw new Error(error.error || 'Failed to generate knockout matches');
  }
}

// Test
describe('Tournament Simulation', () => {
  jest.setTimeout(600000);

  let useFinishApi: boolean;

  // Prompt user to select simulation mode before running tests
  beforeAll(async () => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await new Promise((resolve) => {
      readline.question(
        'Select simulation mode (1 for update-result, 2 for finish API): ',
        (input: string) => {
          readline.close();
          resolve(input);
        }
      );
    });
    useFinishApi = answer === '2';
    console.log(`Selected mode: ${useFinishApi ? 'finish API' : 'update-result API'}`);
  });

  it('should add 76 players', async () => {
    console.log(players.length, 'players to add');
   //add 78 player
    for (const playerName of players) {
      await addPlayer(playerName);
    }
    console.log('Players added');
  });

  it('should generate groups', async () => {
    console.log('Generating groups...');
    await generateGroups();
    const tournament = await fetchTournament();
    expect(tournament.groups.length).toBeGreaterThan(0);
    console.log(`Generated ${tournament.groups.length} groups`);
  });


});