import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Activity, Archive, Ban } from "lucide-react";

import { fetchBAs, fetchBAsGestor } from "@/api/bas";
import { BATable } from "@/components/BATable";
import { BAFormDialog } from "@/components/BAFormDialog";
import { FilterBar } from "@/components/FilterBar";
import { ExportModal } from "@/components/ExportModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

// ── Card de estatística ───────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-md ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Filtro aplicado sobre a lista ─────────────
function aplicarFiltros(bas, filtros) {
  const busca = filtros.busca?.toLowerCase().trim();
  return bas.filter((b) => {
    if (filtros.operadora  && b.operadora      !== filtros.operadora)  return false;
    if (filtros.cgp        && b.cgp            !== filtros.cgp)        return false;
    if (filtros.status     && b.status         !== filtros.status)     return false;
    if (filtros.responsavel && b.pessoa_chamado !== filtros.responsavel) return false;
    if (busca) {
      const campos = [b.numero_ba, b.status, b.ticket_zammad, b.cliente, b.numero_origem, b.numero_destino, b.numero_ba_ofendida, b.numero_ba_transporte, b.pessoa_chamado, b.responsavel_abertura];
      if (!campos.some((c) => c?.toLowerCase().includes(busca))) return false;
    }
    return true;
  });
}

// ── Dashboard ─────────────────────────────────
export function Dashboard({ toast }) {
  const { isAdmin } = useAuth();
  const [filtros, setFiltros] = useState({ operadora: "", cgp: "", status: "", responsavel: "", busca: "" });

  const { data: bas = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["bas"],
    queryFn:  fetchBAs,
    refetchInterval: 60_000,
  });

  const { data: basGestor = [], isLoading: loadingGestor } = useQuery({
    queryKey: ["bas-gestor"],
    queryFn:  fetchBAsGestor,
    refetchInterval: 60_000,
  });

  // Stats sempre sobre todos os BAs (sem filtro aplicado)
  const abertos      = bas.filter((b) => b.status !== "Resolvido e fechado").length;
  const slaEstourado = bas.filter((b) => b.sla_estourado && b.status !== "Resolvido e fechado").length;
  const urgentes     = bas.filter((b) => b.prioridade === "Urgente" && b.status !== "Resolvido e fechado").length;
  const resolvidos   = bas.filter((b) => b.status === "Resolvido e fechado").length;

  // Separação por estado
  const basAtivos     = useMemo(() => bas.filter((b) => b.status !== "Resolvido e fechado" && b.status !== "Indevido"), [bas]);
  const basResolvidos = useMemo(() => bas.filter((b) => b.status === "Resolvido e fechado"), [bas]);
  const basIndevidos  = useMemo(() => bas.filter((b) => b.status === "Indevido"), [bas]);

  // Busca global — quando busca ativa, une todos os BAs
  const todosBas = useMemo(() => bas, [bas]);
  const buscaAtiva = !!filtros.busca?.trim();

  // Filtros aplicados para exibição
  const basFiltrados           = useMemo(() => aplicarFiltros(basAtivos,     filtros), [basAtivos,     filtros]);
  const basGestorFiltrados     = useMemo(() => aplicarFiltros(basGestor,     filtros), [basGestor,     filtros]);
  const basResolvidosFiltrados = useMemo(() => aplicarFiltros(basResolvidos, filtros), [basResolvidos, filtros]);
  const basIndevidosFiltrados  = useMemo(() => aplicarFiltros(basIndevidos,  filtros), [basIndevidos,  filtros]);
  const basGlobalFiltrados     = useMemo(() => aplicarFiltros(todosBas,      filtros), [todosBas,      filtros]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">BA Dashboard</h1>
            <p className="text-xs text-muted-foreground">Network Operations Center</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportModal />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <BAFormDialog toast={toast} />
        </div>
      </header>

      <main className="px-6 py-6 space-y-5 max-w-[1800px] mx-auto">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Clock}         label="BAs em Aberto"   value={abertos}      color="bg-sky-600" />
          <StatCard icon={AlertTriangle} label="SLA Estourado"   value={slaEstourado} color="bg-red-600" />
          <StatCard icon={Activity}      label="Urgentes Ativos" value={urgentes}     color="bg-amber-500" />
          <StatCard icon={CheckCircle2}  label="Resolvidos"      value={resolvidos}   color="bg-emerald-600" />
        </div>

        {/* Tabs: NOC / Gestor */}
        <Tabs defaultValue="noc">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <TabsList>
              <TabsTrigger value="noc">
                <Activity className="w-4 h-4" />
                Visão NOC
                {basAtivos.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 py-0.5">
                    {basAtivos.length}
                  </span>
                )}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="gestor">
                  <AlertTriangle className="w-4 h-4" />
                  Visão Gestor
                  {basGestor.length > 0 && (
                    <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5 py-0.5">
                      {basGestor.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="resolvidos">
                <Archive className="w-4 h-4" />
                BAs Resolvidos
                {basResolvidos.length > 0 && (
                  <span className="ml-1 bg-emerald-600 text-white rounded-full text-[10px] px-1.5 py-0.5">
                    {basResolvidos.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="indevidos">
                <Ban className="w-4 h-4" />
                BAs Indevidos
                {basIndevidos.length > 0 && (
                  <span className="ml-1 bg-slate-500 text-white rounded-full text-[10px] px-1.5 py-0.5">
                    {basIndevidos.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Filtros rápidos */}
            <FilterBar bas={bas} filtros={filtros} onChange={setFiltros} />
          </div>

          {/* Busca global — quando ativa, mostra resultados de todos os BAs */}
          {buscaAtiva && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                Busca global: <strong>{basGlobalFiltrados.length}</strong> resultado(s) em todos os BAs
              </p>
              <BATable bas={basGlobalFiltrados} toast={toast} />
            </div>
          )}

          {/* Visão NOC — apenas BAs ativos */}
          <TabsContent value="noc">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-16">Carregando...</div>
            ) : (
              <>
                {basFiltrados.length < basAtivos.length && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Exibindo <strong>{basFiltrados.length}</strong> de {basAtivos.length} BAs ativos
                  </p>
                )}
                <BATable bas={basFiltrados} toast={toast} />
              </>
            )}
          </TabsContent>

          {/* BAs Resolvidos/Fechados */}
          <TabsContent value="resolvidos">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-16">Carregando...</div>
            ) : basResolvidosFiltrados.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  {basResolvidos.length > 0
                    ? "Nenhum BA resolvido com os filtros aplicados."
                    : "Nenhum BA resolvido/fechado ainda."}
                </p>
              </div>
            ) : (
              <>
                {basResolvidosFiltrados.length < basResolvidos.length && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Exibindo <strong>{basResolvidosFiltrados.length}</strong> de {basResolvidos.length} BAs resolvidos
                  </p>
                )}
                <BATable bas={basResolvidosFiltrados} toast={toast} />
              </>
            )}
          </TabsContent>

          {/* BAs Indevidos */}
          <TabsContent value="indevidos">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-16">Carregando...</div>
            ) : basIndevidosFiltrados.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Ban className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  {basIndevidos.length > 0 ? "Nenhum BA indevido com os filtros aplicados." : "Nenhum BA indevido ainda."}
                </p>
              </div>
            ) : (
              <BATable bas={basIndevidosFiltrados} toast={toast} />
            )}
          </TabsContent>

          {/* Visão Gestor — apenas ADMIN */}
          {isAdmin && <TabsContent value="gestor">
            {loadingGestor ? (
              <div className="text-center text-muted-foreground py-16">Carregando...</div>
            ) : basGestorFiltrados.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  {basGestor.length > 0
                    ? "Nenhum BA escalonado com os filtros aplicados."
                    : "Nenhum BA escalonado no momento."}
                </p>
              </div>
            ) : (
              <BATable bas={basGestorFiltrados} toast={toast} defaultSort={{ coluna: "sla_percentual", direcao: "desc" }} />
            )}
          </TabsContent>}
        </Tabs>
      </main>
    </div>
  );
}
