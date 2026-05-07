import React, { useEffect, useState } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { X, Users, Quote, ChevronRight, Loader2, Film } from 'lucide-react';

const RUN_FOLDER = '/run_20260417_1621_39b2de80';

interface ScreenplayScene {
  page_order: number;
  characters_raw: string[];
  description: string;
  narration: string;
  dialogue: { character: string; text: string }[];
}

interface ScreenplayData {
  characters: { name: string; slug: string; description: string }[];
  panels: ScreenplayScene[];
}

// ─── Screenplay Panel ─────────────────────────────────────────────────────────
export const ScreenplayPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [data, setData] = useState<ScreenplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<number | null>(null);
  const [tab, setTab] = useState<'scenes' | 'chars'>('scenes');

  const pages = useStoryStore(s => s.pages);
  const setSelectedPage = useStoryStore(s => s.setSelectedPage);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);

  // Load screenplay JSON
  useEffect(() => {
    fetch(`${RUN_FOLDER}/screenplay_parsed.json`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Navigate to panel on map
  const navigateTo = (scene: ScreenplayScene) => {
    setActiveScene(scene.page_order);
    // Find which page and panel this global order belongs to
    let globalOrder = 0;
    for (const pg of pages) {
      for (const panel of pg.panels) {
        globalOrder++;
        if (panel.globalOrder === scene.page_order) {
          setSelectedPage(pg.id);
          setSelectedPanel(panel.id);
          return;
        }
      }
    }
    // Fallback: just find by page_order across all panels
    const allPanels = pages.flatMap(pg => pg.panels);
    const target = allPanels.find(p => p.pageOrder === scene.page_order % 8 || p.globalOrder === scene.page_order);
    if (target) {
      const pg = pages.find(p => p.id === target.pageId);
      if (pg) setSelectedPage(pg.id);
      setSelectedPanel(target.id);
    }
  };

  const slugToAvatarUrl = (slug: string) => `${RUN_FOLDER}/chars_output/${slug}.png`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-slate-900 z-40 flex flex-col shadow-2xl animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 shrink-0 bg-slate-800">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-indigo-400" />
            <div>
              <h2 className="font-bold text-white text-sm">Kịch bản toàn truyện</h2>
              <p className="text-slate-400 text-xs">{data?.panels.length ?? '...'} cảnh</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 shrink-0">
          <button
            onClick={() => setTab('scenes')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors
              ${tab === 'scenes' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            📋 Cảnh ({data?.panels.length ?? '...'})
          </button>
          <button
            onClick={() => setTab('chars')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors
              ${tab === 'chars' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            👥 Nhân vật ({data?.characters.length ?? '...'})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          )}

          {/* ── Scenes tab ─────────────────────────────────────────────── */}
          {!loading && tab === 'scenes' && data && (
            <div className="divide-y divide-slate-800">
              {data.panels.map((scene, idx) => {
                const isActive = activeScene === scene.page_order;
                const pageNum = Math.ceil(scene.page_order / 8);
                const panelNum = ((scene.page_order - 1) % 8) + 1;

                return (
                  <button
                    key={scene.page_order}
                    onClick={() => navigateTo(scene)}
                    className={`w-full text-left px-4 py-3 transition-all hover:bg-slate-800/80 group
                      ${isActive ? 'bg-indigo-900/40 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
                  >
                    {/* Scene number + page badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
                          ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}>
                          {idx + 1}
                        </span>
                        <span className="text-indigo-300/70 text-[10px] font-mono">
                          T{pageNum}.K{panelNum}
                        </span>
                      </div>
                      {/* Character badges */}
                      <div className="flex items-center gap-1">
                        {scene.characters_raw.slice(0, 2).map(name => (
                          <span key={name}
                            className="text-[9px] px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                            {name.split(' ')[0]}
                          </span>
                        ))}
                        {scene.characters_raw.length > 2 && (
                          <span className="text-[9px] text-slate-500">+{scene.characters_raw.length - 2}</span>
                        )}
                      </div>
                    </div>

                    {/* Narration */}
                    {scene.narration && (
                      <p className="text-amber-300/80 text-xs italic mb-1.5 line-clamp-2 leading-relaxed">
                        {scene.narration}
                      </p>
                    )}

                    {/* Dialogues */}
                    {scene.dialogue.slice(0, 2).map((d, di) => (
                      <div key={di} className="flex items-start gap-1.5 mb-1">
                        <Quote size={10} className="text-indigo-400/70 mt-0.5 shrink-0" />
                        <p className="text-slate-300 text-[11px] line-clamp-1">
                          <span className="text-indigo-300 font-semibold">{d.character}: </span>
                          {d.text}
                        </p>
                      </div>
                    ))}

                    {isActive && (
                      <div className="flex items-center gap-1 mt-2 text-indigo-400 text-[10px] font-medium">
                        <ChevronRight size={10} /> Đang xem
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Characters tab ──────────────────────────────────────────── */}
          {!loading && tab === 'chars' && data && (
            <div className="p-3 space-y-3">
              {data.characters.map(char => (
                <div key={char.slug} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={slugToAvatarUrl(char.slug)}
                      alt={char.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-600 bg-slate-700"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=4f46e5&color=fff&bold=true`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm">{char.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-3 leading-relaxed">
                        {char.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
