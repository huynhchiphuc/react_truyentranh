// ─── Core Types ────────────────────────────────────────────────────────────────

export interface Character {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'extra';
}

export interface PanelScript {
  narration?: string;
  dialogues?: { character: string; text: string }[];
  action?: string;
  mood?: string;
  ai_prompt?: string;
}

export interface PanelData {
  id: string;
  pageId: string;
  globalOrder: number;
  pageOrder: number;
  image_url: string;
  script: PanelScript;
  characters: Character[];
  aspect_label: string;
  frame: { x: number; y: number; width: number; height: number };
  image_transform: { x: number; y: number; scale: number };
  status: 'empty' | 'scripted' | 'generating' | 'done' | 'error';
  file_name: string;
}

export interface PageData {
  id: string;
  pageNumber: number;
  panels: PanelData[];
}

export type WorkflowStep = 'setup' | 'scenario' | 'layout' | 'generating' | 'result';

export interface StoryConfig {
  title: string;
  genre: string;
  totalPages: number;
  panelsPerPage: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:3';
  description: string;
}
