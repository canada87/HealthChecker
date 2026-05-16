from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_admin = Column(Boolean, default=False)
    medications = relationship("Medication", back_populates="user", cascade="all, delete")
    illnesses = relationship("Illness", back_populates="user", cascade="all, delete")

class Medication(Base):
    __tablename__ = "medications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#4CAF50")
    emoji = Column(String, default="💊")
    user = relationship("User", back_populates="medications")
    logs = relationship("MedicationLog", back_populates="medication", cascade="all, delete")

class Illness(Base):
    __tablename__ = "illnesses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#FF5722")
    emoji = Column(String, default="🤒")
    user = relationship("User", back_populates="illnesses")
    logs = relationship("IllnessLog", back_populates="illness", cascade="all, delete")
    episodes = relationship("IllnessEpisode", back_populates="illness", cascade="all, delete")

class MedicationLog(Base):
    __tablename__ = "medication_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    taken_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(String, nullable=True)
    medication = relationship("Medication", back_populates="logs")

class IllnessEpisode(Base):
    __tablename__ = "illness_episodes"
    id = Column(Integer, primary_key=True, index=True)
    illness_id = Column(Integer, ForeignKey("illnesses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    illness = relationship("Illness", back_populates="episodes")
    logs = relationship(
        "IllnessLog",
        back_populates="episode",
        foreign_keys="[IllnessLog.episode_id]",
        cascade="all, delete-orphan",
    )

class IllnessLog(Base):
    __tablename__ = "illness_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    illness_id = Column(Integer, ForeignKey("illnesses.id"), nullable=False)
    episode_id = Column(Integer, ForeignKey("illness_episodes.id", ondelete="CASCADE"), nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    intensity = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    illness = relationship("Illness", back_populates="logs")
    episode = relationship("IllnessEpisode", back_populates="logs", foreign_keys=[episode_id])
