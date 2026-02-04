import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import secrets

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

def generate_reset_token():
    return secrets.token_urlsafe(32)

def send_username_recovery_email(to_email: str, username: str):
    message = Mail(
        from_email='noreply@joycliff.net',
        to_emails=to_email,
        subject='Username Recovery - ClipHub',
        html_content=f'''
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Username Recovery</h2>
                <p>Your username is: <strong>{username}</strong></p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        '''
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
    
def send_password_recovery_email(to_email: str, link: str): 
    print(f"[EMAIL] Attempting to send to: {to_email}")
    print(f"[EMAIL] Reset link: {link}")
    print(f"[EMAIL] SendGrid API Key present: {bool(SENDGRID_API_KEY)}")
    
    message = Mail(
        from_email='noreply@joycliff.net',
        to_emails=to_email,
        subject='Password Reset - ClipHub',
        html_content=f'''
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="{link}" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        '''
    )
    
    try: 
        print("[EMAIL] Initializing SendGrid client...")
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        print("[EMAIL] Sending message...")
        response = sg.send(message)
        
        print(f"[EMAIL] Response status code: {response.status_code}")
        print(f"[EMAIL] Response body: {response.body}")
        print(f"[EMAIL] Response headers: {response.headers}")
        
        # Check if successful (2xx status codes)
        if 200 <= response.status_code < 300:
            print("[EMAIL] ✓ Email sent successfully!")
            return True
        else:
            print(f"[EMAIL] ✗ Email failed with status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[EMAIL] ✗ Exception occurred: {type(e).__name__}")
        print(f"[EMAIL] ✗ Error message: {str(e)}")
        import traceback
        print(f"[EMAIL] ✗ Full traceback:\n{traceback.format_exc()}")
        return False