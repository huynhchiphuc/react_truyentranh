import React, { useEffect } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { Loader2, Zap } from 'lucide-react';

export const GeneratingStep: React.FC = () => {
  const pages = useStoryStore(s => s.pages);
  const isGenerating = useStoryStore(s => s.isGenerating);
  const generatingPanelId = useStoryStore(s => s.generatingPanelId);
  const generateAllImages = useStoryStore(s => s.generateAllImages);
  const step = useStoryStore(s => s.step);

  // Auto-start generation when entering this step
  useEffect(() => {
    if (step === 'generating' && !isGenerating) {
      generateAllImages();
    }
  }, [step]);

  const allPanels = pages.flatMap(pg => pg.panels);
  const done = allPanels.filter(p => p.status === 'done').length;
  const total = allPanels.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center p-8">
      {/* Glow orb */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-indigo-600/30 flex items-center justify-center">
            <Zap size={36} className="text-indigo-300" />
          </div>
        </div>
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-2 border-indigo-400/50 border-t-indigo-400 animate-spin" />
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        {isGenerating ? 'AI đang tạo ảnh...' : 'Hoàn thành!'}
      </h2>
      <p className="text-indigo-300 mb-8 text-sm">
        {isGenerating
          ? `Đang xử lý khung: ${generatingPanelId || '...'}`
          : `Đã tạo xong ${done}/${total} ảnh`}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-indigo-300 mb-2">
          <span>{done} / {total} khung</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Panel grid progress */}
      <div className="mt-8 w-full max-w-lg">
        <div className="grid grid-cols-6 gap-2">
          {allPanels.map(p => (
            <div
              key={p.id}
              className={`h-10 rounded-lg border-2 flex items-center justify-center transition-all
                ${p.status === 'done' ? 'bg-emerald-500/20 border-emerald-500/60' :
                  p.id === generatingPanelId ? 'bg-indigo-500/30 border-indigo-400 animate-pulse' :
                  'bg-slate-700/50 border-slate-600'}`}
              title={p.file_name}
            >
              {p.status === 'done' ? (
                <span className="text-emerald-400 text-xs">✓</span>
              ) : p.id === generatingPanelId ? (
                <Loader2 size={12} className="text-indigo-300 animate-spin" />
              ) : (
                <span className="text-slate-500 text-xs">{p.pageOrder}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
