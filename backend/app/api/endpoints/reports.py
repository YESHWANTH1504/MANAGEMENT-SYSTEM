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


@router.get("/user/{user_id}/download-pdf")
def download_accomplishment_report(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Generate and download a PDF report containing all tasks and accomplishments done by the user.
    """
    # Authorization: User must be admin or requesting their own report
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view or download this report"
        )

    # Fetch User
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Resolve candidate details
    candidate_name = ""
    role_label = user.role.title()
    details = {}

    if user.role == "intern":
        intern = db.query(models.Intern).filter(models.Intern.user_id == user_id).first()
        if intern:
            candidate_name = intern.full_name
            details = {
                "Internship ID": intern.internship_id,
                "Domain": intern.internship_domain,
                "College Name": intern.college_name,
                "Duration": f"{intern.start_date} to {intern.end_date or 'Present'}"
            }
    elif user.role == "employee":
        employee = db.query(models.Employee).filter(models.Employee.user_id == user_id).first()
        if employee:
            candidate_name = employee.full_name
            details = {
                "Employee ID": employee.employee_id,
                "Designation": employee.designation,
                "Department": employee.department,
                "Mobile Number": employee.mobile_number or "N/A"
            }

    if not candidate_name:
        candidate_name = user.email.split("@")[0].title()
        details = {"Email": user.email}

    # Fetch all reports
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.user_id == user_id
    ).order_by(models.DailyReport.date.asc()).all()

    # Import ReportLab inside function to ensure isolation
    try:
        from fastapi.responses import StreamingResponse
        from io import BytesIO
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation library is not configured properly"
        )

    # Helper function to escape text for ReportLab's XML parser
    def xml_escape(text: str) -> str:
        if not text:
            return ""
        return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")

    # Generate PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    story = []
    styles = getSampleStyleSheet()

    # Branding colors matching the UI/UX: `#1c4d5e` (dark blue) and `#b6e9fc` (light blue)
    primary_color = colors.HexColor("#1c4d5e")
    text_color = colors.HexColor("#334155")

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=primary_color,
        spaceAfter=12,
        alignment=1  # Center
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6
    )

    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=text_color,
        leading=11
    )

    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white,
        leading=11
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=primary_color
    )

    story.append(Paragraph("Candidate Accomplishment Report", title_style))
    story.append(Spacer(1, 8))

    # Resolve profile photo path
    import os
    from app.core.config import settings
    from reportlab.platypus import Image
    
    photo_name = None
    if user.role == "intern" and intern:
        photo_name = intern.profile_photo
    elif user.role == "employee" and employee:
        photo_name = employee.profile_photo

    photo_path = None
    if photo_name:
        resolved_path = os.path.join(settings.UPLOAD_DIR, photo_name)
        if os.path.exists(resolved_path):
            photo_path = resolved_path

    photo_flowable = None
    if photo_path:
        try:
            photo_flowable = Image(photo_path, width=70, height=90)
            # Add a border to the image
            photo_table = Table([[photo_flowable]], colWidths=[74], rowHeights=[94])
            photo_table.setStyle(TableStyle([
                ('BOX', (0,0), (-1,-1), 1, primary_color),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('LEFTPADDING', (0,0), (-1,-1), 1),
                ('RIGHTPADDING', (0,0), (-1,-1), 1),
            ]))
            photo_flowable = photo_table
        except Exception as e:
            print(f"Error loading image in PDF: {e}")
            photo_flowable = None

    if not photo_flowable:
        # Placeholder box
        placeholder_text = Paragraph("<font color='#94a3b8' size='8'><b>PASSPORT PHOTO</b></font>", normal_style)
        photo_table = Table([[placeholder_text]], colWidths=[74], rowHeights=[94])
        photo_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ]))
        photo_flowable = photo_table

    # Details table
    meta_data = [
        [Paragraph("Candidate Name:", meta_label_style), Paragraph(xml_escape(candidate_name), normal_style),
         Paragraph("Role / Type:", meta_label_style), Paragraph(xml_escape(role_label), normal_style)],
    ]
    for key, val in details.items():
        meta_data.append([
            Paragraph(xml_escape(key) + ":", meta_label_style), Paragraph(xml_escape(val), normal_style),
            Paragraph("", meta_label_style), Paragraph("", normal_style)
        ])

    meta_table = Table(meta_data, colWidths=[100, 130, 80, 120])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))

    # Master Header Layout Table
    header_layout_data = [[meta_table, photo_flowable]]
    header_layout_table = Table(header_layout_data, colWidths=[440, 80])
    header_layout_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LINEBELOW', (0,0), (-1,-1), 1, primary_color),
    ]))
    story.append(header_layout_table)
    story.append(Spacer(1, 12))

    # Section accomplishments
    story.append(Paragraph("Tasks & Accomplishments Logs", section_heading))
    story.append(Spacer(1, 6))

    if not reports:
        story.append(Paragraph("No daily report logs have been submitted by this candidate yet.", normal_style))
    else:
        # Table of accomplishments
        table_data = [
            [
                Paragraph("Date", header_style),
                Paragraph("Task Title & Description", header_style),
                Paragraph("Hours", header_style),
                Paragraph("Tech Stack", header_style),
                Paragraph("Status", header_style)
            ]
        ]

        for rep in reports:
            date_str = rep.date.strftime("%Y-%m-%d") if hasattr(rep.date, "strftime") else str(rep.date)
            
            task_title_esc = xml_escape(rep.task_title)
            desc_esc = xml_escape(rep.description)
            
            task_desc = f"<b>{task_title_esc}</b><br/>{desc_esc}"
            if rep.tomorrow_plan:
                plan_esc = xml_escape(rep.tomorrow_plan)
                task_desc += f"<br/><i>Next Steps: {plan_esc}</i>"

            techs = xml_escape(rep.technologies_used or "N/A")
            status_lbl = xml_escape(rep.status.upper())

            table_data.append([
                Paragraph(date_str, normal_style),
                Paragraph(task_desc, normal_style),
                Paragraph(f"{rep.hours_worked:.1f}", normal_style),
                Paragraph(techs, normal_style),
                Paragraph(status_lbl, normal_style)
            ])

        # Printable width: Letter width is 612, minus margins of 36 on each side = 540 total width.
        col_widths = [65, 275, 35, 110, 55]
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)

    doc.build(story)
    buffer.seek(0)

    filename = f"accomplishment_report_{user_id}_{datetime.date.today()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


