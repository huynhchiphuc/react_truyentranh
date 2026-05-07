import React, { useState, useCallback } from 'react';
import {
  BookOpen, Wand2, Loader2, Database, Sparkles,
  CheckCircle2, AlertCircle, ChevronRight, Users,
  RefreshCw, Film, Pencil, ArrowRight,
} from 'lucide-react';
import {
  loadCharacterDb, mockExtractCharacters, searchCharacter,
  type CharacterDbEntry, type MatchType,
} from '../services/characterDb';
import { useStoryStore } from '../store/useStoryStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolvedCharacter {
  inputName: string;            // Tên user nhập / AI extract được
  matchType: MatchType;         // exact | alias | fuzzy | none
  dbEntry: CharacterDbEntry | null; // null = cần sinh mới
  status: 'found' | 'generating' | 'generated' | 'error';
  generatedImageUrl?: string;   // placeholder khi sinh mới
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const SourceBadge: React.FC<{ matchType: MatchType }> = ({ matchType }) => {
  if (matchType === 'none') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
        bg-amber-100 text-amber-700 font-semibold border border-amber-200">
        <Sparkles size={10} />
        Sinh mới (AI)
      </span>
    );
  }
  const label = matchType === 'exact' ? 'Khớp chính xác' : matchType === 'alias' ? 'Tên khác' : 'Gần giống';
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
      bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">
      <Database size={10} />
      Từ CSDL · {label}
    </span>
  );
};

// ─── Character Result Card ────────────────────────────────────────────────────
const CharacterResultCard: React.FC<{ resolved: ResolvedCharacter; index: number }> = ({ resolved, index }) => {
  const isFromDb = resolved.matchType !== 'none';
  const avatarUrl = isFromDb && resolved.dbEntry?.image_path
    ? `/${resolved.dbEntry.image_path}`
    : resolved.generatedImageUrl || null;

  const displayName = resolved.dbEntry?.name || resolved.inputName;
  const description = resolved.dbEntry?.description || 'Nhân vật sẽ được AI sinh ảnh';

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-500 shadow-sm hover:shadow-md
        ${isFromDb
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
          : 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
        }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent bar */}
      <div className={`h-1 ${isFromDb ? 'bg-emerald-400' : 'bg-amber-400'}`} />

      <div className="p-4">
        {/* Avatar */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border-2
            ${isFromDb ? 'border-emerald-200' : 'border-amber-200'}`}>
            {resolved.status === 'generating' ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            ) : avatarUrl ? (
              <img src={avatarUrl} alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<div class="w-full h-full flex items-center justify-center bg-slate-100 text-2xl">${displayName[0]}</div>`;
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-xl font-bold
                ${isFromDb ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {displayName[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{displayName}</p>
            {resolved.inputName !== displayName && (
              <p className="text-xs text-slate-400 truncate">Nhập: "{resolved.inputName}"</p>
            )}
            <div className="mt-1">
              <SourceBadge matchType={resolved.matchType} />
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{description}</p>

        {/* Role badge + story */}
        {resolved.dbEntry && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {resolved.dbEntry.role === 'protagonist' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Nhân vật chính</span>
            )}
            {resolved.dbEntry.role === 'antagonist' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Phản diện</span>
            )}
            {resolved.dbEntry.role === 'supporting' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">Hỗ trợ</span>
            )}
            <span className="text-xs text-slate-400">· {resolved.dbEntry.story}</span>
          </div>
        )}

        {/* Status indicator */}
        {resolved.status === 'generated' && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <CheckCircle2 size={11} />
            <span>Đã sinh ảnh (mock)</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Analysis Progress ─────────────────────────────────────────────────────────
const ProgressStep: React.FC<{ label: string; done: boolean; active: boolean }> = ({ label, done, active }) => (
  <div className={`flex items-center gap-2 text-sm transition-all
    ${done ? 'text-emerald-600' : active ? 'text-indigo-600' : 'text-slate-400'}`}>
    {done
      ? <CheckCircle2 size={15} className="shrink-0" />
      : active
      ? <Loader2 size={15} className="animate-spin shrink-0" />
      : <div className="w-[15px] h-[15px] rounded-full border-2 border-slate-300 shrink-0" />
    }
    <span className={`${active ? 'font-semibold' : ''}`}>{label}</span>
  </div>
);

// ─── Summary Stats ────────────────────────────────────────────────────────────
const SummaryStats: React.FC<{ resolved: ResolvedCharacter[] }> = ({ resolved }) => {
  const fromDb = resolved.filter(r => r.matchType !== 'none').length;
  const generated = resolved.filter(r => r.matchType === 'none').length;
  const saved = fromDb * 0.04;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-black text-emerald-600">{fromDb}</p>
        <p className="text-xs text-emerald-700 font-medium mt-0.5">Từ CSDL</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-black text-amber-600">{generated}</p>
        <p className="text-xs text-amber-700 font-medium mt-0.5">Sinh mới AI</p>
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-black text-indigo-600">${saved.toFixed(2)}</p>
        <p className="text-xs text-indigo-700 font-medium mt-0.5">Tiết kiệm</p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const CharacterSetupStep: React.FC = () => {
  const config = useStoryStore(s => s.config);
  const setConfig = useStoryStore(s => s.setConfig);
  const setStep = useStoryStore(s => s.setStep);
  const addGlobalCharacter = useStoryStore(s => s.addGlobalCharacter);

  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');
  const [analysisStep, setAnalysisStep] = useState(0);
  // 0=idle, 1=extracting chars, 2=searching db, 3=generating missing, 4=done
  const [resolvedChars, setResolvedChars] = useState<ResolvedCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeStory = useCallback(async () => {
    if (!config.title.trim() || !config.description.trim()) {
      setError('Vui lòng nhập tên truyện và mô tả!');
      return;
    }
    setError(null);
    setPhase('analyzing');
    setAnalysisStep(1);

    try {
      // Step 1: Extract character names (mock LLM)
      await new Promise(r => setTimeout(r, 900));
      const names = mockExtractCharacters(config.title, config.description);
      setAnalysisStep(2);

      // Step 2: Search DB for each name
      await new Promise(r => setTimeout(r, 700));
      const db = await loadCharacterDb();
      const results: ResolvedCharacter[] = names.map(name => {
        const { entry, matchType } = searchCharacter(name, db);
        return {
          inputName: name,
          matchType: entry?.image_path ? matchType : 'none',
          dbEntry: entry?.image_path ? entry : null,
          status: (entry?.image_path ? 'found' : 'generating') as ResolvedCharacter['status'],
        };
      });
      setResolvedChars(results);
      setAnalysisStep(3);

      // Step 3: Simulate generating missing characters one by one
      for (let i = 0; i < results.length; i++) {
        if (results[i].matchType === 'none') {
          await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
          setResolvedChars(prev => prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'generated',
                  generatedImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.inputName)}&background=${['6366f1','8b5cf6','ec4899','f59e0b'][idx % 4]}&color=fff&bold=true&size=128`,
                }
              : r
          ));
        }
      }

      setAnalysisStep(4);
      setPhase('done');
    } catch (err: any) {
      setError(err?.message || 'Lỗi không xác định');
      setPhase('input');
    }
  }, [config.title, config.description]);

  const handleConfirm = () => {
    // Push resolved characters vào store
    resolvedChars.forEach(r => {
      const name = r.dbEntry?.name || r.inputName;
      const avatar = r.dbEntry?.image_path
        ? `/${r.dbEntry.image_path}`
        : r.generatedImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`;
      addGlobalCharacter({
        name,
        avatar,
        description: r.dbEntry?.description || '',
        role: (r.dbEntry?.role || 'supporting') as any,
      });
    });
    setStep('scenario');
  };

  const handleReset = () => {
    setPhase('input');
    setAnalysisStep(0);
    setResolvedChars([]);
    setError(null);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl shrink-0">
              <Database size={24} />
            </div>
            <div>
              <h2 className="font-extrabold text-xl">Nhân vật thông minh</h2>
              <p className="text-indigo-200 text-sm mt-1 max-w-xl leading-relaxed">
                Nhập tên truyện và mô tả — hệ thống tự <strong className="text-white">phân tích nhân vật</strong>,
                tìm trong <strong className="text-white">CSDL</strong> để dùng lại ảnh có sẵn,
                chỉ sinh ảnh mới cho nhân vật chưa có. Tiết kiệm token tối đa!
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-5 flex items-center gap-2 text-sm flex-wrap">
            {[
              { icon: '✍️', text: 'Nhập mô tả' },
              { icon: '🤖', text: 'AI phân tích' },
              { icon: '🔍', text: 'Tìm CSDL' },
              { icon: '🎨', text: 'Sinh ảnh mới (nếu thiếu)' },
            ].map((item, i, arr) => (
              <React.Fragment key={i}>
                <span className="bg-white/15 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span>{item.icon}</span>
                  <span className="text-white/90">{item.text}</span>
                </span>
                {i < arr.length - 1 && <ArrowRight size={14} className="text-indigo-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Input Form ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <BookOpen size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Thông tin câu chuyện</h3>
              <p className="text-xs text-slate-500">AI sẽ tự trích xuất nhân vật từ mô tả của bạn</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Film size={14} className="text-indigo-500" /> Tên truyện
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none
                  focus:ring-2 focus:ring-indigo-400 bg-slate-50 font-medium disabled:opacity-60"
                value={config.title}
                onChange={e => setConfig({ title: e.target.value })}
                placeholder="VD: Thánh Gióng, Sơn Tinh Thủy Tinh, Tấm Cám..."
                disabled={phase === 'analyzing'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Pencil size={14} className="text-indigo-500" /> Mô tả câu chuyện
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none
                  focus:ring-2 focus:ring-indigo-400 bg-slate-50 resize-none disabled:opacity-60"
                rows={4}
                value={config.description}
                onChange={e => setConfig({ description: e.target.value })}
                placeholder="Mô tả cốt truyện, nhân vật chính, bối cảnh... AI sẽ tự phân tích!"
                disabled={phase === 'analyzing'}
              />
              <p className="mt-1 text-xs text-slate-400">
                💡 Gợi ý: "Câu chuyện về <strong>Gióng</strong> và <strong>Mẹ Gióng</strong>, được <strong>Hùng Vương</strong> phái <strong>sứ giả</strong> đến..."
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={analyzeStory}
                disabled={phase === 'analyzing'}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600
                  hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl
                  disabled:opacity-60 transition-all shadow-md shadow-indigo-200 active:scale-95"
              >
                {phase === 'analyzing'
                  ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</>
                  : <><Wand2 size={18} /> Phân tích nhân vật</>}
              </button>
              {phase === 'done' && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 border-2 border-slate-200 hover:border-slate-300
                    text-slate-600 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  <RefreshCw size={16} /> Làm lại
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Analysis Progress ─────────────────────────────────────────── */}
        {(phase === 'analyzing' || phase === 'done') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Loader2 size={16} className={phase === 'analyzing' ? 'animate-spin text-indigo-500' : 'text-emerald-500'} />
              Tiến trình phân tích
            </h3>
            <div className="space-y-3">
              <ProgressStep label="🤖 Trích xuất nhân vật từ mô tả (AI mock)" done={analysisStep > 1} active={analysisStep === 1} />
              <ProgressStep label="🔍 Tìm kiếm trong CSDL nhân vật" done={analysisStep > 2} active={analysisStep === 2} />
              <ProgressStep label="🎨 Sinh ảnh cho nhân vật chưa có trong CSDL" done={analysisStep > 3} active={analysisStep === 3} />
              <ProgressStep label="✅ Hoàn tất — sẵn sàng tiếp tục" done={analysisStep === 4} active={false} />
            </div>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {resolvedChars.length > 0 && (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users size={18} className="text-indigo-500" />
                Kết quả — {resolvedChars.length} nhân vật
              </h3>
              <SummaryStats resolved={resolvedChars} />
            </div>

            {/* Character cards grid */}
            <div>
              <h3 className="font-semibold text-slate-600 text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" />
                Danh sách nhân vật đã xử lý
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resolvedChars.map((r, i) => (
                  <CharacterResultCard key={r.inputName} resolved={r} index={i} />
                ))}
              </div>
            </div>

            {/* Confirm CTA */}
            {phase === 'done' && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-lg">Xác nhận nhân vật</p>
                    <p className="text-emerald-100 text-sm mt-0.5">
                      {resolvedChars.filter(r => r.matchType !== 'none').length} ảnh từ CSDL ·{' '}
                      {resolvedChars.filter(r => r.matchType === 'none').length} ảnh sinh mới →
                      thêm vào dự án và tiếp tục
                    </p>
                  </div>
                  <button
                    onClick={handleConfirm}
                    className="flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3
                      rounded-xl hover:bg-emerald-50 transition-all shadow-md active:scale-95 shrink-0"
                  >
                    Tiếp tục <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Skip Option ───────────────────────────────────────────────── */}
        <div className="text-center">
          <button
            onClick={() => setStep('scenario')}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
          >
            Bỏ qua bước này, cấu hình thủ công →
          </button>
        </div>

      </div>
    </div>
  );
};
