import React, { useState } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import { FolderOpen, Loader2, AlertCircle } from 'lucide-react';


// ─── Run Folder types ─────────────────────────────────────────────────────────
interface RunEntry {
  id: string;
  created_at: string;
  title: string;
  description: string;
  total_pages: number;
  panels_per_page: number;
  has_ai_output: boolean;
  data_file: string;
}

// ─── Run Folder Picker ────────────────────────────────────────────────────────
const RunFolderPicker: React.FC = () => {
  const runFolder = useStoryStore(s => s.runFolder);
  const setRunFolder = useStoryStore(s => s.setRunFolder);
  const isGenerating = useStoryStore(s => s.isGenerating);
  const loadError = useStoryStore(s => s.loadError);
  const loadFromRunFolder = useStoryStore(s => s.loadFromRunFolder);

  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Load run_index.json khi mount
  React.useEffect(() => {
    fetch('run_index.json')
      .then(r => r.json())
      .then(data => { setRuns(data.runs || []); setLoadingIndex(false); })
      .catch(e => { setIndexError(e.message); setLoadingIndex(false); });
  }, []);

  const selectedId = runFolder;

  const handleSelect = (id: string) => setRunFolder(id);

  const handleManualApply = () => {
    const v = manualInput.trim().replace(/^\//, '');
    if (v) { setRunFolder(v); setShowManual(false); }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-white/20 rounded-xl shrink-0"><FolderOpen size={22} /></div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Load từ Run Folder</h2>
          <p className="text-indigo-200 text-xs mt-0.5">
            Chọn output folder muốn xem — mỗi lần chạy pipeline tạo ra 1 folder
          </p>
        </div>
      </div>

      {/* Danh sách runs */}
      {loadingIndex && (
        <div className="flex items-center gap-2 text-indigo-200 text-sm py-4 justify-center">
          <Loader2 size={20} className="animate-spin" /> Đang đọc danh sách runs...
        </div>
      )}
      
      {indexError && (
        <div className="text-amber-200 text-xs mb-3 bg-white/10 rounded-lg px-3 py-2 border border-amber-500/30">
          ⚠️ Không đọc được run_index.json: {indexError}
        </div>
      )}

      {!loadingIndex && runs.length === 0 && (
        <div className="text-indigo-200 text-sm py-8 text-center bg-white/5 rounded-xl border-2 border-dashed border-white/10 mb-4">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
          Chưa có folder kết quả nào.
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {[...runs].reverse().map(run => {
            const isSelected = run.id === selectedId;
            return (
              <button
                key={run.id}
                onClick={() => handleSelect(run.id)}
                className={`w-full text-left rounded-xl px-4 py-3 transition-all border
                  ${isSelected
                    ? 'bg-white text-indigo-700 border-white shadow-md'
                    : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen size={14} className={isSelected ? 'text-indigo-500 shrink-0' : 'text-indigo-200 shrink-0'} />
                    <span className="font-semibold text-sm truncate">{run.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {run.has_ai_output && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/30 text-emerald-200'}`}>
                        ✓ Có ảnh AI
                      </span>
                    )}
                    {isSelected && <span className="text-indigo-500 text-xs font-bold">● Đang chọn</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <code className={`text-xs font-mono truncate ${isSelected ? 'text-indigo-400' : 'text-indigo-200'}`}>
                    📁 {run.id}/
                  </code>
                  {run.total_pages > 0 && (
                    <span className={`text-xs ${isSelected ? 'text-slate-500' : 'text-indigo-300'}`}>
                      {run.total_pages} trang · {run.panels_per_page} khung/trang
                    </span>
                  )}
                  <span className={`text-xs ml-auto ${isSelected ? 'text-slate-400' : 'text-indigo-300'}`}>
                    {run.created_at.slice(0, 10)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Nhập thủ công */}
      {showManual ? (
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-white/20 border border-white/30 rounded-xl px-3 py-2 text-sm
              text-white placeholder:text-indigo-300 focus:outline-none focus:bg-white/30"
            placeholder="run_YYYYMMDD_HHMM_xxxxxxxx"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualApply()}
          />
          <button onClick={handleManualApply}
            className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-all">
            OK
          </button>
          <button onClick={() => setShowManual(false)}
            className="text-indigo-300 hover:text-white px-2 transition-colors text-xs">
            Hủy
          </button>
        </div>
      ) : (
        <button onClick={() => setShowManual(true)}
          className="text-indigo-200 hover:text-white text-xs mb-4 underline underline-offset-2 transition-colors">
          + Nhập tên folder thủ công
        </button>
      )}

      {/* Load button */}
      <button
        onClick={loadFromRunFolder}
        disabled={isGenerating || !runFolder}
        className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl
          hover:bg-indigo-50 disabled:opacity-60 transition-all shadow-md active:scale-95 w-full justify-center"
      >
        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
        {isGenerating ? 'Đang đọc dữ liệu...' : runFolder ? `Load "${selectedId}" & Xem Kết Quả` : 'Vui lòng chọn folder'}
      </button>

      {loadError && (
        <div className="mt-3 flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-200 text-sm">Lỗi load dữ liệu</p>
            <p className="text-red-300 text-xs mt-0.5 font-mono">{loadError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Scenario Step ───────────────────────────────────────────────────────
export const ScenarioStep: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6 flex items-center justify-center">
      <div className="max-w-xl w-full">
        <RunFolderPicker />
      </div>
    </div>
  );
};
