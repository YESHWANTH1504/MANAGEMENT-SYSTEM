import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_reset_password_email(email_to: str, reset_link: str):
    """
    Sends a password reset email using SMTP.
    If SMTP settings are not configured, logs the email and writes to simulated log file.
    """
    subject = "IMMS Password Reset Link"
    
    # HTML body with MCC ADM branding matching the visual guidelines
    html_content = f"""
    <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #b6e9fc; padding: 30px; color: #1c4d5e; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(28, 77, 94, 0.15); box-shadow: 0 10px 30px rgba(28, 77, 94, 0.1);">
                <div style="text-align: center; border-bottom: 2px solid rgba(28, 77, 94, 0.1); padding-bottom: 25px; margin-bottom: 25px;">
                    <h2 style="color: #1c4d5e; margin: 0; font-size: 26px; font-weight: 800; tracking-wide: 0.5px;">MCC ADMIN</h2>
                    <p style="color: #1ca4c8; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Innovation Park Management System</p>
                </div>
                <div>
                    <h3 style="color: #1c4d5e; margin-top: 0; font-size: 20px; font-weight: 700;">Password Reset Request</h3>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello,</p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">We received a request to reset the password for your IMMS account. Click the button below to choose a new password. This link is only valid for 15 minutes.</p>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="{reset_link}" style="background-color: #1c4d5e; color: #b6e9fc; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(28, 77, 94, 0.2);">Reset Password</a>
                    </div>
                    <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If you did not request a password reset, you can safely ignore this email. Your account credentials will remain unchanged.</p>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid rgba(28, 77, 94, 0.1); padding-top: 20px; line-height: 1.6; word-break: break-all;">
                        If the button above does not work, copy and paste this URL into your browser:<br/>
                        <a href="{reset_link}" style="color: #1ca4c8; text-decoration: underline;">{reset_link}</a>
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    
    text_content = f"""
    Hello,
    
    We received a request to reset the password for your IMMS account. 
    Use the link below to choose a new password. This link will expire in 15 minutes.
    
    {reset_link}
    
    If you did not request a password reset, you can safely ignore this email.
    """
    
    # Check if SMTP is configured
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP settings not fully configured. Simulating email sending.")
        _simulate_email(email_to, subject, text_content)
        return False
        
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg['To'] = email_to
        
        # Attach parts
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        # Connect to SMTP server with a 5-second timeout
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5.0)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5.0)
            if settings.SMTP_TLS:
                server.starttls()
                
        # Login and send
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL, email_to, msg.as_string())
        server.quit()
        logger.info(f"Password reset email sent successfully to {email_to}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email_to} via SMTP: {e}")
        # fallback to simulated
        _simulate_email(email_to, subject, text_content)
        return False

def _simulate_email(email_to: str, subject: str, body: str):
    """
    Helper to append simulated email to local log file.
    """
    import os
    from datetime import datetime
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    os.makedirs(log_dir, exist_ok=True)
    log_filepath = os.path.join(log_dir, "simulated_emails.log")
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    email_entry = f"[{timestamp}] EMAIL SENT | To: {email_to} | Subject: {subject} | Body: {body.strip()}\n"
    
    with open(log_filepath, "a", encoding="utf-8") as f:
        f.write(email_entry)
        
    print(f"\n=======================================================")
    print(f"SIMULATED EMAIL SENT TO: {email_to}")
    print(f"Subject: {subject}")
    print(f"=======================================================\n")
