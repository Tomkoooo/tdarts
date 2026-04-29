import {
  adminAdsCampaignDeleteAction,
  adminAdsCampaignListAction,
  adminAdsCampaignUpsertAction,
  adminAdsCreativeListAction,
  adminAdsCreativeUpsertAction,
  adminAdsOverviewAction,
  adminAdsTelemetrySummaryAction,
} from './adminAdsServer.action';

const call = <Args extends unknown[]>(fn: (...args: Args) => Promise<unknown>) => {
  return async (...args: Args): Promise<any> => (await fn(...args)) as any;
};

export const adminAdsActions = {
  listCampaigns: call(adminAdsCampaignListAction),
  upsertCampaign: call(adminAdsCampaignUpsertAction),
  deleteCampaign: call(adminAdsCampaignDeleteAction),
  listCreatives: call(adminAdsCreativeListAction),
  upsertCreative: call(adminAdsCreativeUpsertAction),
  overview: call(adminAdsOverviewAction),
  telemetrySummary: call(adminAdsTelemetrySummaryAction),
};
