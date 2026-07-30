import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  "Aberto":                  { variant: "info",        label: "Aberto" },
  "Transporte":              { variant: "secondary",   label: "Transporte" },
  "Em validação":            { variant: "success",     label: "Em validação" },
  "Escalonado":              { variant: "destructive", label: "Escalonado" },
  "Escalonado Transportes":  { variant: "purple",      label: "Escalonado Transp." },
  "Devolvido":               { variant: "warning",     label: "Devolvido" },
  "Engenharia":              { variant: "orange",      label: "Engenharia" },
  "Resolvido e fechado":     { variant: "success",     label: "Resolvido" },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { variant: "outline", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
