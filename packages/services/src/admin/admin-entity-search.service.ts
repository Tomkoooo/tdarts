import mongoose from 'mongoose';
import { connectMongo, ClubModel, PlayerModel, TournamentModel, UserModel } from '@tdarts/core';

export type AdminEntitySearchKind = 'user' | 'player' | 'tournament' | 'club';

export type AdminEntitySearchHit = {
  id: string;
  label: string;
  sublabel?: string;
};

export class AdminEntitySearchService {
  static async search(
    q: string,
    kind: AdminEntitySearchKind,
    limit = 12,
  ): Promise<AdminEntitySearchHit[]> {
    await connectMongo();
    const term = q.trim();
    if (!term) return [];
    const cap = Math.min(Math.max(limit, 1), 25);
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(esc, 'i');

    switch (kind) {
      case 'user': {
        const docs = await UserModel.find({
          $or: [{ email: rx }, { username: rx }, { name: rx }],
          isDeleted: { $ne: true },
        })
          .select('email name username')
          .limit(cap)
          .lean();
        return (docs as Record<string, unknown>[]).map((d) => ({
          id: String(d._id),
          label: String(d.name || d.username || d.email || d._id),
          sublabel: String(d.email ?? ''),
        }));
      }
      case 'player': {
        const docs = await PlayerModel.find({ name: rx })
          .select('name country')
          .limit(cap)
          .lean();
        return (docs as Record<string, unknown>[]).map((d) => ({
          id: String(d._id),
          label: String(d.name ?? d._id),
          sublabel: d.country ? String(d.country) : undefined,
        }));
      }
      case 'club': {
        const docs = await ClubModel.find({ name: rx })
          .select('name city')
          .limit(cap)
          .lean();
        return (docs as Record<string, unknown>[]).map((d) => ({
          id: String(d._id),
          label: String(d.name ?? d._id),
          sublabel: d.city ? String(d.city) : undefined,
        }));
      }
      case 'tournament': {
        const or: Record<string, unknown>[] = [{ tournamentId: rx }, { 'tournamentSettings.name': rx }];
        if (mongoose.Types.ObjectId.isValid(term)) {
          or.push({ _id: new mongoose.Types.ObjectId(term) });
        }
        const docs = await TournamentModel.find({ $or: or, isDeleted: { $ne: true } })
          .select('tournamentId tournamentSettings.name')
          .limit(cap)
          .lean();
        return (docs as Record<string, unknown>[]).map((d) => {
          const settings = d.tournamentSettings as { name?: string } | undefined;
          const code = String(d.tournamentId ?? '');
          const name = settings?.name ? String(settings.name) : code;
          return {
            id: String(d._id),
            label: name,
            sublabel: code,
          };
        });
      }
      default:
        return [];
    }
  }
}
