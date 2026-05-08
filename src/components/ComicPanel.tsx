import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { useStoryStore } from '../store/useStoryStore';
import { Loader2, CheckCircle2, ImageOff, ZoomIn } from 'lucide-react';

interface ComicPanelProps {
  panelId: string;
  pageCanvasWidth: number;
  isResult?: boolean;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panelId, isResult = false }) => {
  const panel = useStoryStore(useCallback(s => {
    for (const pg of s.pages) {
      const found = pg.panels.find(p => p.id === panelId);
      if (found) return found;
    }
    return undefined;
  }, [panelId]));

  const selectedPanelId = useStoryStore(s => s.selectedPanelId);
  const generatingPanelId = useStoryStore(s => s.generatingPanelId);
  const isLayoutMode = useStoryStore(s => s.isLayoutMode);

  const updateFrame = useStoryStore(s => s.updatePanelFrame);
  const setSelectedPanel = useStoryStore(s => s.setSelectedPanel);
  const updateImageTransform = useStoryStore(s => s.updateImageTransform);
  const setShowPanelDetail = useStoryStore(s => s.setShowPanelDetail);

  const detections = useStoryStore(s => s.panelDetections[panelId]);
  const safeDetections = detections || [];

  // Image drag state
  const isDraggingImg = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgFailed, setImgFailed] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number, h: number } | null>(null);

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
  const updatePolygon = useStoryStore(s => s.updatePanelPolygon);



  const tx = panel.image_transform.x + imgOffset.x;
  const ty = panel.image_transform.y + imgOffset.y;
  const sc = panel.image_transform.scale;

  const statusColor = {
    empty: '#cbd5e1', // slate-300
    scripted: '#c084fc', // purple-400
    generating: '#fbbf24', // amber-400
    done: '#cbd5e1',
    error: '#f87171', // red-400
  }[panel.status];

  const poly = panel.polygon;
  let px = panel.frame.x;
  let py = panel.frame.y;
  let pw = panel.frame.width;
  let ph = panel.frame.height;
  let clipPathStr = '';

  if (poly && poly.length > 0) {
    px = Math.min(...poly.map(p => p.x));
    py = Math.min(...poly.map(p => p.y));
    pw = Math.max(...poly.map(p => p.x)) - px;
    ph = Math.max(...poly.map(p => p.y)) - py;
    clipPathStr = `polygon(${poly.map(p => `${p.x - px}px ${p.y - py}px`).join(', ')})`;
  }

  const effectivePoly = poly && poly.length > 0 ? poly : [
    { x: panel.frame.x, y: panel.frame.y },
    { x: panel.frame.x + panel.frame.width, y: panel.frame.y },
    { x: panel.frame.x + panel.frame.width, y: panel.frame.y + panel.frame.height },
    { x: panel.frame.x, y: panel.frame.y + panel.frame.height }
  ];

  return (
    <Rnd
      size={{ width: pw, height: ph }}
      position={{ x: px, y: py }}
      bounds="parent"
      enableResizing={!isLayoutMode && isResult && !poly}
      disableDragging={isLayoutMode || !isResult || !!poly}
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
        zIndex: isSelected ? 20 : 1,
      }}
      className={`
        group transition-shadow
        ${isSelected ? 'shadow-[0_0_20px_rgba(99,102,241,0.3)]' : ''}
        ${isResult ? 'cursor-default' : 'cursor-pointer'}
      `}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPanel(panel.id);
        setShowPanelDetail(false);
      }}
    >
      <div
        className="w-full h-full relative"
        onMouseDown={handleImgMouseDown}
        onMouseMove={handleImgMouseMove}
        onMouseUp={handleImgMouseUp}
        onMouseLeave={handleImgMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width={pw}
          height={ph}
          viewBox={`0 0 ${pw} ${ph}`}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <clipPath id={`clip-${panel.id}`}>
              <polygon points={effectivePoly.map(p => `${p.x - px},${p.y - py}`).join(' ')} />
            </clipPath>
          </defs>

          {/* The Image */}
          {panel.image_url && !imgFailed && (
            <g clipPath={`url(#clip-${panel.id})`}>
              <image
                href={panel.image_url}
                width={pw}
                height={ph}
                preserveAspectRatio="xMidYMid slice"
                onLoad={(e: any) => {
                  const img = new Image();
                  img.src = panel.image_url;
                  img.onload = () => setImgSize({ w: img.width, h: img.height });
                }}
                style={{
                  transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
                  transformOrigin: `${pw / 2}px ${ph / 2}px`,
                }}
              />
            </g>
          )}

          {/* The Border */}
          <polygon
            points={effectivePoly.map(p => `${p.x - px},${p.y - py}`).join(' ')}
            fill="none"
            stroke={isSelected ? '#6366f1' : statusColor}
            strokeWidth={isSelected ? 4 : 2}
            style={{ zIndex: 30 }}
          />
        </svg>

        {/* ── Detection Boxes (Global Portal Layer) ────────────────────────────── */}
        {panel.image_url && imgSize && safeDetections.length > 0 && createPortal(
          <div
            className="absolute pointer-events-none"
            style={{
              left: px, top: py, // Absolute position on canvas
              width: pw, height: ph,
              zIndex: 9999,
              transform: `translate(${tx}px, ${ty}px) scale(${sc})`,
              transformOrigin: `${pw / 2}px ${ph / 2}px`,
            }}
          >
            {safeDetections.map((det, i) => {
              const k = Math.max(pw / imgSize.w, ph / imgSize.h);
              const ox = (pw - imgSize.w * k) / 2;
              const oy = (ph - imgSize.h * k) / 2;

              const [x1, y1, x2, y2] = det.box;
              const bx = x1 * k + ox;
              const by = y1 * k + oy;
              const bw = (x2 - x1) * k;
              const bh = (y2 - y1) * k;

              return (
                <div key={i} className="absolute inset-0">
                  {/* The Cropped Bubble (Interactive Drag) */}
                  <div 
                    className="cursor-move pointer-events-auto group/bubble"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const startX = e.clientX;
                      const startY = e.clientY;
                      
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const dx = (moveEvent.clientX - startX) / (k * sc);
                        const dy = (moveEvent.clientY - startY) / (k * sc);
                        
                        useStoryStore.getState().updateDetectionBox(panel.id, i, [
                          x1 + dx, y1 + dy, x2 + dx, y2 + dy
                        ]);
                      };
                      
                      const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                      };
                      
                      window.addEventListener('mousemove', onMouseMove);
                      window.addEventListener('mouseup', onMouseUp);
                    }}
                    style={{
                      position: 'absolute',
                      left: bx, top: by, width: bw, height: bh,
                      backgroundImage: `url(${panel.image_url})`,
                      backgroundSize: `${imgSize.w * k}px ${imgSize.h * k}px`,
                      backgroundPosition: `-${bx - ox}px -${by - oy}px`,
                      borderRadius: 4/sc,
                      // Subtle hover state
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <div className="absolute inset-0 border-2 border-transparent group-hover/bubble:border-indigo-500/50 rounded-[inherit] transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>,
          document.getElementById('global-detection-portal') || document.body
        )}

        {/* ── Overlays (HTML) ────────────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
          {/* Visual Border (Overlay to prevent shifting) */}
          {!poly && (
            <div 
              className={`absolute inset-0 border-2 pointer-events-none ${isSelected ? 'border-indigo-500' : ''}`}
              style={{ borderColor: isSelected ? undefined : statusColor }}
            />
          )}

          {/* Generating overlay */}
          {isThisGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-auto">
              <Loader2 className="text-white animate-spin mb-1" size={28} />
              <span className="text-white text-xs font-medium">Đang tạo...</span>
            </div>
          )}

          {/* Empty placeholder */}
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

          {/* Done badge */}
          {panel.status === 'done' && isResult && (
            <div className="absolute top-1.5 left-1.5">
              <CheckCircle2 size={14} className="text-emerald-400 drop-shadow" />
            </div>
          )}

          {/* Panel order label */}
          {!isLayoutMode && (
            <div className="absolute bottom-0 left-0 right-0 text-center">
              <span className="inline-block bg-black/50 text-white text-[10px] px-1.5 py-0.5 font-mono">
                {panel.pageOrder}
              </span>
            </div>
          )}

          {/* Click-to-detail BUTTON */}
          {!isLayoutMode && isResult && panel.status === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600/10 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPanel(panel.id);
                  setShowPanelDetail(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-xl transform scale-90 group-hover:scale-100 transition-all flex items-center gap-2"
              >
                <ZoomIn size={14} />
                Bấm để xem kịch bản
              </button>
            </div>
          )}
        </div>

        {/* Resize handles hint */}
        {!isLayoutMode && isResult && isSelected && !poly && (
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500 rounded-tl pointer-events-none" />
        )}
      </div>
    </Rnd>
  );
};