import { useState } from "react";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { exportarCSV } from "@/api/bas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  "Todos", "Aberto", "Transporte", "Em validação",
  "Escalonado", "Escalonado Transportes", "Devolvido", "Engenharia", "Resolvido e fechado",
];

export function ExportModal() {
  const [open, setOpen] = useState(false);
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    dataInicio: "",
    dataFim:    hoje,
    status:     "Todos",
  });

  function handleExport() {
    exportarCSV({
      dataInicio: form.dataInicio ? `${form.dataInicio}T00:00:00` : null,
      dataFim:    form.dataFim    ? `${form.dataFim}T23:59:59`    : null,
      status:     form.status,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" />
          Exportar Relatório
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar Relatório CSV</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={form.dataInicio}
              onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={form.dataFim}
              onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4" />
              Baixar CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
