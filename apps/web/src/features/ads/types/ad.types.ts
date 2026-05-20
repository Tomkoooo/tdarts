export type AdViewType = 'block' | 'landscape' | 'popup' | 'inline';

export type AdCreative = {
  campaignId: string;
  creativeId: string;
  destinationUrl: string;
  viewType: AdViewType;
  title: string;
  bodyText?: string;
  ctaLabel?: string;
  mediaUrl?: string;
  accessibility: {
    altText: string;
    ariaLabel?: string;
  };
  isPlaceholder?: boolean;
};

export type AdDecisionResponse = {
  decisionId: string;
  ad: AdCreative | null;
  reasonCode: string;
  latencyMs: number;
  renderMode?: 'live' | 'placeholder';
};
