import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Barra de progresso do SLA com texto sobreposto.
 * Cores: verde (0–50%) → amarelo (50–80%) → laranja (80–100%) → vermelho pulsante (>100%)
 */
export function SLAProgressBar({ tempoAberto, slaLimite, slaEstourado, slaPercentual, status }) {
  const resolvido = status === "Resolvido e fechado";

  const horas   = Math.floor(tempoAberto);
  const minutos = Math.round((tempoAberto - horas) * 60);
  const label   = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

  // Percentual clampeado para a barra (max visual = 100%)
  const pct = Math.min(slaPercentual, 100);

  // Cor da barra baseada no percentual
  const barColor = resolvido
    ? "bg-slate-500"
    : slaEstourado
      ? "bg-red-500"
      : pct >= 80
        ? "bg-orange-500"
        : pct >= 50
          ? "bg-amber-400"
          : "bg-emerald-500";

  const textColor = resolvido
    ? "text-slate-400"
    : slaEstourado
      ? "text-red-300"
      : pct >= 80
        ? "text-orange-300"
        : pct >= 50
          ? "text-amber-300"
          : "text-emerald-300";

  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      {/* Barra de progresso */}
      <div className="relative h-5 w-full rounded bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded transition-all duration-500", barColor, slaEstourado && "animate-pulse")}
          style={{ width: `${pct}%` }}
        />
        {/* Texto sobre a barra */}
        <div className={cn("absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-semibold", textColor)}>
          {resolvido ? (
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          ) : slaEstourado ? (
            <AlertTriangle className="w-3 h-3 shrink-0" />
          ) : (
            <Clock className="w-3 h-3 shrink-0" />
          )}
          {label}
        </div>
      </div>

      {/* Legenda: tempo / limite */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>{resolvido ? "Resolvido" : slaEstourado ? "SLA estourado" : `${Math.round(slaPercentual)}%`}</span>
        <span>/ {slaLimite}h</span>
      </div>
    </div>
  );
}
