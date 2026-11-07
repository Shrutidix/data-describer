from sqlmodel import SQLModel, create_engine, Session
from app.config import settings

# Ensure data directory exists
settings.data_path

# SQLite engine with thread check disabled for async / multiple workers
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,
)


def init_db():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session

