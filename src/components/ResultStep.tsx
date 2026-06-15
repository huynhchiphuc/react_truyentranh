import React, { useEffect, useCallback, useState } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { ComicPanel } from './ComicPanel';
import { PanelDetailDrawer } from './PanelEditor';
import { ReaderMode } from './ReaderMode';
import { ScreenplayPanel } from './ScreenplayPanel';
import {
  ChevronLeft, ChevronRight, Download, Info,
  BookOpen, Film, RefreshCcw, ImageOff, AlertTriangle,
  Users, Layout, Save
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';

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
  const isLayoutMode = useStoryStore(s => s.isLayoutMode);
  const setIsLayoutMode = useStoryStore(s => s.setIsLayoutMode);
  const updateGlobalCharacter = useStoryStore(s => s.updateGlobalCharacter);

  const [showReader, setShowReader] = useState(false);
  const [showScreenplay, setShowScreenplay] = useState(false);
  const [readerPage, setReaderPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'comic' | 'characters'>('comic');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);

  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];
  const currentIndex = pages.findIndex(p => p.id === currentPage?.id);

  const [pageInput, setPageInput] = useState(String(currentPage?.pageNumber || 1));

  // Sync pageInput when currentPage changes
  useEffect(() => {
    setPageInput(String(currentPage?.pageNumber || 1));
  }, [currentPage?.pageNumber]);

  const handlePageInputChange = (val: string) => {
    setPageInput(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= pages.length) {
      const target = pages.find(p => p.pageNumber === n);
      if (target) setSelectedPage(target.id);
    }
  };

  // ── Page navigation ────────────────────────────────────────────────────────
  const pagePrevNext = useCallback((dir: -1 | 1) => {
    const next = pages[currentIndex + dir];
    if (next) setSelectedPage(next.id);
  }, [pages, currentIndex, setSelectedPage]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showReader || showScreenplay) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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

  // ── Export Logic ──────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const exportAsImage = async () => {
    const el = document.getElementById('comic-canvas');
    if (!el) return;
    setIsExporting(true);

    try {
      // ── Step 1: Find all images (HTML and SVG) and convert to Base64 ──
      const htmlImages = Array.from(el.getElementsByTagName('img'));
      const svgImages = Array.from(el.getElementsByTagName('image'));
      const originalSrcs = new Map<HTMLImageElement | SVGImageElement, string>();

      const processImage = async (img: HTMLImageElement | SVGImageElement) => {
        const src = img instanceof HTMLImageElement ? img.src : img.href.baseVal;
        if (!src || src.startsWith('data:')) return;

        try {
          const res = await fetch(src);
          const blob = await res.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          originalSrcs.set(img, src);
          if (img instanceof HTMLImageElement) {
            img.src = base64;
          } else {
            img.setAttribute('href', base64);
          }
        } catch (e) {
          console.warn("Could not convert image to base64", src, e);
        }
      };

      await Promise.all([...htmlImages, ...svgImages].map(processImage));

      // ── Step 2: Capture the canvas ──
      const dataUrl = await htmlToImage.toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        filter: (node) => {
          const elNode = node as HTMLElement;
          const cl = elNode.className;
          if (typeof cl === 'string') {
            // SPECIFICALLY ALLOW bubbles
            if (cl.includes('group/bubble')) return true;
            if (cl.includes('global-detection-portal')) return true;

            // Hide handles and interactive UI
            if (cl.includes('cursor-move') || cl.includes('pointer-events-none')) {
              // Keep the main content area (SVG/DIV)
              if (elNode.tagName === 'DIV' && elNode.children.length > 0) {
                if (elNode.querySelector('svg')) return true;
              }
              if (elNode.tagName === 'svg' || elNode.tagName === 'SVG') return true;

              // If it's just an absolute div (like a handle), hide it
              if (cl.includes('absolute') && !elNode.querySelector('svg')) return false;
            }
            if (cl.includes('bg-amber-500') || cl.includes('bg-indigo-600')) {
              if (elNode.tagName === 'BUTTON' || elNode.tagName === 'DIV') return false;
            }
          }
          return true;
        }
      });

      // ── Step 3: Restore original sources ──
      originalSrcs.forEach((src, img) => {
        if (img instanceof HTMLImageElement) {
          img.src = src;
        } else {
          img.setAttribute('href', src);
        }
      });

      const link = document.createElement('a');
      link.download = `comic-page-${currentPage?.pageNumber || 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      alert('Không thể xuất ảnh. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportLayoutJson = () => {
    if (!currentPage) return;
    const data = {
      page_number: currentPage.pageNumber,
      panels: currentPage.panels.map(p => ({
        panel_id: p.id,
        file_name: p.file_name,
        polygon: p.polygon,
        frame: p.frame,
        image_transform: p.image_transform
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `layout-page-${currentPage.pageNumber}.json`;
    link.href = url;
    link.click();
  };

  const pageH = currentPage
    ? Math.max(...currentPage.panels.map(p => p.frame.y + p.frame.height)) + 20
    : PAGE_CANVAS_W * (16 / 9);

  const allPanels = pages.flatMap(pg => pg.panels);
  const doneCount = allPanels.filter(p => p.status === 'done').length;
  const missingPanels = currentPage?.panels.filter(p => !p.image_url) ?? [];
  const globalCharacters = useStoryStore(s => s.globalCharacters);
  const updatePanelPolygon = useStoryStore(s => s.updatePanelPolygon);
  const updateImageTransform = useStoryStore(s => s.updateImageTransform);

  // ── Global Joint Logic ────────────────────────────────────────────────────
  const [joints, setJoints] = useState<{ x: number, y: number, connections: { panelId: string, idx: number }[] }[]>([]);
  const [draggingJointIdx, setDraggingJointIdx] = useState<number | null>(null);
  const [dragConstraints, setDragConstraints] = useState<{
    isLeft: boolean;
    isRight: boolean;
    isTop: boolean;
    isBottom: boolean;
    lockX: number;
    lockY: number;
  } | null>(null);

  useEffect(() => {
    if (!isLayoutMode || !currentPage) {
      setJoints([]);
      return;
    }

    const newJoints: { x: number, y: number, connections: { panelId: string, idx: number }[] }[] = [];

    currentPage.panels.forEach(p => {
      const poly = p.polygon && p.polygon.length > 0 ? p.polygon : [
        { x: p.frame.x, y: p.frame.y },
        { x: p.frame.x + p.frame.width, y: p.frame.y },
        { x: p.frame.x + p.frame.width, y: p.frame.y + p.frame.height },
        { x: p.frame.x, y: p.frame.y + p.frame.height }
      ];

      poly.forEach((v, idx) => {
        let found = newJoints.find(j => Math.sqrt(Math.pow(j.x - v.x, 2) + Math.pow(j.y - v.y, 2)) < 12);
        if (found) {
          found.connections.push({ panelId: p.id, idx });
        } else {
          newJoints.push({ x: v.x, y: v.y, connections: [{ panelId: p.id, idx }] });
        }
      });
    });

    setJoints(newJoints);
  }, [isLayoutMode, currentPage]);

  const handleJointMove = useCallback((e: MouseEvent) => {
    if (draggingJointIdx === null || !currentPage) return;
    const canvas = document.getElementById('comic-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let targetX = x;
    let targetY = y;

    if (dragConstraints) {
      if (dragConstraints.isLeft || dragConstraints.isRight) {
        targetX = dragConstraints.lockX;
      }
      if (dragConstraints.isTop || dragConstraints.isBottom) {
        targetY = dragConstraints.lockY;
      }
    }

    const joint = joints[draggingJointIdx];

    // Update each connected panel
    joint.connections.forEach(conn => {
      const panel = currentPage.panels.find(p => p.id === conn.panelId);
      if (!panel) return;

      const poly = panel.polygon && panel.polygon.length > 0 ? [...panel.polygon] : [
        { x: panel.frame.x, y: panel.frame.y },
        { x: panel.frame.x + panel.frame.width, y: panel.frame.y },
        { x: panel.frame.x + panel.frame.width, y: panel.frame.y + panel.frame.height },
        { x: panel.frame.x, y: panel.frame.y + panel.frame.height }
      ];

      // Stationary image logic: calculate bounding box shift
      const oldPx = Math.min(...poly.map(p => p.x));
      const oldPy = Math.min(...poly.map(p => p.y));

      poly[conn.idx] = { x: targetX, y: targetY };

      const newPx = Math.min(...poly.map(p => p.x));
      const newPy = Math.min(...poly.map(p => p.y));
      const dx = newPx - oldPx;
      const dy = newPy - oldPy;

      if (dx !== 0 || dy !== 0) {
        updateImageTransform(panel.id, {
          x: panel.image_transform.x - dx,
          y: panel.image_transform.y - dy,
        });
      }

      updatePanelPolygon(panel.id, poly);
    });

    setJoints(prev => prev.map((j, i) => i === draggingJointIdx ? { ...j, x: targetX, y: targetY } : j));
  }, [draggingJointIdx, joints, currentPage, updatePanelPolygon, dragConstraints]);

  const stopJointDrag = useCallback(() => {
    setDraggingJointIdx(null);
    setDragConstraints(null);
  }, []);

  useEffect(() => {
    if (draggingJointIdx !== null) {
      window.addEventListener('mousemove', handleJointMove);
      window.addEventListener('mouseup', stopJointDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleJointMove);
      window.removeEventListener('mouseup', stopJointDrag);
    };
  }, [draggingJointIdx, handleJointMove, stopJointDrag]);

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
      <div className="hidden md:flex w-44 shrink-0 bg-slate-900 flex-col border-r border-slate-700/50">
        {/* Stats header */}
        <div className="p-3 border-b border-slate-700/50 bg-slate-800/60">
          <p className="text-white text-xs font-bold uppercase tracking-wide">Trang truyện</p>
          <p className="text-slate-400 text-xs mt-0.5">{doneCount}/{allPanels.length} ảnh</p>
        </div>

        {/* Page thumbnails */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-slate-900/50">
          {pages.map(pg => {
            const isActive = pg.id === currentPage?.id;
            const pgDone = pg.panels.filter(p => p.status === 'done').length;
            const pgTotal = pg.panels.length;
            const hasMissing = pgDone < pgTotal;

            return (
              <div key={pg.id} className="relative group">
                <button
                  onClick={() => setSelectedPage(pg.id)}
                  className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all duration-300
                    ${isActive
                      ? 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-[1.02]'
                      : 'border-slate-800 hover:border-slate-600 hover:scale-[1.01]'}`}
                >
                  <div className="relative overflow-hidden bg-slate-800" style={{ aspectRatio: '9/16' }}>
                    <img
                      src={`${runFolder}/final_pages/page_00${pg.pageNumber}.png`}
                      alt={`Trang ${pg.pageNumber}`}
                      className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                      }}
                    />
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

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    {/* Page number badge */}
                    <span className="absolute bottom-2 left-0 right-0 text-center text-white text-[10px] font-black tracking-widest drop-shadow-md">
                      PAGE {pg.pageNumber}
                    </span>

                    {/* Status indicators */}
                    {hasMissing && (
                      <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1 shadow-lg animate-pulse">
                        <AlertTriangle size={10} className="text-white" />
                      </div>
                    )}

                    {/* Hover Reader Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/0 group-hover:bg-indigo-600/40 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                      <div className="p-2 bg-white rounded-full shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-300">
                        <BookOpen size={18} className="text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  {/* Footer info */}
                  <div className={`px-3 py-2 text-[10px] font-bold flex items-center justify-between
                    ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <span className="flex items-center gap-1">
                      <ImageOff size={10} /> {pgDone}/{pgTotal}
                    </span>
                    {hasMissing && (
                      <span className="text-amber-400 font-black">MISSING {pgTotal - pgDone}</span>
                    )}
                  </div>
                </button>
              </div>
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

      {/* ── Main content area with TABS ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Tab Header - Premium Glassy look */}
        <div className="bg-white/80 backdrop-blur-md border-b flex px-6 pt-3 gap-2 shrink-0 z-10">
          <button
            onClick={() => setActiveTab('comic')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-2xl transition-all duration-300
              ${activeTab === 'comic'
                ? 'bg-slate-50 text-indigo-600 border-t border-l border-r border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] translate-y-[1px]'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'comic' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
              <ImageOff size={14} />
            </div>
            Kết quả truyện
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-2xl transition-all duration-300
              ${activeTab === 'characters'
                ? 'bg-slate-50 text-indigo-600 border-t border-l border-r border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] translate-y-[1px]'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'characters' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
              <Users size={14} />
            </div>
            Danh sách nhân vật
          </button>
        </div>

        {activeTab === 'comic' ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
            {/* Toolbar */}
            <div className="bg-white border-b px-4 sm:px-6 py-3 flex flex-wrap items-center gap-4 shrink-0 shadow-sm z-10">
              {/* Page nav with INPUT */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5 shadow-inner">
                <button onClick={() => pagePrevNext(-1)} disabled={currentIndex <= 0}
                  className="p-1.5 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30 transition-all text-slate-600">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2 px-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Trang</span>
                  <input
                    type="text"
                    value={pageInput}
                    onChange={e => handlePageInputChange(e.target.value)}
                    className="w-12 h-8 text-center bg-white border border-slate-200 rounded-xl text-sm font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">/ {pages.length}</span>
                </div>
                <button onClick={() => pagePrevNext(1)} disabled={currentIndex >= pages.length - 1}
                  className="p-1.5 rounded-xl hover:bg-white hover:shadow-md disabled:opacity-30 transition-all text-slate-600">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Hint - More subtle */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <Info size={14} className="text-indigo-400" />
                <p className="text-[11px] text-indigo-700/70 font-medium">
                  {isLayoutMode
                    ? <><span className="font-bold text-indigo-700">Kéo điểm neo</span> để tạo khung nghiêng · <span className="font-bold text-indigo-700">Tắt chỉnh layout</span> để xem kết quả</>
                    : <><span className="font-bold text-indigo-700">Kéo góc</span> để resize · <span className="font-bold text-indigo-700">Bấm nút</span> xem kịch bản · <span className="font-bold text-indigo-700">← →</span> chuyển trang</>
                  }
                </p>
              </div>

              {/* Missing panels indicator */}
              {missingPanels.length > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 animate-pulse">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-xs text-amber-700 font-bold">{missingPanels.length} khung trống</span>
                  <button
                    onClick={() => missingPanels.forEach(p => regeneratePanelImage(p.id))}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCcw size={12} /> Sinh hết
                  </button>
                </div>
              )}

              {/* Right actions */}
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => setIsLayoutMode(!isLayoutMode)}
                  className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-2xl border transition-all
                    ${isLayoutMode
                      ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600 shadow-sm'}`}
                >
                  <Layout size={14} /> {isLayoutMode ? 'Xong layout' : 'Chỉnh layout'}
                </button>

                <button
                  onClick={() => setShowScreenplay(v => !v)}
                  className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-2xl border transition-all
                    ${showScreenplay
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                >
                  <Film size={14} /> Kịch bản
                </button>

                <div className="h-8 w-[1px] bg-slate-200 mx-1" />

                <div className="flex items-center bg-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-slate-200">
                  <button
                    onClick={exportAsImage}
                    disabled={isExporting}
                    className="flex items-center gap-2 text-xs font-bold px-4 py-2 bg-slate-800 hover:bg-black text-white transition-all disabled:opacity-50"
                  >
                    {isExporting ? <RefreshCcw size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExporting ? 'Đang xuất...' : 'Export PNG'}
                  </button>
                  <div className="w-[1px] h-4 bg-slate-600" />
                  <button
                    onClick={exportLayoutJson}
                    title="Xuất tọa độ khung hình (JSON)"
                    className="p-2 bg-slate-800 hover:bg-black text-white transition-all border-l border-slate-700"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-200/50 p-6 sm:p-12 text-center custom-scrollbar">
              <div
                id="comic-canvas"
                className="relative bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200 inline-block text-left animate-scale-in"
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

                {/* Overlay for missing panels - regenerate button */}
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
                    <div className="pointer-events-auto flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                        <ImageOff size={24} />
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); regeneratePanelImage(panel.id); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95"
                      >
                        <RefreshCcw size={14} /> Sinh ảnh AI
                      </button>
                    </div>
                  </div>
                ))}

                {/* Global Joint Handles */}
                {isLayoutMode && joints.map((j, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingJointIdx(idx);
                      const pageH = Math.max(...(currentPage?.panels.map(p => p.frame.y + p.frame.height) ?? [])) + 20;
                      setDragConstraints({
                        isLeft: j.x <= 8,
                        isRight: j.x >= PAGE_CANVAS_W - 8,
                        isTop: j.y <= 8,
                        isBottom: j.y >= pageH - 28,
                        lockX: j.x,
                        lockY: j.y
                      });
                    }}
                    className="absolute w-6 h-6 bg-white border-2 border-indigo-600 rounded-full shadow-lg cursor-move z-[100] hover:scale-125 transition-transform flex items-center justify-center"
                    style={{ left: j.x, top: j.y, marginLeft: -12, marginTop: -12 }}
                  >
                    <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  </div>
                ))}

                {/* Portal Target for Detections (to stay on top of everything) */}
                <div id="global-detection-portal" className="absolute inset-0 pointer-events-none z-[9999]" />
              </div>
            </div>
          </div>
        ) : (
          /* ── Tab Nhân vật ── */
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8 sm:p-12 custom-scrollbar animate-fade-in">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-slate-200 pb-8">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-100">
                    <Users size={32} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhân vật truyện</h2>
                    <p className="text-slate-500 font-medium mt-1">Hệ thống nhận diện nhân vật trong kịch bản</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Tổng số</p>
                    <p className="text-xl font-black text-indigo-600">{globalCharacters.length}</p>
                  </div>
                </div>
              </div>

              {globalCharacters.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200 shadow-inner">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Không tìm thấy nhân vật</h3>
                  <p className="text-slate-400 mt-2 max-w-md mx-auto">Vui lòng kiểm tra lại thư mục run hoặc file kịch bản của bạn.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {globalCharacters.map((char, idx) => (
                    <div
                      key={char.id}
                      className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-[0_20px_40px_-12px_rgba(79,70,229,0.12)] hover:border-indigo-100 transition-all duration-500 group animate-scale-in"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-start gap-5">
                        <div className="relative shrink-0">
                          <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden bg-slate-100 ring-4 ring-slate-50 group-hover:ring-indigo-50 transition-all duration-500 shadow-inner">
                            <img src={char.avatar} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                          <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border-2 border-white
                            ${char.role === 'protagonist' ? 'bg-indigo-500 text-white' :
                              char.role === 'antagonist' ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'}`}>
                            {char.role === 'protagonist' ? 'Chính' : char.role === 'antagonist' ? 'Phản' : 'Phụ'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-2">
                          <h3 className="font-black text-slate-800 text-xl leading-tight truncate group-hover:text-indigo-600 transition-colors">{char.name}</h3>
                          <p className="text-slate-400 text-xs font-mono mt-1 opacity-60">ID: {char.id}</p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100">
                              Lớp nhân vật: {char.role === 'protagonist' ? 'Hero' : 'NPC'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedCharId(char.id)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-4 py-2 bg-indigo-50 rounded-xl transition-all"
                        >
                          Xem chi tiết <ChevronRight size={14} />
                        </button>
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Character detail modal */}
      {selectedCharId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in"
          onClick={() => {
            setSelectedCharId(null);
            setEditDesc(null);
          }}>
          <div
            className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const char = globalCharacters.find(c => c.id === selectedCharId);
              if (!char) return null;

              const appearances = allPanels.filter(p => p.characters.some(c => c.id === char.id));

              return (
                <div className="flex flex-col md:flex-row h-full">
                  {/* Left: Avatar & Role */}
                  <div className="w-full md:w-72 bg-slate-50 p-8 flex flex-col items-center border-r border-slate-100">
                    <div className="w-48 h-48 rounded-[2rem] overflow-hidden shadow-2xl mb-6 ring-8 ring-white">
                      <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4
                      ${char.role === 'protagonist' ? 'bg-indigo-600 text-white' :
                        char.role === 'antagonist' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
                      {char.role === 'protagonist' ? 'Nhân vật chính' : char.role === 'antagonist' ? 'Nhân vật phản diện' : 'Nhân vật phụ'}
                    </div>
                    <p className="text-slate-400 text-[10px] font-mono opacity-50">UID: {char.id}</p>
                  </div>

                  {/* Right: Info & Appearances */}
                  <div className="flex-1 p-8 overflow-y-auto max-h-[80vh] custom-scrollbar">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 leading-tight mb-2">{char.name}</h3>
                        <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                      </div>
                      <button
                        onClick={() => setSelectedCharId(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <ImageOff size={24} />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tiểu sử & Prompt nhân vật</h4>
                          {editDesc === null ? (
                            <button
                              onClick={() => setEditDesc(char.description || '')}
                              className="text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                              Chỉnh sửa
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  updateGlobalCharacter(char.id, { description: editDesc });
                                  setEditDesc(null);
                                }}
                                className="text-[10px] font-bold text-emerald-600 hover:underline"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditDesc(null)}
                                className="text-[10px] font-bold text-slate-400 hover:underline"
                              >
                                Hủy
                              </button>
                            </div>
                          )}
                        </div>

                        {editDesc !== null ? (
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            className="w-full h-32 p-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none custom-scrollbar"
                            placeholder="Mô tả ngoại hình, tính cách để AI tạo ảnh chính xác..."
                          />
                        ) : (
                          <p className="text-slate-600 text-sm leading-relaxed italic bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                            {char.description || "Chưa có mô tả chi tiết cho nhân vật này."}
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">Xuất hiện trong ({appearances.length})</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {appearances.slice(0, 8).map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedPage(p.pageId);
                                setSelectedCharId(null);
                              }}
                              className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:ring-2 ring-indigo-500 transition-all group relative"
                              title={`Trang ${p.pageOrder}`}
                            >
                              <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Panel detail drawer */}
      <PanelDetailDrawer />
    </div>
  );
};
