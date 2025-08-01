import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Match states storage
const matchStates = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Let Socket.IO handle its own requests
    if (req.url?.startsWith('/socket.io/')) {
      return;
    }
    
    // Let Next.js handle all other requests
    return handler(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // Join tournament room
    socket.on('join-tournament', (tournamentCode) => {
      socket.join(`tournament-${tournamentCode}`);
      console.log(`👥 Client ${socket.id} joined tournament: ${tournamentCode}`);
    });
    
    // Join specific match room
    socket.on('join-match', (matchId) => {
      socket.join(`match-${matchId}`);
      console.log(`🎯 Client ${socket.id} joined match: ${matchId}`);
      
      // Send current match state to new viewer
      const matchState = matchStates.get(matchId);
      if (matchState) {
        socket.emit('match-state', matchState);
        console.log(`📤 Sent match state to client ${socket.id} for match ${matchId}`);
      }
    });

    // Set match players
    socket.on('set-match-players', (data) => {
      const { matchId, player1Id, player2Id } = data;
      const matchState = matchStates.get(matchId) || {
        currentLeg: 1,
        completedLegs: [],
        currentLegData: {
          player1Score: 501,
          player2Score: 501,
          player1Throws: [],
          player2Throws: [],
          player1Remaining: 501,
          player2Remaining: 501,
          player1Id,
          player2Id
        }
      };
      
      // Update player IDs
      matchState.currentLegData.player1Id = player1Id;
      matchState.currentLegData.player2Id = player2Id;
      
      matchStates.set(matchId, matchState);
      console.log(`👥 Set players for match ${matchId}: ${player1Id} vs ${player2Id}`);
    });

    // Leave match room
    socket.on('leave-match', (matchId) => {
      socket.leave(`match-${matchId}`);
      console.log(`👋 Client ${socket.id} left match: ${matchId}`);
    });
    
    // Handle throw events
    socket.on('throw', (data) => {
      console.log(`🎯 Throw event for match ${data.matchId}:`, data);
      
      // Update match state
      updateMatchState(data.matchId, data);
      
      // Broadcast to match room
      socket.to(`match-${data.matchId}`).emit('throw-update', data);
    });
    
    // Handle leg completion
    socket.on('leg-complete', (data) => {
      console.log(`🏆 Leg complete for match ${data.matchId}:`, data);
      
      updateMatchState(data.matchId, data);
      socket.to(`match-${data.matchId}`).emit('leg-complete', data);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  function updateMatchState(matchId, data) {
    const currentState = matchStates.get(matchId) || {
      currentLeg: 1,
      completedLegs: [],
      currentLegData: {
        player1Score: 501,
        player2Score: 501,
        player1Throws: [],
        player2Throws: [],
        player1Remaining: 501,
        player2Remaining: 501
      }
    };
    
    if (data.legNumber !== undefined) {
      // Leg completion
      const completedLeg = {
        legNumber: data.legNumber,
        winnerId: data.winnerId,
        player1Throws: data.completedLeg?.player1Throws || [],
        player2Throws: data.completedLeg?.player2Throws || [],
        completedAt: Date.now()
      };
      
      currentState.completedLegs.push(completedLeg);
      currentState.currentLeg = data.legNumber + 1;
      currentState.currentLegData = {
        player1Score: 501,
        player2Score: 501,
        player1Throws: [],
        player2Throws: [],
        player1Remaining: 501,
        player2Remaining: 501
      };
    } else {
      // Throw update
      const throwData = {
        score: data.score,
        darts: data.darts,
        isDouble: data.isDouble,
        isCheckout: data.isCheckout,
        remainingScore: data.remainingScore,
        timestamp: Date.now()
      };
      
      if (data.playerId === currentState.currentLegData.player1Id) {
        currentState.currentLegData.player1Throws.push(throwData);
        currentState.currentLegData.player1Remaining = data.remainingScore;
      } else {
        currentState.currentLegData.player2Throws.push(throwData);
        currentState.currentLegData.player2Remaining = data.remainingScore;
      }
    }
    
    matchStates.set(matchId, currentState);
    console.log(`💾 Updated match state for ${matchId}:`, currentState);
  }

  // Expose match states for API access
  global.matchStates = matchStates;

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running on port ${port}`);
    });
}); 