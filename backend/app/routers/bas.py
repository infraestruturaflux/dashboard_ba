from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import BA, HistoricoBA, SLA_HORAS, StatusBA
from app.schemas import BACreate, BAResponse, BAUpdateStatus, BulkUpdatePayload

router = APIRouter(prefix="/bas", tags=["BAs"])

STATUSES_GESTOR    = {StatusBA.ESCALONADO, StatusBA.ESCALONADO_TRANSPORTES}
STATUSES_TRANSPORTE = {StatusBA.TRANSPORTE, StatusBA.ESCALONADO_TRANSPORTES}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _enrich(ba: BA) -> dict:
    limite = SLA_HORAS[ba.prioridade]
    agora  = datetime.now(timezone.utc)

    if ba.status == StatusBA.RESOLVIDO and ba.tempo_resolucao_horas is not None:
        delta_horas = ba.tempo_resolucao_horas
        estourado   = False
    else:
        abertura = ba.data_abertura
        if abertura.tzinfo is None:
            abertura = abertura.replace(tzinfo=timezone.utc)
        delta_horas = (agora - abertura).total_seconds() / 3600
        estourado   = delta_horas >= limite

    percentual  = min(round((delta_horas / limite) * 100, 1), 999)
    ultima_nota = ba.historico[-1].texto if ba.historico else None
    if ultima_nota and len(ultima_nota) > 80:
        ultima_nota = ultima_nota[:77] + "..."

    # SLA de transporte
    sla_transp = {}
    if ba.data_transporte:
        dt = ba.data_transporte
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        horas_transp = (agora - dt).total_seconds() / 3600
        sla_transp = {
            "tempo_transporte_horas":    round(horas_transp, 2),
            "sla_transporte_estourado":  horas_transp >= limite,
            "sla_transporte_percentual": min(round((horas_transp / limite) * 100, 1), 999),
        }

    return {
        **{c.name: getattr(ba, c.name) for c in BA.__table__.columns},
        "tempo_aberto_horas": round(delta_horas, 2),
        "sla_limite_horas":   limite,
        "sla_estourado":      estourado,
        "sla_percentual":     percentual,
        "ultima_nota":        ultima_nota,
        "total_notas":        len(ba.historico),
        "total_anexos":       len(ba.anexos),
        **sla_transp,
    }


def _load(db: Session):
    """Query com eager loading para evitar N+1."""
    return db.query(BA).options(
        selectinload(BA.historico),
        selectinload(BA.anexos),
    )


def _freeze_resolve(ba: BA, agora: datetime) -> None:
    """Congela o tempo de resolução."""
    abertura = ba.data_abertura
    if abertura.tzinfo is None:
        abertura = abertura.replace(tzinfo=timezone.utc)
    ba.tempo_resolucao_horas = round((agora - abertura).total_seconds() / 3600, 2)
    ba.resolvido_em          = agora


def _unfreeze(ba: BA) -> None:
    """Descongela ao reabrir."""
    ba.tempo_resolucao_horas = None
    ba.resolvido_em          = None


# ──────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────

@router.post("/", response_model=BAResponse, status_code=status.HTTP_201_CREATED)
def criar_ba(payload: BACreate, db: Session = Depends(get_db)):
    if db.query(BA).filter(BA.numero_ba == payload.numero_ba).first():
        raise HTTPException(status_code=409, detail=f"BA '{payload.numero_ba}' já existe.")
    ba = BA(**payload.model_dump())
    db.add(ba)
    db.commit()
    ba = _load(db).filter(BA.id == ba.id).one()
    return _enrich(ba)


@router.get("/", response_model=List[BAResponse])
def listar_bas(db: Session = Depends(get_db)):
    return [_enrich(b) for b in _load(db).order_by(BA.data_abertura.desc()).all()]


@router.get("/gestor", response_model=List[BAResponse])
def listar_bas_gestor(db: Session = Depends(get_db)):
    bas = (
        _load(db)
        .filter(BA.status.in_(STATUSES_GESTOR))
        .order_by(BA.data_abertura.desc())
        .all()
    )
    return [_enrich(b) for b in bas]


# ⚠️  bulk-update DEVE ficar antes de /{ba_id} para não ser interpretado como ID
@router.put("/bulk-update", response_model=List[BAResponse])
def bulk_update(payload: BulkUpdatePayload, db: Session = Depends(get_db)):
    """
    Atualiza status e/ou adiciona nota em múltiplos BAs de uma só vez.
    Retorna a lista dos BAs atualizados.
    """
    agora = datetime.now(timezone.utc)

    bas = _load(db).filter(BA.id.in_(payload.ids)).all()
    if not bas:
        raise HTTPException(status_code=404, detail="Nenhum BA encontrado com os IDs informados.")

    for ba in bas:
        # Atualiza status se fornecido
        if payload.status is not None:
            novo = payload.status

            if novo == StatusBA.RESOLVIDO and ba.status != StatusBA.RESOLVIDO:
                _freeze_resolve(ba, agora)
            elif ba.status == StatusBA.RESOLVIDO and novo != StatusBA.RESOLVIDO:
                _unfreeze(ba)

            em_transp_antes = ba.status in STATUSES_TRANSPORTE
            ba.status = novo

            if novo in STATUSES_TRANSPORTE:
                ba.operadora_transporte = payload.operadora_transporte
                ba.numero_ba_transporte = payload.numero_ba_transporte
                if not em_transp_antes:
                    ba.data_transporte = payload.data_transporte or agora
            else:
                ba.operadora_transporte = None
                ba.numero_ba_transporte = None
                ba.data_transporte      = None

        ba.atualizado_em = agora

        # Adiciona nota ao histórico se fornecida
        if payload.nota and payload.nota.strip():
            nota = HistoricoBA(
                ba_id=ba.id,
                texto=payload.nota.strip(),
                autor=payload.autor or "Ação em lote",
            )
            db.add(nota)

    db.commit()

    # Recarrega com relacionamentos atualizados
    bas = _load(db).filter(BA.id.in_(payload.ids)).all()
    return [_enrich(b) for b in bas]


@router.delete("/{ba_id}", status_code=204)
def deletar_ba(ba_id: int, db: Session = Depends(get_db)):
    """Remove permanentemente um BA e todo o seu histórico/anexos (cascade)."""
    ba = db.get(BA, ba_id)
    if not ba:
        raise HTTPException(status_code=404, detail="BA não encontrado.")
    db.delete(ba)
    db.commit()


@router.get("/{ba_id}", response_model=BAResponse)
def obter_ba(ba_id: int, db: Session = Depends(get_db)):
    ba = _load(db).filter(BA.id == ba_id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="BA não encontrado.")
    return _enrich(ba)


@router.put("/{ba_id}/status", response_model=BAResponse)
def atualizar_status(ba_id: int, payload: BAUpdateStatus, db: Session = Depends(get_db)):
    ba = _load(db).filter(BA.id == ba_id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="BA não encontrado.")

    agora = datetime.now(timezone.utc)

    if payload.status == StatusBA.RESOLVIDO and ba.status != StatusBA.RESOLVIDO:
        _freeze_resolve(ba, agora)
    elif ba.status == StatusBA.RESOLVIDO and payload.status != StatusBA.RESOLVIDO:
        _unfreeze(ba)

    em_transporte_antes = ba.status in STATUSES_TRANSPORTE
    ba.status = payload.status
    if payload.status in STATUSES_TRANSPORTE:
        ba.operadora_transporte = payload.operadora_transporte
        ba.numero_ba_transporte = payload.numero_ba_transporte
        if not em_transporte_antes:
            ba.data_transporte = payload.data_transporte or agora
    else:
        ba.operadora_transporte = None
        ba.numero_ba_transporte = None
        ba.data_transporte      = None
    ba.atualizado_em = agora
    db.commit()
    ba = _load(db).filter(BA.id == ba_id).one()
    return _enrich(ba)
