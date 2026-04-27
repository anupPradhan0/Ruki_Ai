from typing import Any, Optional
import httpx
from src.config.settings import get_settings


PROVIDERS: dict = {
    "local": {
        "label": "Local (Ollama)",
        "models": ["gemma4:e2b", "gemma4:e4b", "gemma3:1b"],
        "needs_api_key": False,
    },
    "gemini": {
        "label": "Google Gemini",
        "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
        "needs_api_key": True,
    },
    "openai": {
        "label": "OpenAI",
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-5"],
        "needs_api_key": True,
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "models": ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"],
        "needs_api_key": True,
    },
    "cohere": {
        "label": "Cohere",
        "models": ["command-a-03-2025", "command-r-plus", "command-r"],
        "needs_api_key": True,
    },
}


def _extract_essential_fields(profile: Any, user_type: str) -> dict:
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


def _build_advice_prompt(user_type: str, data: dict) -> str:
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


def _build_chat_system(user_type: str, data: dict) -> str:
    return (
        f"You are RukiAI, a personal finance advisor for a {user_type} user.\n"
        f"Their profile data: {data}.\n"
        "Give specific, actionable, numbers-backed advice. Keep replies concise "
        "(under 200 words unless the user asks for detail). Use bullets when listing."
    )


def _ai_settings_from_user(user: Any) -> dict:
    """Pull AI settings off the User document with sensible defaults."""
    return {
        "provider": getattr(user, "ai_provider", None) or "local",
        "model": getattr(user, "ai_model", None) or "gemma4:e2b",
        "api_key": getattr(user, "ai_api_key", None),
    }


# ── Provider implementations ─────────────────────────────────────────────────


async def _ollama_chat(model: str, messages: list, temperature: float, max_tokens: int) -> str:
    settings = get_settings()
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.OLLAMA_HOST}/api/chat", json=payload)
        r.raise_for_status()
        return ((r.json().get("message") or {}).get("content") or "").strip()


async def _openai_chat(model: str, api_key: str, messages: list, temperature: float, max_tokens: int) -> str:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _anthropic_chat(model: str, api_key: str, messages: list, temperature: float, max_tokens: int) -> str:
    system = ""
    converted = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
        else:
            converted.append({"role": m["role"], "content": m["content"]})
    payload: dict = {
        "model": model,
        "messages": converted,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        r.raise_for_status()
        data = r.json()
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()


async def _gemini_chat(model: str, api_key: str, messages: list, temperature: float, max_tokens: int) -> str:
    system = ""
    contents = []
    for m in messages:
        if m["role"] == "system":
            system = m["content"]
            continue
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    payload: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts).strip()


async def _cohere_chat(model: str, api_key: str, messages: list, temperature: float, max_tokens: int) -> str:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.cohere.com/v2/chat",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        r.raise_for_status()
        data = r.json()
        content = data.get("message", {}).get("content", [])
        return "".join(c.get("text", "") for c in content if c.get("type") == "text").strip()


async def _dispatch(ai_settings: dict, messages: list, temperature: float, max_tokens: int) -> str:
    provider = ai_settings.get("provider") or "local"
    model = ai_settings.get("model") or "gemma4:e2b"
    api_key = ai_settings.get("api_key")

    if provider == "local":
        return await _ollama_chat(model, messages, temperature, max_tokens)
    if not api_key:
        raise ValueError(f"Provider '{provider}' requires an API key")
    if provider == "openai":
        return await _openai_chat(model, api_key, messages, temperature, max_tokens)
    if provider == "anthropic":
        return await _anthropic_chat(model, api_key, messages, temperature, max_tokens)
    if provider == "gemini":
        return await _gemini_chat(model, api_key, messages, temperature, max_tokens)
    if provider == "cohere":
        return await _cohere_chat(model, api_key, messages, temperature, max_tokens)
    raise ValueError(f"Unknown provider: {provider}")


# ── Public API (signature-compatible with old gemma_utils) ───────────────────


async def get_ai_advice(profile: Any, user_type: str, ai_settings: Optional[dict] = None) -> str:
    """One-shot financial advice. ai_settings selects the provider/model/key."""
    settings = ai_settings or {"provider": "local", "model": "gemma4:e2b", "api_key": None}
    data = _extract_essential_fields(profile, user_type)
    prompt = _build_advice_prompt(user_type, data)
    messages = [{"role": "user", "content": prompt}]
    try:
        text = await _dispatch(settings, messages, temperature=0.9, max_tokens=400)
        return text or "Unable to generate financial advice at this time."
    except Exception as exc:
        print(f"AI advice error ({settings.get('provider')}): {exc}")
        return "Unable to generate financial advice at this time. Please try again later."


async def get_ai_chat_response(
    profile: Any,
    user_type: str,
    history: list,
    message: str,
    ai_settings: Optional[dict] = None,
) -> str:
    """Conversational reply with profile-aware system prompt."""
    settings = ai_settings or {"provider": "local", "model": "gemma4:e2b", "api_key": None}
    data = _extract_essential_fields(profile, user_type)

    messages: list = [{"role": "system", "content": _build_chat_system(user_type, data)}]
    for h in history or []:
        content = h.get("content")
        if not content:
            continue
        role = "user" if (h.get("role") or "").lower() == "user" else "assistant"
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    try:
        text = await _dispatch(settings, messages, temperature=0.7, max_tokens=500)
        return text or "Sorry, I couldn't generate a reply."
    except Exception as exc:
        print(f"AI chat error ({settings.get('provider')}): {exc}")
        return "I'm having trouble responding right now. Please try again."
