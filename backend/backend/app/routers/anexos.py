import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BA, AnexoBA
from app.schemas import AnexoResponse

router = APIRouter(tags=["Anexos"])

# Pasta onde os arquivos são salvos (relativa à raiz do backend)
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Tamanho máximo por arquivo: 20 MB
MAX_SIZE_BYTES = 20 * 1024 * 1024


def _get_ba_or_404(ba_id: int, db: Session) -> BA:
    ba = db.get(BA, ba_id)
    if not ba:
        raise HTTPException(status_code=404, detail="BA não encontrado.")
    return ba


@router.get("/bas/{ba_id}/anexos", response_model=List[AnexoResponse])
def listar_anexos(ba_id: int, db: Session = Depends(get_db)):
    """Lista os anexos de um BA."""
    _get_ba_or_404(ba_id, db)
    return db.query(AnexoBA).filter(AnexoBA.ba_id == ba_id).order_by(AnexoBA.criado_em).all()


@router.post("/bas/{ba_id}/anexos", response_model=AnexoResponse, status_code=201)
async def upload_anexo(ba_id: int, arquivo: UploadFile = File(...), db: Session = Depends(get_db)):
    """Faz o upload de um arquivo e vincula ao BA."""
    _get_ba_or_404(ba_id, db)

    conteudo = await arquivo.read()
    if len(conteudo) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 20 MB.")

    # Salva com nome único para evitar colisões
    ext       = Path(arquivo.filename).suffix
    nome_uuid = f"{uuid.uuid4().hex}{ext}"
    destino   = UPLOAD_DIR / nome_uuid
    destino.write_bytes(conteudo)

    anexo = AnexoBA(
        ba_id=ba_id,
        nome_original=arquivo.filename,
        nome_salvo=nome_uuid,
        caminho=str(destino),
        tamanho_bytes=len(conteudo),
    )
    db.add(anexo)
    db.commit()
    db.refresh(anexo)
    return anexo


@router.get("/anexos/{anexo_id}/download")
def download_anexo(anexo_id: int, db: Session = Depends(get_db)):
    """Retorna o arquivo para download pelo navegador."""
    anexo = db.get(AnexoBA, anexo_id)
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado.")

    caminho = Path(anexo.caminho)
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor.")

    return FileResponse(
        path=str(caminho),
        filename=anexo.nome_original,
        media_type="application/octet-stream",
    )


@router.delete("/anexos/{anexo_id}", status_code=204)
def deletar_anexo(anexo_id: int, db: Session = Depends(get_db)):
    """Remove o anexo do banco e do disco."""
    anexo = db.get(AnexoBA, anexo_id)
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado.")

    caminho = Path(anexo.caminho)
    if caminho.exists():
        caminho.unlink()

    db.delete(anexo)
    db.commit()
