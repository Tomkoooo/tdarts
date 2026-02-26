'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';

type Locale = 'hu' | 'en' | 'de';

interface EmailTemplateLocale {
  _id: string;
  locale: Locale;
  key: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  isActive: boolean;
}

interface EmailTemplateGroup {
  key: string;
  name: string;
  description: string;
  category: string;
  variables: string[];
  isDefault: boolean;
  locales: Partial<Record<Locale, EmailTemplateLocale>>;
  availableLocales: Locale[];
}

const allLocales: Locale[] = ['hu', 'en', 'de'];

function previewHtml(content: string) {
  return content
    .replace(/\{userName\}/g, 'Test User')
    .replace(/\{tournamentName\}/g, 'Test Tournament')
    .replace(/\{freeSpots\}/g, '3')
    .replace(/\{tournamentUrl\}/g, '#')
    .replace(/\{tournamentCode\}/g, 'TEST-2026')
    .replace(/\{currentYear\}/g, new Date().getFullYear().toString());
}

export default function EmailTemplatesPage() {
  const [groups, setGroups] = useState<EmailTemplateGroup[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [activeLocale, setActiveLocale] = useState<Locale>('hu');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [forms, setForms] = useState<Record<Locale, { subject: string; htmlContent: string; textContent: string }>>({
    hu: { subject: '', htmlContent: '', textContent: '' },
    en: { subject: '', htmlContent: '', textContent: '' },
    de: { subject: '', htmlContent: '', textContent: '' },
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedKey) || null,
    [groups, selectedKey]
  );

  const selectedTemplateId = useMemo(() => {
    if (!selectedGroup) return '';
    return (
      selectedGroup.locales[activeLocale]?._id ||
      selectedGroup.locales.hu?._id ||
      selectedGroup.locales.en?._id ||
      selectedGroup.locales.de?._id ||
      ''
    );
  }, [selectedGroup, activeLocale]);

  const completionSummary = useMemo(() => {
    if (!selectedGroup) return '0/3 locales available';
    return `${selectedGroup.availableLocales.length}/3 locales available`;
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email-templates');
      const data = await response.json();
      if (!data.success) throw new Error('Failed to load templates');
      const nextGroups = (data.groupedTemplates || []) as EmailTemplateGroup[];
      setGroups(nextGroups);
      if (!selectedKey && nextGroups.length) {
        setSelectedKey(nextGroups[0].key);
      }
    } catch {
      showErrorToast('Hiba történt a sablonok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!selectedGroup) return;
    setForms({
      hu: {
        subject: selectedGroup.locales.hu?.subject || '',
        htmlContent: selectedGroup.locales.hu?.htmlContent || '',
        textContent: selectedGroup.locales.hu?.textContent || '',
      },
      en: {
        subject: selectedGroup.locales.en?.subject || '',
        htmlContent: selectedGroup.locales.en?.htmlContent || '',
        textContent: selectedGroup.locales.en?.textContent || '',
      },
      de: {
        subject: selectedGroup.locales.de?.subject || '',
        htmlContent: selectedGroup.locales.de?.htmlContent || '',
        textContent: selectedGroup.locales.de?.textContent || '',
      },
    });
  }, [selectedGroup]);

  const setLocaleField = (locale: Locale, field: 'subject' | 'htmlContent' | 'textContent', value: string) => {
    setForms((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  };

  const saveLocales = async () => {
    if (!selectedTemplateId || !selectedGroup) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locales: {
            hu: forms.hu,
            en: forms.en,
            de: forms.de,
          },
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error('save failed');
      showSuccessToast('Sablonok mentve (HU/EN/DE)');
      await loadGroups();
      setSelectedKey(selectedGroup.key);
    } catch {
      showErrorToast('Hiba történt a mentés során');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!selectedTemplateId || !testRecipient) {
      showErrorToast('Adj meg címzett emailt');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testRecipient, locale: activeLocale }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'test failed');
      showSuccessToast(`Teszt email elküldve (${activeLocale.toUpperCase()})`);
    } catch {
      showErrorToast('Teszt email küldése sikertelen');
    } finally {
      setSendingTest(false);
    }
  };

  const copyFromHu = (targetLocale: Locale) => {
    if (targetLocale === 'hu') return;
    setForms((prev) => ({ ...prev, [targetLocale]: { ...prev.hu } }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Sablonok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            Email Sablonok (HU/EN/DE)
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border font-semibold">Template Keys ({groups.length})</div>
            <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setSelectedKey(group.key)}
                  className={`w-full text-left p-4 hover:bg-muted transition-colors ${selectedKey === group.key ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                >
                  <div className="font-medium">{group.name}</div>
                  <div className="text-xs text-muted-foreground">{group.key}</div>
                  <div className="text-xs mt-2 flex gap-1">
                    {allLocales.map((locale) => (
                      <span
                        key={locale}
                        className={`px-2 py-0.5 rounded ${group.availableLocales.includes(locale) ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                      >
                        {locale.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-card rounded-lg border border-border">
            {!selectedGroup ? (
              <div className="p-8 text-center text-muted-foreground">Válassz egy sablont.</div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                  </div>
                  <button
                    onClick={saveLocales}
                    disabled={saving || !selectedTemplateId}
                    className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Mentés...' : 'Mentés (HU/EN/DE)'}
                  </button>
                </div>

                <div className="flex gap-2">
                  {allLocales.map((locale) => (
                    <button
                      key={locale}
                      onClick={() => setActiveLocale(locale)}
                      className={`px-3 py-1.5 rounded-md text-sm border ${activeLocale === locale ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                    >
                      {locale.toUpperCase()}
                    </button>
                  ))}
                  {activeLocale !== 'hu' && (
                    <button
                      onClick={() => copyFromHu(activeLocale)}
                      className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted"
                    >
                      Copy from HU
                    </button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Translation completeness: {completionSummary}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Subject ({activeLocale.toUpperCase()})</label>
                    <input
                      value={forms[activeLocale].subject}
                      onChange={(e) => setLocaleField(activeLocale, 'subject', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">HTML ({activeLocale.toUpperCase()})</label>
                    <textarea
                      rows={10}
                      value={forms[activeLocale].htmlContent}
                      onChange={(e) => setLocaleField(activeLocale, 'htmlContent', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Text ({activeLocale.toUpperCase()})</label>
                    <textarea
                      rows={6}
                      value={forms[activeLocale].textContent}
                      onChange={(e) => setLocaleField(activeLocale, 'textContent', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="text-sm font-medium mb-2">Preview ({activeLocale.toUpperCase()})</div>
                  <iframe
                    srcDoc={previewHtml(forms[activeLocale].htmlContent)}
                    className="w-full border border-border rounded-md bg-white h-[320px]"
                    title={`preview-${activeLocale}`}
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <div className="text-sm font-medium mb-2">Test send ({activeLocale.toUpperCase()})</div>
                  <div className="flex items-end gap-3 max-w-md">
                    <input
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                    />
                    <button
                      onClick={sendTestEmail}
                      disabled={sendingTest || !testRecipient || !selectedTemplateId}
                      className="px-4 py-2 text-sm bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 disabled:opacity-50"
                    >
                      {sendingTest ? 'Küldés...' : 'Küldés'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
