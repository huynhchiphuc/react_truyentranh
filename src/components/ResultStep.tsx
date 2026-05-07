import React, { useEffect, useCallback, useState } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { ComicPanel } from './ComicPanel';
import { PanelDetailDrawer } from './PanelEditor';
import { ReaderMode } from './ReaderMode';
import { ScreenplayPanel } from './ScreenplayPanel';
import {
  ChevronLeft, ChevronRight, Download, Info,
  BookOpen, Film, RefreshCcw, ImageOff, AlertTriangle
} from 'lucide-react';

const PAGE_CANVAS_W = 750;
// RUN_FOLDER lấy từ store (dynamic), không hardcode

// ─── Result Step ──────────────────────────────────────────────────────────────
export const ResultStep: React.FC = () => {
  const pages = useStoryStore(s => s.pages);
  const selectedPageId = useStoryStore(s => s.selectedPageId);
  const setSelectedPage = useStoryStore(s => s.setSelectedPage);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const regeneratePanelImage = useStoryStore(s => s.regeneratePanelImage);
  const runFolder = useStoryStore(s => s.runFolder); // ← dynamic

  const [showReader, setShowReader] = useState(false);
  const [showScreenplay, setShowScreenplay] = useState(false);
  const [readerPage, setReaderPage] = useState(1);

  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];
  const currentIndex = pages.findIndex(p => p.id === currentPage?.id);

  // ── Page navigation ────────────────────────────────────────────────────────
  const pagePrevNext = useCallback((dir: -1 | 1) => {
    const next = pages[currentIndex + dir];
    if (next) setSelectedPage(next.id);
  }, [pages, currentIndex, setSelectedPage]);

  // ── C: Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showReader || showScreenplay) return; // let sub-components handle
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't intercept text input

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pagePrevNext(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') pagePrevNext(-1);
      if (e.key === 'Escape') {
        setSelectedPanel(null);
        setShowScreenplay(false);
      }
      if (e.key === 'r' || e.key === 'R') {
        setReaderPage(currentPage?.pageNumber ?? 1);
        setShowReader(true);
      }
      if (e.key === 's' || e.key === 'S') setShowScreenplay(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pagePrevNext, showReader, showScreenplay, currentPage, setSelectedPanel]);

  const pageH = currentPage
    ? Math.max(...currentPage.panels.map(p => p.frame.y + p.frame.height)) + 20
    : PAGE_CANVAS_W * (16 / 9);

  const allPanels = pages.flatMap(pg => pg.panels);
  const doneCount = allPanels.filter(p => p.status === 'done').length;
  const missingPanels = currentPage?.panels.filter(p => !p.image_url) ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── A: Reader Mode overlay ─────────────────────────────────────── */}
      {showReader && (
        <ReaderMode
          initialPage={readerPage}
          onClose={() => setShowReader(false)}
        />
      )}

      {/* ── B: Screenplay panel (left slide-in) ───────────────────────── */}
      {showScreenplay && (
        <ScreenplayPanel onClose={() => setShowScreenplay(false)} />
      )}

      {/* ── Left: Sidebar thumbnails ─────────────────────────────────── */}
      <div className="w-44 shrink-0 bg-slate-900 flex flex-col border-r border-slate-700/50">
        {/* Stats header */}
        <div className="p-3 border-b border-slate-700/50 bg-slate-800/60">
          <p className="text-white text-xs font-bold uppercase tracking-wide">Trang truyện</p>
          <p className="text-slate-400 text-xs mt-0.5">{doneCount}/{allPanels.length} ảnh</p>
        </div>

        {/* Page thumbnails */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {pages.map(pg => {
            const isActive = pg.id === currentPage?.id;
            const pgDone = pg.panels.filter(p => p.status === 'done').length;
            const pgTotal = pg.panels.length;
            const hasMissing = pgDone < pgTotal;

            return (
              <button
                key={pg.id}
                onClick={() => setSelectedPage(pg.id)}
                className={`w-full text-left rounded-xl overflow-hidden border-2 transition-all group
                  ${isActive
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/25'
                    : 'border-slate-700 hover:border-slate-500'}`}
              >
                {/* C: Better thumbnail using final_pages image */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '9/16' }}>
                  {/* Try final_pages first (composed), fallback to panel mosaic */}
                  <img
                    src={`${runFolder}/final_pages/page_00${pg.pageNumber}.png`}
                    alt={`Trang ${pg.pageNumber}`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                    }}
                  />
                  {/* Mosaic fallback */}
                  <div className="absolute inset-0 bg-white" hidden>
                    {pg.panels.map(p => p.image_url ? (
                      <img key={p.id} src={p.image_url} alt="" className="absolute"
                        style={{
                          left: `${(p.frame.x / PAGE_CANVAS_W) * 100}%`,
                          top: `${(p.frame.y / (PAGE_CANVAS_W * 16 / 9)) * 100}%`,
                          width: `${(p.frame.width / PAGE_CANVAS_W) * 100}%`,
                          height: `${(p.frame.height / (PAGE_CANVAS_W * 16 / 9)) * 100}%`,
                          objectFit: 'cover',
                        }} />
                    ) : null)}
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Missing panels warning badge */}
                  {hasMissing && (
                    <div className="absolute top-1.5 right-1.5 bg-amber-500 rounded-full p-0.5">
                      <AlertTriangle size={8} className="text-white" />
                    </div>
                  )}

                  {/* Page number */}
                  <span className="absolute bottom-1 left-0 right-0 text-center text-white text-[9px] font-bold drop-shadow">
                    Trang {pg.pageNumber}
                  </span>

                  {/* Reader button on hover */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setReaderPage(pg.pageNumber);
                      setShowReader(true);
                    }}
                    className="absolute inset-0 flex items-center justify-center
                      bg-indigo-600/0 group-hover:bg-indigo-600/60 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <BookOpen size={16} className="text-white" />
                  </button>
                </div>

                {/* Status bar */}
                <div className={`px-2 py-1 text-xs font-medium flex items-center justify-between
                  ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <span>{pgDone}/{pgTotal} khung</span>
                  {hasMissing && <span className="text-amber-400">⚠ {pgTotal - pgDone}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="p-2 border-t border-slate-700/50 space-y-1.5">
          <button
            onClick={() => {
              setReaderPage(currentPage?.pageNumber ?? 1);
              setShowReader(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
              bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <BookOpen size={13} /> Đọc truyện (R)
          </button>
          <button
            onClick={() => setShowScreenplay(v => !v)}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
              text-xs font-semibold transition-colors border
              ${showScreenplay
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
          >
            <Film size={13} /> Kịch bản (S)
          </button>
        </div>
      </div>

      {/* ── Main canvas area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b px-5 py-2.5 flex items-center gap-3 shrink-0">
          {/* Page nav */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => pagePrevNext(-1)} disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[90px] text-center">
              Trang {currentPage?.pageNumber} / {pages.length}
            </span>
            <button onClick={() => pagePrevNext(1)} disabled={currentIndex >= pages.length - 1}
              className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-100 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Hint */}
          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <Info size={11} className="text-amber-500 shrink-0" />
            <span><b>Kéo góc</b> để resize · <b>Click</b> xem kịch bản · <b>← →</b> chuyển trang</span>
          </div>

          {/* C: Missing panels indicator */}
          {missingPanels.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5">
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <span className="text-xs text-amber-700 font-medium">{missingPanels.length} khung chưa có ảnh</span>
              <button
                onClick={() => missingPanels.forEach(p => regeneratePanelImage(p.id))}
                className="text-xs text-amber-600 hover:text-amber-800 font-bold underline flex items-center gap-1"
              >
                <RefreshCcw size={11} /> Sinh tất cả
              </button>
            </div>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowScreenplay(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                ${showScreenplay ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Film size={13} /> Kịch bản
            </button>
            <button
              onClick={() => {
                setReaderPage(currentPage?.pageNumber ?? 1);
                setShowReader(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <BookOpen size={13} /> Đọc truyện
            </button>
            {/* C: Export current page as final PNG */}
            <a
              href={`${runFolder}/final_pages/page_00${currentPage?.pageNumber}.png`}
              download={`trang-${currentPage?.pageNumber}.png`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={13} /> Export PNG
            </a>
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

            {/* C: Overlay for missing panels - regenerate button */}
            {currentPage?.panels.filter(p => !p.image_url).map(panel => (
              <div
                key={`missing-${panel.id}`}
                className="absolute flex flex-col items-center justify-center gap-2 pointer-events-none"
                style={{
                  left: panel.frame.x, top: panel.frame.y,
                  width: panel.frame.width, height: panel.frame.height,
                  zIndex: 5
                }}
              >
                <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                  <ImageOff size={20} className="text-slate-400" />
                  <button
                    onClick={e => { e.stopPropagation(); regeneratePanelImage(panel.id); }}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg transition-colors"
                  >
                    <RefreshCcw size={11} /> Sinh ảnh
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel detail drawer */}
      <PanelDetailDrawer />
    </div>
  );
};
