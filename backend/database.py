import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./healthtracker.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    from models import User, Medication, Illness, MedicationLog, IllnessLog, IllnessEpisode
    Base.metadata.create_all(bind=engine)
    _migrate_illness_tables()
    _seed_data()

def _migrate_illness_tables():
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE illness_logs ADD COLUMN episode_id INTEGER REFERENCES illness_episodes(id)",
            "ALTER TABLE illness_logs ADD COLUMN intensity INTEGER",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass

def _seed_data():
    db = SessionLocal()
    try:
        from models import User, Medication, Illness
        if db.query(User).count() == 0:
            admin = User(name="Admin", is_admin=True)
            db.add(admin)
            db.flush()
            med = Medication(user_id=admin.id, name="Tachipirina", color="#4CAF50", emoji="💊")
            ill = Illness(user_id=admin.id, name="Tosse", color="#FF5722", emoji="🤒")
            db.add_all([med, ill])
            db.commit()
    finally:
        db.close()
