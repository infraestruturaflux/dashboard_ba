from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models import PrioridadeBA, StatusBA

# Status que exigem operadora_transporte preenchida
STATUS_TRANSPORTE = {StatusBA.TRANSPORTE, StatusBA.ESCALONADO_TRANSPORTES}


# ─────────────────────────────────────────────
# Histórico
# ─────────────────────────────────────────────

class HistoricoCreate(BaseModel):
    texto: str
    autor: Optional[str] = None     # autor continua opcional (quem escreveu a nota)


class HistoricoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:        int
    ba_id:     int
    texto:     str
    autor:     Optional[str]        # pode ser null no banco para notas antigas
    criado_em: datetime


# ─────────────────────────────────────────────
# Anexos
# ─────────────────────────────────────────────

class AnexoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             int
    ba_id:          int
    nome_original:  str
    tamanho_bytes:  int
    criado_em:      datetime


# ─────────────────────────────────────────────
# BA — entrada (todos os campos obrigatórios,
#               exceto os condicionais/sistema)
# ─────────────────────────────────────────────

class BACreate(BaseModel):
    numero_ba:            str
    operadora:            str
    numero_origem:         str
    portabilidade_origem:  Optional[str] = None   # PORTADO | NÃO PORTADO
    numero_destino:        str
    portabilidade_destino: Optional[str] = None   # PORTADO | NÃO PORTADO
    numero_ba_ofendida:    Optional[str] = None   # BA relacionada / ofendida
    status:                StatusBA       = StatusBA.ABERTO
    chamado_com:          Optional[str]  = None
    pessoa_chamado:       str
    responsavel_abertura: str           # novo campo obrigatório
    cliente:              str
    ticket_zammad:        str           # agora obrigatório
    data_abertura:        datetime
    prioridade:           PrioridadeBA   = PrioridadeBA.NORMAL
    cgp:                  str           # agora obrigatório
    descricao:            str           # agora obrigatório
    operadora_transporte: Optional[str] = None   # condicional — só exigido via validator
    numero_ba_transporte: Optional[str] = None   # condicional — só exigido quando há transporte
    origens_extras:       Optional[str] = None   # JSON: origens adicionais
    destinos_extras:      Optional[str] = None   # JSON: destinos adicionais

    @field_validator("numero_ba", "operadora", "numero_origem", "numero_destino",
                     "pessoa_chamado", "responsavel_abertura", "cliente",
                     "ticket_zammad", "cgp", "descricao")
    @classmethod
    def nao_pode_ser_vazio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Este campo não pode ser vazio.")
        return v.strip()

    @model_validator(mode="after")
    def valida_operadora_transporte(self):
        if self.status in STATUS_TRANSPORTE and not self.operadora_transporte:
            raise ValueError("operadora_transporte é obrigatória para status de Transporte.")
        return self


class BAUpdateStatus(BaseModel):
    status:               StatusBA
    operadora_transporte: Optional[str]      = None
    numero_ba_transporte: Optional[str]      = None
    data_transporte:      Optional[datetime] = None

    @model_validator(mode="after")
    def valida_op_transporte(self):
        if self.status in STATUS_TRANSPORTE and not self.operadora_transporte:
            raise ValueError("operadora_transporte é obrigatória para status de Transporte.")
        return self


# ─────────────────────────────────────────────
# Bulk update
# ─────────────────────────────────────────────

class BulkUpdatePayload(BaseModel):
    ids:                  List[int]
    status:               Optional[StatusBA] = None
    operadora_transporte: Optional[str]      = None
    numero_ba_transporte: Optional[str]      = None
    data_transporte:      Optional[datetime] = None
    nota:                 Optional[str]      = None
    autor:                Optional[str]      = None

    @field_validator("ids")
    @classmethod
    def ids_nao_vazios(cls, v):
        if not v:
            raise ValueError("A lista de IDs não pode ser vazia.")
        return v


# ─────────────────────────────────────────────
# BA — saída
# ─────────────────────────────────────────────

class BAResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:                    int
    numero_ba:             str
    operadora:             str
    numero_origem:         str
    portabilidade_origem:  Optional[str]
    numero_destino:        str
    portabilidade_destino: Optional[str]
    numero_ba_ofendida:    Optional[str]
    status:                StatusBA
    chamado_com:           Optional[str]
    pessoa_chamado:        str
    responsavel_abertura:  str           # novo campo
    cliente:               str
    ticket_zammad:         str
    data_abertura:         datetime
    prioridade:            PrioridadeBA
    cgp:                   str
    descricao:             str
    operadora_transporte:  Optional[str]
    numero_ba_transporte:  Optional[str]
    data_transporte:       Optional[datetime]
    data_devolucao:        Optional[datetime]
    origens_extras:        Optional[str]
    destinos_extras:       Optional[str]
    resolvido_em:          Optional[datetime]
    tempo_resolucao_horas: Optional[float]
    criado_em:             datetime
    atualizado_em:         datetime

    # Calculados em runtime
    tempo_aberto_horas:    float
    sla_limite_horas:      int
    sla_estourado:         bool
    sla_percentual:        float

    # SLA de transporte (calculado quando há data_transporte)
    tempo_transporte_horas:    Optional[float] = None
    sla_transporte_estourado:  Optional[bool]  = None
    sla_transporte_percentual: Optional[float] = None

    # SLA de devolução — 24h fixo a partir de data_devolucao
    tempo_devolucao_horas:    Optional[float] = None
    sla_devolucao_estourado:  Optional[bool]  = None
    sla_devolucao_percentual: Optional[float] = None

    # Agregados de relacionamentos
    ultima_nota:           Optional[str] = None
    total_notas:           int           = 0
    total_anexos:          int           = 0
