import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────

class StatusBA(str, enum.Enum):
    ABERTO                 = "Aberto"
    TRANSPORTE             = "Transporte"
    EM_VALIDACAO           = "Em validação"
    ESCALONADO             = "Escalonado"
    ESCALONADO_TRANSPORTES = "Escalonado Transportes"
    RESOLVIDO              = "Resolvido e fechado"
    DEVOLVIDO              = "Devolvido"
    ENGENHARIA             = "Engenharia"
    INDEVIDO               = "Indevido"


class PrioridadeBA(str, enum.Enum):
    NORMAL  = "Normal"
    URGENTE = "Urgente"


# Limites de SLA em horas por prioridade
SLA_HORAS = {
    PrioridadeBA.NORMAL:  72,
    PrioridadeBA.URGENTE: 24,
}


# ─────────────────────────────────────────────
# BA
# ─────────────────────────────────────────────

class BA(Base):
    __tablename__ = "bas"

    id:                    Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_ba:             Mapped[str]          = mapped_column(String(50),  unique=True, nullable=False)
    operadora:             Mapped[str]          = mapped_column(String(100), nullable=False)
    numero_origem:         Mapped[str]          = mapped_column(String(100), nullable=False)
    portabilidade_origem:  Mapped[str | None]   = mapped_column(String(20),  nullable=True)   # PORTADO | NÃO PORTADO
    numero_destino:        Mapped[str]          = mapped_column(String(100), nullable=False)
    portabilidade_destino: Mapped[str | None]   = mapped_column(String(20),  nullable=True)   # PORTADO | NÃO PORTADO
    numero_ba_ofendida:    Mapped[str | None]   = mapped_column(String(50),  nullable=True)   # BA relacionada
    status:                Mapped[StatusBA]     = mapped_column(Enum(StatusBA),     nullable=False, default=StatusBA.ABERTO)
    chamado_com:           Mapped[str | None]   = mapped_column(String(150), nullable=True)
    pessoa_chamado:        Mapped[str]          = mapped_column(String(150), nullable=False)
    responsavel_abertura:  Mapped[str]          = mapped_column(String(150), nullable=False)
    cliente:               Mapped[str]          = mapped_column(String(150), nullable=False)
    ticket_zammad:         Mapped[str]          = mapped_column(String(100), nullable=False)
    data_abertura:         Mapped[datetime]     = mapped_column(DateTime(timezone=True), nullable=False)
    prioridade:            Mapped[PrioridadeBA] = mapped_column(Enum(PrioridadeBA), nullable=False, default=PrioridadeBA.NORMAL)
    cgp:                   Mapped[str]          = mapped_column(String(100), nullable=False)
    descricao:             Mapped[str]          = mapped_column(Text,        nullable=False)
    # Preenchido automaticamente quando status = Transporte ou Escalonado Transportes
    operadora_transporte:  Mapped[str | None]   = mapped_column(String(100), nullable=True)
    numero_ba_transporte:  Mapped[str | None]   = mapped_column(String(50),  nullable=True)
    data_transporte:       Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_devolucao:        Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    origens_extras:        Mapped[str | None]      = mapped_column(Text, nullable=True)  # JSON: [{"numero":"...","portabilidade":"..."}]
    destinos_extras:       Mapped[str | None]      = mapped_column(Text, nullable=True)  # JSON: [{"numero":"...","portabilidade":"..."}]
    tipo_ba:               Mapped[str | None]      = mapped_column(String(50), nullable=True)  # ENTRANTES | ROTAS | STIR SHAKEN

    # Campos de resolução — preenchidos ao fechar o BA
    resolvido_em:           Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tempo_resolucao_horas:  Mapped[float | None]    = mapped_column(Float, nullable=True)

    criado_em:    Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False,
                                                    default=lambda: datetime.now(timezone.utc))
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False,
                                                     default=lambda: datetime.now(timezone.utc),
                                                     onupdate=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    historico: Mapped[list["HistoricoBA"]] = relationship(
        "HistoricoBA", back_populates="ba", cascade="all, delete-orphan",
        order_by="HistoricoBA.criado_em"
    )
    anexos: Mapped[list["AnexoBA"]] = relationship(
        "AnexoBA", back_populates="ba", cascade="all, delete-orphan",
        order_by="AnexoBA.criado_em"
    )


# ─────────────────────────────────────────────
# Histórico (One-to-Many com BA)
# ─────────────────────────────────────────────

class HistoricoBA(Base):
    __tablename__ = "historico_bas"

    id:        Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    ba_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("bas.id"), nullable=False, index=True)
    texto:     Mapped[str]      = mapped_column(Text, nullable=False)
    autor:     Mapped[str | None] = mapped_column(String(100), nullable=True)  # ex: nome do analista
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False,
                                                 default=lambda: datetime.now(timezone.utc))

    ba: Mapped["BA"] = relationship("BA", back_populates="historico")


# ─────────────────────────────────────────────
# Anexos (One-to-Many com BA)
# ─────────────────────────────────────────────

class AnexoBA(Base):
    __tablename__ = "anexos_bas"

    id:             Mapped[int]       = mapped_column(Integer, primary_key=True, autoincrement=True)
    ba_id:          Mapped[int]       = mapped_column(Integer, ForeignKey("bas.id"), nullable=False, index=True)
    nome_original:  Mapped[str]       = mapped_column(String(255), nullable=False)   # nome que o usuário viu
    nome_salvo:     Mapped[str]       = mapped_column(String(255), nullable=False)   # nome no disco (UUID)
    caminho:        Mapped[str]       = mapped_column(String(500), nullable=False)
    tamanho_bytes:  Mapped[int]       = mapped_column(Integer, nullable=False)
    criado_em:      Mapped[datetime]  = mapped_column(DateTime(timezone=True), nullable=False,
                                                       default=lambda: datetime.now(timezone.utc))

    ba: Mapped["BA"] = relationship("BA", back_populates="anexos")
