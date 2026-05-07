// ─── Character Database Service ───────────────────────────────────────────────
// Logic tra cứu nhân vật từ CSDL với normalize + alias + fuzzy matching

export interface CharacterDbEntry {
  id: string;
  name: string;
  aliases: string[];
  image_path: string | null;
  description: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'extra';
  tags: string[];
  story: string;
  gender: 'male' | 'female';
  style_prompt: string;
}

export interface CharacterDb {
  version: string;
  characters: CharacterDbEntry[];
}

// Cache singleton
let _db: CharacterDb | null = null;

export async function loadCharacterDb(): Promise<CharacterDb> {
  if (_db) return _db;
  const res = await fetch('/characters_db.json');
  if (!res.ok) throw new Error('Không thể load characters_db.json');
  _db = await res.json();
  return _db!;
}

// ─── Normalize: bỏ dấu, lowercase, trim ──────────────────────────────────────
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// ─── Levenshtein distance (fuzzy match) ──────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Search result ────────────────────────────────────────────────────────────
export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'none';

export interface SearchResult {
  entry: CharacterDbEntry | null;
  matchType: MatchType;
  score: number; // 1.0 = perfect, 0 = no match
}

// ─── Main search function ─────────────────────────────────────────────────────
export function searchCharacter(name: string, db: CharacterDb): SearchResult {
  const q = normalize(name);
  if (!q) return { entry: null, matchType: 'none', score: 0 };

  let bestEntry: CharacterDbEntry | null = null;
  let bestType: MatchType = 'none';
  let bestScore = 0;

  for (const entry of db.characters) {
    // 1. Exact match trên tên chính
    if (normalize(entry.name) === q) {
      return { entry, matchType: 'exact', score: 1.0 };
    }

    // 2. Alias match
    const aliasMatch = entry.aliases.some(a => normalize(a) === q);
    if (aliasMatch && bestScore < 0.95) {
      bestEntry = entry;
      bestType = 'alias';
      bestScore = 0.95;
      continue;
    }

    // 3. Fuzzy match (Levenshtein distance ≤ 2)
    const dist = levenshtein(normalize(entry.name), q);
    const maxLen = Math.max(normalize(entry.name).length, q.length);
    const score = maxLen > 0 ? 1 - dist / maxLen : 0;

    if (dist <= 2 && score > bestScore) {
      bestEntry = entry;
      bestType = 'fuzzy';
      bestScore = score;
    }

    // Fuzzy trên aliases
    for (const alias of entry.aliases) {
      const aliasNorm = normalize(alias);
      const aDist = levenshtein(aliasNorm, q);
      const aMax = Math.max(aliasNorm.length, q.length);
      const aScore = aMax > 0 ? 1 - aDist / aMax : 0;
      if (aDist <= 1 && aScore > bestScore) {
        bestEntry = entry;
        bestType = 'fuzzy';
        bestScore = aScore * 0.9; // slightly lower than name fuzzy
      }
    }
  }

  return { entry: bestEntry, matchType: bestType, score: bestScore };
}

// ─── Extract character names from story description (mock LLM) ───────────────
// Trong thực tế sẽ gọi API Gemini/GPT, ở đây dùng keyword matching đơn giản
export function mockExtractCharacters(title: string, description: string): string[] {
  const text = `${title} ${description}`;
  
  // Known characters to detect
  const patterns: [RegExp, string][] = [
    [/thánh gióng|phù đổng|gióng/i, 'Gióng'],
    [/mẹ gióng|mẹ của gióng/i, 'Mẹ Gióng'],
    [/hùng vương|vua hùng/i, 'Hùng Vương'],
    [/ân vương|giặc ân/i, 'Ân Vương'],
    [/sứ giả/i, 'Sứ giả'],
    [/sơn tinh|thần núi/i, 'Sơn Tinh'],
    [/thủy tinh|thần nước/i, 'Thủy Tinh'],
    [/mỵ nương|công chúa/i, 'Mỵ Nương'],
    [/\btấm\b/i, 'Tấm'],
    [/\bcám\b/i, 'Cám'],
    [/lạc long quân|rồng/i, 'Lạc Long Quân'],
    [/âu cơ|tiên nữ/i, 'Âu Cơ'],
  ];

  const found = new Set<string>();
  for (const [regex, charName] of patterns) {
    if (regex.test(text)) found.add(charName);
  }

  // Nếu không match được gì → trả default dựa vào title
  if (found.size === 0) {
    // Thêm nhân vật giả (sẽ được sinh mới bằng AI)
    return ['Nhân vật chính', 'Nhân vật phụ'];
  }

  return Array.from(found);
}
