import { Types } from 'mongoose';
import { TournamentModel } from '../models/tournament.model';
import { MatchModel } from '../models/match.model';
import { GroupStanding, TournamentDocument } from '@/interface/tournament.interface';

export interface CreateTournamentPayload {
  name: string;
  boardCount: number;
  tournamentPassword: string;
  description?: string;
  players: string[];
  startDate?: string;
  tournamentSettings: {
    format: 'group' | 'knockout';
    startingScore: number;
    tournamentPassword: string;
  };
  clubId: string;
}

export class TournamentService {
  /**
   * Dinamikusan kiszámolja a csoportok állását a meccsek eredményei alapján.
   */
  static async calculateGroupStandings(tournamentId: string): Promise<{ [groupId: string]: GroupStanding[] }> {
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    const result: { [groupId: string]: GroupStanding[] } = {};
    for (const group of tournament.groups) {
      // Lekérjük a csoport összes meccsét
      const matches = await MatchModel.find({ _id: { $in: group.matches } });
      // Minden játékoshoz statisztika
      const playerStats: { [playerId: string]: GroupStanding } = {};
      // Csoport játékosok
      const groupPlayerIds = new Set<string>();
      for (const match of matches) {
        groupPlayerIds.add(String(match.player1.playerId));
        groupPlayerIds.add(String(match.player2.playerId));
      }
      groupPlayerIds.forEach(pid => {
        playerStats[pid] = {
          playerId: new Types.ObjectId(pid),
            points: 0,
            legsWon: 0,
            legsLost: 0,
            average: 0,
            rank: 0,
        };
      });
      // Meccsek feldolgozása
      for (const match of matches) {
        const p1 = String(match.player1.playerId);
        const p2 = String(match.player2.playerId);
        // Legs
        playerStats[p1].legsWon += match.player1.legsWon;
        playerStats[p1].legsLost += match.player1.legsLost;
        playerStats[p2].legsWon += match.player2.legsWon;
        playerStats[p2].legsLost += match.player2.legsLost;
        // Átlag
        playerStats[p1].average += match.player1.average;
        playerStats[p2].average += match.player2.average;
        // Pontok
        if (match.winnerId) {
          if (String(match.winnerId) === p1) playerStats[p1].points += 2;
          if (String(match.winnerId) === p2) playerStats[p2].points += 2;
        }
      }
      // Átlagok normalizálása
      for (const pid of groupPlayerIds) {
        const played = matches.filter(m => String(m.player1.playerId) === pid || String(m.player2.playerId) === pid).length;
        if (played > 0) playerStats[pid].average = playerStats[pid].average / played;
      }
      // Rangsorolás
      const standings = Object.values(playerStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aLegDiff = a.legsWon - a.legsLost;
        const bLegDiff = b.legsWon - b.legsLost;
        if (bLegDiff !== aLegDiff) return bLegDiff - aLegDiff;
        if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
        return b.average - a.average;
      });
      standings.forEach((standing, idx) => { standing.rank = idx + 1; });
      result[group.id] = standings;
    }
    return result;
  }

  /**
   * Rugalmas knockout/bracket generálás (alap, paraméterezhető, vagy manuális)
   */
  static async generateKnockoutBracket(tournamentId: string, options?: any): Promise<void> {
    // Itt lehetőség van kiemelés, rájátszás, vagy teljesen manuális bracket kezelésére
    // A logika az options alapján generálja a knockout szakaszt
    // Pl. options: { type: 'seeded', seeds: [...], playIns: [...] } vagy { type: 'manual', bracket: [...] }
    // A meccsek, párosítások, táblabeosztások dinamikusan generálhatók
  }

  /**
   * Manuális bracket szerkesztés támogatása
   */
  static async updateBracket(tournamentId: string, bracketData: any): Promise<void> {
    // bracketData: a frontend bracket komponensből jövő struktúra
    // Itt frissítjük a tournament.knockout mezőt a kapott adatok alapján
  }

  static async createTournament(payload: CreateTournamentPayload): Promise<TournamentDocument> {
    const { name, boardCount, tournamentPassword, description, players, startDate, tournamentSettings, clubId } = payload;
    if (!name || !boardCount || !tournamentPassword) {
      throw new Error('A torna neve, a táblák száma és a jelszó kötelező');
    }
    // Duplikált játékosok kiszűrése
    const uniquePlayerIds = Array.from(new Set((players || []).map((id: string) => id)));
    if (uniquePlayerIds.length !== (players || []).length) {
      throw new Error('Duplikált játékosok nem megengedettek');
    }
    // Egyedi kód generálása, ütközés ellenőrzéssel
    let code: string;
    let exists = true;
    do {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      exists = !!(await TournamentModel.findOne({ tournamentId: code }));
    } while (exists);
    // Torna létrehozása
    const tournament = await TournamentModel.create({
      name,
      tournamentId: code,
      clubId,
      players: uniquePlayerIds,
      tournamentSettings: {
        format: tournamentSettings?.format || 'group',
        startingScore: tournamentSettings?.startingScore || 501,
        tournamentPassword,
        startDate,
        description: description || '',
        name,
      },
      status: 'pending',
      startDate: startDate ? new Date(startDate) : undefined,
      description: description || '',
      groups: [],
      knockout: [],
    });
    return tournament.toObject() as TournamentDocument;
  }

  static async getTournament(idOrCode: string): Promise<TournamentDocument | null> {
    let tournament;
    if (Types.ObjectId.isValid(idOrCode)) {
      tournament = await TournamentModel.findById(idOrCode);
    } else {
      tournament = await TournamentModel.findOne({ code: idOrCode });
    }
    return tournament ? (tournament.toObject() as TournamentDocument) : null;
  }

  static async getTournaments({ name, club, date }: { name?: string; club?: string; date?: string }): Promise<TournamentDocument[]> {
    const query: any = {};
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (club) {
      query.clubId = club;
    }
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      query.startDate = { $gte: startDate, $lt: endDate };
    }
    const tournaments = await TournamentModel.find(query).sort({ createdAt: -1 });
    return tournaments.map(t => t.toObject() as TournamentDocument);
  }

  static async addPlayerToTournament(tournamentId: string, playerId: string) {
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'pending' && tournament.status !== 'created') throw new Error('Csak létrehozott/pending tornához lehet játékost hozzáadni');
    if (!tournament.players.includes(playerId)) {
      tournament.players.push(playerId);
      await tournament.save();
    }
    return tournament;
  }

  static async removePlayerFromTournament(tournamentId: string, playerId: string) {
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'pending' && tournament.status !== 'created') throw new Error('Csak létrehozott/pending tornából lehet játékost törölni');
    tournament.players = tournament.players.filter((id: string) => id.toString() !== playerId.toString());
    await tournament.save();
    return tournament;
  }

  static async updateTournamentStatus(tournamentId: string, status: 'pending' | 'active' | 'finished') {
    const tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    tournament.status = status;
    await tournament.save();
    return tournament;
  }
} 