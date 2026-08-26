import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Truck, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { criarBA } from "@/api/bas";
import { cn } from "@/lib/utils";
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

const TIPO_BA_OPTIONS = ["ENTRANTES", "ROTAS", "STIR SHAKEN"];

const PORTABILIDADE_OPTIONS = [
  "NÃO PORTADO", "PORTADO",
  "CNG NÃO PORTADO", "CNG PORTADO",
  "MIGRADO NÃO PORTADO", "PTO",
];
const OPERADORAS_BA         = ["VIVO", "TIM", "CLARO", "Outra"];
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
  const [tipoBaSel, setTipoBaSel]       = useState("");
  const [statusSel, setStatusSel]       = useState("Aberto");
  const [operadoraSel, setOperadoraSel] = useState("");
  const [outraOperadora, setOutraOperadora] = useState("");
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
      setTipoBaSel("");
      setStatusSel("Aberto");
      setOperadoraSel("");
      setOutraOperadora("");
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
    if (!tipoBaSel)                           return toast({ title: "Selecione o Tipo de BA.", variant: "destructive" });
    const opBAFinal = operadoraSel === "Outra" ? outraOperadora.trim() : operadoraSel;
    if (!opBAFinal)                           return toast({ title: "Selecione a Operadora.", variant: "destructive" });
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
      operadora:             opBAFinal,
      tipo_ba:               tipoBaSel,
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

        {/* grid-cols-6: permite 3 iguais na 1ª linha (2+2+2) e 50/50 no resto (3+3) */}
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-6 gap-4 mt-2">

          {/* ── Identificação: Número BA | Operadora | Tipo BA ── */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Número BA <span className="text-destructive">*</span></Label>
            <Input placeholder="BA-2024-001" {...register("numero_ba", REQUIRED)} />
            {errors.numero_ba && <span className="text-destructive text-xs">{errors.numero_ba.message}</span>}
          </div>

          {/* Operadora */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Operadora <span className="text-destructive">*</span></Label>
            <Select value={operadoraSel} onValueChange={setOperadoraSel}>
              <SelectTrigger className={cn(!operadoraSel ? "border-destructive/40" : "")}>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {OPERADORAS_BA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            {!operadoraSel && <span className="text-xs text-muted-foreground">Selecione uma operadora.</span>}
          </div>

          {/* Tipo de BA */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Tipo de BA <span className="text-destructive">*</span></Label>
            <Select value={tipoBaSel} onValueChange={setTipoBaSel}>
              <SelectTrigger className={!tipoBaSel ? "border-destructive/40" : ""}>
                <SelectValue placeholder="Selecione o tipo…" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_BA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {!tipoBaSel && <span className="text-xs text-muted-foreground">Selecione um tipo.</span>}
          </div>

          {/* Campo livre quando "Outra" operadora */}
          {operadoraSel === "Outra" && (
            <div className="col-span-6 flex flex-col gap-1.5">
              <Label>Nome da Operadora <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Algar, Nextel, Embratel…"
                value={outraOperadora}
                onChange={(e) => setOutraOperadora(e.target.value)}
                className={!outraOperadora ? "border-destructive/40" : ""}
              />
            </div>
          )}

          {/* ── Circuito: 50/50 ── */}
          {/* Número Origem */}
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label>Número Origem <span className="text-destructive">*</span></Label>
            <Input {...register("numero_origem", REQUIRED)} />
            {errors.numero_origem
              ? <span className="text-destructive text-xs">{errors.numero_origem.message}</span>
              : <button
                  type="button"
                  onClick={() => setOrigensExtras([...origensExtras, { numero: "", portabilidade: "" }])}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline self-start"
                >
                  <Plus className="w-3 h-3" /> Adicionar outra origem
                </button>
            }
          </div>

          {/* Portabilidade Origem */}
          <div className="col-span-3 flex flex-col gap-1.5">
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
            <div key={i} className="col-span-6 grid grid-cols-6 gap-2 items-end border border-border/50 rounded p-2">
              <div className="col-span-3 flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Origem adicional {i + 2}</Label>
                <Input
                  placeholder="Número origem"
                  value={o.numero}
                  onChange={(e) => { const c=[...origensExtras]; c[i].numero=e.target.value; setOrigensExtras(c); }}
                />
              </div>
              <div className="col-span-3 flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Portabilidade</Label>
                  <Select value={o.portabilidade} onValueChange={(v) => { const c=[...origensExtras]; c[i].portabilidade=v; setOrigensExtras(c); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <button type="button" onClick={() => setOrigensExtras(origensExtras.filter((_,j)=>j!==i))}
                  className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors mb-0.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Número Destino */}
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label>Número Destino <span className="text-destructive">*</span></Label>
            <Input {...register("numero_destino", REQUIRED)} />
            {errors.numero_destino
              ? <span className="text-destructive text-xs">{errors.numero_destino.message}</span>
              : <button
                  type="button"
                  onClick={() => setDestinosExtras([...destinosExtras, { numero: "", portabilidade: "" }])}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline self-start"
                >
                  <Plus className="w-3 h-3" /> Adicionar outro destino
                </button>
            }
          </div>

          {/* Portabilidade Destino */}
          <div className="col-span-3 flex flex-col gap-1.5">
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
            <div key={i} className="col-span-6 grid grid-cols-6 gap-2 items-end border border-border/50 rounded p-2">
              <div className="col-span-3 flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Destino adicional {i + 2}</Label>
                <Input
                  placeholder="Número destino"
                  value={o.numero}
                  onChange={(e) => { const c=[...destinosExtras]; c[i].numero=e.target.value; setDestinosExtras(c); }}
                />
              </div>
              <div className="col-span-3 flex gap-2 items-end">
                <div className="flex-1 flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Portabilidade</Label>
                  <Select value={o.portabilidade} onValueChange={(v) => { const c=[...destinosExtras]; c[i].portabilidade=v; setDestinosExtras(c); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>{PORTABILIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <button type="button" onClick={() => setDestinosExtras(destinosExtras.filter((_,j)=>j!==i))}
                  className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors mb-0.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Nº BA Ofendida */}
          <Field label="Nº BA Ofendida" error={errors.numero_ba_ofendida} className="col-span-6">
            <Input {...register("numero_ba_ofendida", REQUIRED)} />
          </Field>

          {/* ── Responsabilidades ─────────────────── */}
          <Field label="Cliente" error={errors.cliente} className="col-span-2">
            <Input {...register("cliente", REQUIRED)} />
          </Field>

          <div className="col-span-2 flex flex-col gap-1.5">
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

          <div className="col-span-2 flex flex-col gap-1.5">
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
          <Field label="Ticket Zammad" error={errors.ticket_zammad} className="col-span-3">
            <Input
              placeholder="#12345"
              {...register("ticket_zammad", REQUIRED)}
            />
          </Field>

          <Field label="Data de Abertura" error={errors.data_abertura} className="col-span-3">
            <Input
              type="datetime-local"
              {...register("data_abertura", { required: "Campo obrigatório." })}
            />
          </Field>

          {/* ── Classificação ─────────────────────── */}
          <div className="col-span-3 flex flex-col gap-1.5">
            <Label>Prioridade <span className="text-destructive">*</span></Label>
            <Select value={prioridadeSel} onValueChange={handlePrioridadeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal (SLA 72h)</SelectItem>
                <SelectItem value="Urgente">Urgente (SLA 24h)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-3 flex flex-col gap-1.5">
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
              <div className="col-span-6 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
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
                <div className="col-span-6 flex flex-col gap-1.5">
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

              <div className="col-span-6 flex flex-col gap-1.5">
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
          <div className="col-span-6 flex flex-col gap-1.5">
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
          <Field label="Descrição" error={errors.descricao} className="col-span-6">
            <Textarea
              placeholder="Descreva o problema, impacto, circuito afetado e ações iniciais tomadas…"
              rows={4}
              {...register("descricao", REQUIRED)}
            />
          </Field>

          {/* Rodapé */}
          <div className="col-span-6 flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !tipoBaSel || !operadoraSel || (operadoraSel === "Outra" && !outraOperadora.trim()) || (precisaTransporte && (!opTransporte || !nrBATransporte.trim())) || !cgpSel || !portOrigem || !portDestino}
            >
              {mutation.isPending ? "Salvando…" : "Criar BA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
