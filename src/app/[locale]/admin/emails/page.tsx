'use client';

import { useState, useEffect } from 'react';
import { Mail, Code, Eye, Save, Check, X } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';

interface EmailTemplate {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: 'tournament' | 'club' | 'feedback' | 'admin' | 'system';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  lastModified: Date;
}

function PreviewFrame({ content }: { content: string }) {
  const [height, setHeight] = useState('400px');
  
  // Basic variable replacement for preview
  const previewContent = content
    .replace(/\{userName\}/g, 'Teszt Felhasználó')
    .replace(/\{tournamentName\}/g, 'Teszt Bajnokság')
    .replace(/\{freeSpots\}/g, '3')
    .replace(/\{tournamentUrl\}/g, '#')
    .replace(/\{tournamentCode\}/g, 'TEST-2024')
    .replace(/\{currentYear\}/g, new Date().getFullYear().toString())
    .replace(/\{clubName\}/g, 'Teszt Klub')
    .replace(/\{feedbackTitle\}/g, 'Teszt Visszajelzés')
    .replace(/\{feedbackId\}/g, '65e1234567890abcdef12345')
    .replace(/\{currentDate\}/g, new Date().toLocaleDateString('hu-HU'));

  return (
    <iframe
      srcDoc={previewContent}
      className="w-full border-none"
      style={{ height }}
      onLoad={(e) => {
        const iframe = e.currentTarget;
        if (iframe.contentWindow) {
          try {
            const bodyHeight = iframe.contentWindow.document.body.scrollHeight;
            setHeight(`${Math.max(400, bodyHeight + 40)}px`);
          } catch {
            // Cross-origin or other errors, keep default height
          }
        }
      }}
      title="Email Preview"
    />
  );
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');

  const [editedSubject, setEditedSubject] = useState('');
  const [editedHtmlContent, setEditedHtmlContent] = useState('');
  const [editedTextContent, setEditedTextContent] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        showErrorToast('Hiba történt a sablonok betöltése során');
      }
    } catch {
      showErrorToast('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedHtmlContent(template.htmlContent);
    setEditedTextContent(template.textContent);
    setEditMode(false);
    setPreviewMode(false);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editedSubject,
          htmlContent: editedHtmlContent,
          textContent: editedTextContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast('Sablon sikeresen mentve');
        await fetchTemplates();
        setSelectedTemplate(data.template);
        setEditMode(false);
      } else {
        showErrorToast('Hiba történt a mentés során');
      }
    } catch {
      showErrorToast('Hálózati hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!selectedTemplate) return;
    if (!testRecipient) {
      showErrorToast('Kérjük, adj meg egy email címet');
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate._id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testRecipient }),
      });

      const data = await response.json();
      if (data.success) {
        showSuccessToast('Teszt email elküldve');
      } else {
        showErrorToast(data.message || 'Hiba történt a küldés során');
      }
    } catch {
      showErrorToast('Hálózati hiba történt');
    } finally {
      setSendingTest(false);
    }
  };

  const toggleActive = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${template._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !template.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccessToast(`Sablon ${!template.isActive ? 'aktiválva' : 'deaktiválva'}`);
        await fetchTemplates();
        if (selectedTemplate?._id === template._id) {
          setSelectedTemplate(data.template);
        }
      }
    } catch {
      showErrorToast('Hálózati hiba történt');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      tournament: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      club: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      feedback: 'bg-green-500/10 text-green-700 dark:text-green-400',
      admin: 'bg-primary/10 text-primary',
      system: 'bg-muted text-muted-foreground',
    };
    return colors[category as keyof typeof colors] || colors.system;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      tournament: 'Torna',
      club: 'Klub',
      feedback: 'Visszajelzés',
      admin: 'Admin',
      system: 'Rendszer',
    };
    return labels[category as keyof typeof labels] || category;
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
            Email Sablonok
          </h1>
          <p className="text-muted-foreground mt-2">
            Kezeld az email sablonokat, amelyeket a platform küld a felhasználóknak
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Sablonok ({templates.length})</h2>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
                {templates.map((template) => (
                  <div
                    key={template._id}
                    onClick={() => selectTemplate(template)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedTemplate?._id === template._id
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(template.category)}`}>
                            {getCategoryLabel(template.category)}
                          </span>
                          {!template.isActive && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              Inaktív
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(template);
                          }}
                          className={`p-1 rounded ${
                            template.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}
                        >
                          {template.isActive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedTemplate.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <>
                        <button
                          onClick={() => {
                            setEditedSubject(selectedTemplate.subject);
                            setEditedHtmlContent(selectedTemplate.htmlContent);
                            setEditedTextContent(selectedTemplate.textContent);
                            setEditMode(false);
                          }}
                          className="px-3 py-2 text-sm text-foreground border border-border rounded-md hover:bg-muted flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Mégse
                        </button>
                        <button
                          onClick={saveTemplate}
                          disabled={saving}
                          className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Mentés...' : 'Mentés'}
                        </button>
                      </>
                    )}
                    {!editMode && (
                      <>
                        <button
                          onClick={() => setPreviewMode(!previewMode)}
                          className={`px-3 py-2 text-sm border rounded-md flex items-center gap-2 ${
                            previewMode
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          {previewMode ? 'Kód mód' : 'Előnézet'}
                        </button>
                        <button
                          onClick={() => setEditMode(true)}
                          className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
                        >
                          <Code className="w-4 h-4" />
                          Szerkesztés
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Variables Info */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="p-4 bg-accent/50 border-b border-border">
                    <h3 className="text-sm font-medium text-foreground mb-2">Elérhető változók:</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable) => (
                        <code key={variable} className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded">
                          {`{${variable}}`}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Használd ezeket a változókat a sablonban, pl: <code className="bg-accent px-1">{`{userName}`}</code>
                    </p>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tárgy</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-muted border border-border rounded-md text-foreground">
                        {selectedTemplate.subject}
                      </div>
                    )}
                  </div>

                  {/* HTML Content */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">HTML Tartalom</label>
                    {editMode ? (
                      <textarea
                        value={editedHtmlContent}
                        onChange={(e) => setEditedHtmlContent(e.target.value)}
                        rows={15}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:ring-primary focus:border-primary"
                      />
                    ) : previewMode ? (
                      <div className="border border-border rounded-md overflow-hidden bg-white">
                        <PreviewFrame content={selectedTemplate.htmlContent} />
                      </div>
                    ) : (
                      <pre className="px-3 py-2 bg-muted border border-border rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto text-foreground">
                        {selectedTemplate.htmlContent}
                      </pre>
                    )}
                  </div>

                  {/* Text Content */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Szöveges Tartalom (fallback)</label>
                    {editMode ? (
                      <textarea
                        value={editedTextContent}
                        onChange={(e) => setEditedTextContent(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:ring-primary focus:border-primary"
                      />
                    ) : (
                      <pre className="px-3 py-2 bg-muted border border-border rounded-md text-sm overflow-x-auto whitespace-pre-wrap text-foreground">
                        {selectedTemplate.textContent}
                      </pre>
                    )}
                  </div>

                  {/* Test Email Section */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Teszt email küldése
                    </h3>
                    <div className="flex items-end gap-3 max-w-md">
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">Címzett email</label>
                        <input
                          type="email"
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                          placeholder="vmi@pelda.hu"
                          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <button
                        onClick={sendTestEmail}
                        disabled={sendingTest || !testRecipient}
                        className="px-4 py-2 text-sm bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 flex items-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {sendingTest ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        Küldés
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      A teszt emailt a fent látható módon rendereljük, minta adatokkal feltöltve.
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-border text-sm text-muted-foreground">
                    <p>
                      <strong>Kulcs:</strong> <code className="bg-muted px-1">{selectedTemplate.key}</code>
                    </p>
                    <p className="mt-1">
                      <strong>Utolsó módosítás:</strong> {new Date(selectedTemplate.lastModified).toLocaleString('hu-HU')}
                    </p>
                    <p className="mt-1">
                      <strong>Alapértelmezett:</strong> {selectedTemplate.isDefault ? 'Igen' : 'Nem'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
                <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nincs kiválasztott sablon</h3>
                <p className="text-muted-foreground">Válassz egy sablont a bal oldali listából a megtekintéshez és szerkesztéshez</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
