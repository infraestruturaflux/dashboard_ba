import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BA, SLA_HORAS, StatusBA

router = APIRouter(prefix="/exportar", tags=["Exportação"])


def _calcular_tempo(ba: BA) -> float:
    """Retorna horas decorridas (congeladas se resolvido)."""
    if ba.status == StatusBA.RESOLVIDO and ba.tempo_resolucao_horas is not None:
        return ba.tempo_resolucao_horas
    agora    = datetime.now(timezone.utc)
    abertura = ba.data_abertura
    if abertura.tzinfo is None:
        abertura = abertura.replace(tzinfo=timezone.utc)
    return round((agora - abertura).total_seconds() / 3600, 2)


@router.get("/csv")
def exportar_csv(
    data_inicio: Optional[datetime] = Query(None, description="ISO 8601, ex: 2024-01-01T00:00:00"),
    data_fim:    Optional[datetime] = Query(None, description="ISO 8601, ex: 2024-12-31T23:59:59"),
    status:      Optional[str]      = Query(None, description="Status exato ou 'Todos'"),
    db: Session = Depends(get_db),
):
    """
    Gera um CSV com os BAs filtrados por período e/ou status.
    Todos os parâmetros são opcionais — sem filtros retorna tudo.
    """
    query = db.query(BA)

    if data_inicio:
        if data_inicio.tzinfo is None:
            data_inicio = data_inicio.replace(tzinfo=timezone.utc)
        query = query.filter(BA.data_abertura >= data_inicio)

    if data_fim:
        if data_fim.tzinfo is None:
            data_fim = data_fim.replace(tzinfo=timezone.utc)
        query = query.filter(BA.data_abertura <= data_fim)

    if status and status.lower() not in ("todos", "all", ""):
        query = query.filter(BA.status == status)

    bas = query.order_by(BA.data_abertura.desc()).all()

    # ── Monta o CSV em memória ──
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL)

    # Cabeçalho
    writer.writerow([
        "ID", "Número BA", "BA Ofendida", "Operadora",
        "Número Origem", "Portabilidade Origem",
        "Número Destino", "Portabilidade Destino",
        "Status", "Prioridade", "Cliente", "Pessoa Chamado", "Responsável Abertura",
        "Ticket Zammad", "CGP", "Data Abertura", "Data Resolução",
        "Tempo Total (h)", "SLA Limite (h)", "SLA Estourado", "Descrição",
    ])

    for ba in bas:
        tempo    = _calcular_tempo(ba)
        limite   = SLA_HORAS[ba.prioridade]
        estourou = "Sim" if tempo >= limite and ba.status != StatusBA.RESOLVIDO else "Não"

        writer.writerow([
            ba.id,
            ba.numero_ba,
            ba.numero_ba_ofendida or "",
            ba.operadora,
            ba.numero_origem,
            ba.portabilidade_origem or "",
            ba.numero_destino,
            ba.portabilidade_destino or "",
            ba.status.value,
            ba.prioridade.value,
            ba.cliente,
            ba.pessoa_chamado,
            ba.responsavel_abertura,
            ba.ticket_zammad,
            ba.cgp,
            ba.data_abertura.strftime("%d/%m/%Y %H:%M") if ba.data_abertura else "",
            ba.resolvido_em.strftime("%d/%m/%Y %H:%M") if ba.resolvido_em else "",
            tempo,
            limite,
            estourou,
            ba.descricao.replace("\n", " "),
        ])

    output.seek(0)
    # BOM UTF-8 para o Excel abrir corretamente
    bom = "﻿"
    conteudo = bom + output.getvalue()

    filename = f"bas_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([conteudo]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
