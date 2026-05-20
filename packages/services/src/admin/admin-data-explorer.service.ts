import mongoose from 'mongoose';
import {
  connectMongo,
  UserModel,
  ClubModel,
  PlayerModel,
  TournamentModel,
  MatchModel,
  LeagueModel,
  SubscriptionModel,
  FeedbackModel,
} from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

const ADMIN_EXPLORER_MODELS: Record<string, mongoose.Model<unknown>> = {
  users: UserModel as mongoose.Model<unknown>,
  clubs: ClubModel as mongoose.Model<unknown>,
  players: PlayerModel as mongoose.Model<unknown>,
  tournaments: TournamentModel as mongoose.Model<unknown>,
  matches: MatchModel as mongoose.Model<unknown>,
  leagues: LeagueModel as mongoose.Model<unknown>,
  subscriptions: SubscriptionModel as mongoose.Model<unknown>,
  feedback: FeedbackModel as mongoose.Model<unknown>,
};

/** Keys that must never be set via explorer patch UI */
const PATCH_BLOCKLIST = new Set([
  '__v',
  'password',
  'passwordHash',
  'salt',
  'refreshToken',
  'scoliaAccessToken',
  'scoliaRefreshToken',
]);

/** Indexed lookup shortcuts for relation pickers (exact field match). */
const SEARCH_FIELD_ALLOWLIST: Record<string, readonly string[]> = {
  users: ['email'],
  clubs: ['name'],
};

function sanitizeFilter(raw: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(raw ?? {}));
}

const MONGOOSE_REF_TO_COLL: Record<string, string | undefined> = {
  User: 'users',
  Club: 'clubs',
  Clubs: 'clubs',
  Player: 'players',
  Tournament: 'tournaments',
  Match: 'matches',
  League: 'leagues',
  Feedback: 'feedback',
  Subscription: 'subscriptions',
};

function labelForRelatedDoc(_collectionKey: string, doc: Record<string, unknown> | null): string {
  if (!doc || typeof doc !== 'object') return '';
  const o = doc as Record<string, unknown>;
  const email = o.email;
  if (typeof email === 'string' && email) return email;
  const name = o.name;
  if (typeof name === 'string' && name) return name;
  const title = o.title ?? o.slug;
  if (typeof title === 'string' && title) return title;
  const id = o._id;
  return String(id ?? '');
}

export type AdminExplorerRelation = {
  path: string;
  id: string;
  /** Whitelisted explorer collection key when resolvable */
  collection?: string;
  label: string;
};

function refPopulatePaths(Model: mongoose.Model<unknown>): string[] {
  const paths: string[] = [];
  Model.schema.eachPath((pathname: string, schemaType: mongoose.SchemaType) => {
    if (pathname.includes('.')) return;
    const opts = schemaType.options as { ref?: string } | undefined;
    if (!opts?.ref) return;
    paths.push(pathname);
  });
  return paths;
}

function refNameForPath(Model: mongoose.Model<unknown>, pathname: string): string | undefined {
  const opts = Model.schema.path(pathname)?.options as { ref?: string } | undefined;
  return opts?.ref;
}

function plainAfterPopulate(collection: string, docLean: unknown | null): {
  doc: Record<string, unknown>;
  relations: AdminExplorerRelation[];
} {
  const plain = JSON.parse(JSON.stringify(docLean ?? {})) as Record<string, unknown>;
  const Model = ADMIN_EXPLORER_MODELS[collection];
  if (!Model) return { doc: plain, relations: [] };

  const relations: AdminExplorerRelation[] = [];
  for (const pathname of refPopulatePaths(Model)) {
    const refName = refNameForPath(Model, pathname);
    const coll = refName ? MONGOOSE_REF_TO_COLL[refName] : undefined;
    const raw = plain[pathname];
    if (raw == null) continue;

    if (typeof raw === 'object' && raw !== null && '_id' in (raw as Record<string, unknown>)) {
      const sub = raw as Record<string, unknown>;
      relations.push({
        path: pathname,
        id: String(sub._id),
        collection: coll,
        label: coll ? labelForRelatedDoc(coll, sub) : String(sub._id),
      });
    } else if (mongoose.Types.ObjectId.isValid(String(raw))) {
      relations.push({
        path: pathname,
        id: String(raw),
        collection: coll,
        label: String(raw),
      });
    }
  }
  return { doc: plain, relations };
}

export type AdminGlobalSearchHit = {
  collection: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
};

function labelForSearchHit(collection: string, doc: Record<string, unknown>): {
  title: string;
  subtitle?: string;
  status?: string;
} {
  switch (collection) {
    case 'users':
      return {
        title: String(doc.name || doc.username || doc.email || doc._id),
        subtitle: String(doc.email ?? ''),
        status: doc.isDeleted ? 'deleted' : doc.isVerified ? 'verified' : undefined,
      };
    case 'clubs':
      return {
        title: String(doc.name ?? doc._id),
        subtitle: [doc.city, doc.country].filter(Boolean).join(', ') || undefined,
      };
    case 'players':
      return { title: String(doc.name ?? doc._id), subtitle: String(doc.country ?? '') };
    case 'tournaments': {
      const settings = doc.tournamentSettings as { name?: string; status?: string } | undefined;
      return {
        title: String(settings?.name ?? doc.tournamentId ?? doc._id),
        subtitle: String(doc.tournamentId ?? ''),
        status: settings?.status ? String(settings.status) : undefined,
      };
    }
    case 'matches':
      return {
        title: `Meccs ${String(doc._id).slice(-6)}`,
        subtitle: `round ${doc.round} · ${doc.type}`,
        status: String(doc.status ?? ''),
      };
    case 'leagues':
      return { title: String(doc.name ?? doc._id) };
    case 'feedback':
      return {
        title: String(doc.title ?? doc._id),
        subtitle: String(doc.email ?? ''),
        status: String(doc.status ?? ''),
      };
    default:
      return { title: String(doc._id) };
  }
}

const GLOBAL_SEARCH_FIELDS: Record<string, (q: RegExp) => Record<string, unknown>> = {
  users: (rx) => ({ $or: [{ email: rx }, { username: rx }, { name: rx }] }),
  clubs: (rx) => ({ $or: [{ name: rx }, { city: rx }] }),
  players: (rx) => ({ name: rx }),
  tournaments: (rx) => ({ $or: [{ tournamentId: rx }, { 'tournamentSettings.name': rx }] }),
  matches: (rx) => ({ $or: [{ status: rx }, { type: rx }] }),
  leagues: (rx) => ({ name: rx }),
  subscriptions: (rx) => ({ $or: [{ status: rx }] }),
  feedback: (rx) => ({ $or: [{ title: rx }, { email: rx }, { description: rx }] }),
};

export class AdminDataExplorerService {
  static listCollections(): string[] {
    return Object.keys(ADMIN_EXPLORER_MODELS).sort();
  }

  static async globalSearch(
    q: string,
    opts?: { collections?: string[]; limitPerCollection?: number },
  ): Promise<AdminGlobalSearchHit[]> {
    await connectMongo();
    const term = q.trim();
    if (!term) return [];
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(esc, 'i');
    const perLimit = Math.min(opts?.limitPerCollection ?? 8, 15);
    const cols = (opts?.collections?.length ? opts.collections : Object.keys(ADMIN_EXPLORER_MODELS)).filter(
      (c) => c in ADMIN_EXPLORER_MODELS,
    );

    const hits: AdminGlobalSearchHit[] = [];

    if (mongoose.Types.ObjectId.isValid(term)) {
      for (const collection of cols) {
        const Model = ADMIN_EXPLORER_MODELS[collection];
        const doc = await Model.findById(term).lean();
        if (doc) {
          const plain = doc as Record<string, unknown>;
          const labels = labelForSearchHit(collection, plain);
          hits.push({
            collection,
            id: String(plain._id),
            ...labels,
          });
        }
      }
      if (hits.length) return hits;
    }

    await Promise.all(
      cols.map(async (collection) => {
        const buildFilter = GLOBAL_SEARCH_FIELDS[collection];
        if (!buildFilter) return;
        const Model = ADMIN_EXPLORER_MODELS[collection];
        const filter = buildFilter(rx);
        const docs = await Model.find(filter).limit(perLimit).lean();
        for (const doc of docs as Record<string, unknown>[]) {
          const labels = labelForSearchHit(collection, doc);
          hits.push({
            collection,
            id: String(doc._id),
            ...labels,
          });
        }
      }),
    );

    return hits.slice(0, 50);
  }

  static async browse(params: {
    collection: string;
    filter?: Record<string, unknown>;
    page: number;
    limit: number;
  }): Promise<{ total: number; rows: Record<string, unknown>[] }> {
    await connectMongo();
    const Model = ADMIN_EXPLORER_MODELS[params.collection];
    if (!Model) throw new Error('Unknown collection');
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;
    const filter = sanitizeFilter(params.filter ?? {});

    const [total, docs] = await Promise.all([
      Model.countDocuments(filter as Record<string, unknown>),
      Model.find(filter as Record<string, unknown>)
        .lean()
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const rows = (docs as Record<string, unknown>[]).map((d) =>
      JSON.parse(JSON.stringify(d)) as Record<string, unknown>,
    );
    return { total, rows };
  }

  static async getDocument(
    collection: string,
    id: string,
  ): Promise<{ doc: Record<string, unknown>; relations: AdminExplorerRelation[] } | null> {
    await connectMongo();
    const Model = ADMIN_EXPLORER_MODELS[collection];
    if (!Model) throw new Error('Unknown collection');
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const paths = refPopulatePaths(Model);
    let q = Model.findById(id);
    if (paths.length) q = q.populate(paths);
    const doc = await q.lean();
    if (!doc) return null;
    return plainAfterPopulate(collection, doc);
  }

  /** Safe single-field lookup for relation pickers (allowlisted field per collection). */
  static async lookupByField(collection: string, field: string, value: string): Promise<string | null> {
    await connectMongo();
    const Model = ADMIN_EXPLORER_MODELS[collection];
    if (!Model) throw new Error('Unknown collection');
    const allowed = SEARCH_FIELD_ALLOWLIST[collection];
    if (!allowed || !allowed.includes(field)) throw new Error('Lookup field not allowed');

    const trimmed = value.trim();
    if (!trimmed) return null;

    const row = await Model.findOne({ [field]: trimmed } as Record<string, unknown>)
      .select('_id')
      .lean();
    const rid = row && typeof row === 'object' && '_id' in row ? (row as { _id: unknown })._id : null;
    return rid ? String(rid) : null;
  }

  /** Shallow dot-safe keys only via nested object input (validated). */
  static async applyPatch(actorUserId: string, collection: string, id: string, patch: Record<string, unknown>): Promise<void> {
    await connectMongo();
    const Model = ADMIN_EXPLORER_MODELS[collection];
    if (!Model) throw new Error('Unknown collection');
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid id');

    const before = await Model.findById(id).lean();
    if (!before) throw new Error('Document not found');

    const $set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (PATCH_BLOCKLIST.has(k)) continue;
      if (k.includes('$') || k.includes('.')) continue;
      $set[k] = v;
    }
    if (Object.keys($set).length === 0) return;

    await Model.updateOne({ _id: id }, { $set });
    const after = await Model.findById(id).lean();
    await AdminAuditService.logAction(actorUserId, 'dataExplorer.patch', {
      collection,
      id,
      patch: $set,
      snapshotBefore: before,
      snapshotAfter: after,
    });
  }
}
