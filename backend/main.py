from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.database import Base, engine
from app.routers import bas, historico, anexos, exportacao

# Cria/atualiza todas as tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BA Dashboard - NOC",
    description="API para gerenciamento de Boletins de Anormalidade",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://200.159.177.242:8070",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve os uploads como arquivos estáticos (para preview inline se necessário)
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(bas.router)
app.include_router(historico.router)
app.include_router(anexos.router)
app.include_router(exportacao.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "BA Dashboard API v2"}
