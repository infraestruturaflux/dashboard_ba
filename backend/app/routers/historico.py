from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BA, HistoricoBA
from app.schemas import HistoricoCreate, HistoricoResponse

router = APIRouter(prefix="/bas/{ba_id}/historico", tags=["Histórico"])


def _get_ba_or_404(ba_id: int, db: Session) -> BA:
    ba = db.get(BA, ba_id)
    if not ba:
        raise HTTPException(status_code=404, detail="BA não encontrado.")
    return ba


@router.get("/", response_model=List[HistoricoResponse])
def listar_historico(ba_id: int, db: Session = Depends(get_db)):
    """Retorna o histórico de ações de um BA em ordem cronológica."""
    _get_ba_or_404(ba_id, db)
    return (
        db.query(HistoricoBA)
        .filter(HistoricoBA.ba_id == ba_id)
        .order_by(HistoricoBA.criado_em.asc())
        .all()
    )


@router.post("/", response_model=HistoricoResponse, status_code=201)
def adicionar_nota(ba_id: int, payload: HistoricoCreate, db: Session = Depends(get_db)):
    """Adiciona uma nova nota/ação ao histórico do BA."""
    _get_ba_or_404(ba_id, db)

    if not payload.texto.strip():
        raise HTTPException(status_code=422, detail="O texto da nota não pode ser vazio.")

    nota = HistoricoBA(ba_id=ba_id, texto=payload.texto.strip(), autor=payload.autor)
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return nota
