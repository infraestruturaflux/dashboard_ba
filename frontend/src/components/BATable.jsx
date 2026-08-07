import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";

// Backend retorna datas em UTC sem o "Z" — força interpretação correta
const utc = (s) => parseISO(s?.endsWith("Z") ? s : s + "Z");
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Copy, Check,
  MessageSquare, Truck, Trash2, AlertTriangle,
} from "lucide-react";

import { deletarBA } from "@/api/bas";
import { getOperadoraClasses } from "@/lib/operadora";
import { StatusBadge } from "@/components/StatusBadge";
import { SLAProgressBar } from "@/components/SLAProgressBar";
import { StatusUpdateDialog } from "@/components/StatusUpdateDialog";
import { TimelineDrawer } from "@/components/TimelineDrawer";
import { BulkActionBar } from "@/components/BulkActionBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Botão de exclusão com confirmação inline ──
function DeleteButton({ ba, toast }) {
  const [confirming, setConfirming] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deletarBA(ba.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bas"] });
      qc.invalidateQueries({ queryKey: ["bas-gestor"] });
      toast({ title: `BA ${ba.numero_ba} excluído.` });
    },
    onError: () => toast({ title: "Erro ao excluir BA.", variant: "destructive" }),
  });

  // Confirmação: dois cliques — primeiro mostra aviso, segundo confirma
  if (confirming) {
    return (
      <div className="flex items-center gap-1 animate-in fade-in duration-150">
        <span className="text-[10px] text-destructive font-medium whitespace-nowrap">
          Confirmar?
        </span>
        <button
          onClick={() => { mutation.mutate(); setConfirming(false); }}
          disabled={mutation.isPending}
          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive text-white hover:bg-destructive/80 transition-colors"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary hover:bg-accent transition-colors"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      title="Excluir BA"
      onClick={() => setConfirming(true)}
      className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Hook clipboard ────────────────────────────
function useCopy(timeout = 1500) {
  const [copiado, setCopiado] = useState(null);
  const copiar = useCallback((valor, key) => {
    const done = () => { setCopiado(key); setTimeout(() => setCopiado(null), timeout); };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(valor).then(done).catch(() => fallback(valor, done));
    } else {
      fallback(valor, done);
    }
  }, [timeout]);
  return { copiado, copiar };
}

function fallback(valor, done) {
  const el = document.createElement("textarea");
  el.value = valor;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand("copy"); done(); } catch (_) {}
  document.body.removeChild(el);
}

// ── Sort icon ─────────────────────────────────
function SortIcon({ coluna, sortState }) {
  if (sortState.coluna !== coluna) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  return sortState.direcao === "asc"
    ? <ArrowUp className="w-3 h-3 text-primary" />
    : <ArrowDown className="w-3 h-3 text-primary" />;
}

// ── Th clicável ───────────────────────────────
function Th({ label, coluna, sortState, onSort, className, children }) {
  const clicavel = !!coluna;
  return (
    <th
      className={cn(
        "px-2 py-2 text-left text-[10px] uppercase text-muted-foreground tracking-wider select-none whitespace-nowrap",
        clicavel && "cursor-pointer hover:text-foreground transition-colors",
        className
      )}
      onClick={clicavel ? () => onSort(coluna) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label ?? children}
        {clicavel && <SortIcon coluna={coluna} sortState={sortState} />}
      </span>
    </th>
  );
}

// ── Célula com botão de cópia ─────────────────
function CopyCell({ valor, copyKey, copiado, copiar, className }) {
  if (!valor) return <td className={cn("px-2 py-2 text-xs text-muted-foreground", className)}>—</td>;
  return (
    <td className={cn("px-2 py-2 text-xs text-muted-foreground group", className)}>
      <div className="flex items-center gap-1.5">
        <span className="truncate">{valor}</span>
        <button
          title="Copiar"
          onClick={() => copiar(valor, copyKey)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent shrink-0"
        >
          {copiado === copyKey
            ? <Check className="w-3 h-3 text-emerald-400" />
            : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </td>
  );
}

// ── Linha ─────────────────────────────────────
function Row({ ba, toast, onOpenTimeline, selected, onToggle }) {
  const { copiado, copiar } = useCopy();

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-accent/20 transition-colors",
        ba.sla_estourado && ba.status !== "Resolvido e fechado" && "bg-red-950/20",
        selected && "bg-primary/10 hover:bg-primary/15"
      )}
    >
      {/* Checkbox */}
      <td className="px-2 py-2 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(ba.id)}
          className="w-4 h-4 rounded border-border bg-transparent accent-primary cursor-pointer"
        />
      </td>

      {/* Nº BA */}
      <td className="px-2 py-2 font-mono font-bold text-primary text-xs whitespace-nowrap">
        {ba.numero_ba}
      </td>

      {/* Cliente */}
      <td className="px-2 py-2 text-xs max-w-[110px]">
        <span className="truncate block" title={ba.cliente}>{ba.cliente}</span>
      </td>

      {/* Operadora */}
      <td className="px-2 py-2 whitespace-nowrap">
        {(() => {
          const { bg, text } = getOperadoraClasses(ba.operadora);
          return (
            <span className={cn("inline-block text-xs font-semibold px-2 py-0.5 rounded", bg, text)}>
              {ba.operadora}
            </span>
          );
        })()}
      </td>

      {/* Status + Operadora Transporte */}
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1">
          <StatusBadge status={ba.status} />
          {ba.operadora_transporte && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
              <Truck className="w-3 h-3" />
              {ba.operadora_transporte}
              {ba.numero_ba_transporte && (
                <span className="font-mono text-amber-300">— {ba.numero_ba_transporte}</span>
              )}
            </span>
          )}
          {ba.tempo_devolucao_horas != null && (
            <div className="mt-1">
              <div className="text-[9px] text-orange-400 mb-0.5">SLA Devolução (24h)</div>
              <div className="relative h-3.5 w-full rounded bg-secondary overflow-hidden min-w-[90px]">
                <div
                  className={cn(
                    "h-full rounded transition-all duration-500",
                    ba.sla_devolucao_estourado ? "bg-red-500 animate-pulse" :
                    ba.sla_devolucao_percentual >= 80 ? "bg-orange-500" :
                    ba.sla_devolucao_percentual >= 50 ? "bg-amber-400" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(ba.sla_devolucao_percentual, 100)}%` }}
                />
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center text-[9px] font-semibold",
                  ba.sla_devolucao_estourado ? "text-red-300" : "text-white"
                )}>
                  {(() => {
                    const h = Math.floor(ba.tempo_devolucao_horas);
                    const m = Math.round((ba.tempo_devolucao_horas - h) * 60);
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                  })()}
                </div>
              </div>
            </div>
          )}
          {ba.tempo_transporte_horas != null && (
            <div className="mt-1">
              <div className="text-[9px] text-amber-400 mb-0.5">SLA Transporte</div>
              <div className="relative h-3.5 w-full rounded bg-secondary overflow-hidden min-w-[90px]">
                <div
                  className={cn(
                    "h-full rounded transition-all duration-500",
                    ba.sla_transporte_estourado ? "bg-red-500 animate-pulse" :
                    ba.sla_transporte_percentual >= 80 ? "bg-orange-500" :
                    ba.sla_transporte_percentual >= 50 ? "bg-amber-400" : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(ba.sla_transporte_percentual, 100)}%` }}
                />
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center text-[9px] font-semibold",
                  ba.sla_transporte_estourado ? "text-red-300" : "text-white"
                )}>
                  {(() => {
                    const h = Math.floor(ba.tempo_transporte_horas);
                    const m = Math.round((ba.tempo_transporte_horas - h) * 60);
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Prioridade */}
      <td className="px-2 py-2">
        <Badge variant={ba.prioridade === "Urgente" ? "destructive" : "secondary"}>
          {ba.prioridade}
        </Badge>
      </td>

      {/* SLA */}
      <td className="px-2 py-2">
        <SLAProgressBar
          tempoAberto={ba.tempo_aberto_horas}
          slaLimite={ba.sla_limite_horas}
          slaEstourado={ba.sla_estourado}
          slaPercentual={ba.sla_percentual}
          status={ba.status}
        />
      </td>

      {/* Abertura */}
      <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {format(utc(ba.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR })}
      </td>

      {/* Zammad */}
      <CopyCell
        valor={ba.ticket_zammad}
        copyKey={`zammad-${ba.id}`}
        copiado={copiado}
        copiar={copiar}
      />

      {/* Nº Origem → Destino + Portabilidade */}
      <td className="px-2 py-2 text-xs text-muted-foreground max-w-[200px] group">
        <div className="min-w-0 space-y-1">
          {/* Origem */}
          <div className="flex items-center gap-1">
            <span className="block truncate font-medium text-foreground/80" title={ba.numero_origem}>
              {ba.numero_origem}
            </span>
            <button
              onClick={() => copiar(ba.numero_origem, `orig-${ba.id}`)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent shrink-0"
            >
              {copiado === `orig-${ba.id}`
                ? <Check className="w-3 h-3 text-emerald-400" />
                : <Copy className="w-3 h-3" />}
            </button>
          </div>
          {ba.portabilidade_origem && (
            <span className={cn(
              "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
              ba.portabilidade_origem === "PORTADO"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-500/20 text-slate-400"
            )}>
              {ba.portabilidade_origem}
            </span>
          )}

          {/* Destino */}
          <div className="flex items-center gap-1 mt-1">
            <span className="block truncate opacity-60" title={ba.numero_destino}>
              → {ba.numero_destino}
            </span>
            <button
              onClick={() => copiar(ba.numero_destino, `dest-${ba.id}`)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent shrink-0"
            >
              {copiado === `dest-${ba.id}`
                ? <Check className="w-3 h-3 text-emerald-400" />
                : <Copy className="w-3 h-3" />}
            </button>
          </div>
          {ba.portabilidade_destino && (
            <span className={cn(
              "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded",
              ba.portabilidade_destino === "PORTADO"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-500/20 text-slate-400"
            )}>
              {ba.portabilidade_destino}
            </span>
          )}
        </div>
      </td>

      {/* Nº BA Ofendida */}
      <td className="px-2 py-2 text-xs">
        {ba.numero_ba_ofendida
          ? <span className="font-mono text-amber-400">{ba.numero_ba_ofendida}</span>
          : <span className="text-muted-foreground/40">—</span>
        }
      </td>

      {/* Responsável BA */}
      <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {ba.responsavel_abertura || <span className="opacity-40">—</span>}
      </td>

      {/* Responsável Chamado */}
      <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">
        {ba.pessoa_chamado || <span className="opacity-40">—</span>}
      </td>

      {/* Última nota */}
      <td className="px-2 py-2 max-w-[180px]">
        <button
          onClick={() => onOpenTimeline(ba)}
          className="group/nota flex items-start gap-1.5 text-left hover:text-foreground transition-colors w-full"
        >
          <MessageSquare className={cn(
            "w-3.5 h-3.5 mt-0.5 shrink-0",
            ba.total_notas > 0 ? "text-primary" : "text-muted-foreground/40"
          )} />
          <span className={cn(
            "text-[11px] line-clamp-2 leading-tight",
            ba.ultima_nota
              ? "text-muted-foreground group-hover/nota:text-foreground"
              : "text-muted-foreground/40 italic"
          )}>
            {ba.ultima_nota ?? "Sem notas"}
          </span>
        </button>
      </td>

      {/* Ações */}
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <StatusUpdateDialog ba={ba} toast={toast} />
          <DeleteButton ba={ba} toast={toast} />
        </div>
      </td>
    </tr>
  );
}

// ── Tabela principal ──────────────────────────
export function BATable({ bas, toast, defaultSort }) {
  const [sortState, setSortState] = useState(defaultSort ?? { coluna: "data_abertura", direcao: "asc" });
  const [drawerBA, setDrawerBA]   = useState(null);
  const [selected, setSelected]   = useState(new Set());

  function toggleSort(coluna) {
    setSortState((prev) =>
      prev.coluna === coluna
        ? { coluna, direcao: prev.direcao === "asc" ? "desc" : "asc" }
        : { coluna, direcao: "asc" }
    );
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === bas.length ? new Set() : new Set(bas.map((b) => b.id))
    );
  }

  const allChecked  = bas.length > 0 && selected.size === bas.length;
  const indeterminate = selected.size > 0 && selected.size < bas.length;

  const basSorted = useMemo(() => {
    if (!sortState.coluna) return bas;
    const mult = sortState.direcao === "asc" ? 1 : -1;
    return [...bas].sort((a, b) => {
      const va = a[sortState.coluna] ?? "";
      const vb = b[sortState.coluna] ?? "";
      if (typeof va === "number") return (va - vb) * mult;
      return String(va).localeCompare(String(vb)) * mult;
    });
  }, [bas, sortState]);

  if (!bas || bas.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16 text-sm">
        Nenhum BA encontrado.
      </div>
    );
  }

  const thProps = { sortState, onSort: toggleSort };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="bg-secondary">
            <tr>
              {/* Checkbox "Select all" */}
              <th className="px-2 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-border bg-transparent accent-primary cursor-pointer"
                />
              </th>
              <Th label="Nº BA"            coluna="numero_ba"          {...thProps} />
              <Th label="Cliente"          coluna="cliente"            {...thProps} />
              <Th label="Operadora"        coluna="operadora"          {...thProps} />
              <Th label="Status"           coluna="status"             {...thProps} />
              <Th label="Prioridade"       coluna="prioridade"         {...thProps} />
              <Th label="Tempo / SLA"      coluna="tempo_aberto_horas" {...thProps} className="min-w-[110px]" />
              <Th label="Abertura"         coluna="data_abertura"      {...thProps} />
              <Th label="Zammad"                                        {...thProps} />
              <Th label="Nº Origem → Destino"                           {...thProps} />
              <Th label="BA Ofendida"         coluna="numero_ba_ofendida" {...thProps} />
              <Th label="Responsável BA"      coluna="responsavel_abertura" {...thProps} />
              <Th label="Responsável Chamado" coluna="pessoa_chamado"       {...thProps} />
              <Th label="Última Nota"                                   {...thProps} />
              <Th label=""                                              {...thProps} />
            </tr>
          </thead>
          <tbody>
            {basSorted.map((ba) => (
              <Row
                key={ba.id}
                ba={ba}
                toast={toast}
                onOpenTimeline={setDrawerBA}
                selected={selected.has(ba.id)}
                onToggle={toggleRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline drawer */}
      <TimelineDrawer
        ba={drawerBA}
        toast={toast}
        open={!!drawerBA}
        onClose={() => setDrawerBA(null)}
      />

      {/* Barra flutuante de bulk actions */}
      <BulkActionBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        toast={toast}
      />
    </>
  );
}
