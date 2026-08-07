import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
  headers: { "Content-Type": "application/json" },
});

// ── BAs ──────────────────────────────────────
export const fetchBAs        = () => api.get("/bas/").then((r) => r.data);
export const fetchBAsGestor  = () => api.get("/bas/gestor").then((r) => r.data);
export const criarBA         = (payload) => api.post("/bas/", payload).then((r) => r.data);
export const atualizarStatus = (id, status, operadora_transporte = null, numero_ba_transporte = null, data_transporte = null) =>
  api.put(`/bas/${id}/status`, { status, operadora_transporte, numero_ba_transporte, data_transporte }).then((r) => r.data);

// ── Histórico ────────────────────────────────
export const fetchHistorico = (baId) =>
  api.get(`/bas/${baId}/historico/`).then((r) => r.data);

export const adicionarNota = (baId, texto, autor = "") =>
  api.post(`/bas/${baId}/historico/`, { texto, autor }).then((r) => r.data);

export const deletarNota = (baId, notaId) =>
  api.delete(`/bas/${baId}/historico/${notaId}`).then((r) => r.data);

// ── Anexos ───────────────────────────────────
export const fetchAnexos = (baId) =>
  api.get(`/bas/${baId}/anexos`).then((r) => r.data);

export const uploadAnexo = (baId, file) => {
  const form = new FormData();
  form.append("arquivo", file);
  return api.post(`/bas/${baId}/anexos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const deletarAnexo = (anexoId) =>
  api.delete(`/anexos/${anexoId}`).then((r) => r.data);

export const urlDownloadAnexo = (anexoId) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:8001"}/anexos/${anexoId}/download`;

// ── Delete ───────────────────────────────────
export const deletarBA = (id) =>
  api.delete(`/bas/${id}`).then((r) => r.data);

// ── Bulk Update ──────────────────────────────
export const bulkUpdate = (payload) =>
  api.put("/bas/bulk-update", payload).then((r) => r.data);

// ── Exportação CSV ───────────────────────────
export const exportarCSV = ({ dataInicio, dataFim, status }) => {
  const params = new URLSearchParams();
  if (dataInicio) params.append("data_inicio", new Date(dataInicio).toISOString());
  if (dataFim)    params.append("data_fim",    new Date(dataFim).toISOString());
  if (status && status !== "Todos") params.append("status", status);

  // Abre direto no navegador — o Content-Disposition vai disparar o download
  const base = import.meta.env.VITE_API_URL || "http://localhost:8001";
  window.open(`${base}/exportar/csv?${params.toString()}`, "_blank");
};
