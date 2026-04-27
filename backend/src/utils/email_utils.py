from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
from src.config.settings import get_settings


async def send_email(
    from_email: str,
    subject: str,
    message: str,
    name: str,
) -> bool:
    """Send a contact-form email to the configured receiver address."""
    settings = get_settings()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject or "New Message from Contact Form"
    msg["From"] = f'"{name}" <{settings.EMAIL_FROM}>'
    msg["Reply-To"] = from_email
    msg["To"] = settings.EMAIL_RECEIVER

    html = f"""
    <h3>Contact Form Submission</h3>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> {from_email}</p>
    <p><strong>Message:</strong><br>{message}</p>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=True,
        )
        return True
    except Exception as exc:
        print(f"Email error: {exc}")
        return False
