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
    <div className="flex gap-2 items-center">
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

// ─── Main Scenario Step ───────────────────────────────────────────────────────
export const ScenarioStep: React.FC = () => {
  const config = useStoryStore(s => s.config);
  const setConfig = useStoryStore(s => s.setConfig);
  const chars = useStoryStore(s => s.globalCharacters);
  const isGenerating = useStoryStore(s => s.isGenerating);
  const loadError = useStoryStore(s => s.loadError);
  const loadFromRunFolder = useStoryStore(s => s.loadFromRunFolder);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── LOAD FROM RUN FOLDER (primary CTA) ────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl shrink-0">
              <FolderOpen size={24} />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">Load từ Run Folder</h2>
              <p className="text-indigo-200 text-sm mt-1 mb-4">
                Đọc <code className="bg-white/20 px-1.5 py-0.5 rounded text-xs">panels_with_prompts.json</code> để lấy
                layout, kịch bản từng khung, nhân vật và ảnh AI đã có.
              </p>
              <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-100 mb-4 border border-white/20">
                📁 run_20260417_1621_39b2de80/
              </div>
              <button
                onClick={loadFromRunFolder}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl
                  hover:bg-indigo-50 disabled:opacity-60 transition-all shadow-md active:scale-95"
              >
                {isGenerating
                  ? <Loader2 size={18} className="animate-spin" />
                  : <FolderOpen size={18} />}
                {isGenerating ? 'Đang đọc dữ liệu...' : 'Load & Xem Kết Quả Ngay'}
              </button>
            </div>
          </div>

          {loadError && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-xl p-3">
              <AlertCircle size={16} className="text-red-300 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-200 text-sm">Lỗi load dữ liệu</p>
                <p className="text-red-300 text-xs mt-0.5 font-mono">{loadError}</p>
              </div>
            </div>
          )}
        </div>

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
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <Wand2 size={16} className="text-purple-500" />
            Tạo mới (procedural layout, không dùng run folder)
          </p>
          <button
            onClick={() => useStoryStore.getState().setStep('layout')}
            className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 py-3 rounded-xl text-sm font-medium transition-all"
          >
            Tạo layout mới từ đầu →
          </button>
        </div>

      </div>
    </div>
  );
};
