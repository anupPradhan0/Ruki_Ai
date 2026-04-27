from typing import Any, Optional
import cohere
from src.config.settings import get_settings


def _extract_essential_fields(profile: Any, user_type: str) -> dict:
    """Extract key financial fields from a profile document for the AI prompt."""
    data: dict = {}

    if not profile:
        return data

    profile_dict = profile.model_dump() if hasattr(profile, "model_dump") else {}

    # Common fields
    for src, dest in [
        ("monthly_allowance", "income"),
        ("monthly_salary", "income"),
        ("current_income", "income"),
        ("financial_goals", "goals"),
        ("budget_limits", "budget_limits"),
    ]:
        val = profile_dict.get(src)
        if val is not None:
            data[dest] = val

    # Type-specific fields
    if user_type == "student":
        data["education"] = profile_dict.get("education_level")
        data["living_situation"] = profile_dict.get("living_situation")
        data["custom_categories"] = profile_dict.get("custom_categories")
    elif user_type == "employed":
        data["job"] = profile_dict.get("job_title")
        data["industry"] = profile_dict.get("work_industry")
        data["employment_type"] = profile_dict.get("employment_type")
        data["fixed_expenses"] = profile_dict.get("fixed_expenses")
        data["investment_preferences"] = profile_dict.get("investment_preferences")
    elif user_type == "unemployed":
        data["employment_status"] = profile_dict.get("employment_status")
        data["living_situation"] = profile_dict.get("living_situation")
        data["gig_interest"] = profile_dict.get("gig_interest")
        data["goal_priority"] = profile_dict.get("goal_priority")
        data["savings_details"] = profile_dict.get("savings_details")
        data["job_search_details"] = profile_dict.get("job_search_details")
    elif user_type == "retired":
        data["pension"] = profile_dict.get("pension")
        data["retirement_accounts"] = profile_dict.get("retirement_accounts")
        data["savings_goals"] = profile_dict.get("savings_goals")
        data["healthcare"] = profile_dict.get("healthcare")
    elif user_type == "guest":
        data["current_status"] = profile_dict.get("current_status")
        data["help_preferences"] = profile_dict.get("help_preferences")

    # Quiz responses (10 MCQ self-assessment) — apply for any user type that has them.
    quiz = profile_dict.get("quiz_responses")
    if quiz:
        data["self_assessment"] = [
            {"q": q.get("question"), "a": q.get("answer")} for q in quiz
        ]

    return {k: v for k, v in data.items() if v is not None}


def _build_prompt(user_type: str, data: dict) -> str:
    """Build the structured financial advice prompt matching the original JS template."""
    bullets = "\n".join(f"• {k}: {v}" for k, v in data.items())
    return f"""Generate personalized financial advice for a {user_type}.

DATA:
{bullets}

REQUIREMENTS:
• Provide 5-7 specific, actionable recommendations
• Focus on goal achievement and budget optimization
• Include priority ranking (High/Medium/Low)
• Use bullet points for clarity
• Keep advice practical and measurable

FORMAT:
## Priority Recommendations
• [High] Specific action with timeline
• [Medium] Specific action with timeline
• [Low] Specific action with timeline

## Quick Tips
• Brief practical tips (3-4 items)

Keep response concise and professional."""


async def get_ai_chat_response(
    profile: Any,
    user_type: str,
    history: list,
    message: str,
) -> str:
    """Send a follow-up chat message to Cohere with profile context as preamble."""
    settings = get_settings()
    client = cohere.AsyncClient(api_key=settings.COHERE_API_KEY)
    data = _extract_essential_fields(profile, user_type)

    preamble = (
        f"You are RukiAI, a personal finance advisor for a {user_type} user.\n"
        f"Their profile data: {data}.\n"
        "Give specific, actionable, numbers-backed advice. Keep replies concise "
        "(under 200 words unless the user asks for detail). Use bullets when listing."
    )

    chat_history = [
        {
            "role": "USER" if (h.get("role") or "").lower() == "user" else "CHATBOT",
            "message": h.get("content", ""),
        }
        for h in (history or [])
        if h.get("content")
    ]

    try:
        response = await client.chat(
            model="command-r-plus",
            message=message,
            chat_history=chat_history,
            preamble=preamble,
            max_tokens=400,
            temperature=0.7,
        )
        return (response.text or "").strip() or "Sorry, I couldn't generate a reply."
    except Exception as exc:
        print(f"Cohere chat error: {exc}")
        return "I'm having trouble responding right now. Please try again."


async def get_ai_advice(profile: Any, user_type: str) -> str:
    """Call Cohere command-r-plus to generate personalised financial advice."""
    settings = get_settings()
    client = cohere.AsyncClient(api_key=settings.COHERE_API_KEY)
    data = _extract_essential_fields(profile, user_type)
    prompt = _build_prompt(user_type, data)

    try:
        response = await client.generate(
            model="command-r-plus",
            prompt=prompt,
            max_tokens=300,
            temperature=0.9,
        )
        text = response.generations[0].text if response.generations else ""
        return text.strip() or "Unable to generate financial advice at this time."
    except Exception as exc:
        print(f"Cohere error: {exc}")
        return "Unable to generate financial advice at this time. Please try again later."
