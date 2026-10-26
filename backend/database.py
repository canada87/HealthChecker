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
    from models import User, Medication, Illness, MedicationLog, IllnessLog, IllnessEpisode, CrisisCategory, Crisis, HabitChange
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
        _seed_crisis_categories(db)
    finally:
        db.close()

def _seed_crisis_categories(db):
    # Users created before the crisis feature get the default categories once
    from models import User, CrisisCategory, Crisis
    from crud import seed_crisis_categories
    for user in db.query(User).all():
        has_any = (
            db.query(CrisisCategory).filter(CrisisCategory.user_id == user.id).count()
            or db.query(Crisis).filter(Crisis.user_id == user.id).count()
        )
        if not has_any:
            seed_crisis_categories(db, user.id)
