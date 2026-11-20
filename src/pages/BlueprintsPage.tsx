import React, { useEffect, useState } from 'react';
import { ArrowRight, Edit3, Plus, Trash2, X } from 'lucide-react';
import { apiRequest, formatRelativeDate } from '../lib/api.ts';
import type { BlueprintRecord } from '../shared/types.ts';
import { useToast } from '../components/Toast.tsx';

interface BlueprintsPageProps {
  onUseBlueprint: (bp: BlueprintRecord) => void;
}

export function BlueprintsPage({ onUseBlueprint }: BlueprintsPageProps) {
  const { pushToast } = useToast();
  const [blueprints, setBlueprints] = useState<BlueprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlueprintRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    niche: 'Mortgage & Homebuyer Education',
    description: '',
    keywordsText: '',
    servicesText: '',
    blogsText: '',
    disclosureTemplate: '',
    promptInstructions: '',
    modelPreset: 'claude-3-7-sonnet',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ blueprints: BlueprintRecord[] }>('/api/blueprints');
      setBlueprints(res.blueprints);
    } catch (err) {
      pushToast(
        'Failed to load blueprints',
        'error',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      niche: 'Mortgage & Homebuyer Education',
      description: '',
      keywordsText: '',
      servicesText: '',
      blogsText: '',
      disclosureTemplate:
        'Educational Resource Notice: This site provides US loan education and connects consumers with licensed lending partners. Not a direct lender.',
      promptInstructions: '',
      modelPreset: 'claude-3-7-sonnet',
    });
    setModalOpen(true);
  };

  const openEdit = (bp: BlueprintRecord) => {
    setEditing(bp);
    setForm({
      name: bp.name,
      niche: bp.niche,
      description: bp.description,
      keywordsText: bp.defaultKeywords.join('\n'),
      servicesText: bp.defaultServices.join('\n'),
      blogsText: bp.defaultBlogTopics.join('\n'),
      disclosureTemplate: bp.disclosureTemplate,
      promptInstructions: bp.promptInstructions,
      modelPreset: bp.modelPreset,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      niche: form.niche.trim(),
      description: form.description.trim(),
      defaultKeywords: form.keywordsText.split('\n').map((s) => s.trim()).filter(Boolean),
      defaultServices: form.servicesText.split('\n').map((s) => s.trim()).filter(Boolean),
      defaultBlogTopics: form.blogsText.split('\n').map((s) => s.trim()).filter(Boolean),
      disclosureTemplate: form.disclosureTemplate.trim(),
      promptInstructions: form.promptInstructions.trim(),
      modelPreset: form.modelPreset,
    };

    try {
      if (editing) {
        const res = await apiRequest<{ blueprint: BlueprintRecord }>(
          `/api/blueprints/${editing.id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
        setBlueprints((prev) =>
          prev.map((b) => (b.id === editing.id ? res.blueprint : b))
        );
        pushToast('Blueprint updated', 'success');
      } else {
        const res = await apiRequest<{ blueprint: BlueprintRecord }>('/api/blueprints', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setBlueprints((prev) => [res.blueprint, ...prev]);
        pushToast('Blueprint created', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      pushToast(
        'Save failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleDelete = async (bp: BlueprintRecord) => {
    try {
      await apiRequest(`/api/blueprints/${bp.id}`, { method: 'DELETE' });
      setBlueprints((prev) => prev.filter((b) => b.id !== bp.id));
      pushToast(`Deleted ${bp.name}`, 'info');
    } catch (err) {
      pushToast(
        'Delete failed',
        'error',
        err instanceof Error ? err.message : undefined
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Blueprints
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Reusable US loan site templates, compliance disclosures, prompt instructions, and service presets.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Blueprint</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      ) : blueprints.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <p className="text-sm font-medium">No blueprints yet</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 px-3.5 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium"
          >
            Create First Blueprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {blueprints.map((bp) => (
            <div
              key={bp.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {bp.niche} · <span className="font-mono">{bp.modelPreset}</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50 mt-0.5">
                      {bp.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(bp)}
                      className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                      title="Edit blueprint"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bp)}
                      className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-600"
                      title="Delete blueprint"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {bp.description}
                </p>

                <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  {bp.defaultKeywords.length} keywords · {bp.defaultServices.length} services ·{' '}
                  {bp.defaultBlogTopics.length} blog topics
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-zinc-400">
                  Updated {formatRelativeDate(bp.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => onUseBlueprint(bp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium"
                >
                  <span>Use Blueprint</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                {editing ? 'Edit Blueprint' : 'Create Blueprint'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Blueprint Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">US Loan Niche</label>
                  <input
                    required
                    value={form.niche}
                    onChange={(e) => setForm((p) => ({ ...p, niche: e.target.value }))}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input
                  required
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Default Keywords</label>
                  <textarea
                    rows={4}
                    value={form.keywordsText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, keywordsText: e.target.value }))
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Default Services</label>
                  <textarea
                    rows={4}
                    value={form.servicesText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, servicesText: e.target.value }))
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Default Blog Topics</label>
                  <textarea
                    rows={4}
                    value={form.blogsText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, blogsText: e.target.value }))
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Compliance Disclosure Template
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.disclosureTemplate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, disclosureTemplate: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">
                    Prompt Instructions
                  </label>
                  <input
                    value={form.promptInstructions}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, promptInstructions: e.target.value }))
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Model Preset</label>
                  <input
                    value={form.modelPreset}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, modelPreset: e.target.value }))
                    }
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-zinc-950 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 text-xs font-medium"
                >
                  Save Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
