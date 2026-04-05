import React, { useState, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTranslations } from "next-intl";
import { getPlayerModalDataAction } from '@/features/players/actions/getPlayerModalData.action';

// Types
interface PlayerStats {
  name: string;
  overallStats: {
    average: number;
    checkoutRate: number;
    totalLegsWon: number;
    totalLegsPlayed: number;
    totalMatchesWon: number;
    totalMatchesPlayed: number;
    totalTournamentsPlayed: number;
    totalTournamentsWon: number;
    totalHighestCheckout: number;
    totalOneEighties: number;
    bestPlacement: number | null;
  };
}

interface TournamentHistory {
  tournamentId: string;
  tournamentName: string;
  placement: number;
  stats: {
    average: number;
    checkoutRate: number;
    legsWon: number;
    legsPlayed: number;
    matchesWon: number;
    matchesPlayed: number;
    oneEighties: number;
    highestCheckout: number;
  };
}

interface UsePlayerStatsModalReturn {
  openPlayerStatsModal: (playerId: string) => void;
  PlayerStatsModal: React.FC;
}

// Hook
const usePlayerStatsModal = (): UsePlayerStatsModalReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("Common");

  const toLegacyPlayerStats = (player: any): PlayerStats => {
    const stats = player?.stats || {};
    const history = Array.isArray(player?.tournamentHistory) ? player.tournamentHistory : [];
    const wins = Number(stats.totalMatchesWon || 0);
    const played = Number(stats.matchesPlayed || wins + Number(stats.totalMatchesLost || 0));
    const tournamentsPlayed = Number(stats.tournamentsPlayed || history.length || 0);
    const tournamentsWon = history.filter((h: any) => Number(h?.position) === 1).length;
    const checkoutRate = Number(stats.checkoutRate || 0);

    return {
      name: String(player?.name || ''),
      overallStats: {
        average: Number(stats.avg || 0),
        checkoutRate,
        totalLegsWon: Number(stats.totalLegsWon || stats.legsWon || 0),
        totalLegsPlayed: Number(stats.totalLegsWon || stats.legsWon || 0) + Number(stats.totalLegsLost || stats.legsLost || 0),
        totalMatchesWon: wins,
        totalMatchesPlayed: played,
        totalTournamentsPlayed: tournamentsPlayed,
        totalTournamentsWon: tournamentsWon,
        totalHighestCheckout: Number(stats.highestCheckout || 0),
        totalOneEighties: Number(stats.oneEightiesCount || stats.total180s || 0),
        bestPlacement: Number.isFinite(Number(stats.bestPosition)) ? Number(stats.bestPosition) : null,
      },
    };
  };

  const openPlayerStatsModal = useCallback(async (playerId: string) => {
    setIsLoading(true);
    setError(null);
    setPlayerStats(null);
    try {
      const response = await getPlayerModalDataAction({ playerId });
      const payload =
        response &&
        typeof response === 'object' &&
        'success' in response &&
        response.success &&
        'data' in response
          ? (response as { data?: { player?: any } }).data
          : null;
      const player = payload?.player;
      if (!player) throw new Error('Player data unavailable');

      setPlayerStats(toLegacyPlayerStats(player));
      const history = Array.isArray(player?.tournamentHistory)
        ? player.tournamentHistory.map((entry: any, idx: number) => ({
            tournamentId: String(entry?.tournamentId || entry?._id || idx),
            tournamentName: String(entry?.tournamentName || entry?.name || 'Tournament'),
            placement: Number(entry?.position || 0),
            stats: {
              average: Number(entry?.stats?.average || entry?.stats?.avg || 0),
              checkoutRate: Number(entry?.stats?.checkoutRate || 0),
              legsWon: Number(entry?.stats?.legsWon || entry?.stats?.totalLegsWon || 0),
              legsPlayed:
                Number(entry?.stats?.legsWon || entry?.stats?.totalLegsWon || 0) +
                Number(entry?.stats?.legsLost || entry?.stats?.totalLegsLost || 0),
              matchesWon: Number(entry?.stats?.matchesWon || entry?.stats?.totalMatchesWon || 0),
              matchesPlayed:
                Number(entry?.stats?.matchesPlayed || entry?.stats?.totalMatchesWon || 0) +
                Number(entry?.stats?.matchesLost || entry?.stats?.totalMatchesLost || 0),
              oneEighties: Number(entry?.stats?.oneEighties || entry?.stats?.oneEightiesCount || 0),
              highestCheckout: Number(entry?.stats?.highestCheckout || 0),
            },
          }))
        : [];
      setTournamentHistory(history);

      setIsModalOpen(true);
    } catch (err) {
      setError(t("nem_sikerult_betolteni_a_8vw4"));
      console.error('Error fetching player data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setPlayerStats(null);
    setTournamentHistory([]);
    setError(null);
  };

  const PlayerStatsModal: React.FC = () => {
    return (
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white/80 backdrop-blur-lg p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] flex flex-col">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {playerStats ? `${playerStats.name} statisztikái` : 'Játékos statisztikák'}
                  </Dialog.Title>
                  <div className="mt-4 flex-1 overflow-y-auto">
                    {isLoading && <p>{t("betoltes_69f8")}</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {playerStats && (
                      <>
                        <h4 className="text-md font-semibold">{t("osszesitett_statisztikak_y0ve")}</h4>
                        <table className="min-w-full divide-y divide-gray-200 mt-2">
                          <tbody className="bg-transparent divide-y divide-gray-200">
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("atlag_308n")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.average.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("kiszallo_arany_49l1")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{(playerStats.overallStats.checkoutRate * 100).toFixed(2)}%</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("nyert_lejatszott_leg_47wb")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.totalLegsWon} / {playerStats.overallStats.totalLegsPlayed}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("nyert_lejatszott_meccs_61q5")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.totalMatchesWon} / {playerStats.overallStats.totalMatchesPlayed}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("nyert_lejatszott_torna_5xow")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.totalTournamentsWon} / {playerStats.overallStats.totalTournamentsPlayed}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("legmagasabb_kiszallo_v119")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.totalHighestCheckout}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("osszes_180_reco")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.totalOneEighties}</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{t("legjobb_helyezes_i1t1")}</td>
                              <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{playerStats.overallStats.bestPlacement ?? 'Nincs'}</td>
                            </tr>
                          </tbody>
                        </table>

                        <h4 className="text-md font-semibold mt-6">{t("torna_tortenet_jznf")}</h4>
                        {tournamentHistory.length === 0 ? (
                          <p className="text-sm text-gray-700">{t("nincs_elerheto_torna_tortenet_8gia")}</p>
                        ) : (
                          <div className="max-h-64 overflow-y-auto mt-2">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50/50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t("torna_1c80")}</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t("helyezes_bugj")}</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t("atlag_308n")}</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">180-ak</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t("legmagasabb_kiszallo_v119")}</th>
                                </tr>
                              </thead>
                              <tbody className="bg-transparent divide-y divide-gray-200">
                                {tournamentHistory.map((entry) => (
                                  <tr key={entry.tournamentId}>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{entry.tournamentName}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{entry.placement}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{entry.stats.average.toFixed(2)}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{entry.stats.oneEighties}</td>
                                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{entry.stats.highestCheckout}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border  bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={closeModal}
                    >
                      {t("bezaras_o3av")}</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  };

  return { openPlayerStatsModal, PlayerStatsModal };
};

export default usePlayerStatsModal;