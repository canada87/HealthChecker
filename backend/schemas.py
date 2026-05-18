from pydantic import BaseModel, field_serializer
from datetime import datetime
from typing import Optional

def _utc_iso(v: datetime) -> str:
    return v.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'

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

    @field_serializer('taken_at')
    def serialize_taken_at(self, v: datetime) -> str:
        return _utc_iso(v)

class IllnessLogOut(BaseModel):
    id: int
    illness_id: int
    episode_id: Optional[int]
    occurred_at: datetime
    intensity: Optional[int]
    notes: Optional[str]
    illness: IllnessOut
    model_config = {"from_attributes": True}

    @field_serializer('occurred_at')
    def serialize_occurred_at(self, v: datetime) -> str:
        return _utc_iso(v)

class IllnessEpisodeLogOut(BaseModel):
    id: int
    occurred_at: datetime
    intensity: Optional[int]
    notes: Optional[str]
    model_config = {"from_attributes": True}

    @field_serializer('occurred_at')
    def serialize_occurred_at(self, v: datetime) -> str:
        return _utc_iso(v)

class IllnessEpisodeOut(BaseModel):
    id: int
    illness_id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    illness: IllnessOut
    logs: list[IllnessEpisodeLogOut]
    model_config = {"from_attributes": True}

    @field_serializer('started_at')
    def serialize_started_at(self, v: datetime) -> str:
        return _utc_iso(v)

    @field_serializer('ended_at')
    def serialize_ended_at(self, v: Optional[datetime]) -> Optional[str]:
        return _utc_iso(v) if v else None

class LogCreate(BaseModel):
    notes: Optional[str] = None
    taken_at: Optional[datetime] = None

class LogUpdate(BaseModel):
    taken_at: datetime

class EpisodeCreate(BaseModel):
    intensity: int
    notes: Optional[str] = None
    started_at: Optional[datetime] = None

class IntensityLogCreate(BaseModel):
    intensity: int
    notes: Optional[str] = None
    occurred_at: Optional[datetime] = None

class EpisodeEndRequest(BaseModel):
    ended_at: Optional[datetime] = None

class EpisodeUpdate(BaseModel):
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

class EpisodeLogUpdate(BaseModel):
    occurred_at: Optional[datetime] = None
    intensity: Optional[int] = None

class StatItem(BaseModel):
    id: int
    name: str
    color: str
    emoji: str
    last_at: Optional[datetime]
    count_7d: int
    count_30d: int
    count_total: int
    avg_frequency_days: Optional[float] = None

    @field_serializer('last_at')
    def serialize_last_at(self, v: Optional[datetime]) -> Optional[str]:
        return _utc_iso(v) if v else None
