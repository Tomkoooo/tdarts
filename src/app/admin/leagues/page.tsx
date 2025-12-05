"use client";

import { useState, useEffect } from "react";
import { Loader2, Award, CheckCircle, XCircle } from "lucide-react";
import axios from "axios";

interface League {
  _id: string;
  name: string;
  description: string;
  pointSystemType: string;
  verified: boolean;
  isActive: boolean;
  createdAt: string;
  club: {
    _id: string;
    name: string;
    verified: boolean;
  };
}

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, unverified: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const response = await axios.get('/api/admin/leagues');
      setLeagues(response.data.leagues);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeagues = leagues.filter(league => {
    const matchesSearch = league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (league.club?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (verifiedFilter === 'verified') return matchesSearch && league.verified === true;
    if (verifiedFilter === 'unverified') return matchesSearch && league.verified !== true;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Ligák kezelése</h1>
          <p className="text-base-content/60 mt-2">Összes liga megtekintése és kezelése</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/60">Összes liga</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <Award className="h-10 w-10 text-primary opacity-50" />
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/60">Hitelesített (OAC)</p>
                  <p className="text-3xl font-bold mt-1 text-success">{stats.verified}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-success opacity-50" />
              </div>
            </div>
          </div>
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/60">Platform ligák</p>
                  <p className="text-3xl font-bold mt-1">{stats.unverified}</p>
                </div>
                <XCircle className="h-10 w-10 text-base-content/60 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Szűrés hitelesítés szerint</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setVerifiedFilter('all')}
                className={`btn ${verifiedFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              >
                Összes ({stats.total})
              </button>
              <button
                onClick={() => setVerifiedFilter('verified')}
                className={`btn ${verifiedFilter === 'verified' ? 'btn-success' : 'btn-outline'}`}
              >
                OAC Ligák ({stats.verified})
              </button>
              <button
                onClick={() => setVerifiedFilter('unverified')}
                className={`btn ${verifiedFilter === 'unverified' ? 'btn-outline' : 'btn-outline'}`}
              >
                Platform Ligák ({stats.unverified})
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg">Keresés</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Keresés név vagy klub alapján..."
                className="input input-bordered w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Leagues Table */}
        <div className="card bg-base-200">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Liga neve</th>
                    <th>Klub</th>
                    <th>Pontozási rendszer</th>
                    <th>Státusz</th>
                    <th>Aktív</th>
                    <th>Létrehozva</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeagues.map((league) => (
                    <tr key={league._id} className="hover">
                      <td className="font-medium">{league.name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {league.club ? (
                            <>
                              {league.club.name}
                              {league.club.verified && (
                                <span className="badge badge-success badge-sm">OAC</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Nincs klub</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${league.pointSystemType === 'remiz_christmas' ? 'badge-warning' : 'badge-ghost'}`}>
                          {league.pointSystemType === 'remiz_christmas' ? 'Remiz Karácsony' : 'Platform'}
                        </span>
                      </td>
                      <td>
                        {league.verified ? (
                          <span className="badge badge-success gap-1">
                            <CheckCircle className="h-3 w-3" />
                            OAC Liga
                          </span>
                        ) : (
                          <span className="badge badge-ghost gap-1">
                            Platform Liga
                          </span>
                        )}
                      </td>
                      <td>
                        {league.isActive ? (
                          <span className="text-success">Aktív</span>
                        ) : (
                          <span className="text-base-content/40">Inaktív</span>
                        )}
                      </td>
                      <td className="text-base-content/60">
                        {new Date(league.createdAt).toLocaleDateString('hu-HU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
