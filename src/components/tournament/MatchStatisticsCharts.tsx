'use client';

import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Átlag',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Leg',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
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
    <div className="space-y-6">
      {/* Leg-by-leg averages chart */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg font-bold mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Legenkénti átlagok (3 nyilas)
          </h3>
          <div className="h-64">
            <Line options={chartOptions} data={legByLegData} />
          </div>
          <p className="text-sm text-base-content/70 mt-2">
            Az egyes legek 3 nyilas átlagai. Látható, hogy melyik játékos teljesített jobban az adott legben.
          </p>
        </div>
      </div>



      {/* Throw-by-throw averages for each leg - Collapsible */}
      {legs.map((leg, legIndex) => {
        const throwData = createThrowByThrowData(legIndex);
        if (!throwData || leg.player1Throws.length === 0 && leg.player2Throws.length === 0) return null;

        const isExpanded = expandedLegs.has(legIndex);

        return (
          <div key={legIndex} className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title text-lg font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {legIndex + 1}. Leg - Dobásonkénti átlagok (3 nyilas)
                </h3>
                <button
                  onClick={() => toggleLeg(legIndex)}
                  className="btn btn-sm btn-ghost"
                >
                  {isExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
              
              {isExpanded && (
                <>
                  <div className="h-64">
                    <Line options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ...chartOptions.scales?.x,
                          title: {
                            display: true,
                            text: 'Dobás',
                          },
                        },
                      },
                    }} data={throwData} />
                  </div>
                  <p className="text-sm text-base-content/70 mt-2">
                    Az {legIndex + 1}. legben a dobásonkénti 3 nyilas átlagok változása. Látható, hogyan alakult a játékosok teljesítménye a leg során.
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Statistics summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="font-bold text-primary">{player1Name}</h4>
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-title">Végső átlag (3 nyilas)</div>
                <div className="stat-value text-primary">
                  {player1Cumulative.length > 0 ? player1Cumulative[player1Cumulative.length - 1] : 0}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Legmagasabb leg átlag</div>
                <div className="stat-value text-info">
                  {Math.max(...legAverages.map(item => item.player1Average))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h4 className="font-bold text-primary">{player2Name}</h4>
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-title">Végső átlag (3 nyilas)</div>
                <div className="stat-value text-primary">
                  {player2Cumulative.length > 0 ? player2Cumulative[player2Cumulative.length - 1] : 0}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Legmagasabb leg átlag</div>
                <div className="stat-value text-info">
                  {Math.max(...legAverages.map(item => item.player2Average))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchStatisticsCharts;
