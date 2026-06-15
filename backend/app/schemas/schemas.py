from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role: str = "intern"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Intern Schemas ---
class InternBase(BaseModel):
    full_name: str
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    degree: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    internship_domain: Optional[str] = None
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    internship_status: Optional[str] = "active"
    programming_languages: Optional[str] = None
    frameworks: Optional[str] = None
    tools_used: Optional[str] = None
    databases_used: Optional[str] = None
    technologies_learned: Optional[str] = None

class InternCreate(InternBase):
    email: EmailStr
    password: str
    internship_id: str

class InternUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    degree: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    internship_domain: Optional[str] = None
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    internship_status: Optional[str] = None
    programming_languages: Optional[str] = None
    frameworks: Optional[str] = None
    tools_used: Optional[str] = None
    databases_used: Optional[str] = None
    technologies_learned: Optional[str] = None
    profile_photo: Optional[str] = None

class InternOut(InternBase):
    id: int
    user_id: int
    internship_id: str
    profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

# --- Employee Schemas ---
class EmployeeBase(BaseModel):
    full_name: str
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    employee_id: str
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[datetime.date] = None
    employment_status: Optional[str] = "active"
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    programming_languages: Optional[str] = None
    frameworks: Optional[str] = None
    tools_used: Optional[str] = None
    databases_used: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    email: EmailStr
    password: str

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[datetime.date] = None
    employment_status: Optional[str] = None
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    programming_languages: Optional[str] = None
    frameworks: Optional[str] = None
    tools_used: Optional[str] = None
    databases_used: Optional[str] = None
    profile_photo: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    user_id: int
    profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceBase(BaseModel):
    date: datetime.date
    check_in_time: Optional[datetime.datetime] = None
    check_out_time: Optional[datetime.datetime] = None
    status: str
    ip_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AttendanceCheckIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    user_id: Optional[int] = None

class AttendanceOut(AttendanceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Report Attachment Schemas ---
class ReportAttachmentOut(BaseModel):
    id: int
    report_id: int
    file_name: str
    file_path: str
    file_type: str
    file_size: int
    upload_date: datetime.datetime
    uploaded_by_id: int

    class Config:
        from_attributes = True

# --- Feedback Schemas ---
class FeedbackBase(BaseModel):
    comments: str

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackOut(FeedbackBase):
    id: int
    report_id: int
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Daily Report Schemas ---
class DailyReportBase(BaseModel):
    date: datetime.date
    task_title: Optional[str] = None
    description: Optional[str] = None
    hours_worked: float
    technologies_used: Optional[str] = None
    challenges_faced: Optional[str] = None
    learning_outcomes: Optional[str] = None
    tomorrow_plan: Optional[str] = None
    additional_notes: Optional[str] = None

class DailyReportCreate(DailyReportBase):
    user_id: Optional[int] = None

class DailyReportUpdate(BaseModel):
    task_title: Optional[str] = None
    description: Optional[str] = None
    hours_worked: Optional[float] = None
    technologies_used: Optional[str] = None
    challenges_faced: Optional[str] = None
    learning_outcomes: Optional[str] = None
    tomorrow_plan: Optional[str] = None
    additional_notes: Optional[str] = None

class DailyReportOut(DailyReportBase):
    id: int
    user_id: int
    status: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    attachments: List[ReportAttachmentOut] = []
    feedbacks: List[FeedbackOut] = []

    class Config:
        from_attributes = True

class DailyReportReview(BaseModel):
    status: str  # approved, rejected
    comments: Optional[str] = None

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Activity Feed Schemas ---
class ActivityFeedOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    profile_photo: Optional[str] = None
    college_name: Optional[str] = None
    internship_domain: Optional[str] = None
    activity_type: str
    ref_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime.datetime
    attachments: Optional[List[ReportAttachmentOut]] = []

    class Config:
        from_attributes = True

# --- Dashboard Stats Schemas ---
class AdminDashboardStats(BaseModel):
    total_interns: int
    active_interns: int
    completed_internships: int
    total_employees: int
    active_employees: int
    present_today: int
    absent_today: int
    late_arrivals: int
    reports_submitted_today: int
    pending_reviews: int
    approved_reports: int
    rejected_reports: int
    interns_present_today: int
    interns_absent_today: int

class UserRegistration(BaseModel):
    role: str
    email: EmailStr
    password: str
    full_name: str
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    
    # Intern specific
    internship_id: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    department: Optional[str] = None
    internship_domain: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    
    # Employee specific
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[datetime.date] = None
    
    # Shared / Tech stack
    project_name: Optional[str] = None
    programming_languages: Optional[str] = None
    frameworks: Optional[str] = None
    tools_used: Optional[str] = None
    databases_used: Optional[str] = None

# --- Task Kanban Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    assigned_to_id: int
    due_date: Optional[datetime.date] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime.date] = None

class TaskOut(TaskBase):
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime.datetime
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Weekly Summary Schemas ---
class WeeklySummaryOut(BaseModel):
    id: int
    user_id: int
    week_start: datetime.date
    week_end: datetime.date
    summary_text: str
    blockers: Optional[str] = None
    sentiment: Optional[str] = None
    blocker_detected: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


