from fastapi import APIRouter
from app.api.endpoints import auth, interns, employees, attendance, reports, media, analytics, reports_export, tasks, ai

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(interns.router, prefix="/interns", tags=["Intern Profiles"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employee Profiles"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance Tracking"])
api_router.include_router(reports.router, prefix="/reports", tags=["Daily Activity Reports"])
api_router.include_router(media.router, prefix="/media", tags=["File Storage & Uploads"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Dashboard & Analytics"])
api_router.include_router(reports_export.router, prefix="/export", tags=["Report Generation"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Kanban Workspace Tasks"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])

