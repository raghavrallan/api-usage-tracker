import uuid

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProjectAccess(Base):
    __tablename__ = "user_project_access"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), primary_key=True)
    permission_level: Mapped[str] = mapped_column(String(20), nullable=False, default="view")

    user = relationship("User", back_populates="project_access")
    project = relationship("Project", back_populates="user_access")
