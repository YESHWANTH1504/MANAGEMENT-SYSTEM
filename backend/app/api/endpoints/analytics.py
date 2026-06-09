import datetime
import requests
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas
from app.core.config import settings

router = APIRouter()

@router.get("/admin-stats", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admins: Get key metrics cards for the main dashboard (tracking both Interns and Employees).
    """
    today = datetime.date.today()
    
    # Intern metrics
    total_interns = db.query(models.Intern).count()
    active_interns = db.query(models.Intern).filter(models.Intern.internship_status == "active").count()
    completed_internships = db.query(models.Intern).filter(models.Intern.internship_status == "completed").count()
    
    # Employee metrics
    total_employees = db.query(models.Employee).count()
    active_employees = db.query(models.Employee).filter(models.Employee.employment_status == "active").count()
    
    # Combined active headcount
    total_active_headcount = active_interns + active_employees

    # Attendance counts for today (combined)
    attendance_today = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    present_today = sum(1 for a in attendance_today if a.status in ["present", "late"])
    late_arrivals = sum(1 for a in attendance_today if a.status == "late")
    
    absent_today = total_active_headcount - present_today
    if absent_today < 0:
        absent_today = 0
        
    # Count how many interns checked in today
    interns_present_today = db.query(models.Attendance).join(
        models.User, models.Attendance.user_id == models.User.id
    ).filter(
        models.Attendance.date == today,
        models.User.role == "intern",
        models.Attendance.status.in_(["present", "late"])
    ).count()
    
    # Active interns absent today
    interns_absent_today = active_interns - interns_present_today
    if interns_absent_today < 0:
        interns_absent_today = 0

    # Daily reports for today
    reports_submitted_today = db.query(models.DailyReport).filter(models.DailyReport.date == today).count()
    
    # Reports reviews counts
    pending_reviews = db.query(models.DailyReport).filter(models.DailyReport.status == "pending").count()
    approved_reports = db.query(models.DailyReport).filter(models.DailyReport.status == "approved").count()
    rejected_reports = db.query(models.DailyReport).filter(models.DailyReport.status == "rejected").count()
        
    return {
        "total_interns": total_interns,
        "active_interns": active_interns,
        "completed_internships": completed_internships,
        "total_employees": total_employees,
        "active_employees": active_employees,
        "present_today": present_today,
        "absent_today": absent_today,
        "late_arrivals": late_arrivals,
        "reports_submitted_today": reports_submitted_today,
        "pending_reviews": pending_reviews,
        "approved_reports": approved_reports,
        "rejected_reports": rejected_reports,
        "interns_present_today": interns_present_today,
        "interns_absent_today": interns_absent_today
    }

@router.get("/charts")
def get_chart_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admins: Get chart aggregation metrics for both Interns and Employees.
    """
    # 1. Internship Domain Distribution (Interns)
    domain_dist = db.query(
        models.Intern.internship_domain, 
        func.count(models.Intern.id)
    ).group_by(models.Intern.internship_domain).all()
    
    domain_data = [{"name": d[0] if d[0] else "Unassigned", "value": d[1]} for d in domain_dist]

    # 2. Designation Distribution (Employees)
    designation_dist = db.query(
        models.Employee.designation,
        func.count(models.Employee.id)
    ).group_by(models.Employee.designation).all()
    
    designation_data = [{"name": ds[0] if ds[0] else "Unassigned", "value": ds[1]} for ds in designation_dist]

    # 3. Technology Usage Stats (combined Interns and Employees)
    techs = {}
    active_interns = db.query(models.Intern).filter(models.Intern.internship_status == "active").all()
    active_employees = db.query(models.Employee).filter(models.Employee.employment_status == "active").all()
    
    for user_profile in (active_interns + active_employees):
        if user_profile.programming_languages:
            for lang in user_profile.programming_languages.split(","):
                lang = lang.strip().title()
                if lang:
                    techs[lang] = techs.get(lang, 0) + 1
        if user_profile.frameworks:
            for fw in user_profile.frameworks.split(","):
                fw = fw.strip().title()
                if fw:
                    techs[fw] = techs.get(fw, 0) + 1

    tech_data = [{"name": k, "value": v} for k, v in sorted(techs.items(), key=lambda item: item[1], reverse=True)[:8]]

    # 4. Attendance Trends (Last 7 Days)
    attendance_trends = []
    for i in range(6, -1, -1):
        target_date = datetime.date.today() - datetime.timedelta(days=i)
        att_records = db.query(models.Attendance).filter(models.Attendance.date == target_date).all()
        
        present = sum(1 for a in att_records if a.status == "present")
        late = sum(1 for a in att_records if a.status == "late")
        absent = sum(1 for a in att_records if a.status == "absent")
        
        attendance_trends.append({
            "date": target_date.strftime("%b %d"),
            "present": present,
            "late": late,
            "absent": absent
        })

    # 5. College Distribution (Interns)
    college_dist = db.query(
        models.Intern.college_name,
        func.count(models.Intern.id)
    ).filter(models.Intern.college_name.isnot(None)).group_by(models.Intern.college_name).all()
    
    college_data = [{"name": c[0], "value": c[1]} for c in college_dist if c[0]]

    return {
        "domain_distribution": domain_data,
        "designation_distribution": designation_data,
        "technology_stats": tech_data,
        "attendance_trends": attendance_trends,
        "college_distribution": college_data
    }

@router.get("/feed", response_model=List[schemas.ActivityFeedOut])
def get_activity_feed(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admins: Get recent activity logs in chronological order.
    """
    activities = db.query(models.ActivityFeed).join(
        models.User, models.ActivityFeed.user_id == models.User.id
    ).order_by(models.ActivityFeed.created_at.desc()).limit(limit).all()
    
    feed_cards = []
    for act in activities:
        # Load user and profile details
        user = db.query(models.User).filter(models.User.id == act.user_id).first()
        user_name = "System"
        profile_photo = None
        college_name = None
        internship_domain = None
        
        if user:
            user_name = user.email.split("@")[0].title()
            if user.role == "intern":
                profile = db.query(models.Intern).filter(models.Intern.user_id == user.id).first()
                if profile:
                    user_name = profile.full_name
                    profile_photo = profile.profile_photo
                    college_name = profile.college_name
                    internship_domain = profile.internship_domain
            elif user.role == "employee":
                profile = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()
                if profile:
                    user_name = profile.full_name
                    profile_photo = profile.profile_photo
                    college_name = profile.department  # Map department as subheading
                    internship_domain = profile.designation # Map designation as domain
                    
        attachments_out = []
        if act.activity_type in ["report_submit", "report_approve", "report_reject"] and act.ref_id:
            report = db.query(models.DailyReport).filter(models.DailyReport.id == act.ref_id).first()
            if report and report.attachments:
                for att in report.attachments:
                    attachments_out.append({
                        "id": att.id,
                        "report_id": att.report_id,
                        "file_name": att.file_name,
                        "file_path": att.file_path,
                        "file_type": att.file_type,
                        "file_size": att.file_size,
                        "upload_date": att.upload_date,
                        "uploaded_by_id": att.uploaded_by_id
                    })

        feed_cards.append({
            "id": act.id,
            "user_id": act.user_id,
            "user_name": user_name,
            "profile_photo": profile_photo,
            "college_name": college_name,
            "internship_domain": internship_domain,
            "activity_type": act.activity_type,
            "ref_id": act.ref_id,
            "details": act.details,
            "created_at": act.created_at,
            "attachments": attachments_out
        })
        
    return feed_cards

@router.get("/mongo-data/{collection_name}")
def get_mongo_collection_data(
    collection_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Admin only: Query documents inside MongoDB collection.
    """
    from fastapi import HTTPException
    if collection_name not in ["users", "interns", "employees"]:
        raise HTTPException(
            status_code=400,
            detail="Collection name must be one of: 'users', 'interns', 'employees'"
        )
    from app.db.mongodb import get_mongo_db
    db_mongo = get_mongo_db()
    if db_mongo is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is offline or not configured."
        )
    try:
        docs = list(db_mongo[collection_name].find({}, {"_id": 0}))
        return docs
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to query MongoDB collection '{collection_name}': {e}"
        )


@router.get("/weekly-summary/{user_id}", response_model=schemas.WeeklySummaryOut)
def get_weekly_summary(
    user_id: int,
    week_start: Optional[datetime.date] = Query(None),
    week_end: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Mentor & Admin: Fetch cached weekly summary. Defaults to current week.
    """
    if not week_start or not week_end:
        today = datetime.date.today()
        week_start = today - datetime.timedelta(days=today.weekday()) # Monday
        week_end = week_start + datetime.timedelta(days=6) # Sunday

    summary = db.query(models.WeeklySummary).filter(
        models.WeeklySummary.user_id == user_id,
        models.WeeklySummary.week_start == week_start,
        models.WeeklySummary.week_end == week_end
    ).first()

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly summary not found for this date range. Please click 'Generate Summary' to run the AI compiler."
        )

    return summary


@router.post("/weekly-summary/{user_id}/generate", response_model=schemas.WeeklySummaryOut)
def generate_weekly_summary(
    user_id: int,
    week_start: Optional[datetime.date] = Query(None),
    week_end: Optional[datetime.date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_mentor_or_admin)
):
    """
    Mentor & Admin: Generate weekly performance summary for a user using Gemini API (or sandbox).
    """
    if not week_start or not week_end:
        today = datetime.date.today()
        week_start = today - datetime.timedelta(days=today.weekday()) # Monday
        week_end = week_start + datetime.timedelta(days=6) # Sunday

    # Verify target user exists
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 1. Query reports logged during this week
    reports = db.query(models.DailyReport).filter(
        models.DailyReport.user_id == user_id,
        models.DailyReport.date >= week_start,
        models.DailyReport.date <= week_end
    ).order_by(models.DailyReport.date.asc()).all()

    # 2. Query attendance logs during this week
    attendance = db.query(models.Attendance).filter(
        models.Attendance.user_id == user_id,
        models.Attendance.date >= week_start,
        models.Attendance.date <= week_end
    ).all()

    # 3. Check if we are in Sandbox Mode or run real API
    api_key = settings.GEMINI_API_KEY
    use_sandbox = not api_key
    
    if api_key:
        # Format logs for Gemini API prompt
        reports_logs = []
        for r in reports:
            reports_logs.append(
                f"Date: {r.date} | Task: {r.task_title} | Hours: {r.hours_worked} | "
                f"Desc: {r.description} | Challenges: {r.challenges_faced or 'None'} | Learning: {r.learning_outcomes or 'None'}"
            )
        
        attendance_logs = []
        for a in attendance:
            attendance_logs.append(f"Date: {a.date} | Check-in: {a.check_in_time.strftime('%H:%M:%S') if a.check_in_time else 'N/A'} | Status: {a.status}")

        reports_summary = "\n".join(reports_logs)
        attendance_summary = "\n".join(attendance_logs)

        system_instruction = (
            "You are a weekly workspace summary generator assistant. Your job is to read daily reports and attendance logs of an employee/intern and summarize their week.\n"
            "You MUST return a valid JSON object. Do not include markdown wraps or backticks in the response. Return strictly JSON.\n"
            "Format of the JSON response:\n"
            "{\n"
            "  \"summary\": \"A 2-3 sentence paragraph summarizing achievements, active tasks, and performance.\",\n"
            "  \"blockers\": \"Summary of blockers, challenges, or issues faced. Write 'None' if there were no issues.\",\n"
            "  \"sentiment\": \"overall sentiment value: 'positive', 'neutral', 'stressed', or 'frustrated'\",\n"
            "  \"blocker_detected\": true/false\n"
            "}"
        )

        user_content = (
            f"Here is the daily report feed for this week:\n{reports_summary}\n\n"
            f"Here is the check-in attendance feed for this week:\n{attendance_summary}"
        )

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            gemini_payload = {
                "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                "generationConfig": {
                    "responseMimeType": "application/json"
                },
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                }
            }
            
            response = requests.post(url, json=gemini_payload, headers=headers, timeout=15)
            if response.status_code != 200:
                raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
                
            res_data = response.json()
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise Exception("Gemini API returned empty response candidates")
                
            reply_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
            
            # Parse JSON
            parsed = json.loads(reply_text)
            summary_text = parsed.get("summary", "No summary generated.")
            blockers_text = parsed.get("blockers", "None")
            sentiment = parsed.get("sentiment", "neutral")
            blocker_detected = parsed.get("blocker_detected", False)
            
        except Exception as e:
            print(f"Gemini API failed ({e}). Falling back to Sandbox Simulation Mode.")
            use_sandbox = True

    if use_sandbox:
        # Sandbox simulated analysis
        titles = [r.task_title for r in reports if r.task_title]
        total_hours = sum(r.hours_worked for r in reports)
        late_checkins = sum(1 for a in attendance if a.status == "late")
        absent_days = sum(1 for a in attendance if a.status == "absent")
        
        has_blocker_word = any("block" in (r.challenges_faced or "").lower() or "stuck" in (r.challenges_faced or "").lower() for r in reports)
        
        summary_text = (
            f"During this week, the user made significant progress, logging a total of {total_hours} working hours. "
            f"Active tasks worked on included: {', '.join(titles[:3]) or 'general software development tasks'}. "
            f"Attendance was maintained with {len(attendance) - late_checkins - absent_days} on-time check-ins."
        )
        blockers_text = "None reported. The candidate was able to proceed with standard objectives." if not has_blocker_word else "The intern was blocked temporarily on local environment setups or package conflicts."
        sentiment = "stressed" if has_blocker_word else ("positive" if len(reports) >= 4 else "neutral")
        blocker_detected = has_blocker_word

    # 4. Check if summary already exists in DB to update it, else create new
    existing = db.query(models.WeeklySummary).filter(
        models.WeeklySummary.user_id == user_id,
        models.WeeklySummary.week_start == week_start,
        models.WeeklySummary.week_end == week_end
    ).first()

    if existing:
        existing.summary_text = summary_text
        existing.blockers = blockers_text
        existing.sentiment = sentiment
        existing.blocker_detected = blocker_detected
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_summary = models.WeeklySummary(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
            summary_text=summary_text,
            blockers=blockers_text,
            sentiment=sentiment,
            blocker_detected=blocker_detected
        )
        db.add(new_summary)
        db.commit()
        db.refresh(new_summary)
        return new_summary


