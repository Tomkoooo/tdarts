import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Board } from "./TournamentDetailsPage";

interface BoardSectionProps {
  boards: Board[];
  isModerator: boolean;
  code: string
}

function BoardSection({ boards, isModerator, code }: BoardSectionProps) {
  const [Boards, setBoard] = useState<Board[]>(boards.sort((a, b) => a.boardNumber - b.boardNumber));
  const [countdownMap, setCountdownMap] = useState<Map<string, number>>(new Map());
  const [qrTokens, setQrTokens] = useState<Map<string, string>>(new Map());
  const [printBoardId, setPrintBoardId] = useState<string | null>(null);

  useEffect(() => {
    setBoard(boards.sort((a, b) => a.boardNumber - b.boardNumber));
  }, [boards]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdownMap = new Map<string, number>();
      Boards.forEach((board) => {
        if (board.status === "waiting" && board.updatedAt) {
          const countdown = Math.max(
            0,
            300 - Math.floor((Date.now() - new Date(board.updatedAt).getTime()) / 1000)
          );
          newCountdownMap.set(board._id, countdown);
        }
      });
      setCountdownMap(newCountdownMap);
    }, 1000);

    return () => clearInterval(interval);
  }, [Boards]);

  const handleGenerateAndPrint = async (boardId: string, boardNumber: number) => {
    const existingToken = qrTokens.get(boardId);
    if (existingToken) {
      // Ha már létezik QR-kód, megnyitjuk a nyomtatási ablakot
      setPrintBoardId(boardId);
      setTimeout(() => {
        window.print();
        setPrintBoardId(null);
      }, 100);
      return;
    }

    // Ha nincs QR-kód, generálunk egyet
    try {
      const res = await fetch("/api/qr/generate-qr-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentCode: code,
          boardNumber,
        }),
      });
      if (res.ok) {
        const { token } = await res.json();
        setQrTokens((prev) => new Map(prev.set(boardId, token)));
        setPrintBoardId(boardId);
        setTimeout(() => {
          window.print();
          setPrintBoardId(null);
        }, 100);
      }
    } catch (error) {
      console.error(`Hiba a QR token generálásakor a ${boardNumber}. táblához:`, error);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Táblák</h2>
      {Boards.length === 0 ? (
        <p>Nincsenek még táblák konfigurálva.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {Boards.map((board) => {
            const qrToken = qrTokens.get(board._id);
            const qrUrl = qrToken
              ? `${window.location.origin}/board?code=${code}&token=${qrToken}&boardNumber=${board.boardNumber}`
              : "";

            return (
              <div key={board._id} className="card bg-base-200 shadow-md">
                <div className="card-body">
                  <h3 className="card-title">Tábla {board.boardNumber}</h3>
                  <p
                    className={`text-lg font-bold ${
                      board.status === "idle"
                        ? "text-gray-500"
                        : board.status === "waiting"
                        ? "text-warning"
                        : board.status === "playing" && !board.currentMatch && !board.nextMatch
                        ? "text-gray-500"
                        : "text-success"
                    }`}
                  >
                    Állapot:{" "}
                    {board.status === "idle"
                      ? "Üres"
                      : board.status === "waiting"
                      ? "Várakozik"
                      : board.status === "playing" && !board.currentMatch && !board.nextMatch
                      ? "Üres"
                      : "Játékban"}
                  </p>
                  {board.status === "playing" && board.currentMatch ? (
                    <div className="mt-2">
                      <h4 className="font-semibold">Jelenlegi mérkőzés:</h4>
                      <p className="text-md">
                        <span className="font-bold">{board.currentMatch.player1Name}</span> vs{" "}
                        <span className="font-bold">{board.currentMatch.player2Name}</span>
                      </p>
                      <p className="text-md">
                        Állás:{" "}
                        <span className="font-bold">
                          {board.currentMatch.stats.player1Legs} - {board.currentMatch.stats.player2Legs}
                        </span>
                      </p>
                      <p className="text-md">
                        Eredményíró:{" "}
                        <span className="font-bold">{board.currentMatch.scribeName || "Nincs"}</span>
                      </p>
                      {board.waitingPlayers && board.waitingPlayers.length > 0 && (
                        <div className="mt-2">
                          <h4 className="font-semibold">Várakozó játékosok:</h4>
                          <ul className="list-disc pl-5">
                            {board.waitingPlayers.map((player) => (
                              <li key={player._id} className="text-md">
                                {player.name || "Ismeretlen"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : board.status === "waiting" && board.nextMatch ? (
                    <div className="mt-2">
                      <h4 className="font-semibold">Következő mérkőzés:</h4>
                      <p className="text-md">
                        <span
                          className={`font-bold ${
                            board.nextMatch.player1Status === "ready" ? "text-success" : "text-error"
                          }`}
                        >
                          {board.nextMatch.player1Status === "ready" ? "✔" : "✘"}{" "}
                          {board.nextMatch.player1Name}
                        </span>{" "}
                        vs{" "}
                        <span
                          className={`font-bold ${
                            board.nextMatch.player2Status === "ready" ? "text-success" : "text-error"
                          }`}
                        >
                          {board.nextMatch.player2Status === "ready" ? "✔" : "✘"}{" "}
                          {board.nextMatch.player2Name}
                        </span>
                      </p>
                      <p className="text-md">
                        Eredményíró:{" "}
                        <span className="font-bold">{board.nextMatch.scribeName || "Nincs"}</span>
                      </p>
                      <div className="text-sm text-gray-500">
                        Hátralévő idő:{" "}
                        <b>
                          {Math.floor((countdownMap.get(board._id) || 0) / 60)}:
                          {String((countdownMap.get(board._id) || 0) % 60).padStart(2, "0")}
                        </b>{" "}
                        perc
                      </div>
                    </div>
                  ) : board.waitingPlayers && board.waitingPlayers.length > 0 ? (
                    <div className="mt-2">
                      <h4 className="font-semibold">Várakozó játékosok:</h4>
                      <ul className="list-disc pl-5">
                        {board.waitingPlayers.map((player) => (
                          <li key={player._id} className="text-md">
                            {player.name || "Ismeretlen"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-md italic">Nincs további információ.</p>
                  )}

                  {isModerator && (
                    <div className="mt-4">
                      <h4 className="font-semibold">QR-kód a táblához:</h4>
                      <div className="flex justify-center mt-2">
                        {qrUrl && <QRCodeSVG value={qrUrl} size={128} />}
                      </div>
                      <button
                        className="btn btn-primary mt-2"
                        onClick={() => handleGenerateAndPrint(board._id, board.boardNumber)}
                      >
                        QR-kód generálása és nyomtatása
                      </button>
                    </div>
                  )}
                </div>

                {printBoardId === board._id && (
                  <div className="print-only fixed inset-0 bg-white flex items-center justify-center z-50">
                    <div className="text-center p-6 max-w-md">
                      <h3 className="text-3xl font-bold mb-6">Tábla {board.boardNumber}</h3>
                      {qrUrl && <QRCodeSVG value={qrUrl} size={256} className="mx-auto mb-6" />}
                      <p className="text-lg mb-4">
                        A QR-kód beolvasásával automatikusan csatlakozhatsz a táblához.
                      </p>
                      <div className="border-t border-gray-300 pt-4">
                        <h4 className="text-xl font-semibold mb-2">Manuális csatlakozás</h4>
                        <p className="text-md mb-2">
                          Ha nincs lehetőséged QR-kód beolvasására, kövesd az alábbi lépéseket:
                        </p>
                        <ol className="text-md list-decimal list-inside text-left">
                          <li className="mb-1">
                            Látogass el a következő URL-re: <strong>{window.location.origin}/board</strong>
                          </li>
                          <li className="mb-1">
                            Add meg a torna kódot: <strong>{code}</strong>
                          </li>
                          <li className="mb-1">
                            Add meg a jelszót: <strong>123456</strong>
                          </li>
                          <li className="mb-1">
                            Válaszd ki a tábla számát: <strong>{board.boardNumber}</strong>
                          </li>
                          <li className="mb-1">
                            Kattints a <i>Kiválasztás</i> gombra, hogy csatlakozz a táblához.
                          </li>
                        </ol>
                      </div>
                      <p className="text-sm text-gray-500 mt-6">
                        Generálva: {new Date().toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BoardSection;