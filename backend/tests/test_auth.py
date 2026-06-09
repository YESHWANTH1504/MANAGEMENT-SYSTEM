import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.core import security

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

def test_password_hash():
    password = "MyTestPassword123"
    hashed = security.get_password_hash(password)
    assert hashed != password
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrong_password", hashed)

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_password_reset_flow(client, db_session):
    # 1. Try to request password reset for non-existent email
    res = client.post("/api/v1/auth/forgot-password", json={"email": "nonexistent@example.com"})
    assert res.status_code == 404
    
    # 2. Register a new user
    user_data = {
        "email": "reset_test@example.com",
        "password": "OldPassword123",
        "full_name": "Reset Test User",
        "role": "intern",
        "internship_id": "IMMS-RESET-0001",
        "internship_domain": "QA Engineering",
        "mobile_number": "5551234567",
        "gender": "other"
    }
    res_reg = client.post("/api/v1/auth/register", json=user_data)
    assert res_reg.status_code == 201
    
    # 3. Request password reset for registered email
    res_forgot = client.post("/api/v1/auth/forgot-password", json={"email": "reset_test@example.com"})
    assert res_forgot.status_code == 200
    res_data = res_forgot.json()
    assert "reset_link" in res_data
    assert "token=" in res_data["reset_link"]
    
    # Extract token from the simulated reset link
    token = res_data["reset_link"].split("token=")[1]
    
    # 4. Attempt password reset with invalid token
    res_reset_invalid = client.post("/api/v1/auth/reset-password", json={"token": "invalid_token", "new_password": "NewPassword123"})
    assert res_reset_invalid.status_code == 400
    
    # 5. Attempt password reset with valid token
    res_reset_valid = client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "NewPassword123"})
    assert res_reset_valid.status_code == 200
    
    # 6. Attempt login with old password (should fail)
    res_login_old = client.post("/api/v1/auth/login", data={"username": "reset_test@example.com", "password": "OldPassword123"})
    assert res_login_old.status_code == 400
    
    # 7. Attempt login with new password (should succeed)
    res_login_new = client.post("/api/v1/auth/login", data={"username": "reset_test@example.com", "password": "NewPassword123"})
    assert res_login_new.status_code == 200
    assert "access_token" in res_login_new.json()
