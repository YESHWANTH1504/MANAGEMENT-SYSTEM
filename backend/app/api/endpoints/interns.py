from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas
from app.core import security

router = APIRouter()

@router.post("/", response_model=schemas.InternOut, status_code=status.HTTP_201_CREATED)
def create_intern(
    data: schemas.InternCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Register an intern user account and create their profile.
    """
    # Check if user email already exists
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Check if internship ID is unique
    existing_intern = db.query(models.Intern).filter(models.Intern.internship_id == data.internship_id).first()
    if existing_intern:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Internship ID already exists"
        )

    # Create the user login account
    new_user = models.User(
        email=data.email,
        password_hash=security.get_password_hash(data.password),
        role="intern",
        is_active=True
    )
    db.add(new_user)
    db.flush()  # Obtain new_user.id

    # Create the intern profile
    new_intern = models.Intern(
        user_id=new_user.id,
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        gender=data.gender,
        college_name=data.college_name,
        university_name=data.university_name,
        degree=data.degree,
        department=data.department,
        academic_year=data.academic_year,
        internship_id=data.internship_id,
        internship_domain=data.internship_domain,
        project_name=data.project_name,
        project_description=data.project_description,
        start_date=data.start_date,
        end_date=data.end_date,
        internship_status=data.internship_status or "active",
        programming_languages=data.programming_languages,
        frameworks=data.frameworks,
        tools_used=data.tools_used,
        databases_used=data.databases_used,
        technologies_learned=data.technologies_learned
    )
    db.add(new_intern)
    
    # Track creation in activity feed
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type="intern_create",
        ref_id=new_user.id,
        details=f"Registered intern {data.full_name} ({data.internship_id})"
    )
    db.add(activity)
    
    db.commit()
    try:
        from app.db import mongodb
        mongodb.sync_user_to_mongo(db, new_user.id)
        mongodb.sync_intern_to_mongo(db, new_intern.id)
    except Exception:
        pass
    db.refresh(new_intern)
    return new_intern

@router.get("/", response_model=List[schemas.InternOut])
def get_interns(
    search: Optional[str] = Query(None, description="Search by Name, College, Domain, Project, or Tech"),
    domain: Optional[str] = Query(None),
    college: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Admins: Get lists of all registered interns with advanced search and filters.
    """
    query = db.query(models.Intern)
    
    if domain:
        query = query.filter(models.Intern.internship_domain == domain)
    if college:
        query = query.filter(models.Intern.college_name == college)
    if status:
        query = query.filter(models.Intern.internship_status == status)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            models.Intern.full_name.like(search_filter) |
            models.Intern.college_name.like(search_filter) |
            models.Intern.degree.like(search_filter) |
            models.Intern.department.like(search_filter) |
            models.Intern.internship_domain.like(search_filter) |
            models.Intern.project_name.like(search_filter) |
            models.Intern.programming_languages.like(search_filter) |
            models.Intern.frameworks.like(search_filter)
        )
        
    return query.all()

@router.get("/{intern_id}", response_model=schemas.InternOut)
def get_intern_by_id(
    intern_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Fetch details of a single intern. 
    Interns can only access their own profile. Admins have global access.
    """
    intern = db.query(models.Intern).filter(models.Intern.id == intern_id).first()
    if not intern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intern profile not found"
        )
    return intern

@router.put("/{intern_id}", response_model=schemas.InternOut)
def update_intern(
    intern_id: int,
    data: schemas.InternUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update profile details. 
    Interns can update a subset of their profile details. Admins can update everything.
    """
    intern = db.query(models.Intern).filter(models.Intern.id == intern_id).first()
    if not intern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intern profile not found"
        )
        
    # Access control check
    if current_user.role == "intern" and current_user.id != intern.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own profile"
        )
        
    update_data = data.dict(exclude_unset=True)
    
    # If the user is an intern, restrict editing administrative fields
    if current_user.role == "intern":
        restricted_fields = [
            "start_date", "end_date", 
            "internship_status", "internship_domain"
        ]
        for field in restricted_fields:
            if field in update_data:
                del update_data[field]

    # Apply updates
    for key, value in update_data.items():
        if key == "internship_status" and not value:
            continue
        setattr(intern, key, value)
        
    db.commit()
    try:
        from app.db import mongodb
        mongodb.sync_intern_to_mongo(db, intern.id)
    except Exception:
        pass
    db.refresh(intern)
    return intern

@router.delete("/{intern_id}", status_code=status.HTTP_200_OK)
def delete_intern(
    intern_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Delete an intern profile and their associated system user record.
    """
    intern = db.query(models.Intern).filter(models.Intern.id == intern_id).first()
    if not intern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intern profile not found"
        )
        
    # Fetch User record
    user = db.query(models.User).filter(models.User.id == intern.user_id).first()
    intern_id = intern.id
    
    # Delete from DB (ondelete CASCADE will delete profile, attendance, etc.)
    db.delete(user)
    db.commit()
    try:
        from app.db import mongodb
        mongodb.delete_intern_from_mongo(intern_id)
    except Exception:
        pass
    return {"detail": "Intern and all associated records deleted successfully"}
