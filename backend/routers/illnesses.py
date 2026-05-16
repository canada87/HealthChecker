from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud, schemas

router = APIRouter(tags=["illnesses"])

@router.get("/users/{user_id}/illnesses", response_model=list[schemas.IllnessOut])
def list_illnesses(user_id: int, db: Session = Depends(get_db)):
    return crud.get_illnesses(db, user_id)

@router.post("/users/{user_id}/illnesses", response_model=schemas.IllnessOut, status_code=201)
def create_illness(user_id: int, data: schemas.IllnessCreate, db: Session = Depends(get_db)):
    return crud.create_illness(db, user_id, data)

@router.put("/illnesses/{ill_id}", response_model=schemas.IllnessOut)
def update_illness(ill_id: int, data: schemas.IllnessUpdate, db: Session = Depends(get_db)):
    ill = crud.update_illness(db, ill_id, data)
    if not ill:
        raise HTTPException(404, "Illness not found")
    return ill

@router.delete("/illnesses/{ill_id}")
def delete_illness(ill_id: int, db: Session = Depends(get_db)):
    ill = crud.delete_illness(db, ill_id)
    if not ill:
        raise HTTPException(404, "Illness not found")
    return {"ok": True}
