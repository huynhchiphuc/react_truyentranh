import { create } from 'zustand';
import type { PanelData, PageData, StoryConfig, WorkflowStep, Character, PanelScript } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RUN_FOLDER = 'run_20260417_1537_87ae7fc1';
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
  isLayoutMode: boolean; // ← NEW: mode chỉnh sửa layout

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
  setIsLayoutMode: (v: boolean) => void;

  // Panel mutations
  updatePanelFrame: (id: string, frame: Partial<PanelData['frame']>) => void;
  updatePanelScript: (id: string, script: Partial<PanelScript>) => void;
  updatePanelCharacters: (id: string, chars: Character[]) => void;
  updateImageTransform: (id: string, transform: Partial<PanelData['image_transform']>) => void;
  updatePanelPolygon: (id: string, polygon: {x:number, y:number}[]) => void;
  regeneratePanelImage: (id: string) => Promise<void>;

  // Workflow actions
  loadFromRunFolder: () => Promise<void>;


  // Derived
  getPanel: (id: string) => PanelData | undefined;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStoryStore = create<StoryState>((set, get) => ({
  step: 'scenario',
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
  isLayoutMode: false,

  // ── Config ────────────────────────────────────────────────────────────────
  setConfig: (cfg) => set(s => ({ config: { ...s.config, ...cfg } })),
  setStep: (step) => set({ step }),
  setRunFolder: (folder) => set({ runFolder: folder.replace(/^\//, ''), loadError: null, pages: [] }),

  // ── Characters ────────────────────────────────────────────────────────────
  addGlobalCharacter: (char) => set(s => ({
    globalCharacters: [...s.globalCharacters, { ...char, id: makeId() }]
  })),
  removeGlobalCharacter: (id) => set(s => ({
    globalCharacters: s.globalCharacters.filter(c => c.id !== id)
  })),
  updateGlobalCharacter: async (id, partial) => {
    set(s => ({
      globalCharacters: s.globalCharacters.map(c => c.id === id ? { ...c, ...partial } : c)
    }));

    // Persist to screenplay_parsed.json
    try {
      await fetch('http://localhost:3001/api/save-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runFolder: get().runFolder,
          characters: get().globalCharacters
        })
      });
    } catch (e) {
      console.error("Failed to persist character changes", e);
    }
  },

  // ── Panel selection ───────────────────────────────────────────────────────
  setSelectedPanel: (id) => set({ selectedPanelId: id, showPanelDetail: !!id }),
  setSelectedPage: (id) => set({ selectedPageId: id }),
  setShowPanelDetail: (v) => set({ showPanelDetail: v }),
  setIsLayoutMode: (v) => set({ isLayoutMode: v }),

  // ── Panel mutations ───────────────────────────────────────────────────────
  updatePanelFrame: async (id, frame) => {
    set(s => ({
      pages: s.pages.map(pg => ({
        ...pg,
        panels: pg.panels.map(p => p.id === id ? { ...p, frame: { ...p.frame, ...frame } } : p)
      }))
    }));
    
    // Auto-save layout
    try {
      await fetch('http://localhost:3001/api/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runFolder: get().runFolder, pages: get().pages })
      });
    } catch (e) {}
  },
  updatePanelPolygon: async (id, polygon) => {
    set(s => {
      const oldPanel = s.pages.flatMap(pg => pg.panels).find(p => p.id === id);
      if (!oldPanel) return s;

      const oldPoly = oldPanel.polygon || [];
      let vertexIdx = -1;
      let oldPos = { x: 0, y: 0 };
      let newPos = { x: 0, y: 0 };

      if (oldPoly.length === polygon.length) {
        for (let i = 0; i < polygon.length; i++) {
          if (polygon[i].x !== oldPoly[i].x || polygon[i].y !== oldPoly[i].y) {
            vertexIdx = i;
            oldPos = oldPoly[i];
            newPos = polygon[i];
            break;
          }
        }
      }

      return {
        pages: s.pages.map(pg => {
          if (pg.id !== oldPanel.pageId) return pg;
          return {
            ...pg,
            panels: pg.panels.map(p => {
              if (p.id === id) return { ...p, polygon };
              if (!p.polygon || p.polygon.length === 0) return p;
              const pPoly = [...p.polygon];
              let changed = false;
              for (let i = 0; i < pPoly.length; i++) {
                const dist = Math.sqrt(Math.pow(pPoly[i].x - oldPos.x, 2) + Math.pow(pPoly[i].y - oldPos.y, 2));
                if (dist < 8) {
                  pPoly[i] = newPos;
                  changed = true;
                }
              }
              return changed ? { ...p, polygon: pPoly } : p;
            })
          };
        })
      };
    });

    // Auto-save layout
    try {
      await fetch('http://localhost:3001/api/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runFolder: get().runFolder, pages: get().pages })
      });
    } catch (e) {}
  },
  updatePanelScript: async (id, script) => {
    set(s => ({
      pages: s.pages.map(pg => ({
        ...pg,
        panels: pg.panels.map(p =>
          p.id === id ? { ...p, script: { ...p.script, ...script }, status: 'scripted' } : p
        )
      }))
    }));

    // Auto-save panel prompt
    try {
      await fetch('http://localhost:3001/api/save-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runFolder: get().runFolder,
          panels: get().pages.flatMap(pg => pg.panels)
        })
      });
    } catch (e) {}
  },
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

      // ── 2. Fetch screenplay_parsed.json for character descriptions ──────
      let screenplayChars: any[] = [];
      try {
        const sRes = await fetch(`${runFolder}/screenplay_parsed.json`);
        if (sRes.ok) {
          const sData = await sRes.json();
          screenplayChars = sData.characters || [];
        }
      } catch (e) {
        console.warn("Could not load screenplay_parsed.json", e);
      }

      // ── 3. Build a map of unique characters from all ref_images ──────────
      const charMap = new Map<string, Character>(); // key = base filename (e.g. "giong")
      for (const panel of data.panels) {
        for (const absPath of (panel.ref_images || [])) {
          const parts = absPath.replace(/\\/g, '/').split('/');
          const filename = parts[parts.length - 1];
          const base = filename.replace(/\.[^.]+$/, '');
          if (!charMap.has(base)) {
            // Find description from screenplay
            const sChar = screenplayChars.find(sc => 
              sc.slug === base || 
              sc.name.toLowerCase().includes(fileToCharName(filename).toLowerCase())
            );

            charMap.set(base, {
              id: base,
              name: fileToCharName(filename),
              avatar: `${runFolder}/chars_output/${filename}`,
              description: sChar?.description || '',
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
      set({ 
        isGenerating: false, 
        loadError: `Không thể load folder "${runFolder}". Lỗi: ${err?.message || String(err)}` 
      });
    }
  },
}));