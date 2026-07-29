// Paleta de cores por operadora (case-insensitive)
const MAP = [
  { match: "oi",    color: "#eab308", bg: "bg-yellow-500/15",  text: "text-yellow-400"  },
  { match: "tim",   color: "#1d4ed8", bg: "bg-blue-700/20",    text: "text-blue-400"    },
  { match: "vivo",  color: "#a855f7", bg: "bg-purple-500/15",  text: "text-purple-400"  },
  { match: "claro", color: "#ef4444", bg: "bg-red-500/15",     text: "text-red-400"     },
  { match: "flux",  color: "#38bdf8", bg: "bg-sky-500/15",     text: "text-sky-400"     },
];

const FALLBACK_COLORS = [
  "#f97316", "#06b6d4", "#84cc16", "#f43f5e", "#8b5cf6",
  "#14b8a6", "#fb923c", "#a3e635",
];
const _cache = {};

export function getOperadoraColor(operadora) {
  if (!operadora) return "#94a3b8";
  const lower = operadora.toLowerCase();
  const entry = MAP.find((m) => lower.includes(m.match));
  if (entry) return entry.color;
  if (!_cache[lower]) {
    const idx = Object.keys(_cache).length % FALLBACK_COLORS.length;
    _cache[lower] = FALLBACK_COLORS[idx];
  }
  return _cache[lower];
}

export function getOperadoraClasses(operadora) {
  if (!operadora) return { bg: "bg-slate-500/15", text: "text-slate-400" };
  const lower = operadora.toLowerCase();
  const entry = MAP.find((m) => lower.includes(m.match));
  if (entry) return { bg: entry.bg, text: entry.text };
  return { bg: "bg-orange-500/15", text: "text-orange-400" };
}
