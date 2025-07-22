import { Tournament } from "./TournamentDetailsPage";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
interface TournamentHeaderProps {
  tournament: Tournament;
  fetchTournament: () => Promise<void>;
  loading: boolean;
  autoFetch: boolean;
  setAutoFetch: React.Dispatch<React.SetStateAction<boolean>>;
  isModerator: boolean;
  setIsModerator: React.Dispatch<React.SetStateAction<boolean>>;
  handleModeratorAuth: (password: string) => Promise<void>;
}

function TournamentHeader({
  tournament,
  fetchTournament,
  loading,
  autoFetch,
  setAutoFetch,
  isModerator,
  handleModeratorAuth,
}: TournamentHeaderProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const descriptionLimit = 150;
  const isLongDescription = tournament.description && tournament.description.length > descriptionLimit;

  // Animation variants for Framer Motion
  const descriptionVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await handleModeratorAuth(password);
    setPassword(""); // Clear input after submission
  };

  return (
    <div className="flex justify-between items-start mt-4">
      <div className="flex flex-col items-start gap-1 w-2/4">
        <h1 className="card-title text-2xl">{tournament.name}</h1>
        <p className="font-semibold italic">{tournament.startDate.toString().replaceAll('T', ' ').replaceAll('-', ' ').split('.')[0]}</p>
        <div className="indent-2 italic text-md">
          {isLongDescription ? (
            <>
              {!isDescriptionExpanded && (
                <span>
                  {tournament.description?.slice(0, descriptionLimit)}
                  <button
                    className="text-primary hover:underline cursor-pointer"
                    onClick={() => setIsDescriptionExpanded(true)}
                  >
                    ...
                  </button>
                </span>
              )}
              <AnimatePresence>
                {isDescriptionExpanded && (
                  <motion.div
                    variants={descriptionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="overflow-hidden"
                  >
                    <span>{tournament.description}</span>
                    <button
                      className="text-primary hover:underline ml-2"
                      onClick={() => setIsDescriptionExpanded(false)}
                    >
                      [Kevesebb]
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <span>{tournament.description || "Nincs leírás"}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <button className="btn btn-primary btn-outline btn-sm" onClick={()=>(fetchTournament())} disabled={loading}>
            {loading ? <span className="loading loading-spinner"></span> : "Frissítés"}
          </button>
          <div className="flex flex-col items-start justify-center">
            <label className="label italic">Automatikus frissítés</label>
            <input
              type="checkbox"
              name="autoFetch"
              className="checkbox"
              checked={autoFetch}
              onChange={() => setAutoFetch(!autoFetch)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p>
            Állapot:{" "}
            {tournament.status === "created"
              ? "Létrehozva"
              : tournament.status === "group"
              ? "Csoportkör"
              : tournament.status === "knockout"
              ? "Kieséses szakasz"
              : "Befejezve"}
          </p>
          <p>Táblák száma: {tournament.boardCount}</p>
          {tournament.createdAt && (
            <p>Létrehozva: {new Date(tournament.createdAt).toLocaleString("hu-HU")}</p>
          )}
        </div>
        {!isModerator && (
          <form onSubmit={handlePasswordSubmit} className="flex gap-2 items-center mt-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Moderátor jelszó"
              className="input input-bordered input-sm w-48"
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !password.trim()}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Hitelesítés"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default TournamentHeader;