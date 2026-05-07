import React, { useRef, useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useStoryStore } from '../store/useStoryStore';
import { Loader2, CheckCircle2, ImageOff, ZoomIn } from 'lucide-react';

interface ComicPanelProps {
  panelId: string;
  pageCanvasWidth: number;
  isResult?: boolean;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panelId, isResult = false }) => {
  const panel = useStoryStore(s => {
    for (const pg of s.pages) {
      const found = pg.panels.find(p => p.id === panelId);
      if (found) return found;
    }
    return undefined;
  });
  const selectedPanelId = useStoryStore(s => s.selectedPanelId);
  const generatingPanelId = useStoryStore(s => s.generatingPanelId);
  const updateFrame = useStoryStore(s => s.updatePanelFrame);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const updateImageTransform = useStoryStore(s => s.updateImageTransform);

  // Image drag state
  const isDraggingImg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgFailed, setImgFailed] = useState(false);

  // Reset imgFailed khi image_url thay đổi (e.g. switch run folder)
  React.useEffect(() => { setImgFailed(false); }, [panel?.image_url]);

  const handleImgMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isResult) return;
    e.stopPropagation();
    isDraggingImg.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, [isResult]);

  const handleImgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingImg.current) return;
    e.stopPropagation();
    setImgOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, []);

  const handleImgMouseUp = useCallback(() => {
    if (!isDraggingImg.current || !panel) return;
    isDraggingImg.current = false;
    updateImageTransform(panel.id, {
      x: panel.image_transform.x + imgOffset.x,
      y: panel.image_transform.y + imgOffset.y,
    });
    setImgOffset({ x: 0, y: 0 });
  }, [panel, imgOffset, updateImageTransform]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isResult || !panel) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.2, Math.min(4, panel.image_transform.scale + delta));
    updateImageTransform(panel.id, { scale: newScale });
  }, [isResult, panel, updateImageTransform]);

  if (!panel) return null;

  const isSelected = selectedPanelId === panelId;
  const isThisGenerating = generatingPanelId === panelId;


  const tx = panel.image_transform.x + imgOffset.x;
  const ty = panel.image_transform.y + imgOffset.y;
  const sc = panel.image_transform.scale;

  const statusColor = {
    empty: 'border-slate-300',
    scripted: 'border-purple-400',
    generating: 'border-amber-400 animate-pulse',
    done: 'border-slate-300',
    error: 'border-red-400',
  }[panel.status];

  return (
    <Rnd
      size={{ width: panel.frame.width, height: panel.frame.height }}
      position={{ x: panel.frame.x, y: panel.frame.y }}
      bounds="parent"
      enableResizing={isResult}
      disableDragging={!isResult}
      onDragStop={(_e, d) => updateFrame(panel.id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        updateFrame(panel.id, {
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
          ...pos,
        });
      }}
      style={{
        position: 'absolute',
        zIndex: isSelected ? 10 : 1,
      }}
      className={`
        group border-2 bg-slate-100 overflow-hidden transition-shadow
        ${statusColor}
        ${isSelected ? 'shadow-[0_0_0_3px_rgba(99,102,241,0.6)] border-indigo-500' : ''}
        ${isResult ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPanel(panel.id);
      }}
    >
      {/* ── Image area ──────────────────────────────────────────────────── */}
      <div
        className={`w-full h-full relative overflow-hidden ${isResult && panel.image_url ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleImgMouseDown}
        onMouseMove={handleImgMouseMove}
        onMouseUp={handleImgMouseUp}
        onMouseLeave={handleImgMouseUp}
        onWheel={handleWheel}
      >
        {/* ── Has image ─────────────────────────────────────────────────── */}
        {panel.image_url && !imgFailed && (
          <img
            src={panel.image_url}
            alt={panel.file_name}
            className="absolute inset-0 w-full h-full select-none pointer-events-none"
            style={{
              objectFit: 'cover',
              transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
              transformOrigin: 'center',
            }}
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        )}

        {/* ── Generating overlay ─────────────────────────────────────────── */}
        {isThisGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <Loader2 className="text-white animate-spin mb-1" size={28} />
            <span className="text-white text-xs font-medium">Đang tạo...</span>
          </div>
        )}

        {/* ── Empty placeholder ──────────────────────────────────────────── */}
        {(!panel.image_url || imgFailed) && !isThisGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 select-none">
            {panel.status === 'scripted' ? (
              <>
                <ZoomIn size={20} className="text-purple-400" />
                <span className="text-xs font-medium text-purple-500">Đã có kịch bản</span>
              </>
            ) : (
              <>
                <ImageOff size={20} />
                <span className="text-xs">{panel.pageOrder}</span>
              </>
            )}
          </div>
        )}

        {/* ── Done badge ─────────────────────────────────────────────────── */}
        {panel.status === 'done' && isResult && (
          <div className="absolute top-1.5 left-1.5 pointer-events-none">
            <CheckCircle2 size={14} className="text-emerald-400 drop-shadow" />
          </div>
        )}

        {/* ── Panel order label ──────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 text-center pointer-events-none">
          <span className="inline-block bg-black/50 text-white text-[10px] px-1.5 py-0.5 font-mono">
            {panel.pageOrder}
          </span>
        </div>

        {/* ── Click-to-detail hint (result mode) ───────────────────────── */}
        {isResult && panel.status === 'done' && (
          <div className={`absolute inset-0 flex items-center justify-center bg-indigo-600/0 group-hover:bg-indigo-600/20 transition-colors duration-200 pointer-events-none`}>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold bg-indigo-600/80 px-2 py-1 rounded-lg">
              Bấm để xem kịch bản
            </span>
          </div>
        )}
      </div>

      {/* ── Resize handles hint ─────────────────────────────────────────── */}
      {isResult && isSelected && (
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500 rounded-tl pointer-events-none" />
      )}
    </Rnd>
  );
};