import React from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { ComicPanel } from './ComicPanel';
import { Sparkles, Wand2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const PAGE_CANVAS_W = 750;

// ─── Layout Step ──────────────────────────────────────────────────────────────
export const LayoutStep: React.FC = () => {
  const pages = useStoryStore(s => s.pages);
  const selectedPageId = useStoryStore(s => s.selectedPageId);
  const setSelectedPage = useStoryStore(s => s.setSelectedPage);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const generateAllScripts = useStoryStore(s => s.generateAllScripts);
  const isGenerating = useStoryStore(s => s.isGenerating);
  const setStep = useStoryStore(s => s.setStep);

  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];
  const currentIndex = pages.findIndex(p => p.id === currentPage?.id);

  const pagePrevNext = (dir: -1 | 1) => {
    const next = pages[currentIndex + dir];
    if (next) setSelectedPage(next.id);
  };

  if (pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Chưa có trang nào. Hãy quay lại bước trước.</p>
      </div>
    );
  }

  // Compute canvas height from panels bbox
  const pageH = currentPage
    ? Math.max(...currentPage.panels.map(p => p.frame.y + p.frame.height)) + 20
    : PAGE_CANVAS_W * (16 / 9);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => pagePrevNext(-1)} disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[80px] text-center">
            Trang {currentPage?.pageNumber} / {pages.length}
          </span>
          <button onClick={() => pagePrevNext(1)} disabled={currentIndex >= pages.length - 1}
            className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <span className="text-xs text-slate-500 w-full sm:w-auto text-right mb-1 sm:mb-0">
            {currentPage?.panels.length} khung
          </span>
          <button
            onClick={generateAllScripts}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            {isGenerating
              ? <Loader2 size={16} className="animate-spin" />
              : <Wand2 size={16} />}
            {isGenerating ? 'Đang tạo...' : '2. Tạo kịch bản từng khung'}
          </button>
          <button
            onClick={() => setStep('generating')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Sparkles size={16} /> 3. Sinh ảnh AI →
          </button>
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 px-4 sm:px-6 pt-3 pb-0 bg-slate-50 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
        {pages.map(pg => (
          <button
            key={pg.id}
            onClick={() => setSelectedPage(pg.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors
              ${pg.id === currentPage?.id
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'}`}
          >
            Trang {pg.pageNumber}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-slate-300 p-4 sm:p-8 text-center">
        <div
          className="relative bg-white shadow-2xl border border-slate-300 inline-block text-left"
          style={{ width: PAGE_CANVAS_W, height: pageH, minHeight: 400 }}
          onClick={() => setSelectedPanel(null)}
        >
          {currentPage?.panels.map(panel => (
            <ComicPanel
              key={panel.id}
              panelId={panel.id}
              pageCanvasWidth={PAGE_CANVAS_W}
              isResult={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
