import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { ComicPanel } from './ComicPanel';
import { PanelDetailDrawer } from './PanelEditor';
import { ChevronLeft, ChevronRight, Download, Info } from 'lucide-react';

const PAGE_CANVAS_W = 750;

// ─── Result Step ──────────────────────────────────────────────────────────────
export const ResultStep: React.FC = () => {
  const pages = useStoryStore(s => s.pages);
  const selectedPageId = useStoryStore(s => s.selectedPageId);
  const setSelectedPage = useStoryStore(s => s.setSelectedPage);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const config = useStoryStore(s => s.config);

  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];
  const currentIndex = pages.findIndex(p => p.id === currentPage?.id);

  const pagePrevNext = (dir: -1 | 1) => {
    const next = pages[currentIndex + dir];
    if (next) setSelectedPage(next.id);
  };

  const pageH = currentPage
    ? Math.max(...currentPage.panels.map(p => p.frame.y + p.frame.height)) + 20
    : PAGE_CANVAS_W * (16 / 9);

  const allPanels = pages.flatMap(pg => pg.panels);
  const doneCount = allPanels.filter(p => p.status === 'done').length;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left: Sidebar thumbnails ────────────────────────────────── */}
      <div className="w-48 shrink-0 bg-slate-800 flex flex-col border-r border-slate-700">
        <div className="p-3 border-b border-slate-700">
          <p className="text-white text-xs font-bold uppercase tracking-wide">Trang truyện</p>
          <p className="text-slate-400 text-xs mt-0.5">{doneCount}/{allPanels.length} ảnh</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {pages.map((pg, idx) => {
            const isActive = pg.id === currentPage?.id;
            const pgDone = pg.panels.filter(p => p.status === 'done').length;
            return (
              <button
                key={pg.id}
                onClick={() => setSelectedPage(pg.id)}
                className={`w-full text-left rounded-xl overflow-hidden border-2 transition-all
                  ${isActive ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:border-slate-600'}`}
              >
                {/* Mini page thumbnail */}
                <div className="bg-white aspect-[9/16] relative overflow-hidden">
                  {pg.panels.map(p => (
                    p.image_url ? (
                      <img
                        key={p.id}
                        src={p.image_url}
                        alt=""
                        className="absolute"
                        style={{
                          left: `${(p.frame.x / PAGE_CANVAS_W) * 100}%`,
                          top: `${(p.frame.y / (PAGE_CANVAS_W * 16 / 9)) * 100}%`,
                          width: `${(p.frame.width / PAGE_CANVAS_W) * 100}%`,
                          height: `${(p.frame.height / (PAGE_CANVAS_W * 16 / 9)) * 100}%`,
                          objectFit: 'cover',
                        }}
                      />
                    ) : null
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-1 left-0 right-0 text-center text-white text-[9px] font-bold">
                    Trang {pg.pageNumber}
                  </span>
                </div>
                <div className={`px-2 py-1 text-xs font-medium
                  ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {pgDone}/{pg.panels.length} khung
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main canvas area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b px-6 py-3 flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => pagePrevNext(-1)} disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 min-w-[80px] text-center">
              Trang {currentPage?.pageNumber} / {pages.length}
            </span>
            <button onClick={() => pagePrevNext(1)} disabled={currentIndex >= pages.length - 1}
              className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <Info size={12} className="text-amber-500" />
            <span><b>Kéo góc</b> để thay đổi kích thước khung · <b>Click</b> để xem kịch bản</span>
          </div>

          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-2 text-sm font-medium text-slate-600 border rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors">
              <Download size={15} /> Export
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-400/80 p-8">
          <div
            className="relative bg-white shadow-2xl mx-auto border border-slate-300"
            style={{ width: PAGE_CANVAS_W, height: pageH, minHeight: 400 }}
            onClick={() => setSelectedPanel(null)}
          >
            {currentPage?.panels.map(panel => (
              <ComicPanel
                key={panel.id}
                panelId={panel.id}
                pageCanvasWidth={PAGE_CANVAS_W}
                isResult={true}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail drawer (overlays on top) */}
      <PanelDetailDrawer />
    </div>
  );
};
