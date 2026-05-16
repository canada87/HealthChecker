from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models import User, Medication, Illness, MedicationLog, IllnessLog
from schemas import UserCreate, UserUpdate, MedicationCreate, MedicationUpdate, IllnessCreate, IllnessUpdate

def get_users(db: Session):
    return db.query(User).order_by(User.name).all()

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, data: UserCreate):
    user = User(**data.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user(db: Session, user_id: int, data: UserUpdate):
    user = get_user(db, user_id)
    if not user:
        return None
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    if user:
        db.delete(user)
        db.commit()
    return user

def get_medications(db: Session, user_id: int):
    return db.query(Medication).filter(Medication.user_id == user_id).all()

def create_medication(db: Session, user_id: int, data: MedicationCreate):
    med = Medication(user_id=user_id, **data.model_dump())
    db.add(med)
    db.commit()
    db.refresh(med)
    return med

def update_medication(db: Session, med_id: int, data: MedicationUpdate):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        return None
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(med, k, v)
    db.commit()
    db.refresh(med)
    return med

def delete_medication(db: Session, med_id: int):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if med:
        db.delete(med)
        db.commit()
    return med

def get_illnesses(db: Session, user_id: int):
    return db.query(Illness).filter(Illness.user_id == user_id).all()

def create_illness(db: Session, user_id: int, data: IllnessCreate):
    ill = Illness(user_id=user_id, **data.model_dump())
    db.add(ill)
    db.commit()
    db.refresh(ill)
    return ill

def update_illness(db: Session, ill_id: int, data: IllnessUpdate):
    ill = db.query(Illness).filter(Illness.id == ill_id).first()
    if not ill:
        return None
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ill, k, v)
    db.commit()
    db.refresh(ill)
    return ill

def delete_illness(db: Session, ill_id: int):
    ill = db.query(Illness).filter(Illness.id == ill_id).first()
    if ill:
        db.delete(ill)
        db.commit()
    return ill

def log_medication(db: Session, user_id: int, medication_id: int, notes: str = None):
    log = MedicationLog(user_id=user_id, medication_id=medication_id, taken_at=datetime.utcnow(), notes=notes)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

def log_illness(db: Session, user_id: int, illness_id: int, notes: str = None):
    log = IllnessLog(user_id=user_id, illness_id=illness_id, occurred_at=datetime.utcnow(), notes=notes)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

def get_medication_logs(db: Session, user_id: int, year: int = None, month: int = None):
    q = db.query(MedicationLog).filter(MedicationLog.user_id == user_id)
    if year and month:
        start = datetime(year, month, 1)
        end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        q = q.filter(MedicationLog.taken_at >= start, MedicationLog.taken_at < end)
    return q.order_by(MedicationLog.taken_at.desc()).all()

def get_illness_logs(db: Session, user_id: int, year: int = None, month: int = None):
    q = db.query(IllnessLog).filter(IllnessLog.user_id == user_id)
    if year and month:
        start = datetime(year, month, 1)
        end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        q = q.filter(IllnessLog.occurred_at >= start, IllnessLog.occurred_at < end)
    return q.order_by(IllnessLog.occurred_at.desc()).all()

def delete_medication_log(db: Session, log_id: int):
    log = db.query(MedicationLog).filter(MedicationLog.id == log_id).first()
    if log:
        db.delete(log)
        db.commit()
    return log

def delete_illness_log(db: Session, log_id: int):
    log = db.query(IllnessLog).filter(IllnessLog.id == log_id).first()
    if log:
        db.delete(log)
        db.commit()
    return log

def get_medication_stats(db: Session, user_id: int):
    meds = get_medications(db, user_id)
    now = datetime.utcnow()
    result = []
    for med in meds:
        last = db.query(MedicationLog).filter(
            MedicationLog.medication_id == med.id
        ).order_by(MedicationLog.taken_at.desc()).first()
        c7 = db.query(func.count(MedicationLog.id)).filter(
            MedicationLog.medication_id == med.id,
            MedicationLog.taken_at >= now - timedelta(days=7)
        ).scalar()
        c30 = db.query(func.count(MedicationLog.id)).filter(
            MedicationLog.medication_id == med.id,
            MedicationLog.taken_at >= now - timedelta(days=30)
        ).scalar()
        ctot = db.query(func.count(MedicationLog.id)).filter(
            MedicationLog.medication_id == med.id
        ).scalar()
        result.append({
            "id": med.id, "name": med.name, "color": med.color, "emoji": med.emoji,
            "last_at": last.taken_at if last else None,
            "count_7d": c7, "count_30d": c30, "count_total": ctot
        })
    return result

def get_illness_stats(db: Session, user_id: int):
    ills = get_illnesses(db, user_id)
    now = datetime.utcnow()
    result = []
    for ill in ills:
        last = db.query(IllnessLog).filter(
            IllnessLog.illness_id == ill.id
        ).order_by(IllnessLog.occurred_at.desc()).first()
        c7 = db.query(func.count(IllnessLog.id)).filter(
            IllnessLog.illness_id == ill.id,
            IllnessLog.occurred_at >= now - timedelta(days=7)
        ).scalar()
        c30 = db.query(func.count(IllnessLog.id)).filter(
            IllnessLog.illness_id == ill.id,
            IllnessLog.occurred_at >= now - timedelta(days=30)
        ).scalar()
        ctot = db.query(func.count(IllnessLog.id)).filter(
            IllnessLog.illness_id == ill.id
        ).scalar()
        result.append({
            "id": ill.id, "name": ill.name, "color": ill.color, "emoji": ill.emoji,
            "last_at": last.occurred_at if last else None,
            "count_7d": c7, "count_30d": c30, "count_total": ctot
        })
    return result
