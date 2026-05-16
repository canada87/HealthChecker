from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    is_admin: bool = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    is_admin: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    name: str
    is_admin: bool
    model_config = {"from_attributes": True}

class MedicationCreate(BaseModel):
    name: str
    color: str = "#4CAF50"
    emoji: str = "💊"

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

class MedicationOut(BaseModel):
    id: int
    user_id: int
    name: str
    color: str
    emoji: str
    model_config = {"from_attributes": True}

class IllnessCreate(BaseModel):
    name: str
    color: str = "#FF5722"
    emoji: str = "🤒"

class IllnessUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

class IllnessOut(BaseModel):
    id: int
    user_id: int
    name: str
    color: str
    emoji: str
    model_config = {"from_attributes": True}

class MedicationLogOut(BaseModel):
    id: int
    medication_id: int
    taken_at: datetime
    notes: Optional[str]
    medication: MedicationOut
    model_config = {"from_attributes": True}

class IllnessLogOut(BaseModel):
    id: int
    illness_id: int
    occurred_at: datetime
    notes: Optional[str]
    illness: IllnessOut
    model_config = {"from_attributes": True}

class LogCreate(BaseModel):
    notes: Optional[str] = None
    taken_at: Optional[datetime] = None

class StatItem(BaseModel):
    id: int
    name: str
    color: str
    emoji: str
    last_at: Optional[datetime]
    count_7d: int
    count_30d: int
    count_total: int
