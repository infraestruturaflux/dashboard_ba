import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Truck } from "lucide-react";
import { atualizarStatus } from "@/api/bas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  "Aberto", "Transporte", "Em validação",
  "Escalonado", "Escalonado Transportes", "Devolvido", "Engenharia", "Resolvido e fechado",
];

const OPERADORAS_TRANSPORTE = ["Oi", "Vivo", "TIM", "Claro", "Algar", "Outra"];
const STATUS_TRANSPORTE = ["Transporte", "Escalonado Transportes"];

export function StatusUpdateDialog({ ba, toast }) {
  const [open, setOpen]               = useState(false);
  const [novoStatus, setNovoStatus]   = useState(ba.status);
  const [opTransporte, setOpTransporte] = useState(ba.operadora_transporte ?? "");
  const [outraOp, setOutraOp]           = useState("");
  const [nrBATransporte, setNrBATrans]  = useState(ba.numero_ba_transporte ?? "");
  const [dataTransporte, setDataTrans]  = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const qc = useQueryClient();

  const precisaTransporte = STATUS_TRANSPORTE.includes(novoStatus);
  const opFinal = opTransporte === "Outra" ? outraOp.trim() : opTransporte;
  const podeConfirmar = novoStatus !== ba.status || opTransporte !== (ba.operadora_transporte ?? "");
  const invalido = precisaTransporte && (!opFinal || !nrBATransporte.trim());

  const mutation = useMutation({
    mutationFn: () => atualizarStatus(ba.id, novoStatus, precisaTransporte ? opFinal : null, precisaTransporte ? nrBATransporte.trim() : null, precisaTransporte ? new Date(dataTransporte).toISOString() : null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bas"] });
      qc.invalidateQueries({ queryKey: ["bas-gestor"] });
      toast({ title: "Status atualizado!", description: `BA ${ba.numero_ba} → ${novoStatus}` });
      setOpen(false);
    },
    onError: (err) => {
      const msg = err.response?.data?.detail ?? "Erro ao atualizar.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  function handleStatusChange(v) {
    setNovoStatus(v);
    if (!STATUS_TRANSPORTE.includes(v)) {
      setOpTransporte(""); setNrBATrans(""); setOutraOp("");
    } else {
      // Herda dados do transporte anterior se disponíveis
      if (!opTransporte && ba.operadora_transporte) setOpTransporte(ba.operadora_transporte);
      if (!nrBATransporte && ba.numero_ba_transporte) setNrBATrans(ba.numero_ba_transporte);
      setDataTrans(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Alterar status">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Status — {ba.numero_ba}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label>Novo Status</Label>
            <Select value={novoStatus} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operadora de Transporte e Nº BA — condicional */}
          {precisaTransporte && (
            <>
              <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" />
                  Operadora de Transporte *
                </Label>
                <Select value={opTransporte} onValueChange={setOpTransporte}>
                  <SelectTrigger className={!opTransporte ? "border-amber-500/50" : ""}>
                    <SelectValue placeholder="Selecione a operadora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORAS_TRANSPORTE.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!opTransporte && (
                  <p className="text-xs text-amber-400">Obrigatório para este status.</p>
                )}
              </div>

              {opTransporte === "Outra" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5 text-amber-400">
                    <Truck className="w-3.5 h-3.5" />
                    Nome da Operadora *
                  </Label>
                  <Input
                    placeholder="Ex: GT, Embratel, Rede…"
                    value={outraOp}
                    onChange={(e) => setOutraOp(e.target.value)}
                    className={!outraOp ? "border-amber-500/50" : ""}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" />
                  Nº BA Transporte *
                </Label>
                <Input
                  placeholder="Ex: BA-2024-099"
                  value={nrBATransporte}
                  onChange={(e) => setNrBATrans(e.target.value)}
                  className={!nrBATransporte ? "border-amber-500/50" : ""}
                />
                {!nrBATransporte && (
                  <p className="text-xs text-amber-400">Obrigatório para este status.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" />
                  Data/Hora do Transporte *
                </Label>
                <Input
                  type="datetime-local"
                  value={dataTransporte}
                  onChange={(e) => setDataTrans(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !podeConfirmar || invalido}
            >
              {mutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
