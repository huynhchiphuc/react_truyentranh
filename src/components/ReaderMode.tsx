import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookOpen, ExternalLink } from 'lucide-react';

const RUN_FOLDER = '/run_20260417_1621_39b2de80';
const TOTAL_PAGES = 3;

interface ReaderModeProps {
  initialPage?: number;
  onClose: () => void;
}

// ─── Full-Screen Storyboard Reader ────────────────────────────────────────────
export const ReaderMode: React.FC<ReaderModeProps> = ({ initialPage = 1, onClose }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const goTo = useCallback((page: number, dir: 'left' | 'right') => {
    if (page < 1 || page > TOTAL_PAGES || isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsAnimating(false);
    }, 220);
  }, [isAnimating]);

  const prev = () => goTo(currentPage - 1, 'left');
  const next = () => goTo(currentPage + 1, 'right');

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.2, 3));
      if (e.key === '-') setZoom(z => Math.max(z - 0.2, 0.3));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, isAnimating, onClose]);

  const pageImgUrl = `${RUN_FOLDER}/final_pages/page_00${currentPage}.png`;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/80 backdrop-blur border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-indigo-400" />
          <span className="text-white font-bold text-sm">Thánh Gióng</span>
          <span className="text-slate-400 text-xs">· Storyboard Reader</span>
        </div>

        {/* Page indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_PAGES }, (_, i) => (
            <button
              key={i}
              onClick={() => goTo(i + 1, i + 1 > currentPage ? 'right' : 'left')}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all
                ${i + 1 === currentPage
                  ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-500/40'
                  : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ZoomOut size={16} />
          </button>
          <span className="text-white text-xs font-mono w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
            <ZoomIn size={16} />
          </button>
          <a href={pageImgUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
            title="Mở ảnh gốc">
            <ExternalLink size={16} />
          </a>
          <button onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Main viewer ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative select-none">
        {/* Prev area */}
        <button
          onClick={prev}
          disabled={currentPage <= 1}
          className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center
            bg-gradient-to-r from-black/60 to-transparent z-10
            disabled:opacity-20 hover:from-black/80 transition-all group"
        >
          <ChevronLeft size={40} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Page image */}
        <div
          className={`transition-all duration-200 ${
            isAnimating
              ? direction === 'right' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          <img
            src={pageImgUrl}
            alt={`Trang ${currentPage}`}
            className="max-h-[calc(100vh-120px)] max-w-[calc(100vw-160px)] object-contain shadow-2xl shadow-black/80"
            draggable={false}
          />
        </div>

        {/* Next area */}
        <button
          onClick={next}
          disabled={currentPage >= TOTAL_PAGES}
          className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center
            bg-gradient-to-l from-black/60 to-transparent z-10
            disabled:opacity-20 hover:from-black/80 transition-all group"
        >
          <ChevronRight size={40} className="text-white opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* ── Bottom info bar ── */}
      <div className="flex items-center justify-between px-6 py-2 bg-black/80 border-t border-white/10 shrink-0">
        <span className="text-slate-400 text-xs">
          ← → chuyển trang &nbsp;·&nbsp; +/- zoom &nbsp;·&nbsp; Esc đóng
        </span>
        <span className="text-white text-sm font-semibold">
          Trang {currentPage} / {TOTAL_PAGES}
        </span>
        <a
          href={pageImgUrl}
          download={`thanh-giong-trang-${currentPage}.png`}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          ↓ Tải trang này
        </a>
      </div>
    </div>
  );
};
