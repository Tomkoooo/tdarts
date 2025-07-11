'use client';

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { checkoutTable } from "@/lib/checkouts";
import { Leg } from "@/types/matchSchema";
import mongoose from "mongoose";
import CheckoutPrompt from "./checkoutPrompt";
import FinishConfirmation from "./finishConfirmation";
import MatchSetup from "./matchSetup";
import PlayerCard from "./playerCard";
import ScoreInput from "./scoreInput";

interface DartsCounterProps {
  match: {
    matchId: string;
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    scribeName: string;
    stats: {
      player1: { average: number; dartsThrown: number; legsWon: number };
      player2: { average: number; dartsThrown: number; legsWon: number };
    };
  };
  boardId: string;
  selectedBoard: string;
  handleFinishMatch: (finalStats: {
    winnerId: string;
    player1Stats: { legsWon: number; dartsThrown: number; average: number };
    player2Stats: { legsWon: number; dartsThrown: number; average: number };
    highestCheckout: { player1: number; player2: number };
    oneEighties: { player1: { count: number; darts: number[] }; player2: { count: number; darts: number[] } };
  }) => Promise<void>;
}

interface Throw {
  score: number;
  isDouble?: boolean;
  darts?: number;
}

interface PlayerState {
  score: number;
  totalDartsThrown: number;
  currentLegDartsThrown: number;
  totalPointsThrown: number;
  throws: Throw[];
  checkoutAttempts: number;
  successfulCheckouts: number;
  legsWon: number;
  oneEighties: number[];
  highestCheckout: number;
}

interface ThrowHistoryEntry {
  player: "player1" | "player2";
  score: number;
  darts: number;
  isDouble: boolean;
  wasOneEighty: boolean;
  previousState: {
    score: number;
    currentLegDartsThrown: number;
    totalDartsThrown: number;
    totalPointsThrown: number;
    oneEighties: number[];
    checkoutAttempts: number;
    successfulCheckouts: number;
    highestCheckout: number;
  };
}

interface PendingCheckout {
  player: "player1" | "player2";
  score: number;
  darts: number;
  isDouble: boolean;
  wasOneEighty: boolean;
  newState: PlayerState;
  newLeg: Leg;
  throwEntry: ThrowHistoryEntry;
}

export default function DartsCounter({
  match,
  boardId,
  selectedBoard,
  handleFinishMatch,
}: DartsCounterProps) {
  const [matchType, setMatchType] = useState<"bo3" | "bo5" | "bo7">("bo3");
  const [startingPlayer, setStartingPlayer] = useState<"player1" | "player2">("player1");
  const [legStartingPlayer, setLegStartingPlayer] = useState<"player1" | "player2">("player1");
  const [player1State, setPlayer1State] = useState<PlayerState>({
    score: 501,
    totalDartsThrown: match.stats.player1.dartsThrown || 0,
    currentLegDartsThrown: 0,
    totalPointsThrown: 0,
    throws: [],
    checkoutAttempts: 0,
    successfulCheckouts: 0,
    legsWon: match.stats.player1.legsWon || 0,
    oneEighties: [],
    highestCheckout: 0,
  });
  const [player2State, setPlayer2State] = useState<PlayerState>({
    score: 501,
    totalDartsThrown: match.stats.player2.dartsThrown || 0,
    currentLegDartsThrown: 0,
    totalPointsThrown: 0,
    throws: [],
    checkoutAttempts: 0,
    successfulCheckouts: 0,
    legsWon: match.stats.player2.legsWon || 0,
    oneEighties: [],
    highestCheckout: 0,
  });
  const [currentPlayer, setCurrentPlayer] = useState<"player1" | "player2">(startingPlayer);
  const [inputScore, setInputScore] = useState("");
  const [isDoubleAttempt, setIsDoubleAttempt] = useState(false);
  const [doubleHit, setDoubleHit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [checkoutDartsInput, setCheckoutDartsInput] = useState("");
  const [doubleAttemptsInput, setDoubleAttemptsInput] = useState("");
  const [showSetup, setShowSetup] = useState(true);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);
  const [throwHistory, setThrowHistory] = useState<ThrowHistoryEntry[]>([]);
  const [matchFinished, setMatchFinished] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);

  // Reset states when match prop changes
  useEffect(() => {
    setPlayer1State({
      score: 501,
      totalDartsThrown: match.stats.player1.dartsThrown || 0,
      currentLegDartsThrown: 0,
      totalPointsThrown: 0,
      throws: [],
      checkoutAttempts: 0,
      successfulCheckouts: 0,
      legsWon: match.stats.player1.legsWon || 0,
      oneEighties: [],
      highestCheckout: 0,
    });
    setPlayer2State({
      score: 501,
      totalDartsThrown: match.stats.player2.dartsThrown || 0,
      currentLegDartsThrown: 0,
      totalPointsThrown: 0,
      throws: [],
      checkoutAttempts: 0,
      successfulCheckouts: 0,
      legsWon: match.stats.player2.legsWon || 0,
      oneEighties: [],
      highestCheckout: 0,
    });
    setLegs([]);
    setThrowHistory([]);
    setCurrentPlayer("player1");
    setLegStartingPlayer("player1");
    setMatchType("bo3");
    setStartingPlayer("player1");
    setInputScore("");
    setIsDoubleAttempt(false);
    setDoubleHit(false);
    setShowCheckoutPrompt(false);
    setCheckoutDartsInput("");
    setDoubleAttemptsInput("");
    setShowSetup(true);
    setShowFinishConfirmation(false);
    setMatchFinished(false);
    setPendingCheckout(null);
  }, [match.matchId]);

  // Handle leg changes, but skip if match is finished or confirming
  useEffect(() => {
    if (legs.length > 0 && !matchFinished && !showFinishConfirmation && !showCheckoutPrompt) {
      setPlayer1State((prev) => ({
        ...prev,
        score: 501,
        currentLegDartsThrown: 0,
        throws: [],
        highestCheckout: 0,
      }));
      setPlayer2State((prev) => ({
        ...prev,
        score: 501,
        currentLegDartsThrown: 0,
        throws: [],
        highestCheckout: 0,
      }));
      setInputScore("");
      setThrowHistory([]);
    }
  }, [legs, matchFinished, showFinishConfirmation, showCheckoutPrompt]);

  // Sync starting player
  useEffect(() => {
    setLegStartingPlayer(startingPlayer);
    setCurrentPlayer(startingPlayer);
  }, [startingPlayer]);

  const handleThrow = async () => {
    if (matchFinished || showCheckoutPrompt) return;

    const score = parseInt(inputScore);
    if (isNaN(score) || score < 0 || score > 180) {
      toast.error("Érvénytelen pontszám (0-180 között legyen)");
      return;
    }

    const currentState = currentPlayer === "player1" ? player1State : player2State;
    const setCurrentState = currentPlayer === "player1" ? setPlayer1State : setPlayer2State;

    const newScore = currentState.score - score;
    const newThrows = [...currentState.throws, { score, isDouble: isDoubleAttempt && doubleHit, darts: 3 }];
    let checkoutAttempts = currentState.checkoutAttempts;
    let successfulCheckouts = currentState.successfulCheckouts;
    const oneEighties = [...currentState.oneEighties];
    let highestCheckout = currentState.highestCheckout;
    const newTotalPointsThrown = currentState.totalPointsThrown + score;

    if (score === 180) {
      oneEighties.push(currentState.totalDartsThrown + 1);
    }

    const requiresDouble = newScore > 0 && newScore <= 170 && checkoutTable[newScore];
    const canDoubleFinish =
      newScore <= 50 || (newScore <= 170 && checkoutTable[newScore] && checkoutTable[newScore].includes("D"));
    if (requiresDouble && canDoubleFinish && isDoubleAttempt) {
      checkoutAttempts++;
      if (doubleHit && newScore === 0) {
        successfulCheckouts++;
      }
    }

    const throwEntry: ThrowHistoryEntry = {
      player: currentPlayer,
      score,
      darts: 3,
      isDouble: isDoubleAttempt && doubleHit,
      wasOneEighty: score === 180,
      previousState: {
        score: currentState.score,
        currentLegDartsThrown: currentState.currentLegDartsThrown,
        totalDartsThrown: currentState.totalDartsThrown,
        totalPointsThrown: currentState.totalPointsThrown,
        oneEighties: [...currentState.oneEighties],
        checkoutAttempts,
        successfulCheckouts,
        highestCheckout,
      },
    };

    if (newScore < 0 || (newScore === 0 && requiresDouble && !(isDoubleAttempt && doubleHit))) {
      toast.error("Bust! Túl sok pont vagy dupla szükséges.");
      newThrows.pop();
      setCurrentPlayer(currentPlayer === "player1" ? "player2" : "player1");
    } else if (newScore === 0 && (!requiresDouble || (isDoubleAttempt && doubleHit))) {
      // Defer state update until checkout confirmation
      const newDartsThrown = currentState.currentLegDartsThrown + 3;
      const newTotalDartsThrown = currentState.totalDartsThrown + 3;
      const newLegsWon = currentState.legsWon + 1;
      highestCheckout = Math.max(highestCheckout, currentState.score);

      const newState: PlayerState = {
        ...currentState,
        score: newScore,
        currentLegDartsThrown: newDartsThrown,
        totalDartsThrown: newTotalDartsThrown,
        totalPointsThrown: newTotalPointsThrown,
        throws: newThrows,
        checkoutAttempts,
        successfulCheckouts,
        legsWon: newLegsWon,
        oneEighties,
        highestCheckout,
      };

      const newLeg: Leg = {
        player1Throws: player1State.throws.map((throwItem) => ({
          score: throwItem.score,
          darts: throwItem.darts || 0,
        })),
        player2Throws: player2State.throws.map((throwItem) => ({
          score: throwItem.score,
          darts: throwItem.darts || 0,
        })),
        winnerId: new mongoose.Types.ObjectId(currentPlayer === "player1" ? match.player1Id : match.player2Id),
        highestCheckout: {
          score: currentState.score,
          darts: 3,
          playerId: new mongoose.Types.ObjectId(currentPlayer === "player1" ? match.player1Id : match.player2Id),
        },
        oneEighties: { player1: player1State.oneEighties, player2: player2State.oneEighties },
        createdAt: new Date(),
      };

      setPendingCheckout({
        player: currentPlayer,
        score,
        darts: 3,
        isDouble: isDoubleAttempt && doubleHit,
        wasOneEighty: score === 180,
        newState,
        newLeg,
        throwEntry,
      });
      setShowCheckoutPrompt(true);
      setInputScore("");
      setIsDoubleAttempt(false);
      setDoubleHit(false);
      return;
    } else {
      // Non-checkout throw: update state immediately
      const newDartsThrown = currentState.currentLegDartsThrown + 3;
      const newTotalDartsThrown = currentState.totalDartsThrown + 3;
      setCurrentState((prev) => ({
        ...prev,
        score: newScore,
        currentLegDartsThrown: newDartsThrown,
        totalDartsThrown: newTotalDartsThrown,
        totalPointsThrown: newTotalPointsThrown,
        throws: newThrows,
        checkoutAttempts,
        successfulCheckouts,
        oneEighties,
        highestCheckout,
      }));
      setThrowHistory((prev) => [...prev, throwEntry]);
      setCurrentPlayer(currentPlayer === "player1" ? "player2" : "player1");
    }

    setInputScore("");
    setIsDoubleAttempt(false);
    setDoubleHit(false);
  };

  const handleCheckoutSubmit = async () => {
    if (matchFinished || !pendingCheckout) return;

    const checkoutDarts = parseInt(checkoutDartsInput);
    const doubleAttempts = parseInt(doubleAttemptsInput);

    if (isNaN(checkoutDarts) || checkoutDarts < 1 || checkoutDarts > 3) {
      toast.error("A kiszálló nyilak száma 1 és 3 között legyen");
      return;
    }
    if (isNaN(doubleAttempts) || doubleAttempts < 1 || doubleAttempts > 3) {
      toast.error("A dupla nyilak száma 1 és 3 között legyen");
      return;
    }

    setLoading(true);
    try {
      // Apply the pending state changes
      const setCurrentState = pendingCheckout.player === "player1" ? setPlayer1State : setPlayer2State;
      setCurrentState(pendingCheckout.newState);
      setThrowHistory((prev) => [...prev, pendingCheckout.throwEntry]);

      // Update legs with checkout details
      const updatedLegs = [...legs, pendingCheckout.newLeg];
      updatedLegs[updatedLegs.length - 1].checkoutDarts = checkoutDarts;
      updatedLegs[updatedLegs.length - 1].doubleAttempts = doubleAttempts;
      setLegs(updatedLegs);

      // Update database
      const updatedPlayer1Stats = {
        dartsThrown: player1State.totalDartsThrown,
        average: calculateAverage(player1State.totalPointsThrown, player1State.totalDartsThrown),
        legsWon: player1State.legsWon,
      };
      const updatedPlayer2Stats = {
        dartsThrown: player2State.totalDartsThrown,
        average: calculateAverage(player2State.totalPointsThrown, player2State.totalDartsThrown),
        legsWon: player2State.legsWon,
      };

      await updateMatchStats({
        player1: updatedPlayer1Stats,
        player2: updatedPlayer2Stats,
        legs: updatedLegs,
      });

      const targetLegs = { bo3: 2, bo5: 3, bo7: 4 }[matchType];
      if (pendingCheckout.newState.legsWon >= targetLegs) {
        setShowFinishConfirmation(true);
      } else {
        const nextStartingPlayer = legStartingPlayer === "player1" ? "player2" : "player1";
        setLegStartingPlayer(nextStartingPlayer);
        setCurrentPlayer(nextStartingPlayer);
        toast.success(`${pendingCheckout.player === "player1" ? match.player1Name : match.player2Name} nyerte a leget!`);
      }
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a kiszálló mentése");
    } finally {
      setShowCheckoutPrompt(false);
      setCheckoutDartsInput("");
      setDoubleAttemptsInput("");
      setPendingCheckout(null);
      setLoading(false);
    }
  };

  const handleCheckoutCancel = async () => {
    if (matchFinished || !pendingCheckout) return;

    setLoading(true);
    try {
      // Revert to the previous state using throwHistory
      const lastThrow = pendingCheckout.throwEntry;
      const setState = lastThrow.player === "player1" ? setPlayer1State : setPlayer2State;

      setState((prev) => ({
        ...prev,
        score: lastThrow.previousState.score,
        currentLegDartsThrown: lastThrow.previousState.currentLegDartsThrown,
        totalDartsThrown: lastThrow.previousState.totalDartsThrown,
        totalPointsThrown: lastThrow.previousState.totalPointsThrown,
        throws: prev.throws,
        checkoutAttempts: lastThrow.previousState.checkoutAttempts,
        successfulCheckouts: lastThrow.previousState.successfulCheckouts,
        oneEighties: [...lastThrow.previousState.oneEighties],
        highestCheckout: lastThrow.previousState.highestCheckout,
      }));

      setCurrentPlayer(lastThrow.player);
      toast.success("Kiszálló visszavonva");

      // No database update needed since state wasn’t applied
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a kiszálló visszavonása");
    } finally {
      setShowCheckoutPrompt(false);
      setCheckoutDartsInput("");
      setDoubleAttemptsInput("");
      setPendingCheckout(null);
      setLoading(false);
    }
  };

  const handleRevertThrow = async () => {
    if (matchFinished || showCheckoutPrompt) return;

    if (throwHistory.length === 0) {
      toast.error("Nincs visszavonható dobás");
      return;
    }

    setLoading(true);
    try {
      const lastThrow = throwHistory[throwHistory.length - 1];
      const setState = lastThrow.player === "player1" ? setPlayer1State : setPlayer2State;

      setState((prev) => ({
        ...prev,
        score: lastThrow.previousState.score,
        currentLegDartsThrown: lastThrow.previousState.currentLegDartsThrown,
        totalDartsThrown: lastThrow.previousState.totalDartsThrown,
        totalPointsThrown: lastThrow.previousState.totalPointsThrown,
        throws: prev.throws.slice(0, -1),
        checkoutAttempts: lastThrow.previousState.checkoutAttempts,
        successfulCheckouts: lastThrow.previousState.successfulCheckouts,
        oneEighties: [...lastThrow.previousState.oneEighties],
        highestCheckout: lastThrow.previousState.highestCheckout,
      }));

      setThrowHistory((prev) => prev.slice(0, -1));
      setCurrentPlayer(lastThrow.player);

      const updatedPlayer1Stats = {
        dartsThrown: player1State.totalDartsThrown,
        average: calculateAverage(player1State.totalPointsThrown, player1State.totalDartsThrown),
        legsWon: player1State.legsWon,
      };
      const updatedPlayer2Stats = {
        dartsThrown: player2State.totalDartsThrown,
        average: calculateAverage(player2State.totalPointsThrown, player2State.totalDartsThrown),
        legsWon: player2State.legsWon,
      };

      await updateMatchStats({
        player1: updatedPlayer1Stats,
        player2: updatedPlayer2Stats,
        legs,
      });

      toast.success("Utolsó dobás visszavonva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a dobás visszavonása");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishConfirmation = async (confirm: boolean) => {
    setLoading(true);
    try {
      if (confirm) {
        const winnerId = currentPlayer === "player1" ? match.player1Id : match.player2Id;
        const highestCheckout = legs.reduce(
          (max, leg) => ({
            player1:
              leg.highestCheckout?.playerId.toString() === match.player1Id
                ? Math.max(leg.highestCheckout?.score || 0, max.player1)
                : max.player1,
            player2:
              leg.highestCheckout?.playerId.toString() === match.player2Id
                ? Math.max(leg.highestCheckout?.score || 0, max.player2)
                : max.player2,
          }),
          { player1: 0, player2: 0 }
        );
        const oneEighties = {
          player1: { count: player1State.oneEighties.length, darts: player1State.oneEighties },
          player2: { count: player2State.oneEighties.length, darts: player2State.oneEighties },
        };

        await handleFinishMatch({
          winnerId,
          player1Stats: {
            legsWon: player1State.legsWon,
            dartsThrown: player1State.totalDartsThrown,
            average: calculateAverage(player1State.totalPointsThrown, player1State.totalDartsThrown),
          },
          player2Stats: {
            legsWon: player2State.legsWon,
            dartsThrown: player2State.totalDartsThrown,
            average: calculateAverage(player2State.totalPointsThrown, player2State.totalDartsThrown),
          },
          highestCheckout,
          oneEighties,
        });

        // Reset all states
        setPlayer1State({
          score: 501,
          totalDartsThrown: 0,
          currentLegDartsThrown: 0,
          totalPointsThrown: 0,
          throws: [],
          checkoutAttempts: 0,
          successfulCheckouts: 0,
          legsWon: 0,
          oneEighties: [],
          highestCheckout: 0,
        });
        setPlayer2State({
          score: 501,
          totalDartsThrown: 0,
          currentLegDartsThrown: 0,
          totalPointsThrown: 0,
          throws: [],
          checkoutAttempts: 0,
          successfulCheckouts: 0,
          legsWon: 0,
          oneEighties: [],
          highestCheckout: 0,
        });
        setLegs([]);
        setThrowHistory([]);
        setCurrentPlayer("player1");
        setLegStartingPlayer("player1");
        setStartingPlayer("player1");
        setInputScore("");
        setIsDoubleAttempt(false);
        setDoubleHit(false);
        setShowCheckoutPrompt(false);
        setCheckoutDartsInput("");
        setDoubleAttemptsInput("");
        setShowSetup(true);
        setShowFinishConfirmation(false);
        setMatchFinished(true);
        setPendingCheckout(null);

        toast.success("Mérkőzés befejezve, következő mérkőzés betöltése...");
      } else {
        // Revert to start of new leg
        setPlayer1State((prev) => ({
          ...prev,
          score: 501,
          currentLegDartsThrown: 0,
          throws: [],
          highestCheckout: 0,
        }));
        setPlayer2State((prev) => ({
          ...prev,
          score: 501,
          currentLegDartsThrown: 0,
          throws: [],
          highestCheckout: 0,
        }));
        setLegs((prev) => prev.slice(0, -1)); // Remove last leg
        setCurrentPlayer(legStartingPlayer === "player1" ? "player2" : "player1");
        setInputScore("");
        setThrowHistory([]);
        setShowFinishConfirmation(false);
        setPendingCheckout(null);
        toast.success("Mérkőzés vége visszavonva");
      }
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a mérkőzés befejezése");
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = (pointsThrown: number, dartsThrown: number) => {
    if (dartsThrown === 0) return 0;
    return (pointsThrown / dartsThrown) * 3;
  };

  const updateMatchStats = async (updatedStats: {
    player1: { dartsThrown: number; average: number; legsWon: number };
    player2: { dartsThrown: number; average: number; legsWon: number };
    legs?: Leg[];
  }) => {
    if (matchFinished) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.matchId}/update-stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: { player1: updatedStats.player1, player2: updatedStats.player2 },
          legs: updatedStats.legs || legs,
          boardId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Statisztikák frissítve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a statisztikák frissítése");
    } finally {
      setLoading(false);
    }
  };

  const getCheckoutSuggestion = (score: number) => {
    if (score <= 170 && score > 0) return checkoutTable[score] || "Nincs javaslat";
    return null;
  };

  return (
    <div className="w-screen bg-base-200 flex flex-col items-center justify-center p-6">
      {showSetup ? (
        <>
          <h2 className="text-5xl font-bold text-gray-800 mb-8 text-center">
            Tábla {selectedBoard} - Darts Counter
          </h2>
          <MatchSetup
            matchType={matchType}
            startingPlayer={startingPlayer}
            player1Name={match.player1Name}
            player2Name={match.player2Name}
            onMatchTypeChange={setMatchType}
            onStartingPlayerChange={setStartingPlayer}
            onStart={() => setShowSetup(false)}
          />
        </>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <div className="flex flex-col sm:gap-1 md:gap-6 w-full max-w-6xl">
            <PlayerCard
              playerName={match.player1Name}
              score={player1State.score}
              legsWon={player1State.legsWon}
              dartsThrown={player1State.currentLegDartsThrown}
              average={calculateAverage(player1State.totalPointsThrown, player1State.totalDartsThrown)}
              checkoutSuggestion={getCheckoutSuggestion(player1State.score)}
              isCurrentPlayer={currentPlayer === "player1"}
              inputScore={inputScore}
              isDoubleAttempt={isDoubleAttempt && currentPlayer === "player1"}
              doubleHit={doubleHit}
              onDoubleAttemptChange={setIsDoubleAttempt}
              onDoubleHitChange={setDoubleHit}
            />
            <PlayerCard
              playerName={match.player2Name}
              score={player2State.score}
              legsWon={player2State.legsWon}
              dartsThrown={player2State.currentLegDartsThrown}
              average={calculateAverage(player2State.totalPointsThrown, player2State.totalDartsThrown)}
              checkoutSuggestion={getCheckoutSuggestion(player2State.score)}
              isCurrentPlayer={currentPlayer === "player2"}
              inputScore={inputScore}
              isDoubleAttempt={isDoubleAttempt && currentPlayer === "player2"}
              doubleHit={doubleHit}
              onDoubleAttemptChange={setIsDoubleAttempt}
              onDoubleHitChange={setDoubleHit}
            />
          </div>
          {!showCheckoutPrompt && !showFinishConfirmation && (
            <ScoreInput
              inputScore={inputScore}
              loading={loading}
              onInputChange={setInputScore}
              onClear={() => setInputScore("")}
              onThrow={handleThrow}
              onRevert={handleRevertThrow}
              scribeName={match.scribeName}
            />
          )}
          {showCheckoutPrompt && (
            <CheckoutPrompt
              checkoutDartsInput={checkoutDartsInput}
              doubleAttemptsInput={doubleAttemptsInput}
              loading={loading}
              onCheckoutDartsChange={setCheckoutDartsInput}
              onDoubleAttemptsChange={setDoubleAttemptsInput}
              onSubmit={handleCheckoutSubmit}
              onRevert={handleCheckoutCancel}
            />
          )}
          {showFinishConfirmation && (
            <FinishConfirmation
              winnerName={currentPlayer === "player1" ? match.player1Name : match.player2Name}
              scribeName={match.scribeName}
              loading={loading}
              onConfirm={handleFinishConfirmation}
            />
          )}
        </div>
      )}
    </div>
  );
}