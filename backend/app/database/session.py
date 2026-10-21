from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings
from backend.app.database.base import Base

# SQLite configuration
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models before calling create_all
    import backend.app.models.repository
    import backend.app.models.scan
    import backend.app.models.finding
    import backend.app.models.analysis
    import backend.app.models.patch
    import backend.app.models.audit
    import backend.app.models.schedule
    Base.metadata.create_all(bind=engine)
