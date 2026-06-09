import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="intern")  # admin, mentor, intern
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    intern_profile = relationship("Intern", back_populates="user", uselist=False, foreign_keys="[Intern.user_id]", cascade="all, delete-orphan")
    employee_profile = relationship("Employee", back_populates="user", uselist=False, foreign_keys="[Employee.user_id]", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("ActivityFeed", back_populates="user", cascade="all, delete-orphan")
    weekly_summaries = relationship("WeeklySummary", back_populates="user", cascade="all, delete-orphan")

class Intern(Base):
    __tablename__ = "interns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    profile_photo = Column(String(255), nullable=True)
    mobile_number = Column(String(15), nullable=True)
    gender = Column(String(10), nullable=True)

    # Academic Details
    college_name = Column(String(150), nullable=True)
    university_name = Column(String(150), nullable=True)
    degree = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    academic_year = Column(String(20), nullable=True)

    # Internship Details
    internship_id = Column(String(50), unique=True, index=True, nullable=False)  # IMMS-2026-XXXX
    internship_domain = Column(String(100), index=True, nullable=True)          # Web Dev, AI, etc.
    project_name = Column(String(150), nullable=True)
    project_description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    internship_status = Column(String(20), default="active")  # active, completed, terminated

    # Technology Details (Stored as comma-separated values)
    programming_languages = Column(Text, nullable=True)
    frameworks = Column(Text, nullable=True)
    tools_used = Column(Text, nullable=True)
    databases_used = Column(Text, nullable=True)
    technologies_learned = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="intern_profile", foreign_keys=[user_id])

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    profile_photo = Column(String(255), nullable=True)
    mobile_number = Column(String(15), nullable=True)
    gender = Column(String(10), nullable=True)

    # Job Details
    employee_id = Column(String(50), unique=True, index=True, nullable=False)  # EMP-2026-XXXX
    department = Column(String(100), index=True, nullable=True)
    designation = Column(String(100), nullable=True)
    joining_date = Column(Date, nullable=True)
    employment_status = Column(String(20), default="active")  # active, resigned, on_leave
    project_name = Column(String(150), nullable=True)
    project_description = Column(Text, nullable=True)

    # Tech Details
    programming_languages = Column(Text, nullable=True)
    frameworks = Column(Text, nullable=True)
    tools_used = Column(Text, nullable=True)
    databases_used = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="employee_profile", foreign_keys=[user_id])

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="absent")  # present, absent, late
    ip_address = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationship
    user = relationship("User", back_populates="attendance_records")

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    task_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    hours_worked = Column(Float, nullable=False)
    technologies_used = Column(Text, nullable=True)  # comma separated
    challenges_faced = Column(Text, nullable=True)
    learning_outcomes = Column(Text, nullable=True)
    tomorrow_plan = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected

    # Relationships
    user = relationship("User", back_populates="daily_reports")
    attachments = relationship("ReportAttachment", back_populates="report", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="report", cascade="all, delete-orphan")

    @property
    def user_name(self):
        if not self.user:
            return None
        if self.user.role == "intern" and self.user.intern_profile:
            return self.user.intern_profile.full_name
        elif self.user.role == "employee" and self.user.employee_profile:
            return self.user.employee_profile.full_name
        return self.user.email.split("@")[0].title()

    @property
    def user_role(self):
        if not self.user:
            return None
        return self.user.role

class ReportAttachment(Base):
    __tablename__ = "report_attachments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), index=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50), nullable=False)  # text, document, image, audio, video, archive
    file_size = Column(Integer, nullable=False)     # in bytes
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationship
    report = relationship("DailyReport", back_populates="attachments")

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("daily_reports.id", ondelete="CASCADE"), index=True, nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    comments = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    report = relationship("DailyReport", back_populates="feedbacks")
    reviewer = relationship("User")

    @property
    def reviewer_name(self):
        if not self.reviewer:
            return "Unknown"
        if self.reviewer.role == "admin":
            return "Administrator"
        if self.reviewer.role == "intern" and self.reviewer.intern_profile:
            return self.reviewer.intern_profile.full_name
        if self.reviewer.role == "employee" and self.reviewer.employee_profile:
            return self.reviewer.employee_profile.full_name
        return self.reviewer.email.split("@")[0].title()

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="notifications")

class ActivityFeed(Base):
    __tablename__ = "activity_feed"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    activity_type = Column(String(50), nullable=False)  # check_in, check_out, report_submit, report_approve, report_reject, comment_add
    ref_id = Column(Integer, nullable=True)              # reference ID of report, attendance, etc.
    details = Column(Text, nullable=True)               # Quick JSON or formatted text of summary
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Relationship
    user = relationship("User", back_populates="activities")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="todo", nullable=False)  # todo, in_progress, done
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    due_date = Column(Date, nullable=True)

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    @property
    def assigned_to_name(self):
        if not self.assigned_to:
            return "Unassigned"
        if self.assigned_to.role == "intern" and self.assigned_to.intern_profile:
            return self.assigned_to.intern_profile.full_name
        elif self.assigned_to.role == "employee" and self.assigned_to.employee_profile:
            return self.assigned_to.employee_profile.full_name
        return self.assigned_to.email.split("@")[0].title()


class WeeklySummary(Base):
    __tablename__ = "weekly_summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False)
    blockers = Column(Text, nullable=True)
    sentiment = Column(String(50), nullable=True)
    blocker_detected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="weekly_summaries")



