import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Exibe o tempo decorrido e um alerta visual caso o SLA tenha sido estourado.
 */
export function SLAIndicator({ tempoAberto, slaLimite, slaEstourado, status }) {
  // BAs resolvidos não mostram alerta de SLA
  const resolvido = status === "Resolvido e fechado";

  const horas = Math.floor(tempoAberto);
  const minutos = Math.round((tempoAberto - horas) * 60);
  const label = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

  if (resolvido) {
    return (
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        <Clock className="w-3 h-3" /> {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5",
        slaEstourado
          ? "bg-red-600/20 text-red-400 animate-pulse"
          : "bg-emerald-600/15 text-emerald-400"
      )}
    >
      {slaEstourado ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3" />
      )}
      {label}
      {slaEstourado && <span className="ml-1 opacity-80">/ {slaLimite}h</span>}
    </span>
  );
}
