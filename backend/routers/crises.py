from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import crud, schemas

router = APIRouter(tags=["crises"])

def _check_range(started_at, ended_at):
    if started_at and ended_at and ended_at < started_at:
        raise HTTPException(422, "ended_at must be after started_at")

# --- Categories ---

@router.get("/users/{user_id}/crisis-categories", response_model=list[schemas.CrisisCategoryOut])
def list_categories(user_id: int, db: Session = Depends(get_db)):
    return crud.get_crisis_categories(db, user_id)

@router.post("/users/{user_id}/crisis-categories", response_model=schemas.CrisisCategoryOut, status_code=201)
def create_category(user_id: int, data: schemas.CrisisCategoryCreate, db: Session = Depends(get_db)):
    return crud.create_crisis_category(db, user_id, data)

@router.put("/crisis-categories/{cat_id}", response_model=schemas.CrisisCategoryOut)
def update_category(cat_id: int, data: schemas.CrisisCategoryUpdate, db: Session = Depends(get_db)):
    cat = crud.update_crisis_category(db, cat_id, data)
    if not cat:
        raise HTTPException(404, "Category not found")
    return cat

@router.delete("/crisis-categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = crud.delete_crisis_category(db, cat_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    return {"ok": True}

# --- Crises ---

@router.get("/users/{user_id}/crises", response_model=list[schemas.CrisisOut])
def list_crises(user_id: int, db: Session = Depends(get_db)):
    return crud.get_crises(db, user_id)

@router.post("/users/{user_id}/crises", response_model=schemas.CrisisOut, status_code=201)
def create_crisis(user_id: int, data: schemas.CrisisCreate, db: Session = Depends(get_db)):
    _check_range(data.started_at, data.ended_at)
    return crud.create_crisis(db, user_id, data)

@router.put("/crises/{crisis_id}", response_model=schemas.CrisisOut)
def update_crisis(crisis_id: int, data: schemas.CrisisUpdate, db: Session = Depends(get_db)):
    _check_range(data.started_at, data.ended_at)
    crisis = crud.update_crisis(db, crisis_id, data)
    if not crisis:
        raise HTTPException(404, "Crisis not found")
    return crisis

@router.patch("/crises/{crisis_id}/end", response_model=schemas.CrisisOut)
def end_crisis(crisis_id: int, data: schemas.EpisodeEndRequest, db: Session = Depends(get_db)):
    crisis = crud.end_crisis(db, crisis_id, data.ended_at)
    if not crisis:
        raise HTTPException(404, "Crisis not found")
    return crisis

@router.delete("/crises/{crisis_id}")
def delete_crisis(crisis_id: int, db: Session = Depends(get_db)):
    crisis = crud.delete_crisis(db, crisis_id)
    if not crisis:
        raise HTTPException(404, "Crisis not found")
    return {"ok": True}

# --- Habit changes ---

@router.get("/users/{user_id}/habit-changes", response_model=list[schemas.HabitChangeOut])
def list_habit_changes(user_id: int, db: Session = Depends(get_db)):
    return crud.get_habit_changes(db, user_id)

@router.post("/users/{user_id}/habit-changes", response_model=schemas.HabitChangeOut, status_code=201)
def create_habit_change(user_id: int, data: schemas.HabitChangeCreate, db: Session = Depends(get_db)):
    return crud.create_habit_change(db, user_id, data)

@router.put("/habit-changes/{change_id}", response_model=schemas.HabitChangeOut)
def update_habit_change(change_id: int, data: schemas.HabitChangeCreate, db: Session = Depends(get_db)):
    change = crud.update_habit_change(db, change_id, data)
    if not change:
        raise HTTPException(404, "Change not found")
    return change

@router.delete("/habit-changes/{change_id}")
def delete_habit_change(change_id: int, db: Session = Depends(get_db)):
    change = crud.delete_habit_change(db, change_id)
    if not change:
        raise HTTPException(404, "Change not found")
    return {"ok": True}
