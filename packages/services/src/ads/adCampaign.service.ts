import { connectMongo } from '@tdarts/core';
import { AdCampaignModel, AdCreativeModel } from '@tdarts/core';
import type { AdViewType } from '@tdarts/core';

export type UpsertCampaignInput = {
  id?: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  priority: number;
  startAt: Date;
  endAt: Date;
  audienceRoles: string[];
  allowedViewTypes: AdViewType[];
  maxImpressionsPerActor: number;
  windowHours: number;
  noFillRate: number;
  createdBy?: string;
  updatedBy?: string;
};

export class AdCampaignService {
  static async listCampaigns() {
    await connectMongo();
    return AdCampaignModel.find({}).sort({ createdAt: -1 }).lean();
  }

  static async upsertCampaign(input: UpsertCampaignInput) {
    await connectMongo();
    const payload = {
      name: input.name,
      status: input.status,
      priority: input.priority,
      startAt: input.startAt,
      endAt: input.endAt,
      audienceRoles: input.audienceRoles,
      allowedViewTypes: input.allowedViewTypes,
      frequencyCap: {
        maxImpressionsPerActor: input.maxImpressionsPerActor,
        windowHours: input.windowHours,
      },
      noFillRate: input.noFillRate,
      ...(input.updatedBy ? { updatedBy: input.updatedBy } : {}),
      ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    };
    if (input.id) {
      return AdCampaignModel.findByIdAndUpdate(input.id, payload, { new: true });
    }
    return AdCampaignModel.create(payload);
  }

  static async deleteCampaign(campaignId: string) {
    await connectMongo();
    await AdCreativeModel.deleteMany({ campaignId });
    await AdCampaignModel.deleteOne({ _id: campaignId });
  }
}
