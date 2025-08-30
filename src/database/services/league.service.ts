import { connectMongo } from '@/lib/mongoose';
import { LeagueModel, LeagueDocument } from '@/database/models/league.model';
import { LeagueStandingModel, LeagueStandingDocument } from '@/database/models/leagueStanding.model';
import { LeagueTournamentModel, LeagueTournamentDocument } from '@/database/models/leagueTournament.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { PlayerModel } from '@/database/models/player.model';
import { ILeague, CreateLeagueData, UpdateLeagueData, AddPointsData, AddTournamentResultData } from '@/interface/league.interface';

export class LeagueService {
  /**
   * Liga létrehozása
   */
  static async createLeague(data: CreateLeagueData, createdBy: string): Promise<LeagueDocument> {
    await connectMongo();
    
    const league = new LeagueModel({
      ...data,
      createdBy,
      scoringSystem: {
        groupStage: {
          eliminated: data.scoringSystem?.groupStage?.eliminated ?? 0
        },
        knockoutStage: {
          round1: data.scoringSystem?.knockoutStage?.round1 ?? 1,
          round2: data.scoringSystem?.knockoutStage?.round2 ?? 2,
          round3: data.scoringSystem?.knockoutStage?.round3 ?? 3,
          quarterFinal: data.scoringSystem?.knockoutStage?.quarterFinal ?? 5,
          semiFinal: data.scoringSystem?.knockoutStage?.semiFinal ?? 8,
          finalist: data.scoringSystem?.knockoutStage?.finalist ?? 12,
          winner: data.scoringSystem?.knockoutStage?.winner ?? 20
        }
      },
      settings: {
        allowManualPoints: data.settings?.allowManualPoints ?? true,
        allowExistingPoints: data.settings?.allowExistingPoints ?? true,
        autoCalculateStandings: data.settings?.autoCalculateStandings ?? true
      }
    });

    return await league.save();
  }

  /**
   * Liga lekérdezése ID alapján
   */
  static async getLeagueById(leagueId: string): Promise<LeagueDocument | null> {
    await connectMongo();
    return await LeagueModel.findById(leagueId)
      .populate('clubId', 'name')
      .populate('createdBy', 'username name')
      .populate('tournaments', 'name startDate endDate');
  }

  /**
   * Klub ligái
   */
  static async getLeaguesByClub(clubId: string): Promise<LeagueDocument[]> {
    await connectMongo();
    return await LeagueModel.find({ clubId, isActive: true })
      .populate('createdBy', 'username name')
      .populate('tournaments', 'name startDate endDate')
      .sort({ createdAt: -1 });
  }

  /**
   * Liga frissítése
   */
  static async updateLeague(leagueId: string, data: UpdateLeagueData): Promise<LeagueDocument | null> {
    await connectMongo();
    return await LeagueModel.findByIdAndUpdate(
      leagueId,
      { ...data },
      { new: true, runValidators: true }
    );
  }

  /**
   * Liga törlése (deaktiválás)
   */
  static async deleteLeague(leagueId: string): Promise<boolean> {
    await connectMongo();
    const result = await LeagueModel.findByIdAndUpdate(
      leagueId,
      { isActive: false },
      { new: true }
    );
    return !!result;
  }

  /**
   * Liga állás lekérdezése
   */
  static async getLeagueStandings(leagueId: string): Promise<LeagueStandingDocument[]> {
    await connectMongo();
    return await LeagueStandingModel.find({ leagueId })
      .populate('playerId', 'username name')
      .populate('clubId', 'name')
      .sort({ totalPoints: -1, bestFinish: 1 });
  }

  /**
   * Játékos liga állása
   */
  static async getPlayerLeagueStanding(leagueId: string, playerId: string): Promise<LeagueStandingDocument | null> {
    await connectMongo();
    return await LeagueStandingModel.findOne({ leagueId, playerId })
      .populate('playerId', 'username name')
      .populate('clubId', 'name');
  }

  /**
   * Manuális pontok hozzáadása
   */
  static async addManualPoints(leagueId: string, data: AddPointsData): Promise<LeagueStandingDocument | null> {
    await connectMongo();
    
    let standing = await LeagueStandingModel.findOne({ leagueId, playerId: data.playerId });
    
    if (!standing) {
      // Új állás létrehozása
      standing = new LeagueStandingModel({
        leagueId,
        playerId: data.playerId,
        clubId: data.clubId,
        totalPoints: data.points,
        pointsBreakdown: {
          manual: data.points,
          groupStage: 0,
          knockoutStage: 0,
          existing: 0
        }
      });
    } else {
      // Meglévő állás frissítése
      standing.pointsBreakdown.manual += data.points;
      standing.totalPoints += data.points;
      standing.lastUpdated = new Date();
    }

    return await standing.save();
  }

  /**
   * Verseny eredmény hozzáadása a ligához
   */
  static async addTournamentResult(leagueId: string, data: AddTournamentResultData): Promise<boolean> {
    await connectMongo();
    
    try {
      // Liga lekérdezése
      const league = await LeagueModel.findById(leagueId);
      if (!league) {
        throw new Error('League not found');
      }

      // Verseny eredmények feldolgozása
      for (const result of data.results) {
        let points = 0;
        
        // Pontok kiszámítása a helyezés alapján
        if (result.stage === 'group') {
          points = league.scoringSystem.groupStage.eliminated;
        } else if (result.stage === 'knockout') {
          switch (result.knockoutRound) {
            case 1:
              points = league.scoringSystem.knockoutStage.round1;
              break;
            case 2:
              points = league.scoringSystem.knockoutStage.round2;
              break;
            case 3:
              points = league.scoringSystem.knockoutStage.round3;
              break;
            case 4:
              points = league.scoringSystem.knockoutStage.quarterFinal;
              break;
            case 5:
              points = league.scoringSystem.knockoutStage.semiFinal;
              break;
            default:
              points = league.scoringSystem.knockoutStage.round1;
          }
        } else if (result.stage === 'final') {
          if (result.finish === 1) {
            points = league.scoringSystem.knockoutStage.winner;
          } else if (result.finish === 2) {
            points = league.scoringSystem.knockoutStage.finalist;
          }
        }

        // Állás frissítése vagy létrehozása
        let standing = await LeagueStandingModel.findOne({ leagueId, playerId: result.playerId });
        
        if (!standing) {
          // Új állás létrehozása
          standing = new LeagueStandingModel({
            leagueId,
            playerId: result.playerId,
            clubId: league.clubId,
            totalPoints: points,
            tournamentsPlayed: 1,
            bestFinish: result.finish,
            pointsBreakdown: {
              groupStage: result.stage === 'group' ? points : 0,
              knockoutStage: result.stage === 'knockout' || result.stage === 'final' ? points : 0,
              manual: 0,
              existing: 0
            },
            finishes: {
              first: result.finish === 1 ? 1 : 0,
              second: result.finish === 2 ? 1 : 0,
              third: result.finish === 3 ? 1 : 0,
              top5: result.finish <= 5 ? 1 : 0,
              top10: result.finish <= 10 ? 1 : 0
            }
          });
        } else {
          // Meglévő állás frissítése
          standing.totalPoints += points;
          standing.tournamentsPlayed += 1;
          
          if (result.finish < standing.bestFinish) {
            standing.bestFinish = result.finish;
          }

          if (result.stage === 'group') {
            standing.pointsBreakdown.groupStage += points;
          } else {
            standing.pointsBreakdown.knockoutStage += points;
          }

          // Helyezések frissítése
          if (result.finish === 1) standing.finishes.first += 1;
          if (result.finish === 2) standing.finishes.second += 1;
          if (result.finish === 3) standing.finishes.third += 1;
          if (result.finish <= 5) standing.finishes.top5 += 1;
          if (result.finish <= 10) standing.finishes.top10 += 1;

          standing.lastUpdated = new Date();
        }

        await standing.save();
      }

      // Liga verseny rekord létrehozása
      const leagueTournament = new LeagueTournamentModel({
        leagueId,
        tournamentId: data.tournamentId,
        clubId: league.clubId,
        status: 'completed',
        pointsDistributed: true,
        pointsDistributedAt: new Date(),
        results: data.results,
        notes: data.notes
      });

      await leagueTournament.save();

      return true;
    } catch (error) {
      console.error('Error adding tournament result:', error);
      return false;
    }
  }

  /**
   * Liga állás újraszámítása
   */
  static async recalculateLeagueStandings(leagueId: string): Promise<boolean> {
    await connectMongo();
    
    try {
      // Összes verseny eredmény összegyűjtése
      const leagueTournaments = await LeagueTournamentModel.find({ 
        leagueId, 
        pointsDistributed: true 
      }).populate('results.playerId');

      // Állások törlése
      await LeagueStandingModel.deleteMany({ leagueId });

      // Új állások létrehozása
      for (const lt of leagueTournaments) {
        await this.addTournamentResult(leagueId, {
          tournamentId: lt.tournamentId.toString(),
          results: lt.results.map(r => ({
            playerId: r.playerId.toString(),
            finish: r.finish,
            stage: r.stage,
            knockoutRound: r.knockoutRound
          })),
          notes: lt.notes
        });
      }

      return true;
    } catch (error) {
      console.error('Error recalculating league standings:', error);
      return false;
    }
  }
}
