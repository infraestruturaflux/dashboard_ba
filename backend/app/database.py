from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# SQLite para desenvolvimento local. Troque pela URL do seu banco em produção.
DATABASE_URL = "sqlite:///./ba_dashboard.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # necessário apenas para SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency injetada nas rotas para obter uma sessão de banco."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
