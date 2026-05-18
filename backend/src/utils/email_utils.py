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


async def send_transactional_email(to_email: str, subject: str, html: str) -> bool:
    """Send a transactional email (verification, password reset, etc.) to a single recipient."""
    settings = get_settings()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f'"RukiAI" <{settings.EMAIL_FROM}>'
    msg["To"] = to_email
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
        print(f"Transactional email error to {to_email}: {exc}")
        return False


def _shell(title: str, intro: str, button_label: str, link: str, footer: str) -> str:
    return f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 16px;font-size:20px">{title}</h2>
      <p style="margin:0 0 16px;line-height:1.55;color:#444">{intro}</p>
      <p style="margin:24px 0">
        <a href="{link}"
           style="display:inline-block;background:#FFD700;color:#000;text-decoration:none;
                  font-weight:600;padding:12px 22px;border-radius:10px">{button_label}</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#777">If the button doesn't work, copy and paste this link:</p>
      <p style="margin:0 0 24px;font-size:12px;color:#555;word-break:break-all">{link}</p>
      <p style="margin:0;font-size:12px;color:#888">{footer}</p>
    </div>
    """


async def send_verification_email(to_email: str, verify_url: str) -> bool:
    html = _shell(
        title="Verify your RukiAI email",
        intro="Welcome to RukiAI. Confirm your email so we can secure your account and send important messages.",
        button_label="Verify email",
        link=verify_url,
        footer="This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
    )
    return await send_transactional_email(to_email, "Verify your RukiAI email", html)


async def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    html = _shell(
        title="Reset your RukiAI password",
        intro="We received a request to reset your password. Click the button below to choose a new one.",
        button_label="Reset password",
        link=reset_url,
        footer="This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.",
    )
    return await send_transactional_email(to_email, "Reset your RukiAI password", html)
