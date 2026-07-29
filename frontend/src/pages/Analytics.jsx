import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import {
  Activity, ArrowLeft, TrendingUp, Clock, AlertTriangle, CheckCircle2,
  CalendarDays, X,
} from "lucide-react";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subDays, subWeeks, subMonths,
  isWithinInterval, format, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
const utc = (s) => { const d = s?.endsWith("Z") ? s : s + "Z"; return new Date(d); };
import { fetchBAs } from "@/api/bas";
import { cn } from "@/lib/utils";

// ── Paleta ────────────────────────────────────
const CORES_STATUS = {
  "Aberto":                 "#38bdf8",
  "Transporte":             "#94a3b8",
  "Em validação":           "#f59e0b",
  "Escalonado":             "#ef4444",
  "Escalonado Transportes": "#a855f7",
  "Devolvido":              "#f59e0b",
  "Engenharia":             "#8b5cf6",
  "Resolvido e fechado":    "#10b981",
};

// Cores fixas por operadora — o restante cai no fallback automático
const CORES_OPERADORA = {
  "oi":    "#eab308",   // amarelo
  "tim":   "#1d4ed8",   // azul forte
  "vivo":  "#a855f7",   // roxo
  "claro": "#ef4444",   // vermelho
  "flux":  "#38bdf8",   // azul claro
};

// Fallback para operadoras sem cor fixada
const CORES_BAR_AUTO = ["#fb923c","#34d399","#f472b6","#818cf8","#a78bfa","#facc15","#2dd4bf"];

/**
 * Retorna a cor de uma operadora:
 * usa CORES_OPERADORA se houver match (case-insensitive),
 * caso contrário pega a próxima cor do pool automático.
 */
function getCoreOperadora(nome, indexAuto) {
  const chave = nome?.toLowerCase().trim() ?? "";
  for (const [key, cor] of Object.entries(CORES_OPERADORA)) {
    if (chave.includes(key)) return cor;
  }
  return CORES_BAR_AUTO[indexAuto % CORES_BAR_AUTO.length];
}

// Mantém compatibilidade nos outros gráficos (status, transporte)
const CORES_BAR = CORES_BAR_AUTO;

// ── Presets de período ────────────────────────
function buildPresets() {
  const hoje = new Date();
  return [
    {
      label: "Hoje",
      inicio: startOfDay(hoje),
      fim:    endOfDay(hoje),
    },
    {
      label: "Ontem",
      inicio: startOfDay(subDays(hoje, 1)),
      fim:    endOfDay(subDays(hoje, 1)),
    },
    {
      label: "Últimos 7 dias",
      inicio: startOfDay(subDays(hoje, 6)),
      fim:    endOfDay(hoje),
    },
    {
      label: "Últimos 30 dias",
      inicio: startOfDay(subDays(hoje, 29)),
      fim:    endOfDay(hoje),
    },
    {
      label: "Esta semana",
      inicio: startOfWeek(hoje, { locale: ptBR }),
      fim:    endOfWeek(hoje,   { locale: ptBR }),
    },
    {
      label: "Semana passada",
      inicio: startOfWeek(subWeeks(hoje, 1), { locale: ptBR }),
      fim:    endOfWeek(subWeeks(hoje, 1),   { locale: ptBR }),
    },
    {
      label: "Este mês",
      inicio: startOfMonth(hoje),
      fim:    endOfMonth(hoje),
    },
    {
      label: "Mês passado",
      inicio: startOfMonth(subMonths(hoje, 1)),
      fim:    endOfMonth(subMonths(hoje, 1)),
    },
    {
      label: "Este trimestre",
      inicio: startOfQuarter(hoje),
      fim:    endOfQuarter(hoje),
    },
    {
      label: "Este ano",
      inicio: startOfYear(hoje),
      fim:    endOfYear(hoje),
    },
    {
      label: "Tudo",
      inicio: null,
      fim:    null,
    },
  ];
}

// ── Componente: Filtro de data ────────────────
function DateRangeFilter({ periodo, onChange }) {
  const presets = useMemo(buildPresets, []);

  // Estado LOCAL dos inputs — separado dos presets para que
  // ao clicar num preset os campos fiquem em branco
  const [inputInicio, setInputInicio] = useState("");
  const [inputFim,    setInputFim]    = useState("");

  const activeLabel = useMemo(() => {
    if (!periodo.inicio && !periodo.fim) return "Tudo";
    const p = presets.find(
      (x) => x.inicio && x.fim &&
        x.inicio.getTime() === periodo.inicio?.getTime() &&
        x.fim.getTime()    === periodo.fim?.getTime()
    );
    return p?.label ?? "Personalizado";
  }, [periodo, presets]);

  // Preset clicado → aplica filtro e limpa os inputs
  function handlePreset(preset) {
    setInputInicio("");
    setInputFim("");
    onChange({ inicio: preset.inicio, fim: preset.fim });
  }

  // Digitação manual → atualiza o input e aplica o filtro
  function handleCustomStart(v) {
    setInputInicio(v);
    const d = v ? startOfDay(utc(v)) : null;
    onChange({ inicio: d, fim: periodo.fim });
  }

  function handleCustomEnd(v) {
    setInputFim(v);
    const d = v ? endOfDay(utc(v)) : null;
    onChange({ inicio: periodo.inicio, fim: d });
  }

  // Limpar tudo
  function handleClear() {
    setInputInicio("");
    setInputFim("");
    onChange({ inicio: null, fim: null });
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Período de análise</span>
        <span className="ml-auto text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
          {activeLabel}
        </span>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const ativo = activeLabel === p.label;
          return (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                ativo
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Inputs de data personalizada — sempre em branco ao usar presets */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">De</span>
          <input
            type="date"
            value={inputInicio}
            placeholder="dd/mm/aaaa"
            onChange={(e) => handleCustomStart(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">até</span>
          <input
            type="date"
            value={inputFim}
            placeholder="dd/mm/aaaa"
            min={inputInicio}
            onChange={(e) => handleCustomEnd(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {(inputInicio || inputFim) && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Limpar datas"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tooltip customizado ───────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold mb-1 text-xs text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Mini stat card ────────────────────────────
function MiniStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`p-2 rounded-md ${color} shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold truncate">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────
function filtrarPorPeriodo(bas, periodo) {
  if (!periodo.inicio && !periodo.fim) return bas;
  return bas.filter((b) => {
    const abertura = typeof b.data_abertura === "string"
      ? utc(b.data_abertura)
      : b.data_abertura;
    if (periodo.inicio && periodo.fim)
      return isWithinInterval(abertura, { start: periodo.inicio, end: periodo.fim });
    if (periodo.inicio) return abertura >= periodo.inicio;
    if (periodo.fim)    return abertura <= periodo.fim;
    return true;
  });
}

function agrupar(bas, campo) {
  return bas.reduce((acc, b) => {
    const k = b[campo] ?? "—";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

// Decide granularidade da linha do tempo
function buildTimeSeries(bas, periodo) {
  if (bas.length === 0) return [];

  // Determina o range real
  const datas = bas.map((b) => utc(b.data_abertura)).sort((a, z) => a - z);
  const inicio = periodo.inicio ?? datas[0];
  const fim    = periodo.fim    ?? datas[datas.length - 1];
  const dias   = differenceInDays(fim, inicio);

  // Granularidade
  if (dias <= 31) {
    // Por dia
    return eachDayOfInterval({ start: startOfDay(inicio), end: endOfDay(fim) }).map((d) => ({
      label:  format(d, "dd/MM", { locale: ptBR }),
      total:  bas.filter((b) => {
        const ab = utc(b.data_abertura);
        return ab >= startOfDay(d) && ab <= endOfDay(d);
      }).length,
    }));
  } else if (dias <= 120) {
    // Por semana
    return eachWeekOfInterval(
      { start: inicio, end: fim },
      { locale: ptBR }
    ).map((w) => ({
      label: `Sem ${format(w, "dd/MM", { locale: ptBR })}`,
      total: bas.filter((b) => {
        const ab = utc(b.data_abertura);
        return ab >= startOfWeek(w, { locale: ptBR }) && ab <= endOfWeek(w, { locale: ptBR });
      }).length,
    }));
  } else {
    // Por mês
    return eachMonthOfInterval({ start: inicio, end: fim }).map((m) => ({
      label: format(m, "MMM/yy", { locale: ptBR }),
      total: bas.filter((b) => {
        const ab = utc(b.data_abertura);
        return ab >= startOfMonth(m) && ab <= endOfMonth(m);
      }).length,
    }));
  }
}

// ── Página ────────────────────────────────────
export function Analytics() {
  const [periodo, setPeriodo] = useState({ inicio: null, fim: null });

  const { data: bas = [], isLoading } = useQuery({
    queryKey: ["bas"],
    queryFn:  fetchBAs,
    staleTime: 30_000,
  });

  const basFiltrados = useMemo(() => filtrarPorPeriodo(bas, periodo), [bas, periodo]);

  // Gráficos
  const porOperadora = useMemo(() =>
    Object.entries(agrupar(basFiltrados, "operadora"))
      .map(([operadora, total]) => ({ operadora, total }))
      .sort((a, b) => b.total - a.total),
  [basFiltrados]);

  const porStatus = useMemo(() =>
    Object.entries(agrupar(basFiltrados, "status"))
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total),
  [basFiltrados]);

  const porPrioridade = useMemo(() =>
    Object.entries(agrupar(basFiltrados, "prioridade"))
      .map(([prioridade, total]) => ({ prioridade, total })),
  [basFiltrados]);

  const timeSeries = useMemo(() => buildTimeSeries(basFiltrados, periodo), [basFiltrados, periodo]);

  // Stats
  const ativos         = basFiltrados.filter((b) => b.status !== "Resolvido e fechado");
  const slaEstourado   = ativos.filter((b) => b.sla_estourado).length;
  const taxaSLA        = ativos.length > 0 ? Math.round((slaEstourado / ativos.length) * 100) : 0;
  const resolvidos     = basFiltrados.filter((b) => b.tempo_resolucao_horas != null);
  const mediaResolucao = resolvidos.length > 0
    ? (resolvidos.reduce((s, b) => s + b.tempo_resolucao_horas, 0) / resolvidos.length).toFixed(1)
    : "—";

  // Label descritivo do período
  const labelPeriodo = useMemo(() => {
    if (!periodo.inicio && !periodo.fim) return "Todo o período";
    if (periodo.inicio && periodo.fim)
      return `${format(periodo.inicio, "dd/MM/yyyy")} → ${format(periodo.fim, "dd/MM/yyyy")}`;
    if (periodo.inicio) return `A partir de ${format(periodo.inicio, "dd/MM/yyyy")}`;
    return `Até ${format(periodo.fim, "dd/MM/yyyy")}`;
  }, [periodo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Carregando Analytics...
      </div>
    );
  }

  const semDados = basFiltrados.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Analytics</h1>
            <p className="text-xs text-muted-foreground">Análise de BAs — NOC</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {basFiltrados.length} de {bas.length} BAs
            {basFiltrados.length !== bas.length && " (filtrado)"}
          </span>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6 max-w-[1400px] mx-auto">

        {/* Filtro de período */}
        <DateRangeFilter periodo={periodo} onChange={setPeriodo} />

        {/* Banner quando sem dados no período */}
        {semDados && (
          <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum BA encontrado em: <strong className="text-foreground">{labelPeriodo}</strong></p>
            <button
              onClick={() => setPeriodo({ inicio: null, fim: null })}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Ver todos os períodos
            </button>
          </div>
        )}

        {!semDados && (
          <>
            {/* Mini stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MiniStat
                icon={Activity}
                label="BAs no período"
                value={basFiltrados.length}
                sub={labelPeriodo}
                color="bg-sky-600"
              />
              <MiniStat
                icon={AlertTriangle}
                label="Taxa SLA Estourado"
                value={`${taxaSLA}%`}
                sub={`${slaEstourado} de ${ativos.length} ativos`}
                color="bg-red-600"
              />
              <MiniStat
                icon={Clock}
                label="Tempo Médio Resolução"
                value={mediaResolucao === "—" ? "—" : `${mediaResolucao}h`}
                sub={`${resolvidos.length} BAs resolvidos`}
                color="bg-amber-500"
              />
              <MiniStat
                icon={CheckCircle2}
                label="Taxa de Resolução"
                value={basFiltrados.length > 0
                  ? `${Math.round((resolvidos.length / basFiltrados.length) * 100)}%`
                  : "—"}
                sub={`${resolvidos.length} de ${basFiltrados.length}`}
                color="bg-emerald-600"
              />
            </div>

            {/* Gráfico de linha temporal */}
            {timeSeries.length > 1 && (
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Volume de Abertura ao Longo do Tempo</h2>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {timeSeries.length <= 31 ? "por dia" : timeSeries.length <= 18 ? "por semana" : "por mês"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{labelPeriodo}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeSeries} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="BAs abertos"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="url(#gradTotal)"
                      dot={{ fill: "#38bdf8", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Barras + Donut lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Gráfico 1: Volume por Operadora */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Volume por Operadora</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Principais ofensores no período</p>

                {porOperadora.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={porOperadora}
                      margin={{ top: 0, right: 10, left: -20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="operadora"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
                      <Bar dataKey="total" name="BAs" radius={[4, 4, 0, 0]}>
                        {porOperadora.map((entry, i) => (
                          <Cell key={i} fill={getCoreOperadora(entry.operadora, i)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Gráfico 2: Donut por Status */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Proporção por Status</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Distribuição no período</p>

                {porStatus.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={porStatus}
                        dataKey="total"
                        nameKey="status"
                        cx="50%"
                        cy="44%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {porStatus.map((entry, i) => (
                          <Cell
                            key={entry.status}
                            fill={CORES_STATUS[entry.status] ?? CORES_BAR[i % CORES_BAR.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(v) => (
                          <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}>{v}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Prioridade + Operadora de Transporte */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Prioridade */}
              <div className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">BAs por Prioridade</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Normal vs. Urgente no período</p>
                <div className="flex gap-6 items-end h-24">
                  {porPrioridade.map((p) => {
                    const max   = Math.max(...porPrioridade.map((x) => x.total), 1);
                    const pct   = (p.total / max) * 100;
                    const color = p.prioridade === "Urgente" ? "bg-red-500" : "bg-sky-500";
                    return (
                      <div key={p.prioridade} className="flex flex-col items-center gap-1.5 flex-1 max-w-[120px]">
                        <span className="text-lg font-bold">{p.total}</span>
                        <div className="w-full bg-secondary rounded-t overflow-hidden" style={{ height: "56px" }}>
                          <div
                            className={`w-full ${color} rounded-t transition-all duration-500`}
                            style={{ height: `${Math.max(pct * 0.56, 3)}px`, marginTop: `${56 - Math.max(pct * 0.56, 3)}px` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground text-center">{p.prioridade}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Operadoras de Transporte */}
              {(() => {
                const comTransporte = basFiltrados.filter((b) => b.operadora_transporte);
                const porOpTrans = Object.entries(agrupar(comTransporte, "operadora_transporte"))
                  .map(([op, total]) => ({ op, total }))
                  .sort((a, b) => b.total - a.total);

                return (
                  <div className="bg-card border border-border rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold">Operadoras de Transporte</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {comTransporte.length} BAs com transporte no período
                    </p>
                    {porOpTrans.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Nenhum BA com operadora de transporte no período.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {porOpTrans.map(({ op, total }, i) => {
                          const max = porOpTrans[0].total;
                          const pct = Math.round((total / max) * 100);
                          return (
                            <div key={op} className="flex items-center gap-3">
                              <span className="text-xs w-16 text-right text-muted-foreground shrink-0">{op}</span>
                              <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    background: getCoreOperadora(op, i),
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold w-6 shrink-0">{total}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
