import React from 'react';
import { useStoryStore } from './store/useStoryStore';
import { ScenarioStep } from './components/ScenarioStep';
import { LayoutStep } from './components/LayoutStep';
import { GeneratingStep } from './components/GeneratingStep';
import { ResultStep } from './components/ResultStep';
import { BookOpen, Layout, Zap, ImageIcon, ChevronRight } from 'lucide-react';

// ─── Step Config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'scenario', label: 'Kịch bản', icon: BookOpen, color: 'indigo' },
  { id: 'layout', label: 'Trang & Khung', icon: Layout, color: 'purple' },
  { id: 'generating', label: 'Sinh ảnh AI', icon: Zap, color: 'amber' },
  { id: 'result', label: 'Kết quả', icon: ImageIcon, color: 'emerald' },
] as const;

// ─── Stepper Header ───────────────────────────────────────────────────────────
const StepperHeader: React.FC = () => {
  const step = useStoryStore(s => s.step);
  const config = useStoryStore(s => s.config);
  const currentIdx = STEPS.findIndex(s => s.id === step);

  return (
    <header className="bg-white border-b shadow-sm shrink-0 z-30">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 leading-tight">{config.title}</h1>
            <p className="text-xs text-slate-400">{config.genre} · {config.totalPages}p · {config.panelsPerPage}k/trang</p>
          </div>
        </div>

        {/* Stepper */}
        <nav className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = idx < currentIdx;

            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : isDone
                    ? 'text-slate-500 bg-slate-100'
                    : 'text-slate-400'}`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
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
        {step === 'layout' && <LayoutStep />}
        {step === 'generating' && <GeneratingStep />}
        {step === 'result' && <ResultStep />}
      </main>
    </div>
  );
}

export default App;
