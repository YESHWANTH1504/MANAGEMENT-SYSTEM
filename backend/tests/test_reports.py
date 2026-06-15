import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.core import security
from app.db import models

# Setup test DB (SQLite in memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_daily_reports_access(client, db_session):
    # 1. Register an intern
    intern_data = {
        "email": "intern@example.com",
        "password": "internpassword123",
        "full_name": "Test Intern",
        "role": "intern",
        "internship_id": "IMMS-2026-0001",
        "internship_domain": "Web Development",
        "mobile_number": "1234567890",
        "gender": "male"
    }
    res_reg = client.post("/api/v1/auth/register", json=intern_data)
    assert res_reg.status_code == 201

    # 2. Register an employee
    employee_data = {
        "email": "employee@example.com",
        "password": "employeepassword123",
        "full_name": "Test Employee",
        "role": "employee",
        "employee_id": "EMP-2026-0001",
        "mobile_number": "0987654321",
        "gender": "female"
    }
    res_reg_emp = client.post("/api/v1/auth/register", json=employee_data)
    assert res_reg_emp.status_code == 201

    # 3. Log in as intern and get token
    res_login_intern = client.post("/api/v1/auth/login-json", json={
        "email": "intern@example.com",
        "password": "internpassword123"
    })
    assert res_login_intern.status_code == 200
    intern_token = res_login_intern.json()["access_token"]

    # 4. Log in as employee and get token
    res_login_employee = client.post("/api/v1/auth/login-json", json={
        "email": "employee@example.com",
        "password": "employeepassword123"
    })
    assert res_login_employee.status_code == 200
    employee_token = res_login_employee.json()["access_token"]

    # 5. Access reports list as Intern - should be allowed (returns 200)
    res_reports_intern = client.get(
        "/api/v1/reports/",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_reports_intern.status_code == 200
    assert isinstance(res_reports_intern.json(), list)

    # 6. Access reports list as Employee - should be allowed (returns 200)
    res_reports_employee = client.get(
        "/api/v1/reports/",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res_reports_employee.status_code == 200
    assert isinstance(res_reports_employee.json(), list)

def test_profile_access(client, db_session):
    # Log in as intern and employee (using the emails registered in previous test)
    res_login_intern = client.post("/api/v1/auth/login-json", json={
        "email": "intern@example.com",
        "password": "internpassword123"
    })
    intern_token = res_login_intern.json()["access_token"]

    res_login_employee = client.post("/api/v1/auth/login-json", json={
        "email": "employee@example.com",
        "password": "employeepassword123"
    })
    employee_token = res_login_employee.json()["access_token"]

    # 1. Intern should be able to get interns list (200 OK)
    res_interns_list = client.get(
        "/api/v1/interns/",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_interns_list.status_code == 200
    interns = res_interns_list.json()
    assert len(interns) > 0
    intern_id = interns[0]["id"]

    # 2. Intern should be able to get employees list (200 OK)
    res_employees_list = client.get(
        "/api/v1/employees/",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_employees_list.status_code == 200
    employees = res_employees_list.json()
    assert len(employees) > 0
    emp_id = employees[0]["id"]

    # 3. Intern should be able to get details of another intern (200 OK)
    res_intern_detail = client.get(
        f"/api/v1/interns/{intern_id}",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_intern_detail.status_code == 200

    # 4. Employee should be able to get details of another employee (200 OK)
    res_emp_detail = client.get(
        f"/api/v1/employees/{emp_id}",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res_emp_detail.status_code == 200


def test_download_accomplishment_report(client, db_session):
    # 1. Log in as intern
    res_login_intern = client.post("/api/v1/auth/login-json", json={
        "email": "intern@example.com",
        "password": "internpassword123"
    })
    intern_token = res_login_intern.json()["access_token"]

    # Get user IDs directly from DB
    intern_user = db_session.query(models.User).filter(models.User.email == "intern@example.com").first()
    intern_user_id = intern_user.id

    # Log in as employee
    res_login_employee = client.post("/api/v1/auth/login-json", json={
        "email": "employee@example.com",
        "password": "employeepassword123"
    })
    employee_token = res_login_employee.json()["access_token"]

    employee_user = db_session.query(models.User).filter(models.User.email == "employee@example.com").first()
    employee_user_id = employee_user.id

    # 2. Submit a report as Intern first
    report_data = {
        "date": "2026-06-11",
        "task_title": "Completed UI Integration",
        "description": "Finished implementing custom profile photo adjustments and responsive alignment rules.",
        "hours_worked": 6.5,
        "technologies_used": "React, Tailwind, CSS",
        "challenges_faced": "None",
        "learning_outcomes": "Responsive styles",
        "tomorrow_plan": "Add report downloads",
        "additional_notes": ""
    }
    res_report = client.post(
        "/api/v1/reports/",
        json=report_data,
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_report.status_code == 200

    # 3. Download the report as Intern - should be allowed (200 OK)
    res_pdf = client.get(
        f"/api/v1/reports/user/{intern_user_id}/download-pdf",
        headers={"Authorization": f"Bearer {intern_token}"}
    )
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert "attachment" in res_pdf.headers["content-disposition"]
    assert len(res_pdf.content) > 0

    # 4. Try to download Intern's report as Employee - should be denied (403 Forbidden)
    res_pdf_forbidden = client.get(
        f"/api/v1/reports/user/{intern_user_id}/download-pdf",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    assert res_pdf_forbidden.status_code == 403


