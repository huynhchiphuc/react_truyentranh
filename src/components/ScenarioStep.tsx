import React, { useState } from 'react';
import { useStoryStore } from '../store/useStoryStore';
import type { Character } from '../types';
import {
  BookOpen, Users, Plus, Trash2, ChevronDown, ChevronUp,
  FolderOpen, Wand2, Loader2, AlertCircle, Tag, Film, Pencil
} from 'lucide-react';

const GENRES = ['Cổ tích Việt Nam', 'Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Horror', 'Comedy', 'Drama'];
const ASPECT_OPTIONS = [
  { value: '9:16', label: '9:16 – Dọc (Mobile)' },
  { value: '16:9', label: '16:9 – Ngang (Wide)' },
  { value: '1:1', label: '1:1 – Vuông' },
  { value: '4:3', label: '4:3 – Tiêu chuẩn' },
];
const ROLES = [
  { value: 'protagonist', label: 'Nhân vật chính', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'antagonist', label: 'Phản diện', color: 'bg-red-100 text-red-700' },
  { value: 'supporting', label: 'Hỗ trợ', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'extra', label: 'Phụ', color: 'bg-gray-100 text-gray-600' },
];

// ─── Character Card ───────────────────────────────────────────────────────────
const CharacterCard: React.FC<{ char: Character }> = ({ char }) => {
  const [expanded, setExpanded] = useState(false);
  const update = useStoryStore(s => s.updateGlobalCharacter);
  const remove = useStoryStore(s => s.removeGlobalCharacter);
  const role = ROLES.find(r => r.value === char.role) || ROLES[3];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="flex items-center gap-3 p-4">
        <img src={char.avatar} alt={char.name}
          className="w-12 h-12 rounded-full ring-2 ring-white shadow-md object-cover bg-slate-200" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 truncate">{char.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>{role.label}</span>
          </div>
          {char.description && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{char.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => remove(char.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tên nhân vật</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={char.name}
                onChange={e => update(char.id, { name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Vai trò</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={char.role}
                onChange={e => update(char.id, { role: e.target.value as Character['role'] })}
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Mô tả</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              rows={2}
              value={char.description || ''}
              onChange={e => update(char.id, { description: e.target.value })}
              placeholder="Mô tả ngoại hình, tính cách..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Add Character Form ───────────────────────────────────────────────────────
const AddCharacterForm: React.FC = () => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Character['role']>('supporting');
  const add = useStoryStore(s => s.addGlobalCharacter);

  const handleAdd = () => {
    if (!name.trim()) return;
    add({ name: name.trim(), role, description: '', avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true` });
    setName('');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <input
        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Tên nhân vật mới..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      <select
        className="border border-slate-200 rounded-xl px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={role}
        onChange={e => setRole(e.target.value as Character['role'])}
      >
        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <button
        onClick={handleAdd}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl flex items-center gap-1 text-sm font-medium transition-colors shadow-sm"
      >
        <Plus size={16} /> Thêm
      </button>
    </div>
  );
};

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
    fetch('/run_index.json')
      .then(r => r.json())
      .then(data => { setRuns(data.runs || []); setLoadingIndex(false); })
      .catch(e => { setIndexError(e.message); setLoadingIndex(false); });
  }, []);

  const selectedId = runFolder.replace(/^\//, ''); // strip leading /

  const handleSelect = (id: string) => setRunFolder(`/${id}`);

  const handleManualApply = () => {
    const v = manualInput.trim().replace(/^\//, '');
    if (v) { setRunFolder(`/${v}`); setShowManual(false); }
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
        <div className="flex items-center gap-2 text-indigo-200 text-sm py-2">
          <Loader2 size={15} className="animate-spin" /> Đang đọc danh sách runs...
        </div>
      )}
      {indexError && (
        <div className="text-amber-200 text-xs mb-3 bg-white/10 rounded-lg px-3 py-2">
          ⚠️ Không đọc được run_index.json: {indexError}
        </div>
      )}

      {runs.length > 0 && (
        <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
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
        disabled={isGenerating}
        className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl
          hover:bg-indigo-50 disabled:opacity-60 transition-all shadow-md active:scale-95 w-full justify-center"
      >
        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
        {isGenerating ? 'Đang đọc dữ liệu...' : `Load "${selectedId}" & Xem Kết Quả`}
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
  const config = useStoryStore(s => s.config);
  const setConfig = useStoryStore(s => s.setConfig);
  const chars = useStoryStore(s => s.globalCharacters);


  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── LOAD FROM RUN FOLDER (primary CTA) ────────────────────────── */}
        <RunFolderPicker />

        {/* Divider */}
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="flex-1 h-px bg-slate-200" />
          <span>hoặc cấu hình thủ công</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Story Config Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <BookOpen size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Cài đặt truyện</h2>
              <p className="text-xs text-slate-500">Thông tin tổng quan của câu chuyện</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Film size={14} className="text-indigo-500" /> Tên truyện
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 font-medium"
                value={config.title}
                onChange={e => setConfig({ title: e.target.value })}
                placeholder="Nhập tên truyện..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Pencil size={14} className="text-indigo-500" /> Tóm tắt nội dung
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 resize-none"
                rows={3}
                value={config.description}
                onChange={e => setConfig({ description: e.target.value })}
                placeholder="Mô tả ngắn về câu chuyện..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Tag size={14} className="text-indigo-500" /> Thể loại
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                value={config.genre}
                onChange={e => setConfig({ genre: e.target.value })}
              >
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Tỉ lệ trang</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                value={config.aspectRatio}
                onChange={e => setConfig({ aspectRatio: e.target.value as any })}
              >
                {ASPECT_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Số trang</label>
              <input type="number" min={1} max={20}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                value={config.totalPages}
                onChange={e => setConfig({ totalPages: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">Khung / trang</label>
              <input type="number" min={1} max={12}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
                value={config.panelsPerPage}
                onChange={e => setConfig({ panelsPerPage: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
          </div>
        </div>

        {/* Characters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Users size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-800">Nhân vật</h2>
              <p className="text-xs text-slate-500">
                {chars.length > 0
                  ? 'Đã load từ chars_output/ – ảnh nhân vật thực tế'
                  : 'Sẽ được load tự động từ run folder'}
              </p>
            </div>
            <span className="text-sm font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
              {chars.length} nhân vật
            </span>
          </div>
          <div className="p-6 space-y-3">
            {chars.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nhân vật sẽ xuất hiện sau khi load từ run folder</p>
              </div>
            )}
            {chars.map(char => <CharacterCard key={char.id} char={char} />)}
            <AddCharacterForm />
          </div>
        </div>

        {/* Manual workflow CTA */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-violet-50">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Wand2 size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Tạo mới từ đầu (không dùng run folder)</p>
              <p className="text-xs text-slate-500">Sinh layout grid tự động từ cấu hình bên trên</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-2xl font-black text-indigo-600">{config.totalPages}</p>
                <p className="text-slate-500 mt-0.5">Trang</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-2xl font-black text-purple-600">{config.panelsPerPage}</p>
                <p className="text-slate-500 mt-0.5">Khung/trang</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-2xl font-black text-violet-600">{config.aspectRatio}</p>
                <p className="text-slate-500 mt-0.5">Tỉ lệ</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              💡 Sẽ tạo <strong>{config.totalPages * config.panelsPerPage} panels</strong> trống dạng grid đều nhau.
              Sau đó bạn có thể chỉnh kích thước từng panel trong LayoutStep, thêm kịch bản và sinh ảnh AI.
            </p>
            <button
              onClick={() => useStoryStore.getState().generateProceduralLayout()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600
                hover:from-purple-700 hover:to-violet-700 text-white font-bold py-3 rounded-xl
                text-sm transition-all shadow-md shadow-purple-200 active:scale-95"
            >
              <Wand2 size={16} />
              Tạo {config.totalPages} trang · {config.panelsPerPage} khung/trang →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
