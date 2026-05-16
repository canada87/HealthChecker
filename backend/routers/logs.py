from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import crud, schemas

router = APIRouter(tags=["logs"])

@router.post("/medications/{med_id}/log", response_model=schemas.MedicationLogOut, status_code=201)
def log_medication(med_id: int, data: schemas.LogCreate, db: Session = Depends(get_db)):
    from models import Medication
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(404, "Medication not found")
    return crud.log_medication(db, med.user_id, med_id, data.notes, data.taken_at)

@router.post("/illnesses/{ill_id}/log", response_model=schemas.IllnessLogOut, status_code=201)
def log_illness(ill_id: int, data: schemas.LogCreate, db: Session = Depends(get_db)):
    from models import Illness
    ill = db.query(Illness).filter(Illness.id == ill_id).first()
    if not ill:
        raise HTTPException(404, "Illness not found")
    return crud.log_illness(db, ill.user_id, ill_id, data.notes, data.taken_at)

@router.get("/users/{user_id}/medication-logs", response_model=list[schemas.MedicationLogOut])
def get_medication_logs(user_id: int, year: Optional[int] = None, month: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_medication_logs(db, user_id, year, month)

@router.get("/users/{user_id}/illness-logs", response_model=list[schemas.IllnessLogOut])
def get_illness_logs(user_id: int, year: Optional[int] = None, month: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_illness_logs(db, user_id, year, month)

@router.delete("/medication-logs/{log_id}")
def delete_medication_log(log_id: int, db: Session = Depends(get_db)):
    log = crud.delete_medication_log(db, log_id)
    if not log:
        raise HTTPException(404, "Log not found")
    return {"ok": True}

@router.delete("/illness-logs/{log_id}")
def delete_illness_log(log_id: int, db: Session = Depends(get_db)):
    log = crud.delete_illness_log(db, log_id)
    if not log:
        raise HTTPException(404, "Log not found")
    return {"ok": True}

@router.get("/users/{user_id}/stats/medications", response_model=list[schemas.StatItem])
def medication_stats(user_id: int, db: Session = Depends(get_db)):
    return crud.get_medication_stats(db, user_id)

@router.get("/users/{user_id}/stats/illnesses", response_model=list[schemas.StatItem])
def illness_stats(user_id: int, db: Session = Depends(get_db)):
    return crud.get_illness_stats(db, user_id)
