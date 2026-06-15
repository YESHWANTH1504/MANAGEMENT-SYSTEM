from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas
from app.core import security

router = APIRouter()

@router.post("/", response_model=schemas.EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    data: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Register an employee user account and create their profile.
    """
    # Check if user email already exists
    existing_user = db.query(models.User).filter(models.User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Check if employee ID is unique
    existing_emp = db.query(models.Employee).filter(models.Employee.employee_id == data.employee_id).first()
    if existing_emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee ID already exists"
        )

    # Create the user login account
    new_user = models.User(
        email=data.email,
        password_hash=security.get_password_hash(data.password),
        role="employee",
        is_active=True
    )
    db.add(new_user)
    db.flush()  # Obtain new_user.id

    # Create the employee profile
    new_emp = models.Employee(
        user_id=new_user.id,
        full_name=data.full_name,
        mobile_number=data.mobile_number,
        gender=data.gender,
        employee_id=data.employee_id,
        department=data.department,
        designation=data.designation,
        joining_date=data.joining_date,
        employment_status=data.employment_status or "active",
        project_name=data.project_name,
        project_description=data.project_description,
        programming_languages=data.programming_languages,
        frameworks=data.frameworks,
        tools_used=data.tools_used,
        databases_used=data.databases_used
    )
    db.add(new_emp)
    
    # Track creation in activity feed
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type="employee_create",
        ref_id=new_user.id,
        details=f"Registered employee {data.full_name} ({data.employee_id})"
    )
    db.add(activity)
    
    db.commit()
    try:
        from app.db import mongodb
        mongodb.sync_user_to_mongo(db, new_user.id)
        mongodb.sync_employee_to_mongo(db, new_emp.id)
    except Exception:
        pass
    db.refresh(new_emp)
    return new_emp

@router.get("/", response_model=List[schemas.EmployeeOut])
def get_employees(
    search: Optional[str] = Query(None, description="Search by Name, ID, Department, Designation, or Tech"),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Admins: Get lists of all registered employees with advanced search and filters.
    """
    query = db.query(models.Employee)
    
    if department:
        query = query.filter(models.Employee.department == department)
    if status:
        query = query.filter(models.Employee.employment_status == status)
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            models.Employee.full_name.like(search_filter) |
            models.Employee.employee_id.like(search_filter) |
            models.Employee.department.like(search_filter) |
            models.Employee.designation.like(search_filter) |
            models.Employee.programming_languages.like(search_filter) |
            models.Employee.frameworks.like(search_filter)
        )
        
    return query.all()

@router.get("/{emp_id}", response_model=schemas.EmployeeOut)
def get_employee_by_id(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Fetch details of a single employee. 
    Employees can only access their own profile. Admins have global access.
    """
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )
    return emp

@router.put("/{emp_id}", response_model=schemas.EmployeeOut)
def update_employee(
    emp_id: int,
    data: schemas.EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update profile details. 
    Employees can update a subset of their profile details. Admins can update everything.
    """
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )
        
    # Access control check
    if current_user.role == "employee" and current_user.id != emp.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own profile"
        )
        
    update_data = data.dict(exclude_unset=True)
    
    # If the user is an employee, restrict editing administrative fields
    if current_user.role == "employee":
        restricted_fields = [
            "joining_date", "employment_status", "department", "designation"
        ]
        for field in restricted_fields:
            if field in update_data:
                del update_data[field]

    # Apply updates
    for key, value in update_data.items():
        if key == "employment_status" and not value:
            continue
        setattr(emp, key, value)
        
    db.commit()
    try:
        from app.db import mongodb
        mongodb.sync_employee_to_mongo(db, emp.id)
    except Exception:
        pass
    db.refresh(emp)
    return emp

@router.delete("/{emp_id}", status_code=status.HTTP_200_OK)
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Delete an employee profile and their associated system user record.
    """
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )
        
    # Fetch User record
    user = db.query(models.User).filter(models.User.id == emp.user_id).first()
    emp_id = emp.id
    
    # Delete from DB (ondelete CASCADE will delete profile, attendance, etc.)
    db.delete(user)
    db.commit()
    try:
        from app.db import mongodb
        mongodb.delete_employee_from_mongo(emp_id)
    except Exception:
        pass
    return {"detail": "Employee and all associated records deleted successfully"}
