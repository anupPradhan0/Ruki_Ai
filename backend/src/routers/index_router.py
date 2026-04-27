from fastapi import APIRouter
from fastapi.responses import JSONResponse
from src.schemas.feedback_schemas import EmailRequest
from src.utils.email_utils import send_email

router = APIRouter(tags=["index"])


@router.get("/")
async def index() -> dict:
    return {"message": "RukiAI API is running", "version": "1.0.0"}


@router.get("/about")
async def about() -> dict:
    return {"page": "about"}


@router.get("/features")
async def features() -> dict:
    return {"page": "features"}


@router.get("/contact")
async def contact() -> dict:
    return {"page": "contact"}


@router.get("/how-it-works")
async def how_it_works() -> dict:
    return {"page": "how-it-works"}


@router.post("/send-email")
async def send_contact_email(data: EmailRequest) -> JSONResponse:
    success = await send_email(
        from_email=data.email,
        subject=data.subject or "New Message from Contact Form",
        message=data.message,
        name=data.full_name,
    )
    if success:
        return JSONResponse(content={"message": "Email sent successfully"})
    return JSONResponse(status_code=500, content={"message": "Failed to send email"})
