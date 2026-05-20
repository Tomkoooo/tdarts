export type AdsViewType = 'block' | 'landscape' | 'popup' | 'inline';

export type AdDecisionRequest = {
  slotContext: {
    slotId: string;
    placementKey: string;
    viewType: AdsViewType;
    pageKey: string;
    device?: 'desktop' | 'mobile' | 'tablet';
  };
  identity: {
    userId?: string;
    sessionId: string;
    audienceRoles: string[];
  };
  now?: Date;
  requestId?: string;
};

export type AdCreativePayload = {
  campaignId: string;
  creativeId: string;
  destinationUrl: string;
  viewType: AdsViewType;
  title: string;
  bodyText?: string;
  ctaLabel?: string;
  mediaUrl?: string;
  accessibility: {
    altText: string;
    ariaLabel?: string;
  };
};

export type AdDecisionResult = {
  decisionId: string;
  ad: AdCreativePayload | null;
  reasonCode:
    | 'ok'
    | 'no_campaign'
    | 'out_of_window'
    | 'audience_mismatch'
    | 'frequency_capped'
    | 'no_fill'
    | 'creative_missing'
    | 'engine_error';
  latencyMs: number;
};

export interface AdDecisionEnginePort {
  decide(request: AdDecisionRequest): Promise<AdDecisionResult>;
}
