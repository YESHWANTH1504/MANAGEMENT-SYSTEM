from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.TaskOut])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get lists of tasks. Admins can see all tasks, users can only see tasks assigned to them.
    """
    if current_user.role == "admin":
        return db.query(models.Task).order_by(models.Task.created_at.desc()).all()
    else:
        return db.query(models.Task).filter(models.Task.assigned_to_id == current_user.id).order_by(models.Task.created_at.desc()).all()

@router.post("/", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Assign a new task card to an intern or employee.
    """
    # Verify assignee exists
    assignee = db.query(models.User).filter(models.User.id == data.assigned_to_id).first()
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned user not found"
        )

    new_task = models.Task(
        title=data.title,
        description=data.description,
        status=data.status,
        assigned_to_id=data.assigned_to_id,
        created_by_id=current_user.id,
        due_date=data.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update a task.
    Admins can update all fields. Users can only update their assigned task's column status.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Access control
    if current_user.role != "admin" and task.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks assigned to you"
        )

    update_data = data.dict(exclude_unset=True)

    if current_user.role != "admin":
        # Restrict standard users to only update status column
        allowed_keys = ["status"]
        for key in list(update_data.keys()):
            if key not in allowed_keys:
                del update_data[key]

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_admin)
):
    """
    Admin only: Delete a task card.
    """
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    db.delete(task)
    db.commit()
    return {"detail": "Task deleted successfully"}
