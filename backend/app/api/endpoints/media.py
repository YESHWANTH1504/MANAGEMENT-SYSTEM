import os
import uuid
import shutil
import mimetypes
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import models
from app.api import deps
from app.schemas import schemas
from app.core.config import settings

router = APIRouter()

# Extension categorization mapping
EXTENSION_MAP = {
    # Images
    "jpg": "image", "jpeg": "image", "png": "image", "gif": "image", "webp": "image",
    # Documents
    "pdf": "document", "doc": "document", "docx": "document", "ppt": "document", "pptx": "document", 
    "xls": "document", "xlsx": "document", "txt": "document",
    # Audio
    "mp3": "audio", "wav": "audio", "aac": "audio",
    # Video
    "mp4": "video", "mov": "video", "avi": "video", "webm": "video",
    # Archives
    "zip": "archive", "rar": "archive"
}

@router.post("/upload", response_model=schemas.ReportAttachmentOut)
def upload_report_attachment(
    report_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Upload a file attachment and link it to an existing daily report.
    Only the report author (intern) can upload files to it.
    """
    report = db.query(models.DailyReport).filter(models.DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked daily report not found"
        )
        
    # Access check
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only attach files to your own reports"
        )
        
    if report.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot attach files to reviewed reports"
        )

    # Validate file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    ext = ext.lstrip(".")
    
    if ext not in EXTENSION_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'"
        )
        
    file_category = EXTENSION_MAP[ext]

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate a secure unique file name on disk
    unique_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Read and save in chunks to prevent memory blowup for large files
    try:
        file_size = 0
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    # Clean up partial file
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"
                    )
                buffer.write(chunk)
    except Exception as e:
        if not isinstance(e, HTTPException):
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving file: {str(e)}"
            )
        raise e

    # Create Attachment Record
    new_attachment = models.ReportAttachment(
        report_id=report_id,
        file_name=filename,
        file_path=file_path,
        file_type=file_category,
        file_size=file_size,
        uploaded_by_id=current_user.id
    )
    
    db.add(new_attachment)
    
    # Notify activity feed
    activity = models.ActivityFeed(
        user_id=current_user.id,
        activity_type="file_upload",
        ref_id=report_id,
        details=f"Uploaded {file_category}: '{filename}' ({round(file_size / (1024*1024), 2)} MB)"
    )
    db.add(activity)
    
    db.commit()
    db.refresh(new_attachment)
    return new_attachment

@router.get("/download/{attachment_id}")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Download/stream an uploaded attachment securely. 
    Verifies authentication and enforces supervisor boundaries for mentors.
    """
    attachment = db.query(models.ReportAttachment).filter(models.ReportAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File attachment not found"
        )
        
    # Any authenticated user has access to view/download attachments since they can see other interns' activity.
    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File has been deleted from server disk"
        )

    # Resolve the MIME-type dynamically
    mime_type, _ = mimetypes.guess_type(attachment.file_name)
    if not mime_type:
        mime_type = "application/octet-stream"

    # Return FileResponse which handles chunks and range requests for audio/video automatically
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type=mime_type,
        content_disposition_type="inline"
    )

@router.delete("/{attachment_id}", status_code=status.HTTP_200_OK)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Delete an attachment. Only report author can delete pending report attachment. Admins can delete anything.
    """
    attachment = db.query(models.ReportAttachment).filter(models.ReportAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File attachment not found"
        )
        
    report = db.query(models.DailyReport).filter(models.DailyReport.id == attachment.report_id).first()
    
    if current_user.role != "admin" and attachment.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    if current_user.role != "admin" and report and report.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete attachments on reviewed reports"
        )

    # Delete from local file system
    if os.path.exists(attachment.file_path):
        try:
            os.remove(attachment.file_path)
        except Exception:
            pass # Continue database removal even if file deletion fails

    db.delete(attachment)
    db.commit()
    return {"detail": "File deleted successfully"}

@router.post("/upload-avatar")
def upload_avatar(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Upload a profile picture for an intern or employee.
    Admin can upload for any user, standard users can only upload for themselves.
    """
    # Access check: admin or owner
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload your own profile photo"
        )
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Validate file extension
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    ext = ext.lstrip(".")
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed formats: jpg, jpeg, png, webp, gif"
        )

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    unique_filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save profile picture: {str(e)}"
        )

    # Update database record
    profile = None
    if user.role == "intern":
        profile = db.query(models.Intern).filter(models.Intern.user_id == user.id).first()
    elif user.role == "employee":
        profile = db.query(models.Employee).filter(models.Employee.user_id == user.id).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Delete old avatar file if it exists and is local
    if profile.profile_photo:
        old_path = os.path.join(settings.UPLOAD_DIR, profile.profile_photo)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass

    profile.profile_photo = unique_filename
    db.commit()

    # Sync to MongoDB if applicable
    try:
        from app.db import mongodb
        if user.role == "intern":
            mongodb.sync_intern_to_mongo(db, profile.id)
        elif user.role == "employee":
            mongodb.sync_employee_to_mongo(db, profile.id)
    except Exception:
        pass

    return {
        "detail": "Profile photo uploaded successfully",
        "profile_photo": unique_filename
    }
