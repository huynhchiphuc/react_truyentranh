import React, { useState, useEffect } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import type { Character } from '../types';
import {
  X, RefreshCcw, Save, Users, FileText, Cpu,
  MessageSquare, Eye, Check, Plus, Trash2, Quote
} from 'lucide-react';

const MOOD_OPTIONS = ['intense', 'calm', 'mysterious', 'joyful', 'tense', 'melancholic', 'epic', 'romantic'];
const ROLE_BADGE: Record<string, string> = {
  protagonist: 'bg-indigo-100 text-indigo-700',
  antagonist: 'bg-red-100 text-red-700',
  supporting: 'bg-emerald-100 text-emerald-700',
  extra: 'bg-gray-100 text-gray-600',
};

// ─── Panel Detail Drawer ──────────────────────────────────────────────────────
export const PanelDetailDrawer: React.FC = () => {

  const showPanelDetail = useStoryStore(s => s.showPanelDetail);
  const setShow = useStoryStore(s => s.setShowPanelDetail);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const globalChars = useStoryStore(s => s.globalCharacters);
  const step = useStoryStore(s => s.step);

  const panel = useStoryStore(s => {
    if (!s.selectedPanelId) return undefined;
    for (const pg of s.pages) {
      const found = pg.panels.find(p => p.id === s.selectedPanelId);
      if (found) return found;
    }
    return undefined;
  });

  const updateScript = useStoryStore(s => s.updatePanelScript);
  const updateChars = useStoryStore(s => s.updatePanelCharacters);
  const regenerate = useStoryStore(s => s.regeneratePanelImage);

  // Local state
  const [tab, setTab] = useState<'script' | 'chars' | 'info'>('script');
  const [narration, setNarration] = useState('');
  const [action, setAction] = useState('');
  const [mood, setMood] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dialogues, setDialogues] = useState<{ character: string; text: string }[]>([]);
  const [isRegen, setIsRegen] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync from panel whenever selected panel changes
  useEffect(() => {
    if (!panel) return;
    setNarration(panel.script.narration || '');
    setAction(panel.script.action || '');
    setMood(panel.script.mood || '');
    setPrompt(panel.script.ai_prompt || '');
    // support both 'dialogues' (new) and legacy shape
    setDialogues(panel.script.dialogues || []);
    setSaved(false);
  }, [panel?.id]);

  if (!panel || !showPanelDetail) return null;

  const isResultMode = step === 'result';

  const handleSave = () => {
    updateScript(panel.id, { narration, action, mood, ai_prompt: prompt, dialogues });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRegenerate = async () => {
    handleSave();
    setIsRegen(true);
    await regenerate(panel.id);
    setIsRegen(false);
  };

  const handleClose = () => {
    setShow(false);
    setSelectedPanel(null);
  };

  const toggleChar = (char: Character) => {
    const exists = panel.characters.find(c => c.id === char.id);
    if (exists) {
      updateChars(panel.id, panel.characters.filter(c => c.id !== char.id));
    } else {
      updateChars(panel.id, [...panel.characters, char]);
    }
  };

  const addDialogue = () => setDialogues(d => [...d, { character: '', text: '' }]);
  const removeDialogue = (i: number) => setDialogues(d => d.filter((_, idx) => idx !== i));
  const updateDialogue = (i: number, field: 'character' | 'text', val: string) =>
    setDialogues(d => d.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-mono">Khung {panel.pageOrder}</p>
            <h2 className="font-bold text-slate-800 truncate text-sm">{panel.id}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 font-medium
              ${panel.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                panel.status === 'scripted' ? 'bg-purple-100 text-purple-700' :
                panel.status === 'generating' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'}`}>
              {panel.status === 'done' ? '✓ Đã tạo ảnh' :
               panel.status === 'scripted' ? '✎ Có kịch bản' :
               panel.status === 'generating' ? '⟳ Đang tạo' : '○ Trống'}
            </span>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Preview thumbnail if image exists */}
        {panel.image_url && (
          <div className="shrink-0 bg-slate-900 flex items-center justify-center" style={{ height: 160 }}>
            <img src={panel.image_url} alt="" className="h-full w-full object-cover opacity-90" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b shrink-0 bg-white">
          {([
            { id: 'script', icon: FileText, label: 'Kịch bản' },
            { id: 'chars', icon: Users, label: 'Nhân vật' },
            { id: 'info', icon: Eye, label: 'Thông tin' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2
                ${tab === id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Script Tab ─────────────────────────────────────────────── */}
          {tab === 'script' && (
            <>
              {/* Narration box */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <Quote size={12} className="text-amber-500" /> Narration
                </label>
                {narration && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-sm text-amber-900 mb-2 italic">
                    {narration}
                  </div>
                )}
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  rows={2}
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  placeholder="Narration / mô tả cảnh..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Hành động trong khung
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  placeholder="Nhân vật đang làm gì..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tâm trạng</label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
                        ${mood === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dialogues */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                    <MessageSquare size={12} /> Hội thoại
                  </label>
                  <button onClick={addDialogue}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium">
                    <Plus size={12} /> Thêm
                  </button>
                </div>
                <div className="space-y-2">
                  {dialogues.map((d, i) => {
                    // Try to find character avatar from panel's character list
                    const charInfo = panel?.characters.find(c =>
                      c.name.toLowerCase() === d.character.toLowerCase()
                    );
                    return (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        {/* Character header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          {charInfo?.avatar && (
                            <img src={charInfo.avatar} alt={charInfo.name}
                              className="w-6 h-6 rounded-full object-cover border border-white shadow-sm" />
                          )}
                          <input
                            className="flex-1 text-xs font-semibold bg-transparent focus:outline-none text-slate-700"
                            placeholder="Tên nhân vật"
                            value={d.character}
                            onChange={e => updateDialogue(i, 'character', e.target.value)}
                          />
                          <button onClick={() => removeDialogue(i)}
                            className="p-0.5 text-red-400 hover:text-red-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {/* Dialogue text */}
                        <div className="px-3 py-1.5 bg-indigo-50/50">
                          <p className="text-xs text-indigo-800 font-medium italic mb-1">❝ {d.text} ❞</p>
                          <input
                            className="w-full text-xs bg-transparent focus:outline-none text-slate-500 border-t border-slate-100 pt-1"
                            placeholder="Chỉnh sửa lời thoại..."
                            value={d.text}
                            onChange={e => updateDialogue(i, 'text', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {dialogues.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Chưa có hội thoại nào</p>
                  )}
                </div>
              </div>

              {/* AI Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <Cpu size={12} /> Prompt AI
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono resize-none"
                  rows={3}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Prompt sẽ gửi tới AI để tạo ảnh..."
                />
              </div>
            </>
          )}

          {/* ── Characters Tab ─────────────────────────────────────────── */}
          {tab === 'chars' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Chọn nhân vật xuất hiện trong khung này:</p>
              {globalChars.map(char => {
                const selected = panel.characters.find(c => c.id === char.id);
                return (
                  <button
                    key={char.id}
                    onClick={() => toggleChar(char)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all
                      ${selected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                  >
                    <img src={char.avatar} alt={char.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800">{char.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGE[char.role || 'extra']}`}>
                        {char.role || 'extra'}
                      </span>
                    </div>
                    {selected && <Check size={16} className="text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Info Tab ───────────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-3">
              {[
                { label: 'ID', value: panel.id },
                { label: 'File', value: panel.file_name },
                { label: 'Aspect', value: panel.aspect_label.replace('_', ' ') },
                { label: 'Global #', value: panel.globalOrder },
                { label: 'Page #', value: panel.pageOrder },
                { label: 'Width', value: `${Math.round(panel.frame.width)}px` },
                { label: 'Height', value: `${Math.round(panel.frame.height)}px` },
                { label: 'X', value: `${Math.round(panel.frame.x)}px` },
                { label: 'Y', value: `${Math.round(panel.frame.y)}px` },
                { label: 'Zoom', value: `${Math.round(panel.image_transform.scale * 100)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{label}</span>
                  <span className="text-xs font-mono text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t p-4 space-y-2 bg-slate-50 shrink-0">
          <button
            onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all
              ${saved
                ? 'bg-emerald-500 text-white'
                : 'bg-white border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50'}`}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Đã lưu!' : 'Lưu kịch bản'}
          </button>

          {isResultMode && (
            <button
              onClick={handleRegenerate}
              disabled={isRegen}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md shadow-indigo-200"
            >
              <RefreshCcw size={16} className={isRegen ? 'animate-spin' : ''} />
              {isRegen ? 'Đang sinh lại...' : 'Sinh lại ảnh AI'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};