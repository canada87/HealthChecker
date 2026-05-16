from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud, schemas

router = APIRouter(tags=["medications"])

@router.get("/users/{user_id}/medications", response_model=list[schemas.MedicationOut])
def list_medications(user_id: int, db: Session = Depends(get_db)):
    return crud.get_medications(db, user_id)

@router.post("/users/{user_id}/medications", response_model=schemas.MedicationOut, status_code=201)
def create_medication(user_id: int, data: schemas.MedicationCreate, db: Session = Depends(get_db)):
    return crud.create_medication(db, user_id, data)

@router.put("/medications/{med_id}", response_model=schemas.MedicationOut)
def update_medication(med_id: int, data: schemas.MedicationUpdate, db: Session = Depends(get_db)):
    med = crud.update_medication(db, med_id, data)
    if not med:
        raise HTTPException(404, "Medication not found")
    return med

@router.delete("/medications/{med_id}")
def delete_medication(med_id: int, db: Session = Depends(get_db)):
    med = crud.delete_medication(db, med_id)
    if not med:
        raise HTTPException(404, "Medication not found")
    return {"ok": True}
