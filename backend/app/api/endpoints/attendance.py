import datetime
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas
from app.core.config import settings

router = APIRouter()

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth's radius in meters
    R = 6371000.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
        
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


# Daily check-in cutoff time: 10:00 AM
CHECKIN_LATE_CUTOFF = datetime.time(10, 0)

@router.post("/check-in", response_model=schemas.AttendanceOut)
def check_in(
    data: schemas.AttendanceCheckIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Log daily check-in for the current user or on behalf of an intern/employee by admin.
    """
    if current_user.role == "admin" and data.user_id is not None:
        target_user_id = data.user_id
        target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not target_user or target_user.role not in ["intern", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user must be a valid intern or employee"
            )
    else:
        if current_user.role not in ["intern", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only interns and employees can check-in"
            )
        target_user_id = current_user.id
        
        # Enforce Geofencing Check
        if data.latitude is None or data.longitude is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GPS coordinates are required to check-in. Please enable browser location permissions."
            )
            
        distance = haversine_distance(
            data.latitude, data.longitude,
            settings.OFFICE_LATITUDE, settings.OFFICE_LONGITUDE
        )
        
        if distance > settings.GEOFENCE_RADIUS_METERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Check-in rejected. You are outside the authorized office area (distance: {round(distance, 1)}m, limit: {settings.GEOFENCE_RADIUS_METERS}m)."
            )
            
    today = datetime.date.today()
    
    # Check if already checked in today
    existing = db.query(models.Attendance).filter(
        models.Attendance.user_id == target_user_id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked in for today"
        )
        
    now = datetime.datetime.now()
    current_time = now.time()
    
    # Auto status calculation
    attendance_status = "present"
    if current_time > CHECKIN_LATE_CUTOFF:
        attendance_status = "late"
        
    # Get client IP address
    client_ip = request.client.host if request.client else "unknown"
    
    new_attendance = models.Attendance(
        user_id=target_user_id,
        date=today,
        check_in_time=now,
        status=attendance_status,
        ip_address=client_ip,
        latitude=data.latitude,
        longitude=data.longitude
    )
    
    db.add(new_attendance)
    
    # Feed activity
    activity = models.ActivityFeed(
        user_id=target_user_id,
        activity_type="check_in",
        ref_id=new_attendance.id,
        details=f"Checked-in at {now.strftime('%H:%M:%S')} (Status: {attendance_status.upper()})"
    )
    db.add(activity)
    
    # Notification for late check-in
    if attendance_status == "late":
        notification = models.Notification(
            user_id=target_user_id,
            title="Late Check-In",
            message=f"Checked in late today at {now.strftime('%I:%M %p')}. Cut-off time is {CHECKIN_LATE_CUTOFF.strftime('%I:%M %p')}."
        )
        db.add(notification)
        
    db.commit()
    db.refresh(new_attendance)
    return new_attendance

@router.post("/check-out", response_model=schemas.AttendanceOut)
def check_out(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Log check-out for the current user or on behalf of an intern/employee by admin.
    """
    if current_user.role == "admin" and user_id is not None:
        target_user_id = user_id
        target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
        if not target_user or target_user.role not in ["intern", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user must be a valid intern or employee"
            )
    else:
        if current_user.role not in ["intern", "employee"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only interns and employees can check-out"
            )
        target_user_id = current_user.id
        
    today = datetime.date.today()
    
    # Fetch check-in record
    attendance = db.query(models.Attendance).filter(
        models.Attendance.user_id == target_user_id,
        models.Attendance.date == today
    ).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check-out. You have not checked-in today."
        )
        
    if attendance.check_out_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked-out for today"
        )
        
    now = datetime.datetime.now()
    attendance.check_out_time = now
    
    # Feed activity
    activity = models.ActivityFeed(
        user_id=target_user_id,
        activity_type="check_out",
        ref_id=attendance.id,
        details=f"Checked-out at {now.strftime('%H:%M:%S')}"
    )
    db.add(activity)
    
    db.commit()
    db.refresh(attendance)
    return attendance

@router.get("/me", response_model=List[schemas.AttendanceOut])
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get checking history for the currently logged-in user (intern/employee).
    """
    records = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id
    ).order_by(models.Attendance.date.desc()).all()
    return records

@router.get("/", response_model=List[schemas.AttendanceOut])
def get_all_attendance(
    date: Optional[datetime.date] = Query(None),
    intern_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admins & Mentors: Get attendance records filtered by date or intern.
    """
    query = db.query(models.Attendance)
    
    if intern_id:
        query = query.filter(models.Attendance.user_id == intern_id)
    if date:
        query = query.filter(models.Attendance.date == date)
        
    return query.order_by(models.Attendance.date.desc()).all()

@router.get("/statistics")
def get_attendance_statistics(
    intern_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve attendance stats (Total days, Present, Absent, Late ratios).
    Interns get their own stats; Admins & Mentors can check stats for any intern.
    """
    target_user_id = current_user.id
    if current_user.role in ["admin"] and intern_id:
        target_user_id = intern_id
        
    records = db.query(models.Attendance).filter(
        models.Attendance.user_id == target_user_id
    ).all()
    
    total_records = len(records)
    if total_records == 0:
        return {
            "total_days": 0,
            "present": 0,
            "absent": 0,
            "late": 0,
            "attendance_rate": 100.0
        }
        
    present_count = sum(1 for r in records if r.status in ["present", "late"])
    late_count = sum(1 for r in records if r.status == "late")
    absent_count = sum(1 for r in records if r.status == "absent")
    
    attendance_rate = (present_count / total_records) * 100
    
    return {
        "total_days": total_records,
        "present": present_count - late_count,
        "absent": absent_count,
        "late": late_count,
        "attendance_rate": round(attendance_rate, 2)
    }

@router.post("/simulate-cron")
def simulate_cron_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Run simulated check-in cron.
    Generates notifications and appends logs for any employees/interns who missed the check-in.
    """
    import os
    today = datetime.date.today()
    active_users = db.query(models.User).filter(
        models.User.role.in_(["intern", "employee"]),
        models.User.is_active == True
    ).all()

    alerted_count = 0
    email_logs_appended = []

    log_dir = settings.UPLOAD_DIR
    os.makedirs(log_dir, exist_ok=True)
    log_filepath = os.path.join(log_dir, "simulated_emails.log")

    with open(log_filepath, "a", encoding="utf-8") as log_file:
        for user in active_users:
            has_record = db.query(models.Attendance).filter(
                models.Attendance.user_id == user.id,
                models.Attendance.date == today
            ).first()

            if not has_record:
                name = user.email.split("@")[0].title()
                if user.role == "intern" and user.intern_profile:
                    name = user.intern_profile.full_name
                elif user.role == "employee" and user.employee_profile:
                    name = user.employee_profile.full_name

                # Add Notification
                new_notif = models.Notification(
                    user_id=user.id,
                    title="Attendance Notice: Missing Check-In",
                    message=f"Hi {name}, you have missed the 10:00 AM workspace check-in cut-off. Please check-in immediately to log your punctuality tracking."
                )
                db.add(new_notif)
                
                # Append to simulated email log
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                email_entry = f"[{timestamp}] EMAIL SENT | To: {user.email} | Subject: IMMS Attendance Cut-off Alert | Body: Dear {name}, our system indicates that you have not logged a check-in for today ({today.strftime('%A, %B %d')}) before the 10:00 AM cut-off. Please log in to your dashboard to track your hours.\n"
                log_file.write(email_entry)
                email_logs_appended.append({
                    "email": user.email,
                    "name": name,
                    "timestamp": timestamp
                })
                alerted_count += 1

    db.commit()
    return {
        "alerted_count": alerted_count,
        "logs": email_logs_appended,
        "log_file": log_filepath
    }

@router.get("/email-logs")
def get_simulated_email_logs(
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Read simulated emails log file.
    """
    import os
    log_dir = settings.UPLOAD_DIR
    log_filepath = os.path.join(log_dir, "simulated_emails.log")
    
    if not os.path.exists(log_filepath):
        return {"logs": []}
        
    try:
        with open(log_filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        return {"logs": [line.strip() for line in lines[-30:]]}
    except Exception as e:
        return {"error": str(e), "logs": []}

