'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AdminDetailTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type Props = {
  tabs: AdminDetailTab[];
  defaultTab?: string;
};

export function AdminDetailTabs({ tabs, defaultTab }: Props) {
  const initial = defaultTab ?? tabs[0]?.id ?? 'identity';

  return (
    <Tabs defaultValue={initial} className="space-y-4">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
