import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, X, RefreshCw, MessageSquare, Truck } from "lucide-react";
import { bulkUpdate } from "@/api/bas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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

// ── Modal de bulk: status ─────────────────────
function BulkStatusModal({ open, onClose, count, onConfirm, loading }) {
  const [status, setStatus]           = useState("");
  const [opTrans, setOpTrans]         = useState("");
  const [outraOp, setOutraOp]         = useState("");
  const [nrBATrans, setNrBATrans]     = useState("");
  const [dataTransporte, setDataTrans] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const precisaTransporte = STATUS_TRANSPORTE.includes(status);
  const opFinal = opTrans === "Outra" ? outraOp.trim() : opTrans;

  function handleConfirm() {
    if (!status) return;
    if (precisaTransporte && (!opFinal || !nrBATrans.trim())) return;
    onConfirm({
      status,
      operadora_transporte: precisaTransporte ? opFinal : null,
      numero_ba_transporte: precisaTransporte ? nrBATrans.trim() : null,
      data_transporte:      precisaTransporte ? new Date(dataTransporte).toISOString() : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar status — {count} BAs</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Novo Status *</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setOpTrans(""); setNrBATrans(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {precisaTransporte && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" /> Operadora de Transporte *
                </Label>
                <Select value={opTrans} onValueChange={(v) => { setOpTrans(v); setOutraOp(""); }}>
                  <SelectTrigger className={!opTrans ? "border-amber-500/50" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORAS_TRANSPORTE.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {opTrans === "Outra" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5 text-amber-400">
                    <Truck className="w-3.5 h-3.5" /> Nome da Operadora *
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
                  <Truck className="w-3.5 h-3.5" /> Nº BA Transporte *
                </Label>
                <Input
                  placeholder="Ex: BA-2024-099"
                  value={nrBATrans}
                  onChange={(e) => setNrBATrans(e.target.value)}
                  className={!nrBATrans ? "border-amber-500/50" : ""}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" /> Data/Hora do Transporte *
                </Label>
                <Input
                  type="datetime-local"
                  value={dataTransporte}
                  onChange={(e) => setDataTrans(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={!status || (precisaTransporte && (!opTrans || !nrBATrans.trim())) || loading}
            >
              {loading ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal de bulk: nota ───────────────────────
function BulkNoteModal({ open, onClose, count, onConfirm, loading }) {
  const [texto, setTexto] = useState("");
  const [autor, setAutor] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar nota — {count} BAs</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Seu nome (opcional)</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Analista NOC..."
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nota *</Label>
            <Textarea
              placeholder="Descreva a ação ou atualização para todos os BAs selecionados..."
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onConfirm({ nota: texto, autor })} disabled={!texto.trim() || loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Barra flutuante principal ─────────────────
export function BulkActionBar({ selectedIds, onClear, toast }) {
  const [modalStatus, setModalStatus] = useState(false);
  const [modalNota,   setModalNota]   = useState(false);
  const qc = useQueryClient();
  const count = selectedIds.length;

  const mutation = useMutation({
    mutationFn: bulkUpdate,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["bas"] });
      qc.invalidateQueries({ queryKey: ["bas-gestor"] });
      toast({ title: `${data.length} BA(s) atualizado(s) com sucesso!` });
      setModalStatus(false);
      setModalNota(false);
      onClear();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail ?? "Erro ao atualizar BAs.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  if (count === 0) return null;

  return (
    <>
      {/* Barra flutuante */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-primary/40 rounded-full px-5 py-3 shadow-2xl shadow-primary/10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold">{count}</span>
          <span className="text-muted-foreground">{count === 1 ? "BA selecionado" : "BAs selecionados"}</span>
        </div>

        <div className="w-px h-5 bg-border" />

        <Button size="sm" variant="secondary" onClick={() => setModalStatus(true)}>
          <RefreshCw className="w-3.5 h-3.5" />
          Alterar Status
        </Button>

        <Button size="sm" variant="secondary" onClick={() => setModalNota(true)}>
          <MessageSquare className="w-3.5 h-3.5" />
          Adicionar Nota
        </Button>

        <button
          onClick={onClear}
          className="p-1 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Cancelar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <BulkStatusModal
        open={modalStatus}
        onClose={() => setModalStatus(false)}
        count={count}
        loading={mutation.isPending}
        onConfirm={({ status, operadora_transporte, numero_ba_transporte, data_transporte }) =>
          mutation.mutate({ ids: selectedIds, status, operadora_transporte, numero_ba_transporte, data_transporte })
        }
      />

      <BulkNoteModal
        open={modalNota}
        onClose={() => setModalNota(false)}
        count={count}
        loading={mutation.isPending}
        onConfirm={({ nota, autor }) =>
          mutation.mutate({ ids: selectedIds, nota, autor })
        }
      />
    </>
  );
}
