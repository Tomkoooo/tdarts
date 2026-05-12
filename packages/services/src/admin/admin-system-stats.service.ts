import mongoose from 'mongoose';
import { connectMongo } from '@tdarts/core';

export type AdminDbCollectionCount = {
  name: string;
  count: number;
};

export type AdminSystemStats = {
  dbName: string;
  dataSizeBytes: number;
  storageSizeBytes: number;
  indexSizeBytes: number;
  collections: AdminDbCollectionCount[];
  yearlyWrap: {
    year: number;
    usersCreated: number;
    tournamentsFinished: number;
    clubsCreated: number;
  };
};

export class AdminSystemStatsService {
  static async getStats(): Promise<AdminSystemStats> {
    await connectMongo();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const [dbStats, collInfos] = await Promise.all([db.stats(), db.listCollections().toArray()]);
    const names = collInfos.map((c) => c.name).filter((n) => !n.startsWith('system.'));
    const counts = await Promise.all(
      names.map(async (name) => {
        const n = await db.collection(name).estimatedDocumentCount();
        return { name, count: n } satisfies AdminDbCollectionCount;
      }),
    );
    counts.sort((a, b) => b.count - a.count);

    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const usersCol = db.collection('users');
    const tournamentsCol = db.collection('tournaments');
    const clubsCol = db.collection('clubs');

    const [usersCreated, tournamentsFinished, clubsCreated] = await Promise.all([
      usersCol.countDocuments({ createdAt: { $gte: yearStart } }),
      tournamentsCol.countDocuments({
        'tournamentSettings.status': 'finished',
        updatedAt: { $gte: yearStart },
      }),
      clubsCol.countDocuments({ createdAt: { $gte: yearStart } }),
    ]);

    return {
      dbName: db.databaseName,
      dataSizeBytes: Number(dbStats.dataSize) || 0,
      storageSizeBytes: Number(dbStats.storageSize) || 0,
      indexSizeBytes: Number(dbStats.indexSize) || 0,
      collections: counts.slice(0, 40),
      yearlyWrap: {
        year,
        usersCreated,
        tournamentsFinished,
        clubsCreated,
      },
    };
  }
}
