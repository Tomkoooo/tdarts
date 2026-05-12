import mongoose from 'mongoose';
import { connectMongo, ClubModel } from '@tdarts/core';

export type AdminClubListRow = {
  _id: string;
  name: string;
  country: string;
  city: string | null;
  subscriptionModel: string;
  verified: boolean;
  isActive: boolean;
  membersCount: number;
  featureFlags: { liveMatchFollowing?: boolean; advancedStatistics?: boolean };
  updatedAt: string;
};

export class AdminClubsQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    verified?: 'all' | 'yes' | 'no';
    isActive?: 'all' | 'yes' | 'no';
  }): Promise<{ total: number; rows: AdminClubListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      match.$or = [
        { name: rx },
        { location: rx },
        { 'structuredLocation.city': rx },
        { 'structuredLocation.formattedAddress': rx },
      ];
    }
    if (params.verified === 'yes') match.verified = true;
    if (params.verified === 'no') match.verified = false;
    if (params.isActive === 'yes') match.isActive = true;
    if (params.isActive === 'no') match.isActive = false;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          membersCount: { $size: { $ifNull: ['$members', []] } },
        },
      },
      {
        $project: {
          name: 1,
          country: 1,
          city: '$structuredLocation.city',
          subscriptionModel: 1,
          verified: 1,
          isActive: 1,
          membersCount: 1,
          featureFlags: 1,
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'c' }],
        },
      },
    ];

    const agg = await ClubModel.aggregate(pipeline);
    const facet = agg[0] as {
      rows: Record<string, unknown>[];
      total: { c: number }[];
    };
    const total = facet?.total?.[0]?.c ?? 0;
    const rows: AdminClubListRow[] = (facet?.rows ?? []).map((doc) => ({
      _id: String(doc._id),
      name: String(doc.name ?? ''),
      country: String(doc.country ?? ''),
      city: doc.city != null ? String(doc.city) : null,
      subscriptionModel: String(doc.subscriptionModel ?? 'free'),
      verified: Boolean(doc.verified),
      isActive: Boolean(doc.isActive),
      membersCount: Number(doc.membersCount) || 0,
      featureFlags: (doc.featureFlags as AdminClubListRow['featureFlags']) ?? {},
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  static async getById(clubId: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) return null;
    const doc = await ClubModel.findById(clubId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    // Strip heavy arrays from default payload for overview — callers can refetch if needed
    return {
      _id: String(o._id),
      name: o.name,
      description: o.description,
      location: o.location,
      structuredLocation: o.structuredLocation,
      address: o.address,
      logo: o.logo,
      contact: o.contact,
      subscriptionModel: o.subscriptionModel,
      featureFlags: o.featureFlags,
      verified: o.verified,
      isActive: o.isActive,
      country: o.country,
      billingInfo: o.billingInfo,
      landingPage: o.landingPage,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      membersCount: Array.isArray(o.members) ? o.members.length : 0,
      adminCount: Array.isArray(o.admin) ? o.admin.length : 0,
      moderatorsCount: Array.isArray(o.moderators) ? o.moderators.length : 0,
    };
  }
}
