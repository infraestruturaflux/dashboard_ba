import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
const utc = (s) => parseISO(s?.endsWith("Z") ? s : s + "Z");
import { ptBR } from "date-fns/locale";
import {
  MessageSquare, Paperclip, Send, X, Download, Trash2,
  Clock, FileText, Upload, ChevronRight,
} from "lucide-react";

import {
  fetchHistorico, adicionarNota, deletarNota,
  fetchAnexos, uploadAnexo, deletarAnexo, urlDownloadAnexo,
} from "@/api/bas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// ── Formato de bytes legível ──────────────────
function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Aba: Histórico ────────────────────────────
function TabHistorico({ ba, toast }) {
  const qc      = useQueryClient();
  const { isAdmin } = useAuth();
  const [texto, setTexto]   = useState("");
  const [autor, setAutor]   = useState("");

  const deleteMutation = useMutation({
    mutationFn: (notaId) => deletarNota(ba.id, notaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historico", ba.id] });
      qc.invalidateQueries({ queryKey: ["bas"] });
      toast({ title: "Entrada removida." });
    },
    onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
  });

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico", ba.id],
    queryFn:  () => fetchHistorico(ba.id),
  });

  const mutation = useMutation({
    mutationFn: () => adicionarNota(ba.id, texto, autor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historico", ba.id] });
      qc.invalidateQueries({ queryKey: ["bas"] });
      setTexto("");
      toast({ title: "Nota adicionada!" });
    },
    onError: () => toast({ title: "Erro ao salvar nota.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {isLoading && (
          <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
        )}
        {!isLoading && historico.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma anotação ainda.
          </div>
        )}
        {historico.map((nota, idx) => (
          <div key={nota.id} className="flex gap-3">
            {/* Linha do tempo */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
              {idx < historico.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            {/* Conteúdo */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                {nota.autor && (
                  <span className="text-xs font-semibold text-primary">{nota.autor}</span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {format(utc(nota.criado_em), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
                {isAdmin && (
                  <button
                    title="Excluir entrada"
                    onClick={() => deleteMutation.mutate(nota.id)}
                    className="ml-auto p-0.5 rounded hover:bg-destructive/20 text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-secondary rounded-md px-3 py-2">
                {nota.texto}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário de nova nota */}
      <div className="border-t border-border pt-3 space-y-2">
        <input
          className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Seu nome (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <Textarea
          placeholder="Descreva a ação tomada, retorno da operadora, atualização do cliente..."
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && texto.trim()) {
              mutation.mutate();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar</span>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!texto.trim() || mutation.isPending}
          >
            <Send className="w-3.5 h-3.5" />
            {mutation.isPending ? "Salvando..." : "Adicionar nota"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Aba: Anexos ───────────────────────────────
function TabAnexos({ ba, toast }) {
  const qc        = useQueryClient();
  const fileRef   = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ["anexos", ba.id],
    queryFn:  () => fetchAnexos(ba.id),
  });

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadAnexo(ba.id, file);
      }
      qc.invalidateQueries({ queryKey: ["anexos", ba.id] });
      qc.invalidateQueries({ queryKey: ["bas"] });
      toast({ title: `${files.length} arquivo(s) enviado(s)!` });
    } catch {
      toast({ title: "Erro no upload.", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const deleteMutation = useMutation({
    mutationFn: deletarAnexo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anexos", ba.id] });
      qc.invalidateQueries({ queryKey: ["bas"] });
      toast({ title: "Anexo removido." });
    },
    onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Botão upload */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dt = e.dataTransfer;
          if (dt.files.length) {
            handleUpload({ target: { files: dt.files }, });
          }
        }}
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading ? "Enviando..." : "Clique ou arraste arquivos aqui"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">Máx. 20 MB por arquivo</p>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Lista de anexos */}
      {isLoading && <p className="text-muted-foreground text-sm text-center">Carregando...</p>}
      {!isLoading && anexos.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">Nenhum anexo ainda.</p>
      )}
      <div className="space-y-2">
        {anexos.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 bg-secondary rounded-md px-3 py-2 group"
          >
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-medium">{a.nome_original}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatBytes(a.tamanho_bytes)} · {format(utc(a.criado_em), "dd/MM/yy HH:mm")}
              </p>
            </div>
            <a
              href={urlDownloadAnexo(a.id)}
              target="_blank"
              rel="noreferrer"
              title="Download"
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              title="Remover"
              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => deleteMutation.mutate(a.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Drawer principal ──────────────────────────
export function TimelineDrawer({ ba, toast, open, onClose }) {
  const [aba, setAba] = useState("historico");

  if (!open || !ba) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel lateral */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-primary">{ba.numero_ba}</span>
              <StatusBadge status={ba.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-[340px]">{ba.cliente}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setAba("historico")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              aba === "historico"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Histórico
            <span className="text-[10px] bg-secondary rounded-full px-1.5">{ba.total_notas}</span>
          </button>
          <button
            onClick={() => setAba("anexos")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              aba === "anexos"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Paperclip className="w-4 h-4" />
            Anexos
            <span className="text-[10px] bg-secondary rounded-full px-1.5">{ba.total_anexos}</span>
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5">
          {aba === "historico" ? (
            <TabHistorico ba={ba} toast={toast} />
          ) : (
            <TabAnexos ba={ba} toast={toast} />
          )}
        </div>
      </div>
    </>
  );
}
