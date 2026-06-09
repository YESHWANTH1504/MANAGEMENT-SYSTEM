import pytest
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

def test_geofenced_check_in(client, db_session):
    # 1. Register a test intern
    intern_data = {
        "email": "geotest@example.com",
        "password": "geopassword123",
        "full_name": "Geo Test Intern",
        "role": "intern",
        "internship_id": "IMMS-2026-GEO1",
        "internship_domain": "QA Testing",
        "mobile_number": "1112223333",
        "gender": "male"
    }
    res_reg = client.post("/api/v1/auth/register", json=intern_data)
    assert res_reg.status_code == 201

    # 2. Log in to get token
    res_login = client.post("/api/v1/auth/login-json", json={
        "email": "geotest@example.com",
        "password": "geopassword123"
    })
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]

    # 3. Attempt check-in without coordinates - should fail (400)
    res_checkin_none = client.post(
        "/api/v1/attendance/check-in",
        json={"latitude": None, "longitude": None},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_checkin_none.status_code == 400
    assert "GPS coordinates are required" in res_checkin_none.json()["detail"]

    # 4. Attempt check-in from unauthorized location - should fail (400)
    res_checkin_far = client.post(
        "/api/v1/attendance/check-in",
        json={"latitude": 13.0000, "longitude": 80.2000},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_checkin_far.status_code == 400
    assert "outside the authorized office area" in res_checkin_far.json()["detail"]

    # 5. Attempt check-in from authorized location (within geofence) - should succeed
    res_checkin_near = client.post(
        "/api/v1/attendance/check-in",
        json={"latitude": 12.92135, "longitude": 80.12205},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_checkin_near.status_code == 200
