"use client";

import { useEffect, useState } from 'react';
import { adminAdsActions } from '@/features/ad-management/actions/adminAds.action';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Campaign = {
  _id: string;
  name: string;
  status: string;
  priority: number;
};

export function AdminAdsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAdsActions.listCampaigns();
      if (res?.ok) setCampaigns((res.data?.campaigns || []) as Campaign[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCampaign() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await adminAdsActions.upsertCampaign({
        name,
        status: 'draft',
        priority: 100,
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        audienceRoles: ['visitor'],
        allowedViewTypes: ['block', 'landscape', 'popup', 'inline'],
        maxImpressionsPerActor: 8,
        windowHours: 24,
        noFillRate: 0.1,
      });
      setName('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-lg font-semibold">Create campaign</h2>
        <div className="flex gap-2">
          <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={createCampaign} disabled={loading || !name.trim()}>
            Create
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 text-lg font-semibold">Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div key={campaign._id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="font-medium">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.status} • priority {campaign.priority}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await adminAdsActions.deleteCampaign(campaign._id);
                    await load();
                  }}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
