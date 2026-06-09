import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine, Base, SessionLocal
from app.db import models
from app.core import security

# 1. Initialize Database Tables automatically (SQLite fallback)
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables synchronized successfully.")
except Exception as e:
    print(f"Error synchronizing database tables: {e}")

# 2. Seed Default Database Records for Admin and Mentor accounts
db = SessionLocal()
try:
    # Check if admin user exists, else seed
    admin_user = db.query(models.User).filter(models.User.email == "admin@imms.com").first()
    if not admin_user:
        new_admin = models.User(
            email="admin@imms.com",
            password_hash=security.get_password_hash("AdminPassword123"),
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        print("Default administrator seeded: admin@imms.com / AdminPassword123")
        
    # Check if employee user exists, else seed
    employee_user = db.query(models.User).filter(models.User.email == "employee@imms.com").first()
    if not employee_user:
        new_employee = models.User(
            email="employee@imms.com",
            password_hash=security.get_password_hash("EmployeePassword123"),
            role="employee",
            is_active=True
        )
        db.add(new_employee)
        db.flush()
        
        # Create default employee profile
        new_emp_profile = models.Employee(
            user_id=new_employee.id,
            full_name="Jane Doe (Employee)",
            employee_id="EMP-2026-001",
            department="Engineering",
            designation="Software Engineer",
            employment_status="active"
        )
        db.add(new_emp_profile)
        print("Default employee seeded: employee@imms.com / EmployeePassword123")
        
    db.commit()
except Exception as e:
    print(f"Error seeding default users: {e}")
    db.rollback()
finally:
    db.close()

# 3. Instantiate FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Internship Management & Monitoring System (IMMS)",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 4. Set CORS origins middleware — allow all origins for LAN/multi-device access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Create media upload directory if missing
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# 6. Mount Static Uploads Folder
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# 7. Attach API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs": "/docs"
    }
