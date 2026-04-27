from typing import Any
import httpx
from src.config.settings import get_settings


def _extract_essential_fields(profile: Any, user_type: str) -> dict:
    """Extract key financial fields from a profile document for the AI prompt."""
    data: dict = {}

    if not profile:
        return data

    profile_dict = profile.model_dump() if hasattr(profile, "model_dump") else {}

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

    quiz = profile_dict.get("quiz_responses")
    if quiz:
        data["self_assessment"] = [
            {"q": q.get("question"), "a": q.get("answer")} for q in quiz
        ]

    return {k: v for k, v in data.items() if v is not None}


def _build_prompt(user_type: str, data: dict) -> str:
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


def _build_system_preamble(user_type: str, data: dict) -> str:
    return (
        f"You are RukiAI, a personal finance advisor for a {user_type} user.\n"
        f"Their profile data: {data}.\n"
        "Give specific, actionable, numbers-backed advice. Keep replies concise "
        "(under 200 words unless the user asks for detail). Use bullets when listing."
    )


async def get_ai_advice(profile: Any, user_type: str) -> str:
    """Generate one-shot financial advice via local Ollama (Gemma 4 E2B)."""
    settings = get_settings()
    data = _extract_essential_fields(profile, user_type)
    prompt = _build_prompt(user_type, data)

    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.9, "num_predict": 300},
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{settings.OLLAMA_HOST}/api/generate", json=payload)
            r.raise_for_status()
            text = (r.json().get("response") or "").strip()
            return text or "Unable to generate financial advice at this time."
    except Exception as exc:
        print(f"Ollama generate error: {exc}")
        return "Unable to generate financial advice at this time. Please try again later."


async def get_ai_chat_response(
    profile: Any,
    user_type: str,
    history: list,
    message: str,
) -> str:
    """Conversational reply via local Ollama chat API with profile context."""
    settings = get_settings()
    data = _extract_essential_fields(profile, user_type)

    messages = [{"role": "system", "content": _build_system_preamble(user_type, data)}]
    for h in history or []:
        content = h.get("content")
        if not content:
            continue
        role = "user" if (h.get("role") or "").lower() == "user" else "assistant"
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 400},
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(f"{settings.OLLAMA_HOST}/api/chat", json=payload)
            r.raise_for_status()
            text = ((r.json().get("message") or {}).get("content") or "").strip()
            return text or "Sorry, I couldn't generate a reply."
    except Exception as exc:
        print(f"Ollama chat error: {exc}")
        return "I'm having trouble responding right now. Please try again."
