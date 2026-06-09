import os
from datetime import date
from typing import List, Optional
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import models
from app.api import deps
from app.core.config import settings

router = APIRouter()

# Schema models
class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    text: str

class ChatPayload(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    sandbox: bool  # True if running in sandbox/simulation mode

@router.post("/chat", response_model=ChatResponse)
def chat_assistant(
    payload: ChatPayload,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core chat endpoint that routes assistant queries to Google Gemini API.
    Injects context queries dynamically for Admin users.
    """
    # 1. Determine role and inject System Prompt Instructions
    if current_user.role == "admin":
        # Fetch current database statistics for context
        try:
            active_interns = db.query(models.Intern).filter(models.Intern.internship_status == "active").count()
            active_employees = db.query(models.Employee).filter(models.Employee.employment_status == "active").count()
            pending_reports = db.query(models.DailyReport).filter(models.DailyReport.status == "pending").count()
            today_str = date.today().isoformat()
            checked_in_today = db.query(models.Attendance).filter(models.Attendance.date == today_str).count()
        except Exception:
            active_interns = 0
            active_employees = 0
            pending_reports = 0
            checked_in_today = 0

        system_prompt = (
            "You are a helpful AI Assistant integrated into the IMMS (Internship Management & Monitoring System) Admin Dashboard.\n"
            "You are talking to an administrator who manages the workspace. Provide professional, clear, data-driven, and business-focused answers.\n"
            f"Here is current live workspace data to assist you:\n"
            f"- Active interns: {active_interns}\n"
            f"- Active employees: {active_employees}\n"
            f"- Reports pending review evaluation: {pending_reports}\n"
            f"- Total people checked in today: {checked_in_today}\n"
            "Use this data to answer questions about dashboard status, current workloads, or attendee metrics. Do not invent other stats."
        )
    else:
        system_prompt = (
            "You are a helpful AI Assistant integrated into the IMMS (Internship Management & Monitoring System) Personal Workspace.\n"
            "You are talking to an intern or employee. Help them draft their daily work reports, organize their tomorrow plans, "
            "solve programming or tech stack questions (e.g. React hooks, FastAPI routers, Tailwind styling, databases), and suggest professional summaries. "
            "Keep answers highly technical, encouraging, professional, and clear."
        )

    # 2. Check if API Key is configured. If empty, enter Sandbox Mode.
    api_key = settings.GEMINI_API_KEY
    use_sandbox = not api_key
    
    if api_key:
        # 3. Format payload contents for Gemini API
        formatted_contents = []
        for h in payload.history:
            formatted_contents.append({
                "role": "user" if h.role == "user" else "model",
                "parts": [{"text": h.text}]
            })
        
        # Append newest message
        formatted_contents.append({
            "role": "user",
            "parts": [{"text": payload.message}]
        })

        # Comply with Gemini API rules (must start with 'user', alternate roles)
        while formatted_contents and formatted_contents[0]["role"] != "user":
            formatted_contents.pop(0)

        cleaned_contents = []
        for turn in formatted_contents:
            if not cleaned_contents:
                cleaned_contents.append(turn)
            else:
                last_turn = cleaned_contents[-1]
                if last_turn["role"] == turn["role"]:
                    last_turn["parts"][0]["text"] += "\n\n" + turn["parts"][0]["text"]
                else:
                    cleaned_contents.append(turn)
        
        formatted_contents = cleaned_contents

        # 4. Fire POST REST call to Google Gemini API
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            gemini_payload = {
                "contents": formatted_contents,
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                }
            }
            
            response = requests.post(url, json=gemini_payload, headers=headers, timeout=15)
            
            if response.status_code != 200:
                raise Exception(f"Gemini API returned status {response.status_code}: {response.text}")
                
            res_data = response.json()
            
            # Parse output from candidate parts
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise Exception("Empty response returned from Gemini API.")
                
            reply = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return ChatResponse(reply=reply, sandbox=False)
            
        except Exception as e:
            print(f"Gemini Chat API failed ({e}). Falling back to Sandbox Simulation Mode.")
            use_sandbox = True

    if use_sandbox:
        # Sandbox simulated responses
        msg = payload.message.lower()
        if "report" in msg or "draft" in msg:
            simulated_reply = (
                "**Simulated AI Report Assistant Draft:**\n\n"
                "Here is a draft daily report you can copy:\n"
                f"- **Task Title**: Refined components & debugging interface\n"
                f"- **Description**: Customised layout panels and resolved rendering loop bug in {msg}.\n"
                f"- **Hours Worked**: 8 hours\n"
                f"- **Technologies**: React, Tailwind CSS, FastAPI\n"
                f"- **Tomorrow's Plan**: Finalize integration tests and prepare production build."
            )
        elif "stats" in msg or "summary" in msg or "attendance" in msg:
            simulated_reply = (
                "**Simulated AI Workspace Summary:**\n\n"
                "Here is an overview of the current workspace statistics:\n"
                "- 🟢 **System Status**: Online & Active\n"
                "- 📊 **Punctuality**: 85% on-time check-in rate this week.\n"
                "- 📝 **Activity Feed**: Normal submission levels detected across all domains."
            )
        else:
            simulated_reply = (
                f"Hello! I am your AI Workspace Assistant. (Simulation Mode)\n\n"
                f"I received your question: \"{payload.message}\".\n\n"
                "To get real, intelligent responses from me, please configure your **`GEMINI_API_KEY`** "
                "in your `.env` file."
            )
        
        return ChatResponse(reply=simulated_reply, sandbox=True)
