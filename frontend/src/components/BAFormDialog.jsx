import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Truck, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { criarBA } from "@/api/bas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnalystCombobox } from "@/components/AnalystCombobox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  "Aberto", "Transporte", "Em validação",
  "Escalonado", "Escalonado Transportes", "Devolvido", "Engenharia", "Indevido", "Resolvido e fechado",
];

const PORTABILIDADE_OPTIONS = [
  "NÃO PORTADO", "PORTADO",
  "CNG NÃO PORTADO", "CNG PORTADO",
  "MIGRADO NÃO PORTADO", "PTO",
];
const OPERADORAS_TRANSPORTE = ["Oi", "Vivo", "TIM", "Claro", "Algar", "Outra"];
const STATUS_TRANSPORTE     = ["Transporte", "Escalonado Transportes"];
const CGP_OPTIONS           = ["0924 - Flux", "0845 - Defferari"];

// Regra de validação reutilizável: não vazio após trim
const REQUIRED = {
  required:  "Campo obrigatório.",
  validate: (v) => (v && v.trim() !== "") || "Campo obrigatório.",
};

// Sub-componente de campo com label + erro inline
function Field({ label, error, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label>
        {label} <span className="text-destructive">*</span>
      </Label>
      {children}
      {error && (
        <span className="text-destructive text-xs">{error.message}</span>
      )}
    </div>
  );
}

export function BAFormDialog({ toast }) {
  const [open, setOpen]                 = useState(false);
  const [statusSel, setStatusSel]       = useState("Aberto");
  const [opTransporte, setOpTrans]      = useState("");
  const [outraOp, setOutraOp]           = useState("");
  const [nrBATransporte, setNrBATrans]  = useState("");
  const [cgpSel, setCgpSel]             = useState("");
  const [portOrigem,  setPortOrigem]    = useState("");
  const [portDestino, setPortDestino]   = useState("");
  const [origensExtras,  setOrigensExtras]  = useState([]);  // [{numero:"", portabilidade:""}]
  const [destinosExtras, setDestinosExtras] = useState([]);  // [{numero:"", portabilidade:""}]
  const [prioridadeSel, setPriorid]     = useState("Normal");
  const [chamadoCom, setChamadoCom]               = useState("");
  const [pessoaChamado, setPessoaChamado]         = useState("");
  const [responsavelAbertura, setRespAbertura]    = useState("");
  const qc = useQueryClient();

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      status:        "Aberto",
      prioridade:    "Normal",
      data_abertura: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const precisaTransporte = STATUS_TRANSPORTE.includes(statusSel);

  const mutation = useMutation({
    mutationFn: criarBA,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bas"] });
      toast({ title: "BA criado com sucesso!" });
      // reset completo
      reset();
      setStatusSel("Aberto");
      setOpTrans("");
      setOutraOp("");
      setNrBATrans("");
      setCgpSel("");
      setPriorid("Normal");
      setPortOrigem("");
      setPortDestino("");
      setOrigensExtras([]);
      setDestinosExtras([]);
      setChamadoCom("");
      setPessoaChamado("");
      setRespAbertura("");
      setOpen(false);
    },
    onError: (err) => {
      const detail = err.response?.data?.detail;
      const msg    = Array.isArray(detail)
        ? detail.map((d) => d.msg).join(" | ")
        : (detail ?? "Erro ao criar BA.");
      toast({ title: "Erro ao criar BA", description: msg, variant: "destructive" });
    },
  });

  function handleStatusChange(v) {
    setStatusSel(v);
    setValue("status", v);
    if (!STATUS_TRANSPORTE.includes(v)) { setOpTrans(""); setOutraOp(""); }
  }

  function handleCgpChange(v) {
    setCgpSel(v);
    setValue("cgp", v);
  }

  function handlePrioridadeChange(v) {
    setPriorid(v);
    setValue("prioridade", v);
  }

  function onSubmit(data) {
    if (!cgpSel)                              return toast({ title: "Selecione o CGP.", variant: "destructive" });
    const opFinal = opTransporte === "Outra" ? outraOp.trim() : opTransporte;
    if (precisaTransporte && !opFinal)             return toast({ title: "Selecione a Operadora de Transporte.", variant: "destructive" });
    if (precisaTransporte && !nrBATransporte.trim()) return toast({ title: "Informe o Nº BA Transporte.", variant: "destructive" });
    if (!portOrigem)                          return toast({ title: "Selecione a Portabilidade Origem.", variant: "destructive" });
    if (!portDestino)                         return toast({ title: "Selecione a Portabilidade Destino.", variant: "destructive" });
    if (!pessoaChamado.trim())                return toast({ title: "Informe a Pessoa no Chamado.", variant: "destructive" });
    if (!responsavelAbertura.trim())          return toast({ title: "Informe o Responsável pela Abertura.", variant: "destructive" });

    mutation.mutate({
      ...data,
      cgp:                   cgpSel,
      prioridade:            prioridadeSel,
      status:                statusSel,
      data_abertura:         new Date(data.data_abertura).toISOString(),
      operadora_transporte:  precisaTransporte ? (opTransporte === "Outra" ? outraOp.trim() : opTransporte) : null,
      numero_ba_transporte:  precisaTransporte ? nrBATransporte.trim() : null,
      portabilidade_origem:  portOrigem  || null,
      portabilidade_destino: portDestino || null,
      origens_extras: origensExtras.filter(o => o.numero.trim()).length > 0
        ? JSON.stringify(origensExtras.filter(o => o.numero.trim()))
        : null,
      destinos_extras: destinosExtras.filter(o => o.numero.trim()).length > 0
        ? JSON.stringify(destinosExtras.filter(o => o.numero.trim()))
        : null,
      chamado_com:           chamadoCom.trim() || null,
      pessoa_chamado:        pessoaChamado.trim(),
      responsavel_abertura:  responsavelAbertura.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="w-4 h-4" /> Novo BA</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Abrir Boletim de Anormalidade</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Todos os campos marcados com <span className="text-destructive font-bold">*</span> são obrigatórios.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 mt-2">

          {/* ── Identificação ─────────────────────── */}
          <Field label="Número BA" error={errors.numero_ba}>
            <Input
              placeholder="BA-2024-001"
              {...register("numero_ba", REQUIRED)}
            />
          </Field>

          <Field label="Operadora" error={errors.operadora}>
            <Input
              placeholder="Ex: Vivo, Claro, TIM…"
              {...register("operadora", REQUIRED)}
            />
          </Field>

          {/* ── Circuito ──────────────────────────── */}
          {/* Origem principal */}
          <Field label="Número Origem" error={errors.numero_origem}>
            <Input {...register("numero_origem", REQUIRED)} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label>Portabilidade Origem <span className="text-destructive">*</span></Label>
            <Select value={portOrigem} onValueChange={setPortOrigem}>
              <SelectTrigger className={!portOrigem ? "border-destructive/40" : ""}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {!portOrigem && <span className="text-xs text-muted-foreground">Selecione uma opção.</span>}
          </div>

          {/* Origens extras */}
          {origensExtras.map((o, i) => (
            <div key={i} className="col-span-2 grid grid-cols-2 gap-2 items-end border border-border/50 rounded p-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Origem adicional {i + 2}</Label>
                <Input
                  placeholder="Número origem"
                  value={o.numero}
                  onChange={(e) => {
                    const copy = [...origensExtras];
                    copy[i].numero = e.target.value;
                    setOrigensExtras(copy);
                  }}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Portabilidade</Label>
                  <Select
                    value={o.portabilidade}
                    onValueChange={(v) => {
                      const copy = [...origensExtras];
                      copy[i].portabilidade = v;
                      setOrigensExtras(copy);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => setOrigensExtras(origensExtras.filter((_, j) => j !== i))}
                  className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors mb-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar origem */}
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setOrigensExtras([...origensExtras, { numero: "", portabilidade: "" }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar outra origem
            </button>
          </div>

          <Field label="Número Destino" error={errors.numero_destino}>
            <Input {...register("numero_destino", REQUIRED)} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label>Portabilidade Destino <span className="text-destructive">*</span></Label>
            <Select value={portDestino} onValueChange={setPortDestino}>
              <SelectTrigger className={!portDestino ? "border-destructive/40" : ""}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {!portDestino && <span className="text-xs text-muted-foreground">Selecione uma opção.</span>}
          </div>

          {/* Destinos extras */}
          {destinosExtras.map((o, i) => (
            <div key={i} className="col-span-2 grid grid-cols-2 gap-2 items-end border border-border/50 rounded p-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Destino adicional {i + 2}</Label>
                <Input
                  placeholder="Número destino"
                  value={o.numero}
                  onChange={(e) => {
                    const copy = [...destinosExtras];
                    copy[i].numero = e.target.value;
                    setDestinosExtras(copy);
                  }}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Portabilidade</Label>
                  <Select
                    value={o.portabilidade}
                    onValueChange={(v) => {
                      const copy = [...destinosExtras];
                      copy[i].portabilidade = v;
                      setDestinosExtras(copy);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => setDestinosExtras(destinosExtras.filter((_, j) => j !== i))}
                  className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors mb-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar destino */}
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setDestinosExtras([...destinosExtras, { numero: "", portabilidade: "" }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar outro destino
            </button>
          </div>

          {/* Nº BA Ofendida */}
          <Field label="Nº BA Ofendida" error={errors.numero_ba_ofendida} className="col-span-2">
            <Input {...register("numero_ba_ofendida", REQUIRED)} />
          </Field>

          {/* ── Responsabilidades ─────────────────── */}
          <Field label="Cliente" error={errors.cliente}>
            <Input {...register("cliente", REQUIRED)} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label>Pessoa no Chamado <span className="text-destructive">*</span></Label>
            <AnalystCombobox
              value={pessoaChamado}
              onChange={setPessoaChamado}
              placeholder="Buscar analista…"
            />
            {!pessoaChamado && (
              <span className="text-xs text-muted-foreground">Selecione ou digite o nome.</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>Responsável pela abertura do BA <span className="text-destructive">*</span></Label>
            <AnalystCombobox
              value={responsavelAbertura}
              onChange={setRespAbertura}
              placeholder="Quem está abrindo este BA…"
            />
            {!responsavelAbertura && (
              <span className="text-xs text-muted-foreground">Selecione ou digite o nome.</span>
            )}
          </div>

          {/* ── Ticket e Data ─────────────────────── */}
          <Field label="Ticket Zammad" error={errors.ticket_zammad}>
            <Input
              placeholder="#12345"
              {...register("ticket_zammad", REQUIRED)}
            />
          </Field>

          <Field label="Data de Abertura" error={errors.data_abertura}>
            <Input
              type="datetime-local"
              {...register("data_abertura", { required: "Campo obrigatório." })}
            />
          </Field>

          {/* ── Classificação ─────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label>Prioridade <span className="text-destructive">*</span></Label>
            <Select value={prioridadeSel} onValueChange={handlePrioridadeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal (SLA 72h)</SelectItem>
                <SelectItem value="Urgente">Urgente (SLA 24h)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status <span className="text-destructive">*</span></Label>
            <Select value={statusSel} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operadora de Transporte — condicional */}
          {precisaTransporte && (
            <>
              <div className="flex flex-col gap-1.5 col-span-2 animate-in slide-in-from-top-2 duration-200">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" />
                  Operadora de Transporte <span className="text-destructive">*</span>
                </Label>
                <Select value={opTransporte} onValueChange={setOpTrans}>
                  <SelectTrigger className={!opTransporte ? "border-amber-500/60" : ""}>
                    <SelectValue placeholder="Selecione a operadora de transporte…" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERADORAS_TRANSPORTE.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!opTransporte && (
                  <span className="text-xs text-amber-400">Obrigatório para este status.</span>
                )}
              </div>

              {opTransporte === "Outra" && (
                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label className="flex items-center gap-1.5 text-amber-400">
                    <Truck className="w-3.5 h-3.5" />
                    Nome da Operadora <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: GT, Embratel, Rede…"
                    value={outraOp}
                    onChange={(e) => setOutraOp(e.target.value)}
                    className={!outraOp ? "border-amber-500/60" : ""}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5 col-span-2">
                <Label className="flex items-center gap-1.5 text-amber-400">
                  <Truck className="w-3.5 h-3.5" />
                  Nº BA Transporte <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Ex: BA-2024-099"
                  value={nrBATransporte}
                  onChange={(e) => setNrBATrans(e.target.value)}
                  className={!nrBATransporte ? "border-amber-500/60" : ""}
                />
                {!nrBATransporte && (
                  <span className="text-xs text-amber-400">Obrigatório para este status.</span>
                )}
              </div>
            </>
          )}

          {/* CGP */}
          <div className="flex flex-col gap-1.5 col-span-2">
            <Label>
              CGP <span className="text-destructive">*</span>
            </Label>
            <Select value={cgpSel} onValueChange={handleCgpChange}>
              <SelectTrigger className={!cgpSel ? "border-destructive/40" : ""}>
                <SelectValue placeholder="Selecione o CGP…" />
              </SelectTrigger>
              <SelectContent>
                {CGP_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!cgpSel && (
              <span className="text-xs text-muted-foreground">Selecione um CGP.</span>
            )}
          </div>

          {/* Descrição */}
          <Field label="Descrição" error={errors.descricao} className="col-span-2">
            <Textarea
              placeholder="Descreva o problema, impacto, circuito afetado e ações iniciais tomadas…"
              rows={4}
              {...register("descricao", REQUIRED)}
            />
          </Field>

          {/* Rodapé */}
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || (precisaTransporte && (!opTransporte || !nrBATransporte.trim())) || !cgpSel || !portOrigem || !portDestino}
            >
              {mutation.isPending ? "Salvando…" : "Criar BA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
