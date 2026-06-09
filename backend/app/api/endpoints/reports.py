import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas

router = APIRouter()

@router.post("/", response_model=schemas.DailyReportOut)
def create_daily_report(
    data: schemas.DailyReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Submit a new daily report (either self or on behalf of an intern/employee).
    """
    # Enforce access check: non-admins cannot submit reports for other users
    if current_user.role != "admin" and data.user_id is not None and data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit reports for yourself"
        )
        
    target_user_id = data.user_id if data.user_id is not None else current_user.id
        
    # Check if a report was already submitted for this date for this user
    existing = db.query(models.DailyReport).filter(
        models.DailyReport.user_id == target_user_id,
        models.DailyReport.date == data.date
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report already submitted for {data.date}. Edit that report instead."
        )

    task_title = data.task_title if (data.task_title and data.task_title.strip()) else f"Daily Activity Report - {data.date}"
    description = data.description if (data.description and data.description.strip()) else f"Submitted daily report on {data.date}."

    new_report = models.DailyReport(
        user_id=target_user_id,
        date=data.date,
        task_title=task_title,
        description=description,
        hours_worked=data.hours_worked,
        technologies_used=data.technologies_used,
        challenges_faced=data.challenges_faced,
        learning_outcomes=data.learning_outcomes,
        tomorrow_plan=data.tomorrow_plan,
        additional_notes=data.additional_notes,
        status="pending"
    )
    db.add(new_report)
    db.flush() # Yield report.id

    # Create Activity Log
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type="report_submit",
        ref_id=new_report.id,
        details=f"Submitted Daily Report: '{task_title}' ({data.hours_worked} hrs)"
    )
    db.add(activity)

    db.commit()
    db.refresh(new_report)
    return new_report

@router.put("/{report_id}", response_model=schemas.DailyReportOut)
def update_daily_report(
    report_id: int,
    data: schemas.DailyReportUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Intern only: Modify a pending report.
    Reports that have been approved or rejected cannot be edited directly without admin permission.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily report not found"
        )
        
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own reports"
        )
        
    if report.status != "pending" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit report. It has already been reviewed (Approved/Rejected)."
        )

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
        
    db.commit()
    db.refresh(report)
    return report

@router.get("/me", response_model=List[schemas.DailyReportOut])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Intern only: Get history of all submitted reports.
    """
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.user_id == current_user.id
    ).order_by(models.DailyReport.date.desc()).all()
    return reports

@router.get("/", response_model=List[schemas.DailyReportOut])
def get_all_reports(
    intern_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Admins & Mentors: Retrieve all intern reports with optional filtering.
    Mentors can only retrieve reports for interns assigned to them.
    """
    query = db.query(models.DailyReport).join(models.User, models.DailyReport.user_id == models.User.id)
    
    if intern_id:
        query = query.filter(models.DailyReport.user_id == intern_id)
        
    if status:
        query = query.filter(models.DailyReport.status == status)
    if start_date:
        query = query.filter(models.DailyReport.date >= start_date)
    if end_date:
        query = query.filter(models.DailyReport.date <= end_date)
        
    return query.order_by(models.DailyReport.date.desc()).all()

@router.post("/{report_id}/review", response_model=schemas.DailyReportOut)
def review_daily_report(
    report_id: int,
    review: schemas.DailyReportReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admins & Mentors: Review (Approve/Reject) a daily activity report.
    Appends feedback and sends notifications to the intern.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily report not found"
        )
        
    # No mentor logic needed, admin review only

    # Update report status
    report.status = review.status.lower()
    
    # Save feedback comment if provided
    if review.comments:
        new_feedback = models.Feedback(
            report_id=report.id,
            reviewer_id=current_user.id,
            comments=review.comments
        )
        db.add(new_feedback)
        
    # Log to Activity Feed
    activity_type = "report_approve" if report.status == "approved" else "report_reject"
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type=activity_type,
        ref_id=report.id,
        details=f"Reviewed report on {report.date}: {report.status.upper()}"
    )
    db.add(activity)
    
    # Notify Intern
    status_label = "Approved" if report.status == "approved" else "Rejected"
    notif_msg = f"Your daily report for {report.date} has been {status_label.upper()}."
    if review.comments:
        notif_msg += f" Feedback: \"{review.comments}\""
        
    notification = models.Notification(
        user_id=report.user_id,
        title=f"Report {status_label}",
        message=notif_msg
    )
    db.add(notification)
    
    db.commit()
    db.refresh(report)
    return report

@router.get("/{report_id}", response_model=schemas.DailyReportOut)
def get_report_by_id(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get details of a daily report, including its attachments and feedbacks.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily report not found"
        )
    return report

@router.post("/{report_id}/comments", response_model=schemas.FeedbackOut)
def add_report_comment(

    report_id: int,
    data: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    All Roles: Post a comment in the feedback chat thread of a report.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily report not found"
        )

    # Access control
    if current_user.role != "admin" and report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to comment on this report"
        )

    new_comment = models.Feedback(
        report_id=report.id,
        reviewer_id=current_user.id,
        comments=data.comments
    )
    db.add(new_comment)

    # Track in activity feed
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type="comment_add",
        ref_id=report.id,
        details=f"Posted a comment on report ({report.date})"
    )
    db.add(activity)

    # Send Notification to the other party
    if current_user.role == "admin":
        # Notify intern/employee
        notification = models.Notification(
            user_id=report.user_id,
            title="New Review Comment",
            message=f"Administrator commented on your report for {report.date}: \"{data.comments}\""
        )
        db.add(notification)
    else:
        # Notify Admin
        admin_user = db.query(models.User).filter(models.User.role == "admin").first()
        if admin_user:
            notification = models.Notification(
                user_id=admin_user.id,
                title="New Comment Reply",
                message=f"User {current_user.email} replied to report feedback for {report.date}: \"{data.comments}\""
            )
            db.add(notification)

    db.commit()
    db.refresh(new_comment)
    return new_comment

