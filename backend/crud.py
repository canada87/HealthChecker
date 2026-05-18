from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models import User, Medication, Illness, MedicationLog, IllnessLog, IllnessEpisode
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

def log_medication(db: Session, user_id: int, medication_id: int, notes: str = None, taken_at: datetime = None):
    log = MedicationLog(user_id=user_id, medication_id=medication_id, taken_at=taken_at or datetime.utcnow(), notes=notes)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

def log_illness(db: Session, user_id: int, illness_id: int, notes: str = None, taken_at: datetime = None):
    log = IllnessLog(user_id=user_id, illness_id=illness_id, occurred_at=taken_at or datetime.utcnow(), notes=notes)
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

def update_medication_log(db: Session, log_id: int, taken_at: datetime):
    log = db.query(MedicationLog).filter(MedicationLog.id == log_id).first()
    if log:
        log.taken_at = taken_at
        db.commit()
        db.refresh(log)
    return log

def update_illness_log(db: Session, log_id: int, taken_at: datetime):
    log = db.query(IllnessLog).filter(IllnessLog.id == log_id).first()
    if log:
        log.occurred_at = taken_at
        db.commit()
        db.refresh(log)
    return log

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

# --- Episode CRUD ---

def start_illness_episode(db: Session, user_id: int, illness_id: int, intensity: int, notes: str = None, started_at: datetime = None):
    now = started_at or datetime.utcnow()
    ep = IllnessEpisode(illness_id=illness_id, user_id=user_id, started_at=now)
    db.add(ep)
    db.flush()
    log = IllnessLog(
        user_id=user_id,
        illness_id=illness_id,
        episode_id=ep.id,
        occurred_at=now,
        intensity=intensity,
        notes=notes,
    )
    db.add(log)
    db.commit()
    db.refresh(ep)
    return _sort_episode_logs(ep)

def add_episode_intensity_log(db: Session, episode_id: int, intensity: int, notes: str = None, occurred_at: datetime = None):
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == episode_id).first()
    if not ep:
        return None
    log = IllnessLog(
        user_id=ep.user_id,
        illness_id=ep.illness_id,
        episode_id=ep.id,
        occurred_at=occurred_at or datetime.utcnow(),
        intensity=intensity,
        notes=notes,
    )
    db.add(log)
    db.commit()
    db.refresh(ep)
    return _sort_episode_logs(ep)

def end_illness_episode(db: Session, episode_id: int, ended_at: datetime = None):
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == episode_id).first()
    if not ep:
        return None
    ep.ended_at = ended_at or datetime.utcnow()
    db.commit()
    db.refresh(ep)
    return _sort_episode_logs(ep)

def update_illness_episode(db: Session, episode_id: int, started_at: datetime = None, ended_at: datetime = None):
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == episode_id).first()
    if not ep:
        return None
    if started_at is not None:
        ep.started_at = started_at
    if ended_at is not None:
        ep.ended_at = ended_at
    db.commit()
    db.refresh(ep)
    return _sort_episode_logs(ep)

def update_episode_log(db: Session, log_id: int, intensity: int = None, occurred_at: datetime = None):
    log = db.query(IllnessLog).filter(IllnessLog.id == log_id, IllnessLog.episode_id != None).first()
    if not log:
        return None
    if intensity is not None:
        log.intensity = intensity
    if occurred_at is not None:
        log.occurred_at = occurred_at
    db.commit()
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == log.episode_id).first()
    if not ep:
        return None
    db.refresh(ep)
    return _sort_episode_logs(ep)

def delete_episode_log(db: Session, log_id: int):
    log = db.query(IllnessLog).filter(IllnessLog.id == log_id, IllnessLog.episode_id != None).first()
    if not log:
        return None
    ep_id = log.episode_id
    db.delete(log)
    db.commit()
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == ep_id).first()
    return ep

def delete_illness_episode(db: Session, episode_id: int):
    ep = db.query(IllnessEpisode).filter(IllnessEpisode.id == episode_id).first()
    if ep:
        db.delete(ep)
        db.commit()
    return ep

def _sort_episode_logs(ep):
    ep.logs.sort(key=lambda l: l.occurred_at)
    return ep

def get_illness_episodes(db: Session, user_id: int):
    eps = db.query(IllnessEpisode).filter(IllnessEpisode.user_id == user_id).order_by(IllnessEpisode.started_at.desc()).all()
    for ep in eps:
        _sort_episode_logs(ep)
    return eps

def get_active_illness_episodes(db: Session, user_id: int):
    eps = db.query(IllnessEpisode).filter(
        IllnessEpisode.user_id == user_id,
        IllnessEpisode.ended_at == None,
    ).all()
    for ep in eps:
        _sort_episode_logs(ep)
    return eps

# --- Stats ---

def get_medication_stats(db: Session, user_id: int, window_days: int = 730):
    meds = get_medications(db, user_id)
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)
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

        events_in_window = db.query(MedicationLog.taken_at).filter(
            MedicationLog.medication_id == med.id,
            MedicationLog.taken_at >= window_start
        ).order_by(MedicationLog.taken_at).all()
        avg_freq = None
        if len(events_in_window) >= 2:
            span = (events_in_window[-1][0] - events_in_window[0][0]).total_seconds() / 86400
            avg_freq = span / (len(events_in_window) - 1)

        result.append({
            "id": med.id, "name": med.name, "color": med.color, "emoji": med.emoji,
            "last_at": last.taken_at if last else None,
            "count_7d": c7, "count_30d": c30, "count_total": ctot,
            "avg_frequency_days": avg_freq,
        })
    return result

def get_illness_stats(db: Session, user_id: int, window_days: int = 730):
    ills = get_illnesses(db, user_id)
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)
    result = []
    for ill in ills:
        # Episode-based counts (new style)
        last_ep = db.query(IllnessEpisode).filter(
            IllnessEpisode.illness_id == ill.id
        ).order_by(IllnessEpisode.started_at.desc()).first()

        # Legacy standalone logs (no episode)
        last_old = db.query(IllnessLog).filter(
            IllnessLog.illness_id == ill.id,
            IllnessLog.episode_id == None,
        ).order_by(IllnessLog.occurred_at.desc()).first()

        last_ep_at = last_ep.started_at if last_ep else None
        last_old_at = last_old.occurred_at if last_old else None
        if last_ep_at and last_old_at:
            last_at = max(last_ep_at, last_old_at)
        else:
            last_at = last_ep_at or last_old_at

        def count_ep(days):
            return db.query(func.count(IllnessEpisode.id)).filter(
                IllnessEpisode.illness_id == ill.id,
                IllnessEpisode.started_at >= now - timedelta(days=days)
            ).scalar()

        def count_old(days):
            return db.query(func.count(IllnessLog.id)).filter(
                IllnessLog.illness_id == ill.id,
                IllnessLog.episode_id == None,
                IllnessLog.occurred_at >= now - timedelta(days=days)
            ).scalar()

        ctot_ep = db.query(func.count(IllnessEpisode.id)).filter(IllnessEpisode.illness_id == ill.id).scalar()
        ctot_old = db.query(func.count(IllnessLog.id)).filter(IllnessLog.illness_id == ill.id, IllnessLog.episode_id == None).scalar()

        ep_dates = [r[0] for r in db.query(IllnessEpisode.started_at).filter(
            IllnessEpisode.illness_id == ill.id,
            IllnessEpisode.started_at >= window_start
        ).all()]
        old_dates = [r[0] for r in db.query(IllnessLog.occurred_at).filter(
            IllnessLog.illness_id == ill.id,
            IllnessLog.episode_id == None,
            IllnessLog.occurred_at >= window_start
        ).all()]
        all_dates = sorted(ep_dates + old_dates)
        avg_freq = None
        if len(all_dates) >= 2:
            span = (all_dates[-1] - all_dates[0]).total_seconds() / 86400
            avg_freq = span / (len(all_dates) - 1)

        result.append({
            "id": ill.id, "name": ill.name, "color": ill.color, "emoji": ill.emoji,
            "last_at": last_at,
            "count_7d": count_ep(7) + count_old(7),
            "count_30d": count_ep(30) + count_old(30),
            "count_total": ctot_ep + ctot_old,
            "avg_frequency_days": avg_freq,
        })
    return result
