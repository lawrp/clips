import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")

def send_username_recovery_email(to_email: str, username: str):
    message = Mail(
        from_email='admin@joycliff.net',
        to_emails=to_email,
        subject='Username Recovery - Clip Champ',
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