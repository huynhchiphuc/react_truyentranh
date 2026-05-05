import { create } from 'zustand';
import type { PanelData, PageData, StoryConfig, WorkflowStep, Character, PanelScript } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const RUN_FOLDER = '/run_20260417_1621_39b2de80';
const PAGE_W = 750; // canvas render width in px

// ─── Helpers ─────────────────────────────────────────────────────────────────

function coordToPixel(val: number, coord_w: number): number {
  return (val / coord_w) * PAGE_W;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Extract the filename from an absolute Windows path like:
 *   D:\git\python\...\chars_output\giong.png
 * and convert to web URL:
 *   /run_20260417_1621_39b2de80/chars_output/giong.png
 */
function refImageToUrl(absPath: string): string {
  // Split on \ or / and take the last segment
  const parts = absPath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  return `${RUN_FOLDER}/chars_output/${filename}`;
}

/**
 * Convert filename like "giong.png" or "me-giong.png" to a display name:
 *   giong → Gióng, me-giong → Mẹ Gióng, hung-vuong → Hùng Vương
 */
function fileToCharName(filename: string): string {
  // Remove extension
  const base = filename.replace(/\.[^.]+$/, '');
  // Map known keys
  const nameMap: Record<string, string> = {
    'giong': 'Gióng',
    'me-giong': 'Mẹ Gióng',
    'hung-vuong': 'Hùng Vương',
    'an-vuong': 'Ân Vương',
    'su-gia': 'Sứ giả',
    'ao-giap-sat': 'Áo giáp sắt',
    'bui-tre': 'Bụi tre',
    'guom-sat': 'Gươm sắt',
    'ngua-sat': 'Ngựa sắt',
    'non-sat': 'Nón sắt',
  };
  return nameMap[base] || base.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Build Character[] from ref_images (abs paths).
 * Each ref_image becomes a character with:
 *   - id based on filename
 *   - name from fileToCharName
 *   - avatar as web URL
 */
function refImagesToChars(refImages: string[]): Character[] {
  return refImages.map(absPath => {
    const url = refImageToUrl(absPath);
    const parts = absPath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1]; // e.g. "giong.png"
    const base = filename.replace(/\.[^.]+$/, ''); // "giong"
    return {
      id: base,
      name: fileToCharName(filename),
      avatar: url,
      description: '',
      role: base === 'giong' ? 'protagonist'
          : base === 'an-vuong' ? 'antagonist'
          : base === 'hung-vuong' ? 'supporting'
          : 'supporting',
    } satisfies Character;
  });
}

/**
 * Check if a panel's ai_output image file exists in the known list.
 * We pre-check statically because we know what's in ai_output.
 */
const EXISTING_AI_OUTPUT = new Set([
  'page_001_panel_01', 'page_001_panel_02', 'page_001_panel_03',
  'page_001_panel_04', 'page_001_panel_05', 'page_001_panel_06',
  'page_001_panel_07', 'page_001_panel_08',
  'page_002_panel_02', 'page_002_panel_03', 'page_002_panel_04',
  'page_002_panel_05', 'page_002_panel_06', 'page_002_panel_07',
  'page_003_panel_01', 'page_003_panel_02',
  'page_003_panel_04', 'page_003_panel_05', 'page_003_panel_06',
  'page_003_panel_07', 'page_003_panel_08',
]);

function aiImageUrl(panelId: string): string {
  return `${RUN_FOLDER}/ai_output/${panelId}.jpg`;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface StoryState {
  step: WorkflowStep;
  config: StoryConfig;
  globalCharacters: Character[];
  pages: PageData[];
  selectedPanelId: string | null;
  selectedPageId: string | null;
  isGenerating: boolean;
  generatingPanelId: string | null;
  showPanelDetail: boolean;
  loadError: string | null;

  // Config
  setConfig: (cfg: Partial<StoryConfig>) => void;
  setStep: (s: WorkflowStep) => void;

  // Characters
  addGlobalCharacter: (char: Omit<Character, 'id'>) => void;
  removeGlobalCharacter: (id: string) => void;
  updateGlobalCharacter: (id: string, partial: Partial<Character>) => void;

  // Panel selection
  setSelectedPanel: (id: string | null) => void;
  setSelectedPage: (id: string | null) => void;
  setShowPanelDetail: (v: boolean) => void;

  // Panel mutations
  updatePanelFrame: (id: string, frame: Partial<PanelData['frame']>) => void;
  updatePanelScript: (id: string, script: Partial<PanelScript>) => void;
  updatePanelCharacters: (id: string, chars: Character[]) => void;
  updateImageTransform: (id: string, transform: Partial<PanelData['image_transform']>) => void;
  regeneratePanelImage: (id: string) => Promise<void>;

  // Workflow actions
  loadFromRunFolder: () => Promise<void>;
  generateAllImages: () => Promise<void>;

  // Derived
  getPanel: (id: string) => PanelData | undefined;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStoryStore = create<StoryState>((set, get) => ({
  step: 'scenario',
  config: {
    title: 'Thánh Gióng',
    genre: 'Cổ tích Việt Nam',
    totalPages: 3,
    panelsPerPage: 8,
    aspectRatio: '9:16',
    description: 'Câu chuyện về Thánh Gióng – người anh hùng huyền thoại đánh giặc Ân bảo vệ đất nước.',
  },
  globalCharacters: [],
  pages: [],
  selectedPanelId: null,
  selectedPageId: null,
  isGenerating: false,
  generatingPanelId: null,
  showPanelDetail: false,
  loadError: null,

  // ── Config ────────────────────────────────────────────────────────────────
  setConfig: (cfg) => set(s => ({ config: { ...s.config, ...cfg } })),
  setStep: (step) => set({ step }),

  // ── Characters ────────────────────────────────────────────────────────────
  addGlobalCharacter: (char) => set(s => ({
    globalCharacters: [...s.globalCharacters, { ...char, id: makeId() }]
  })),
  removeGlobalCharacter: (id) => set(s => ({
    globalCharacters: s.globalCharacters.filter(c => c.id !== id)
  })),
  updateGlobalCharacter: (id, partial) => set(s => ({
    globalCharacters: s.globalCharacters.map(c => c.id === id ? { ...c, ...partial } : c)
  })),

  // ── Panel selection ───────────────────────────────────────────────────────
  setSelectedPanel: (id) => set({ selectedPanelId: id, showPanelDetail: !!id }),
  setSelectedPage: (id) => set({ selectedPageId: id }),
  setShowPanelDetail: (v) => set({ showPanelDetail: v }),

  // ── Panel mutations ───────────────────────────────────────────────────────
  updatePanelFrame: (id, frame) => set(s => ({
    pages: s.pages.map(pg => ({
      ...pg,
      panels: pg.panels.map(p => p.id === id ? { ...p, frame: { ...p.frame, ...frame } } : p)
    }))
  })),
  updatePanelScript: (id, script) => set(s => ({
    pages: s.pages.map(pg => ({
      ...pg,
      panels: pg.panels.map(p =>
        p.id === id ? { ...p, script: { ...p.script, ...script }, status: 'scripted' } : p
      )
    }))
  })),
  updatePanelCharacters: (id, chars) => set(s => ({
    pages: s.pages.map(pg => ({
      ...pg,
      panels: pg.panels.map(p => p.id === id ? { ...p, characters: chars } : p)
    }))
  })),
  updateImageTransform: (id, transform) => set(s => ({
    pages: s.pages.map(pg => ({
      ...pg,
      panels: pg.panels.map(p =>
        p.id === id ? { ...p, image_transform: { ...p.image_transform, ...transform } } : p
      )
    }))
  })),

  regeneratePanelImage: async (id) => {
    set(s => ({
      pages: s.pages.map(pg => ({
        ...pg,
        panels: pg.panels.map(p => p.id === id ? { ...p, status: 'generating' } : p)
      })),
      generatingPanelId: id,
    }));
    // Simulate backend call (replace with real API call)
    await new Promise(r => setTimeout(r, 1500));
    set(s => ({
      pages: s.pages.map(pg => ({
        ...pg,
        panels: pg.panels.map(p => {
          if (p.id !== id) return p;
          return {
            ...p,
            status: 'done',
            image_url: aiImageUrl(id) + '?t=' + Date.now(),
            image_transform: { x: 0, y: 0, scale: 1 },
          };
        })
      })),
      generatingPanelId: null,
    }));
  },

  // ── Derived ───────────────────────────────────────────────────────────────
  getPanel: (id) => {
    for (const pg of get().pages) {
      const found = pg.panels.find(p => p.id === id);
      if (found) return found;
    }
    return undefined;
  },

  // ════════════════════════════════════════════════════════════════════════
  // MAIN LOAD: Read panels_with_prompts.json (merged layout + scripts)
  // ════════════════════════════════════════════════════════════════════════
  loadFromRunFolder: async () => {
    set({ isGenerating: true, loadError: null });

    try {
      // ── 1. Fetch panels_with_prompts.json (has BOTH layout bbox AND scripts) ──
      const res = await fetch(`${RUN_FOLDER}/panels_with_prompts.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
      const data: {
        meta: { coord_w: number; coord_h: number; total_pages: number; panels_per_page: number; page_aspect: string };
        panels: Array<{
          panel_id: string;
          file_name: string;
          bbox: { x: number; y: number; w: number; h: number };
          aspect_ratio_api: string;
          prompt: string;
          ref_images: string[];
          page_number: number;
          page_order: number;
          narration: string;
          dialogue: Array<{ character: string; text: string }>;
        }>;
      } = await res.json();

      const coord_w = data.meta.coord_w;

      // ── 2. Build a map of unique characters from all ref_images ──────────
      const charMap = new Map<string, Character>(); // key = base filename (e.g. "giong")
      for (const panel of data.panels) {
        for (const absPath of (panel.ref_images || [])) {
          const parts = absPath.replace(/\\/g, '/').split('/');
          const filename = parts[parts.length - 1];
          const base = filename.replace(/\.[^.]+$/, '');
          if (!charMap.has(base)) {
            charMap.set(base, {
              id: base,
              name: fileToCharName(filename),
              avatar: `${RUN_FOLDER}/chars_output/${filename}`,
              description: '',
              role: base === 'giong' ? 'protagonist'
                  : base === 'an-vuong' ? 'antagonist'
                  : 'supporting',
            });
          }
        }
      }
      const globalCharacters = Array.from(charMap.values());

      // ── 3. Group panels by page_number ──────────────────────────────────
      const pageMap = new Map<number, PanelData[]>();
      for (const p of data.panels) {
        const panelId = p.panel_id; // e.g. "page_001_panel_01"
        const hasImage = EXISTING_AI_OUTPUT.has(panelId);

        // Build characters for THIS panel from its ref_images
        const panelChars = refImagesToChars(p.ref_images || []);

        // Build script
        const script: PanelScript = {
          narration: p.narration || undefined,
          dialogues: p.dialogue?.map(d => ({ character: d.character, text: d.text })) || [],
          ai_prompt: p.prompt || undefined,
        };

        const panel: PanelData = {
          id: panelId,
          pageId: `page_${p.page_number}`,
          globalOrder: (p.page_number - 1) * 8 + p.page_order,
          pageOrder: p.page_order,
          file_name: p.file_name,
          aspect_label: p.aspect_ratio_api || 'unknown',
          image_url: hasImage ? aiImageUrl(panelId) : '',
          script,
          characters: panelChars,
          status: hasImage ? 'done' : 'scripted',
          frame: {
            x: coordToPixel(p.bbox.x, coord_w),
            y: coordToPixel(p.bbox.y, coord_w),
            width: coordToPixel(p.bbox.w, coord_w),
            height: coordToPixel(p.bbox.h, coord_w),
          },
          image_transform: { x: 0, y: 0, scale: 1 },
        };

        if (!pageMap.has(p.page_number)) pageMap.set(p.page_number, []);
        pageMap.get(p.page_number)!.push(panel);
      }

      // ── 4. Sort pages and panels ─────────────────────────────────────────
      const pages: PageData[] = Array.from(pageMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([pageNum, panels]) => ({
          id: `page_${pageNum}`,
          pageNumber: pageNum,
          panels: panels.sort((a, b) => a.pageOrder - b.pageOrder),
        }));

      set({
        pages,
        globalCharacters,
        isGenerating: false,
        step: 'result',
        selectedPageId: pages[0]?.id ?? null,
        config: {
          title: 'Thánh Gióng',
          genre: 'Cổ tích Việt Nam',
          totalPages: data.meta.total_pages,
          panelsPerPage: data.meta.panels_per_page,
          aspectRatio: '9:16',
          description: 'Câu chuyện về Thánh Gióng – người anh hùng huyền thoại đánh giặc Ân bảo vệ đất nước.',
        },
      });

    } catch (err: any) {
      console.error('[loadFromRunFolder]', err);
      set({ isGenerating: false, loadError: err?.message || String(err) });
    }
  },

  // ── Generate all images (simulate calling backend per-panel) ─────────────
  generateAllImages: async () => {
    const { pages } = get();
    set({ isGenerating: true, step: 'generating' });

    for (const pg of pages) {
      for (const panel of pg.panels) {
        if (panel.status === 'done') continue; // skip already-generated
        set(s => ({
          pages: s.pages.map(p => ({
            ...p,
            panels: p.panels.map(pp => pp.id === panel.id ? { ...pp, status: 'generating' } : pp)
          })),
          generatingPanelId: panel.id,
        }));
        await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
        set(s => ({
          pages: s.pages.map(p => ({
            ...p,
            panels: p.panels.map(pp => pp.id === panel.id ? {
              ...pp,
              status: 'done',
              image_url: aiImageUrl(panel.id),
              image_transform: { x: 0, y: 0, scale: 1 },
            } : pp)
          })),
        }));
      }
    }

    set({ isGenerating: false, generatingPanelId: null, step: 'result' });
  },
}));