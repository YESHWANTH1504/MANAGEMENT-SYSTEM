import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.core import security
from app.db import models

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

def test_weekly_summary_flow(client, db_session):
    # 1. Register and login as admin
    admin_data = {
        "email": "weeklyadmin@example.com",
        "password": "adminpassword123"
    }
    
    admin_user = models.User(
        email=admin_data["email"],
        password_hash=security.get_password_hash(admin_data["password"]),
        role="admin",
        is_active=True
    )
    db_session.add(admin_user)
    db_session.commit()

    res_login = client.post("/api/v1/auth/login-json", json=admin_data)
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]

    # 2. Register an intern
    intern_data = {
        "email": "weeklyintern@example.com",
        "password": "internpassword123",
        "full_name": "Weekly Intern",
        "role": "intern",
        "internship_id": "IMMS-2026-WKLY",
        "internship_domain": "Backend Dev"
    }
    res_reg = client.post("/api/v1/auth/register", json=intern_data)
    assert res_reg.status_code == 201
    
    user = db_session.query(models.User).filter(models.User.email == intern_data["email"]).first()
    assert user is not None
    intern_user_id = user.id

    # 3. Create a daily report for this intern
    today = datetime.date.today()
    report = models.DailyReport(
        user_id=intern_user_id,
        date=today,
        task_title="Completed AI weekly summary router",
        description="Fitted models, routers, and schemas. Checked in near coordinates.",
        hours_worked=8.0,
        technologies_used="FastAPI, SQLite",
        challenges_faced="Sandbox testing fallback models",
        learning_outcomes="Learned Pydantic validation scopes",
        status="pending"
    )
    db_session.add(report)
    db_session.commit()

    # 4. Generate weekly summary via API - should succeed (using sandbox mode fallback)
    res_gen = client.post(
        f"/api/v1/analytics/weekly-summary/{intern_user_id}/generate",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_gen.status_code == 200
    data = res_gen.json()
    assert data["user_id"] == intern_user_id
    assert len(data["summary_text"]) > 10
    assert data["sentiment"] in ["positive", "neutral", "stressed", "frustrated"]

    # 5. Fetch cached weekly summary - should succeed
    res_get = client.get(
        f"/api/v1/analytics/weekly-summary/{intern_user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_get.status_code == 200
    assert res_get.json()["summary_text"] == data["summary_text"]
