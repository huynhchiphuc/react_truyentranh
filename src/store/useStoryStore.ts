import { create } from 'zustand';
import type { PanelData, PageData, StoryConfig, WorkflowStep, Character, PanelScript } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RUN_FOLDER = '/run_20260417_1621_39b2de80';
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
function refImageToUrl(runFolder: string, absPath: string): string {
  const parts = absPath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1];
  return `${runFolder}/chars_output/${filename}`;
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
function refImagesToChars(runFolder: string, refImages: string[]): Character[] {
  return refImages.map(absPath => {
    const url = refImageToUrl(runFolder, absPath);
    const parts = absPath.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    const base = filename.replace(/\.[^.]+$/, '');
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

// image_url luôn được set — browser tự xử lý 404 qua onError trong ComicPanel

function aiImageUrl(runFolder: string, panelId: string): string {
  return `${runFolder}/ai_output/${panelId}.jpg`;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface StoryState {
  step: WorkflowStep;
  runFolder: string;            // ← dynamic: user chọn từ picker
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
  setRunFolder: (folder: string) => void;

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
  updatePanelPolygon: (id: string, polygon: {x:number, y:number}[]) => void;
  regeneratePanelImage: (id: string) => Promise<void>;

  // Workflow actions
  loadFromRunFolder: () => Promise<void>;
  generateProceduralLayout: () => void;   // ← tạo layout từ config, không cần run folder
  randomizePageLayout: (pageId: string) => void; // ← tạo lại layout ngẫu nhiên cho 1 trang cụ thể
  generateAllScripts: () => Promise<void>; // ← tạo kịch bản mock cho từng panel
  generateAllImages: () => Promise<void>;

  // Derived
  getPanel: (id: string) => PanelData | undefined;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStoryStore = create<StoryState>((set, get) => ({
  step: 'setup',
  runFolder: DEFAULT_RUN_FOLDER,
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
  setRunFolder: (folder) => set({ runFolder: folder, loadError: null, pages: [] }),

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
  updatePanelPolygon: (id, polygon) => set(s => ({
    pages: s.pages.map(pg => ({
      ...pg,
      panels: pg.panels.map(p => p.id === id ? { ...p, polygon } : p)
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
            image_url: aiImageUrl(get().runFolder, id) + '?t=' + Date.now(),
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
    const runFolder = get().runFolder;
    set({ isGenerating: true, loadError: null });

    try {
      // ── 1. Fetch panels_with_prompts.json (has BOTH layout bbox AND scripts) ──
      const res = await fetch(`${runFolder}/panels_with_prompts.json`);
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
              avatar: `${runFolder}/chars_output/${filename}`,
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
        const panelId = p.panel_id;

        // Luôn set image_url — browser tự xử lý nếu file không tồn tại (onError trong ComicPanel)
        const panelChars = refImagesToChars(runFolder, p.ref_images || []);

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
          image_url: aiImageUrl(runFolder, panelId), // luôn set, onError xử lý 404
          script,
          characters: panelChars,
          status: 'done',
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

  // ════════════════════════════════════════════════════════════════════════
  // PROCEDURAL LAYOUT: Sinh layout đa dạng — ngang/vuông/dọc
  // Row-based templates: mỗi row có heightWeight riêng, mỗi panel có widthWeight riêng
  // → 1 panel/row = chữ nhật ngang | 2 panel/row = vuông | 3 panel/row = chữ nhật dọc
  // ════════════════════════════════════════════════════════════════════════
  generateProceduralLayout: () => {
    const { config } = get();
    const { totalPages, panelsPerPage, aspectRatio } = config;

    const PAGE_W = 750;
    const [rW, rH] = aspectRatio.split(':').map(Number);
    const PAGE_H = Math.round(PAGE_W * (rH / rW));
    const PAD = 10;
    const GAP = 8;

    // ── Layout templates: array of rows, mỗi row = {h: heightWeight, p: widthWeights[]}
    type Recipe = { h: number; p: number[] }[];

    const RECIPES: Record<number, Recipe[]> = {
      1: [[{ h: 1, p: [1] }]],
      2: [
        [{ h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [1, 1] }], [{ h: 1.5, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1.5, p: [1] }], [{ h: 1, p: [2, 1] }], [{ h: 1, p: [1, 2] }],
        [{ h: 1, p: [3, 1] }], [{ h: 1, p: [1, 3] }]
      ],
      3: [
        [{ h: 1, p: [1] }, { h: 1.3, p: [1, 1] }], [{ h: 1.3, p: [1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1, 1, 1] }], 
        [{ h: 1, p: [1] }, { h: 1.3, p: [1.5, 1] }], [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1, 1] }], [{ h: 1, p: [1, 2, 1] }], [{ h: 1, p: [1, 1, 2] }],
        [{ h: 1, p: [1.5, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1.5, 1] }],
        [{ h: 1, p: [1, 1.5] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [3, 1, 1] }], [{ h: 1, p: [1, 1, 3] }],
        [{ h: 1, p: [1, 1] }, { h: 1.5, p: [1] }], [{ h: 1.5, p: [1] }, { h: 1, p: [1, 1] }]
      ],
      4: [
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1] }, { h: 1.5, p: [1, 1, 1] }], 
        [{ h: 1.5, p: [1, 1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1.5, 1] }, { h: 1.2, p: [1, 1.5] }],
        [{ h: 1, p: [1, 1, 1, 1] }], [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1.2, p: [1, 1] }],
        [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [2, 1, 1] }], [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 2] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 2, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [3, 1] }, { h: 1, p: [1, 3] }],
        [{ h: 1, p: [1, 3] }, { h: 1, p: [3, 1] }], [{ h: 1, p: [2, 1, 1, 2] }], [{ h: 1, p: [1, 2, 2, 1] }]
      ],
      5: [
        [{ h: 0.8, p: [1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1, 1, 1] }], 
        [{ h: 1, p: [1, 1, 1] }, { h: 1.2, p: [1, 1] }], [{ h: 0.7, p: [1] }, { h: 1, p: [1.5, 1] }, { h: 1, p: [1, 1.5] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 2, 1] }],
        [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 2] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 3] }, { h: 1, p: [3, 1] }], [{ h: 1, p: [1, 1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 1, 2] }]
      ],
      6: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], 
        [{ h: 0.8, p: [1] }, { h: 1.1, p: [1, 1] }, { h: 1.1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 0.8, p: [1] }, { h: 1.2, p: [1, 1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1, 2] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 2, 1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [2, 1, 1] }], [{ h: 1, p: [3, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 3] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [1, 2, 2, 1] }, { h: 1, p: [1, 1] }]
      ],
      7: [
        [{ h: 0.7, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }], 
        [{ h: 1, p: [1, 1, 1] }, { h: 1.1, p: [1, 1] }, { h: 1.1, p: [1, 1] }], [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [2, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }]
      ],
      8: [
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 0.7, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1.2, 1] }, { h: 1, p: [1, 1.2] }], 
        [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1.2, p: [1.5, 1] }, { h: 1, p: [1, 1.5] }, { h: 1, p: [1, 1, 1] }, { h: 0.8, p: [1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }], [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 2] }, { h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }]
      ],
      9: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 2] }, { h: 1, p: [1, 2, 1] }, { h: 1, p: [2, 1, 2] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1, 2] }]
      ],
      10: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 1] }]
      ],
      11: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1, 1, 1] }]
      ],
      12: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }]
      ],
    };

    const getRecipes = (n: number): Recipe[] => {
      if (RECIPES[n]) return RECIPES[n];
      const keys = Object.keys(RECIPES).map(Number).sort((a, b) => Math.abs(a - n) - Math.abs(b - n));
      return RECIPES[keys[0]];
    };

    const buildPanelsForRecipe = (recipe: Recipe, pageNum: number, panelsPerPage: number): PanelData[] => {
      const totalHWeight = recipe.reduce((s, r) => s + r.h, 0);
      const availH = PAGE_H - PAD * 2 - GAP * (recipe.length - 1);
      const availW = PAGE_W - PAD * 2;
      const panels: PanelData[] = [];
      let panelIdx = 0;
      let curY = PAD;

      for (let ri = 0; ri < recipe.length; ri++) {
        const row = recipe[ri];
        const rowH = Math.round((row.h / totalHWeight) * availH);
        const totalWWeight = row.p.reduce((s, w) => s + w, 0);
        let curX = PAD;

        for (let pi = 0; pi < row.p.length; pi++) {
          const isLastInRow = pi === row.p.length - 1;
          const panelW = isLastInRow ? PAGE_W - PAD - curX : Math.round((row.p[pi] / totalWWeight) * availW);
          const panelId = `page_${String(pageNum).padStart(3,'0')}_panel_${String(panelIdx + 1).padStart(2,'0')}`;
          const ratio = panelW / rowH;
          const shapeLabel = ratio >= 1.4 ? '16:9' : ratio <= 0.8 ? '9:16' : '1:1';

          panels.push({
            id: panelId,
            pageId: `page_${pageNum}`,
            globalOrder: (pageNum - 1) * panelsPerPage + panelIdx + 1,
            pageOrder: panelIdx + 1,
            file_name: `${panelId}.jpg`,
            aspect_label: shapeLabel,
            image_url: '',
            script: { narration: '', dialogues: [], ai_prompt: '' },
            characters: [],
            status: 'empty',
            frame: { x: curX, y: curY, width: panelW, height: rowH },
            polygon: [
              { x: curX, y: curY },
              { x: curX + panelW, y: curY },
              { x: curX + panelW, y: curY + rowH },
              { x: curX, y: curY + rowH }
            ],
            image_transform: { x: 0, y: 0, scale: 1 },
          });
          curX += panelW + GAP;
          panelIdx++;
        }
        curY += rowH + GAP;
      }
      return panels;
    };

    const pages: PageData[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const recipes = getRecipes(panelsPerPage);
      // Pick random recipe to avoid repeating
      const recipe = recipes[Math.floor(Math.random() * recipes.length)];
      const panels = buildPanelsForRecipe(recipe, pageNum, panelsPerPage);
      pages.push({ id: `page_${pageNum}`, pageNumber: pageNum, panels });
    }

    set({
      pages,
      step: 'layout',
      selectedPageId: pages[0]?.id ?? null,
      selectedPanelId: null,
      loadError: null,
    });
  },

  randomizePageLayout: (pageId: string) => {
    const { pages, config } = get();
    const { panelsPerPage, aspectRatio } = config;
    
    // We need the recipes logic again
    type Recipe = { h: number; p: number[] }[];
    const RECIPES: Record<number, Recipe[]> = {
      1: [[{ h: 1, p: [1] }]],
      2: [
        [{ h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [1, 1] }], [{ h: 1.5, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1.5, p: [1] }], [{ h: 1, p: [2, 1] }], [{ h: 1, p: [1, 2] }],
        [{ h: 1, p: [3, 1] }], [{ h: 1, p: [1, 3] }]
      ],
      3: [
        [{ h: 1, p: [1] }, { h: 1.3, p: [1, 1] }], [{ h: 1.3, p: [1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1, 1, 1] }], 
        [{ h: 1, p: [1] }, { h: 1.3, p: [1.5, 1] }], [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1, 1] }], [{ h: 1, p: [1, 2, 1] }], [{ h: 1, p: [1, 1, 2] }],
        [{ h: 1, p: [1.5, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1.5, 1] }],
        [{ h: 1, p: [1, 1.5] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [3, 1, 1] }], [{ h: 1, p: [1, 1, 3] }],
        [{ h: 1, p: [1, 1] }, { h: 1.5, p: [1] }], [{ h: 1.5, p: [1] }, { h: 1, p: [1, 1] }]
      ],
      4: [
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1] }, { h: 1.5, p: [1, 1, 1] }], 
        [{ h: 1.5, p: [1, 1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1.5, 1] }, { h: 1.2, p: [1, 1.5] }],
        [{ h: 1, p: [1, 1, 1, 1] }], [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1.2, p: [1, 1] }],
        [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [2, 1, 1] }], [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 2] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 2, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [3, 1] }, { h: 1, p: [1, 3] }],
        [{ h: 1, p: [1, 3] }, { h: 1, p: [3, 1] }], [{ h: 1, p: [2, 1, 1, 2] }], [{ h: 1, p: [1, 2, 2, 1] }]
      ],
      5: [
        [{ h: 0.8, p: [1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1, 1, 1] }], 
        [{ h: 1, p: [1, 1, 1] }, { h: 1.2, p: [1, 1] }], [{ h: 0.7, p: [1] }, { h: 1, p: [1.5, 1] }, { h: 1, p: [1, 1.5] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 2, 1] }],
        [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 2] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1] }, { h: 1, p: [1, 3] }, { h: 1, p: [3, 1] }], [{ h: 1, p: [1, 1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 1, 1] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [1, 1, 1, 2] }]
      ],
      6: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], 
        [{ h: 0.8, p: [1] }, { h: 1.1, p: [1, 1] }, { h: 1.1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 0.8, p: [1] }, { h: 1.2, p: [1, 1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1, 2] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 2, 1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [2, 1, 1] }], [{ h: 1, p: [3, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 3] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1] }], [{ h: 1, p: [1] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [1, 2, 2, 1] }, { h: 1, p: [1, 1] }]
      ],
      7: [
        [{ h: 0.7, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }], 
        [{ h: 1, p: [1, 1, 1] }, { h: 1.1, p: [1, 1] }, { h: 1.1, p: [1, 1] }], [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [2, 1] }], [{ h: 1, p: [1, 1, 2] }, { h: 1, p: [2, 1, 1] }, { h: 1, p: [1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }]
      ],
      8: [
        [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }], [{ h: 0.7, p: [1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1.2, 1] }, { h: 1, p: [1, 1.2] }], 
        [{ h: 1.2, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1.2, p: [1.5, 1] }, { h: 1, p: [1, 1.5] }, { h: 1, p: [1, 1, 1] }, { h: 0.8, p: [1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }], [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 2] }, { h: 1, p: [1, 2, 1] }, { h: 1, p: [1, 1] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }]
      ],
      9: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [2, 1, 2] }, { h: 1, p: [1, 2, 1] }, { h: 1, p: [2, 1, 2] }], [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [2, 1, 1] }, { h: 1, p: [1, 1, 2] }]
      ],
      10: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }],
        [{ h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [2, 1] }, { h: 1, p: [1, 1] }]
      ],
      11: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }], [{ h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [2, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 2] }, { h: 1, p: [1, 1, 1] }]
      ],
      12: [
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1, 1] }],
        [{ h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }, { h: 1, p: [1, 1, 1, 1] }],
        [{ h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1, 1] }, { h: 1, p: [1, 1] }, { h: 1, p: [1, 1] }]
      ],
    };
    const getRecipes = (n: number): Recipe[] => {
      if (RECIPES[n]) return RECIPES[n];
      const keys = Object.keys(RECIPES).map(Number).sort((a, b) => Math.abs(a - n) - Math.abs(b - n));
      return RECIPES[keys[0]];
    };

    const targetPage = pages.find(p => p.id === pageId);
    if (!targetPage) return;

    const recipes = getRecipes(panelsPerPage);
    // Pick a random recipe
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];

    const PAGE_W = 750;
    const [rW, rH] = aspectRatio.split(':').map(Number);
    const PAGE_H = Math.round(PAGE_W * (rH / rW));
    const PAD = 10;
    const GAP = 8;

    const totalHWeight = recipe.reduce((s, r) => s + r.h, 0);
    const availH = PAGE_H - PAD * 2 - GAP * (recipe.length - 1);
    const availW = PAGE_W - PAD * 2;
    const panels: PanelData[] = [];
    let panelIdx = 0;
    let curY = PAD;

    for (let ri = 0; ri < recipe.length; ri++) {
      const row = recipe[ri];
      const rowH = Math.round((row.h / totalHWeight) * availH);
      const totalWWeight = row.p.reduce((s, w) => s + w, 0);
      let curX = PAD;

      for (let pi = 0; pi < row.p.length; pi++) {
        const isLastInRow = pi === row.p.length - 1;
        const panelW = isLastInRow ? PAGE_W - PAD - curX : Math.round((row.p[pi] / totalWWeight) * availW);
        const panelId = `page_${String(targetPage.pageNumber).padStart(3,'0')}_panel_${String(panelIdx + 1).padStart(2,'0')}`;
        const ratio = panelW / rowH;
        const shapeLabel = ratio >= 1.4 ? '16:9' : ratio <= 0.8 ? '9:16' : '1:1';

        // Keep old script and characters if they exist
        const oldPanel = targetPage.panels[panelIdx];

        panels.push({
          id: panelId,
          pageId: `page_${targetPage.pageNumber}`,
          globalOrder: (targetPage.pageNumber - 1) * panelsPerPage + panelIdx + 1,
          pageOrder: panelIdx + 1,
          file_name: `${panelId}.jpg`,
          aspect_label: shapeLabel,
          image_url: oldPanel?.image_url || '',
          script: oldPanel?.script || { narration: '', dialogues: [], ai_prompt: '' },
          characters: oldPanel?.characters || [],
          status: oldPanel?.status || 'empty',
          frame: { x: curX, y: curY, width: panelW, height: rowH },
          polygon: [
            { x: curX, y: curY },
            { x: curX + panelW, y: curY },
            { x: curX + panelW, y: curY + rowH },
            { x: curX, y: curY + rowH }
          ],
          image_transform: oldPanel?.image_transform || { x: 0, y: 0, scale: 1 },
        });
        curX += panelW + GAP;
        panelIdx++;
      }
      curY += rowH + GAP;
    }

    set(s => ({
      pages: s.pages.map(p => p.id === pageId ? { ...p, panels } : p)
    }));
  },

  // ════════════════════════════════════════════════════════════════════════
  // GENERATE ALL SCRIPTS: Điền kịch bản placeholder cho từng panel
  // (Thực tế sẽ gọi AI, hiện tại là mock)
  // ════════════════════════════════════════════════════════════════════════
  generateAllScripts: async () => {
    const { pages, config } = get();
    if (pages.length === 0) return;

    set({ isGenerating: true });

    const scriptTemplates = [
      { narration: 'Cảnh mở đầu, giới thiệu bối cảnh câu chuyện.' },
      { narration: 'Nhân vật chính xuất hiện lần đầu.' },
      { narration: 'Tình huống căng thẳng bắt đầu hình thành.' },
      { narration: 'Cuộc đối thoại quan trọng diễn ra.' },
      { narration: 'Điểm đột phá của cốt truyện.' },
      { narration: 'Nhân vật đưa ra quyết định quan trọng.' },
      { narration: 'Cao trào của câu chuyện.' },
      { narration: 'Giải quyết mâu thuẫn và kết thúc.' },
    ];

    for (const pg of pages) {
      for (let i = 0; i < pg.panels.length; i++) {
        const panel = pg.panels[i];
        if (panel.status !== 'empty') continue;

        await new Promise(r => setTimeout(r, 120));

        const template = scriptTemplates[i % scriptTemplates.length];
        set(s => ({
          pages: s.pages.map(p => ({
            ...p,
            panels: p.panels.map(pp =>
              pp.id === panel.id
                ? {
                    ...pp,
                    status: 'scripted',
                    script: {
                      narration: `[Trang ${pg.pageNumber} · Khung ${i + 1}] ${template.narration}`,
                      dialogues: [],
                      ai_prompt: `${config.genre} style, ${config.title}, panel ${i + 1}: ${template.narration}`,
                    },
                  }
                : pp
            ),
          })),
        }));
      }
    }

    set({ isGenerating: false });
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
              image_url: aiImageUrl(get().runFolder, panel.id),
              image_transform: { x: 0, y: 0, scale: 1 },
            } : pp)
          })),
        }));
      }
    }

    set({ isGenerating: false, generatingPanelId: null, step: 'result' });
  },
}));