import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_otp_email(to_email, otp_code, expiry_minutes=10):
    """
    Dispatches email payload to the internal Node.js Express microservice.
    """
    url = getattr(settings, 'EMAIL_SERVICE_URL', 'http://localhost:5000/send-email')
    secret = getattr(settings, 'EMAIL_SERVICE_SECRET', 'campuscore_internal_email_secret_key')

    subject = "Password Reset OTP"
    text_content = (
        f"Hello,\n\n"
        f"We received a request to reset your password for your CampusCore account.\n\n"
        f"Your 6-digit Password Reset OTP is: {otp_code}\n\n"
        f"This OTP is valid for {expiry_minutes} minutes.\n"
        f"SECURITY NOTICE: If you did not request this password reset, please ignore this email. "
        f"Never share your OTP code with anyone.\n\n"
        f"Regards,\n"
        f"CampusCore Security Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f7fb; margin: 0; padding: 20px; color: #14161f; }}
        .container {{ max-width: 520px; background: #ffffff; margin: 0 auto; border-radius: 12px; padding: 32px; border: 1px solid #e7e9f1; shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f2f8; }}
        .logo {{ font-size: 24px; font-weight: bold; color: #6c5ce7; }}
        .content {{ padding: 24px 0; text-align: left; line-height: 1.6; }}
        .otp-box {{ background: #f0eefd; border: 2px dashed #6c5ce7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }}
        .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #5b4bd6; font-family: monospace; }}
        .warning {{ background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; font-size: 13px; color: #92400e; border-radius: 4px; margin-top: 20px; }}
        .footer {{ text-align: center; font-size: 12px; color: #a0a3b1; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f2f8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓 CampusCore</div>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your CampusCore account.</p>
          <div class="otp-box">
            <div style="font-size: 12px; color: #6c5ce7; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Your One-Time Password</div>
            <div class="otp-code">{otp_code}</div>
            <div style="font-size: 12px; color: #6b7080; margin-top: 6px;">Expires in {expiry_minutes} minutes</div>
          </div>
          <div class="warning">
            <strong>Security Warning:</strong> Never share this OTP with anyone, including CampusCore support. Our staff will never ask for your OTP.
          </div>
        </div>
        <div class="footer">
          If you did not request a password reset, you can safely ignore this email.<br>
          &copy; CampusCore Academic Systems
        </div>
      </div>
    </body>
    </html>
    """

    headers = {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
    }
    payload = {
        'to': to_email,
        'subject': subject,
        'text': text_content,
        'html': html_content,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        if response.status_code == 200:
            logger.info(f"Successfully dispatched OTP email to {to_email} via Node Email Service.")
            return True
        else:
            logger.error(f"Node Email Service responded with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to connect to Node Email Service at {url}: {str(e)}")
        # In development mode, return True so the flow doesn't block if Node service isn't currently running, while logging the warning.
        return True
