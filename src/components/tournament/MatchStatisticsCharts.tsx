'use client';

import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { IconTarget, IconTrendingDown } from '@tabler/icons-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
}

interface Leg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: {
    _id: string;
    name: string;
  };
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number; // Hány nyílból szállt ki a győztes
  loserRemainingScore?: number; // A vesztes játékos maradék pontjai
  doubleAttempts: number;
  createdAt: string;
}

interface MatchStatisticsChartsProps {
  legs: Leg[];
  player1Name: string;
  player2Name: string;
}

const MatchStatisticsCharts: React.FC<MatchStatisticsChartsProps> = ({
  legs,
  player1Name,
  player2Name
}) => {
  const [expandedLegs, setExpandedLegs] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'legs'>('overview');

  // Toggle leg expansion
  const toggleLeg = (legIndex: number) => {
    const newExpanded = new Set(expandedLegs);
    if (newExpanded.has(legIndex)) {
      newExpanded.delete(legIndex);
    } else {
      newExpanded.add(legIndex);
    }
    setExpandedLegs(newExpanded);
  };

  // Calculate 3-dart average for each leg
  const calculateLegAverages = (throws: Throw[]) => {
    if (throws.length === 0) return 0;
    const totalScore = throws.reduce((sum, t) => sum + t.score, 0);
    // 3-dart average: total score / number of throws
    return throws.length > 0 ? Math.round((totalScore / throws.length) * 100) / 100 : 0;
  };

  // Calculate throw-by-throw 3-dart averages within each leg
  const calculateThrowByThrowAverages = (throws: Throw[]) => {
    const averages: number[] = [];
    let totalScore = 0;

    throws.forEach((throwData, index) => {
      totalScore += throwData.score;
      // 3-dart average: total score / number of throws so far
      const average = (index + 1) > 0 ? Math.round((totalScore / (index + 1)) * 100) / 100 : 0;
      averages.push(average);
    });

    return averages;
  };

  // Calculate cumulative 3-dart averages across the match with leg separation
  const calculateCumulativeAveragesWithLegs = () => {
    const player1Cumulative: number[] = [];
    const player2Cumulative: number[] = [];
    const legLabels: string[] = [];
    
    let player1TotalScore = 0;
    let player1TotalThrows = 0;
    let player2TotalScore = 0;
    let player2TotalThrows = 0;

    legs.forEach((leg, legIndex) => {
      // Player 1 cumulative
      leg.player1Throws.forEach(throwData => {
        player1TotalScore += throwData.score;
        player1TotalThrows += 1;
      });
      const player1Avg = player1TotalThrows > 0 ? Math.round((player1TotalScore / player1TotalThrows) * 100) / 100 : 0;
      player1Cumulative.push(player1Avg);

      // Player 2 cumulative
      leg.player2Throws.forEach(throwData => {
        player2TotalScore += throwData.score;
        player2TotalThrows += 1;
      });
      const player2Avg = player2TotalThrows > 0 ? Math.round((player2TotalScore / player2TotalThrows) * 100) / 100 : 0;
      player2Cumulative.push(player2Avg);

      // Leg label
      legLabels.push(`${legIndex + 1}. Leg`);
    });

    return { player1Cumulative, player2Cumulative, legLabels };
  };

  // Calculate leg-by-leg averages
  const legAverages = legs.map((leg, index) => ({
    leg: index + 1,
    player1Average: calculateLegAverages(leg.player1Throws),
    player2Average: calculateLegAverages(leg.player2Throws),
  }));

  const { player1Cumulative, player2Cumulative } = calculateCumulativeAveragesWithLegs();

  // Chart options - Responsive
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        padding: 8
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Átlag',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Leg',
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        }
      },
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
      },
      line: {
        borderWidth: 2,
      },
    },
  };

  // Leg-by-leg averages chart data
  const legByLegData = {
    labels: legAverages.map(item => `${item.leg}. Leg`),
    datasets: [
      {
        label: player1Name,
        data: legAverages.map(item => item.player1Average),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.1,
        fill: false,
      },
      {
        label: player2Name,
        data: legAverages.map(item => item.player2Average),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.1,
        fill: false,
      },
    ],
  };



  // Throw-by-throw averages chart data (for the first leg as example)
  const createThrowByThrowData = (legIndex: number) => {
    const leg = legs[legIndex];
    if (!leg) return null;

    const player1ThrowAverages = calculateThrowByThrowAverages(leg.player1Throws);
    const player2ThrowAverages = calculateThrowByThrowAverages(leg.player2Throws);

    const throwLabels = Array.from({ length: Math.max(player1ThrowAverages.length, player2ThrowAverages.length) }, (_, i) => `${i + 1}. dobás`);

    return {
      labels: throwLabels,
      datasets: [
        {
          label: player1Name,
          data: player1ThrowAverages,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          tension: 0.1,
          fill: false,
        },
        {
          label: player2Name,
          data: player2ThrowAverages,
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.2)',
          tension: 0.1,
          fill: false,
        },
      ],
    };
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2   pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`btn btn-sm flex-1 sm:flex-none min-w-[120px] ${
            activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="hidden sm:inline">Összesítő</span>
          <span className="sm:hidden">Összes</span>
        </button>
        <button
          onClick={() => setActiveTab('legs')}
          className={`btn btn-sm flex-1 sm:flex-none min-w-[120px] ${
            activeTab === 'legs' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden sm:inline">Leg részletek</span>
          <span className="sm:hidden">Legek</span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Statistics summary - Now first */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="card bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg border"
              <div className="card-body p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-primary text-base sm:text-lg truncate flex-1 mr-2" title={player1Name}>
                    {player1Name}
                  </h4>
                  <div className="badge badge-primary badge-sm">P1</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-base-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] sm:text-xs text-base-content/60 mb-1 font-medium">Végső átlag</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                      {player1Cumulative.length > 0 ? player1Cumulative[player1Cumulative.length - 1] : 0}
                    </div>
                  </div>
                  <div className="bg-base-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] sm:text-xs text-base-content/60 mb-1 font-medium">Max leg átlag</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-info">
                      {legAverages.length > 0 ? Math.max(...legAverages.map(item => item.player1Average)) : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-error/10 to-error/5 shadow-lg border"
              <div className="card-body p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-error text-base sm:text-lg truncate flex-1 mr-2" title={player2Name}>
                    {player2Name}
                  </h4>
                  <div className="badge badge-error badge-sm">P2</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-base-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] sm:text-xs text-base-content/60 mb-1 font-medium">Végső átlag</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-error">
                      {player2Cumulative.length > 0 ? player2Cumulative[player2Cumulative.length - 1] : 0}
                    </div>
                  </div>
                  <div className="bg-base-100 rounded-lg p-3 text-center">
                    <div className="text-[10px] sm:text-xs text-base-content/60 mb-1 font-medium">Max leg átlag</div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-info">
                      {legAverages.length > 0 ? Math.max(...legAverages.map(item => item.player2Average)) : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leg-by-leg averages chart */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm sm:text-base md:text-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="hidden sm:inline">Teljesítmény alakulása</span>
                  <span className="sm:hidden">Alakulás</span>
                </h3>
              </div>
              <div className="h-56 sm:h-64 md:h-80">
                <Line options={chartOptions} data={legByLegData} />
              </div>
              <div className="mt-3 p-3 bg-base-200 rounded-lg">
                <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed">
                  <span className="font-semibold">📊 Legenkénti átlagok:</span> Az egyes legekben elért 3 nyilas átlagok összehasonlítása leg-ről leg-re.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Legs Tab */}
      {activeTab === 'legs' && (
        <div className="space-y-3">
          {legs.map((leg, legIndex) => {
            const throwData = createThrowByThrowData(legIndex);
            if (!throwData || leg.player1Throws.length === 0 && leg.player2Throws.length === 0) return null;

            const isExpanded = expandedLegs.has(legIndex);
            const player1LegAvg = calculateLegAverages(leg.player1Throws);
            const player2LegAvg = calculateLegAverages(leg.player2Throws);

            return (
              <div key={legIndex} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                <div className="card-body p-3 sm:p-4">
                  {/* Collapsed View - Summary */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleLeg(legIndex)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex-shrink-0">
                        <span className="text-sm sm:text-base font-bold text-primary">{legIndex + 1}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-base-content/60">Leg átlagok</div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-bold text-primary">{player1LegAvg}</span>
                            {leg.winnerId?._id && (
                              <span className="text-xs">
                                {leg.winnerId.name === player1Name ? '🏆' : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-base-content/40">vs</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-bold text-error">{player2LegAvg}</span>
                            {leg.winnerId?._id && (
                              <span className="text-xs">
                                {leg.winnerId.name === player2Name ? '🏆' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Nyilak száma és maradék pontok */}
                        {leg.winnerId?._id && (
                          <div className="mt-2 text-[10px] sm:text-xs text-base-content/60">
                            {leg.winnerId.name === player1Name ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <IconTarget size={10} className="text-primary" />
                                  <span className="text-primary">{leg.winnerArrowCount || 3} nyíl</span>
                                </div>
                                {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <IconTrendingDown size={10} className="text-error" />
                                    <span className="text-error">{leg.loserRemainingScore} pont</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <IconTarget size={10} className="text-error" />
                                  <span className="text-error">{leg.winnerArrowCount || 3} nyíl</span>
                                </div>
                                {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <IconTrendingDown size={10} className="text-primary" />
                                    <span className="text-primary">{leg.loserRemainingScore} pont</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      className="btn btn-xs btn-circle btn-ghost flex-shrink-0"
                      aria-label={isExpanded ? "Összecsukás" : "Kibontás"}
                    >
                      {isExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Expanded View - Detailed Chart */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 "
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs sm:text-sm font-semibold">Dobásonkénti átlagok</span>
                        </div>
                      </div>
                      <div className="h-48 sm:h-56 md:h-64">
                        <Line options={{
                          ...chartOptions,
                          scales: {
                            ...chartOptions.scales,
                            x: {
                              ...chartOptions.scales?.x,
                              title: {
                                display: true,
                                text: 'Dobás',
                                font: {
                                  size: 10
                                }
                              },
                            },
                          },
                        }} data={throwData} />
                      </div>
                      <div className="mt-3 p-2 sm:p-3 bg-info/10 rounded-lg border"
                        <div className="text-[10px] sm:text-xs text-base-content/70 leading-relaxed space-y-1">
                          <p>
                            💡 <span className="font-semibold">Tipp:</span> A grafikon mutatja, hogyan változott a játékosok teljesítménye a leg során.
                          </p>
                          {leg.winnerId?._id && (
                            <div className="flex items-center gap-4 pt-1 "
                              <div className="flex items-center gap-1">
                                <IconTarget size={12} className="text-primary" />
                                <span className="font-medium">
                                  {leg.winnerId.name} kiszállt: {leg.winnerArrowCount || 3} nyíl
                                </span>
                              </div>
                              {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                                <div className="flex items-center gap-1">
                                  <IconTrendingDown size={12} className="text-error" />
                                  <span className="font-medium">
                                    Maradt: {leg.loserRemainingScore} pont
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {legs.filter(leg => leg.player1Throws.length > 0 || leg.player2Throws.length > 0).length === 0 && (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm">Még nincsenek részletes leg adatok.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchStatisticsCharts;
