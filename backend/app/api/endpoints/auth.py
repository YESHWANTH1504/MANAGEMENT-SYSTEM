from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.core import security
from app.core.config import settings
from app.api import deps
from app.schemas import schemas

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login(
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Standard OAuth2 compatible token login, parsing username & password.
    Returns access token, and sets refresh token in HttpOnly cookie.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = security.create_refresh_token(user.id, expires_delta=refresh_token_expires)
    
    # Set the refresh token inside a secure, HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False  # Set to True in production with HTTPS
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.post("/login-json", response_model=schemas.Token)
def login_json(
    response: Response,
    request_data: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    """
    JSON-based API login. Useful for custom client JSON fetch requests.
    """
    user = db.query(models.User).filter(models.User.email == request_data.email).first()
    if not user or not security.verify_password(request_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = security.create_refresh_token(user.id, expires_delta=refresh_token_expires)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        secure=False
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Issue a new access token using the refresh token cookie.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    payload = security.decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session invalid"
        )
        
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or deleted"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = security.create_access_token(user.id, expires_delta=access_token_expires)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.post("/logout")
def logout(response: Response):
    """Log out current user session by clearing refresh cookie."""
    response.delete_cookie("refresh_token")
    return {"detail": "Successfully logged out"}

@router.get("/me")
def read_current_user(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Retrieve full user profile and contextual records."""
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }
    
    if current_user.role == "intern":
        profile = db.query(models.Intern).filter(models.Intern.user_id == current_user.id).first()
        if profile:
            user_data["profile"] = {
                "full_name": profile.full_name,
                "profile_photo": profile.profile_photo,
                "internship_id": profile.internship_id,
                "internship_domain": profile.internship_domain,
                "project_name": profile.project_name,
            }
    elif current_user.role == "employee":
        profile = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
        if profile:
            user_data["profile"] = {
                "full_name": profile.full_name,
                "profile_photo": profile.profile_photo,
                "employee_id": profile.employee_id,
                "department": profile.department,
                "designation": profile.designation,
                "project_name": profile.project_name,
            }
    return user_data

@router.post("/change-password")
def change_password(
    data: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Securely change current user's password."""
    if not security.verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    current_user.password_hash = security.get_password_hash(data.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    data: schemas.UserRegistration,
    db: Session = Depends(get_db)
):
    """
    Public Endpoint: Self-register an employee or intern user profile.
    """
    # 1. Check if role is valid
    if data.role not in ["intern", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'intern' or 'employee'"
        )

    # 2. Check if email is already registered
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    # 3. Handle based on role
    if data.role == "intern":
        if not data.internship_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Internship ID is required for Intern registration"
            )
        
        # Verify uniqueness of Internship ID
        existing_intern = db.query(models.Intern).filter(models.Intern.internship_id == data.internship_id).first()
        if existing_intern:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Internship ID already exists"
            )

        # Create user
        new_user = models.User(
            email=data.email,
            password_hash=security.get_password_hash(data.password),
            role="intern",
            is_active=True
        )
        db.add(new_user)
        db.flush()

        # Create profile
        new_profile = models.Intern(
            user_id=new_user.id,
            full_name=data.full_name,
            mobile_number=data.mobile_number,
            gender=data.gender,
            college_name=data.college_name,
            degree=data.degree,
            department=data.department,
            internship_id=data.internship_id,
            internship_domain=data.internship_domain,
            start_date=data.start_date,
            end_date=data.end_date,
            project_name=data.project_name,
            programming_languages=data.programming_languages,
            frameworks=data.frameworks,
            tools_used=data.tools_used,
            databases_used=data.databases_used
        )
        db.add(new_profile)

    else: # employee
        if not data.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID is required for Employee registration"
            )

        # Verify uniqueness of Employee ID
        existing_emp = db.query(models.Employee).filter(models.Employee.employee_id == data.employee_id).first()
        if existing_emp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID already exists"
            )

        # Create user
        new_user = models.User(
            email=data.email,
            password_hash=security.get_password_hash(data.password),
            role="employee",
            is_active=True
        )
        db.add(new_user)
        db.flush()

        # Create profile
        new_profile = models.Employee(
            user_id=new_user.id,
            full_name=data.full_name,
            mobile_number=data.mobile_number,
            gender=data.gender,
            employee_id=data.employee_id,
            department=data.department,
            designation=data.designation,
            joining_date=data.joining_date,
            project_name=data.project_name,
            programming_languages=data.programming_languages,
            frameworks=data.frameworks,
            tools_used=data.tools_used,
            databases_used=data.databases_used
        )
        db.add(new_profile)

    # 4. Log to activity feed
    activity = models.ActivityFeed(
        user_id=new_user.id,
        activity_type="register_signup",
        ref_id=new_user.id,
        details=f"Self-registered new account: {data.full_name} ({data.internship_id if data.role == 'intern' else data.employee_id})"
    )
    db.add(activity)

    db.commit()
    try:
        from app.db import mongodb
        mongodb.sync_user_to_mongo(db, new_user.id)
        if data.role == "intern":
            mongodb.sync_intern_to_mongo(db, new_profile.id)
        else:
            mongodb.sync_employee_to_mongo(db, new_profile.id)
    except Exception:
        pass
    return {"detail": "Account registered successfully. You can now log in."}

@router.post("/forgot-password")
def forgot_password(
    data: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a password reset token for user's email if it exists.
    """
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email address not found"
        )
    
    # Generate token
    token = security.create_password_reset_token(user.email)
    
    # Build simulated reset link
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    
    # Print to console/terminal
    print(f"\n=======================================================")
    print(f"PASSWORD RESET SIMULATION FOR: {user.email}")
    print(f"Reset Link: {reset_link}")
    print(f"=======================================================\n")
    
    return {
        "detail": "Password reset link generated successfully.",
        "reset_link": reset_link
    }

@router.post("/reset-password")
def reset_password(
    data: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset user's password using reset token.
    """
    payload = security.decode_token(data.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload"
        )
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    # Hash and save new password
    user.password_hash = security.get_password_hash(data.new_password)
    
    # Log to Activity Feed
    activity = models.ActivityFeed(
        user_id=user.id,
        activity_type="reset_password",
        ref_id=user.id,
        details=f"Password was reset using email token verification"
    )
    db.add(activity)
    
    db.commit()
    return {"detail": "Password has been reset successfully. You can now log in."}

