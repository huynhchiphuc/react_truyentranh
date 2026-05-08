import React from 'react';
import { useStoryStore } from './store/useStoryStore';
import { ScenarioStep } from './components/ScenarioStep';
import { ResultStep } from './components/ResultStep';
import { ImageIcon, ChevronRight, FolderOpen, BookOpen } from 'lucide-react';

// ─── Step Config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'scenario', label: 'Chọn Kịch Bản', icon: FolderOpen, color: 'indigo' },
  { id: 'result', label: 'Kết quả', icon: ImageIcon, color: 'emerald' },
] as const;

// ─── Stepper Header ───────────────────────────────────────────────────────────
const StepperHeader: React.FC = () => {
  const step = useStoryStore(s => s.step);
  const setStep = useStoryStore(s => s.setStep);
  const config = useStoryStore(s => s.config);
  const currentIdx = STEPS.findIndex(s => s.id === step);

  const goBack = () => {
    if (step === 'result') {
      setStep('scenario');
    } else if (currentIdx > 0) {
      setStep(STEPS[currentIdx - 1].id);
    }
  };

  return (
    <header className="bg-white border-b shadow-sm shrink-0 z-30">
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 gap-3 sm:gap-0">
        {/* Logo + Back button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          {/* Back button — chỉ hiện khi không phải bước đầu */}
          {currentIdx > 0 && (
            <button
              onClick={goBack}
              title="Quay lại bước trước"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500
                hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200
                hover:border-indigo-300 px-3 py-1.5 rounded-xl transition-all active:scale-95"
            >
              <ChevronRight size={13} className="rotate-180" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shrink-0">
              <BookOpen size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-800 leading-tight truncate">{config.title}</h1>
              <p className="text-xs text-slate-400 truncate">{config.genre} · {config.totalPages}p · {config.panelsPerPage}k/trang</p>
            </div>
          </div>
        </div>

        {/* Stepper — các bước đã done thì click được để quay lại */}
        <nav className="flex flex-wrap justify-center sm:justify-end items-center gap-1 w-full sm:w-auto mt-1 sm:mt-0">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = idx < currentIdx;
            const isClickable = isDone && s.id !== 'generating';

            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => isClickable && setStep(s.id)}
                  disabled={!isClickable && !isActive}
                  title={isDone ? `Quay lại: ${s.label}` : s.label}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 cursor-default'
                      : isDone
                      ? 'text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer border border-transparent hover:border-indigo-200'
                      : 'text-slate-300 cursor-default'}`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={14} className={isDone || isActive ? 'text-slate-400' : 'text-slate-200'} />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const step = useStoryStore(s => s.step);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      <StepperHeader />

      <main className="flex-1 flex overflow-hidden">
        {step === 'scenario' && <ScenarioStep />}
        {step === 'result' && <ResultStep />}
      </main>
    </div>
  );
}

export default App;
