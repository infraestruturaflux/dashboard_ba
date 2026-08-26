import { useMemo } from "react";
import { X, Search } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Barra de filtros rápidos: Operadora, CGP e Status.
 * Recebe `bas` para extrair os valores únicos disponíveis.
 */
export function FilterBar({ bas, filtros, onChange }) {
  const operadoras = useMemo(() => {
    const s = new Set(bas.map((b) => b.operadora).filter(Boolean));
    return Array.from(s).sort();
  }, [bas]);

  const cgps = useMemo(() => {
    const s = new Set(bas.map((b) => b.cgp).filter(Boolean));
    return Array.from(s).sort();
  }, [bas]);

  const responsaveis = useMemo(() => {
    const s = new Set(bas.map((b) => b.pessoa_chamado).filter(Boolean));
    return Array.from(s).sort();
  }, [bas]);

  const temFiltro = filtros.operadora || filtros.cgp || filtros.status || filtros.responsavel || filtros.tipoBa || filtros.busca;

  return (
    <div className="flex flex-col gap-2">
      {/* Linha 1: Operadora | Tipo BA | Status */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtros.operadora || ""} onValueChange={(v) => onChange({ ...filtros, operadora: v === "__all__" ? "" : v })}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Operadora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas operadoras</SelectItem>
            {operadoras.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtros.tipoBa || ""} onValueChange={(v) => onChange({ ...filtros, tipoBa: v === "__all__" ? "" : v })}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Tipo de BA" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {["ENTRANTES", "ROTAS", "STIR SHAKEN"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtros.status || ""} onValueChange={(v) => onChange({ ...filtros, status: v === "__all__" ? "" : v })}>
          <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            {["Aberto","Transporte","Em validação","Escalonado","Escalonado Transportes","Devolvido","Engenharia","Indevido","Resolvido e fechado"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Linha 2: CGP | Responsável Chamado | Busca | Limpar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtros.cgp || ""} onValueChange={(v) => onChange({ ...filtros, cgp: v === "__all__" ? "" : v })}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="CGP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os CGPs</SelectItem>
            {cgps.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtros.responsavel || ""} onValueChange={(v) => onChange({ ...filtros, responsavel: v === "__all__" ? "" : v })}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Responsável Chamado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar BA, status, Zammad…"
            value={filtros.busca || ""}
            onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
            className="h-8 w-[200px] text-xs pl-6"
          />
        </div>

        {temFiltro && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => onChange({ operadora: "", cgp: "", status: "", responsavel: "", tipoBa: "", busca: "" })}>
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
