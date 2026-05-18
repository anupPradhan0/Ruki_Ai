import asyncio
import json
from typing import Any, AsyncIterator, Optional
import httpx
from beanie import PydanticObjectId
from src.config.settings import get_settings
from src.utils.embed_utils import embed_text
from src.services.retrieval import (
    retrieve_knowledge,
    retrieve_memory,
    format_knowledge,
    format_memory,
)
from src.services.query_router import route_query


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


def _format_recent_spend(spend: Optional[dict]) -> str:
    """Render the user's last-N-days spending summary as a labelled block."""
    if not spend:
        return ""
    total_exp = spend.get("total_expense") or 0
    total_inc = spend.get("total_income") or 0
    top = spend.get("top_categories") or []
    if not total_exp and not total_inc and not top:
        return ""
    lines = [f"  Last {spend.get('days', 30)} days: spent ₹{total_exp:,.0f}, income ₹{total_inc:,.0f}"]
    if top:
        cats = ", ".join(f"{c} ₹{v:,.0f}" for c, v in top)
        lines.append(f"  Top categories: {cats}")
    return "\n".join(lines)


async def _fetch_recent_spend(user_id: Optional[PydanticObjectId]) -> Optional[dict]:
    """Lazy import to avoid cycles. Returns None if user_id missing or query fails."""
    if user_id is None:
        return None
    try:
        from src.services.transaction_service import recent_spend_summary
        return await recent_spend_summary(user_id)
    except Exception as exc:
        print(f"recent_spend fetch failed: {exc}")
        return None


def _format_self_assessment(qa_list: Optional[list]) -> str:
    """Render the 10-question self-assessment quiz answers as a labelled block."""
    if not qa_list:
        return ""
    lines = []
    for i, qa in enumerate(qa_list, 1):
        q = (qa.get("q") or "").strip()
        a = (qa.get("a") or "").strip()
        if q and a:
            lines.append(f"  Q{i}: {q}\n     → {a}")
    if not lines:
        return ""
    return "\n".join(lines)


def _build_advice_prompt(
    user_type: str,
    data: dict,
    context: str = "",
    history_context: str = "",
    recent_spend: Optional[dict] = None,
) -> str:
    # Self-assessment is its own block — pull it out so the AI weights it explicitly.
    profile_data = {k: v for k, v in data.items() if k != "self_assessment"}
    quiz_block_text = _format_self_assessment(data.get("self_assessment"))
    quiz_block = (
        f"\nSELF-ASSESSMENT (10-question quiz — anchor your advice in these answers):\n{quiz_block_text}\n"
        if quiz_block_text
        else ""
    )
    spend_text = _format_recent_spend(recent_spend)
    spend_block = (
        f"\nRECENT SPENDING (the user's actual transactions — use these numbers, don't invent):\n{spend_text}\n"
        if spend_text
        else ""
    )

    bullets = "\n".join(f"• {k}: {v}" for k, v in profile_data.items())
    knowledge_block = (
        f"\nRELEVANT FINANCIAL KNOWLEDGE (cite when applicable):\n{context}\n"
        if context
        else ""
    )
    history_block = (
        f"\nPAST CONVERSATIONS WITH THIS USER (build on these, don't repeat):\n{history_context}\n"
        if history_context
        else ""
    )
    return f"""Generate personalized financial advice for a {user_type}.

PROFILE:
{bullets}
{quiz_block}{spend_block}{knowledge_block}{history_block}
REQUIREMENTS:
• Provide 5-7 specific, actionable recommendations
• Focus on goal achievement and budget optimization
• Include priority ranking (High/Medium/Low)
• Use bullet points for clarity
• Keep advice practical and measurable
• Reference the self-assessment answers when they reveal a habit, attitude, or risk preference

FORMAT:
## Priority Recommendations
• [High] Specific action with timeline
• [Medium] Specific action with timeline
• [Low] Specific action with timeline

## Quick Tips
• Brief practical tips (3-4 items)

Keep response concise and professional."""


def _build_chat_system(
    user_type: str,
    data: dict,
    context: str = "",
    history_context: str = "",
    recent_spend: Optional[dict] = None,
) -> str:
    profile_data = {k: v for k, v in data.items() if k != "self_assessment"}
    quiz_block_text = _format_self_assessment(data.get("self_assessment"))
    quiz_block = (
        f"\nSelf-assessment (use these to tailor every reply — they reveal the user's habits, "
        f"risk appetite, and priorities):\n{quiz_block_text}\n"
        if quiz_block_text
        else ""
    )
    spend_text = _format_recent_spend(recent_spend)
    spend_block = (
        f"\nRecent spending (real transactions — cite exact figures when answering money questions):\n{spend_text}\n"
        if spend_text
        else ""
    )
    knowledge_block = (
        f"\nReference these facts when relevant:\n{context}\n"
        if context
        else ""
    )
    history_block = (
        f"\nRelevant past conversations with this user:\n{history_context}\n"
        if history_context
        else ""
    )
    return (
        f"You are RukiAI, a personal finance advisor for a {user_type} user.\n"
        f"Their profile data: {profile_data}.\n"
        f"{quiz_block}"
        f"{spend_block}"
        f"{history_block}"
        f"{knowledge_block}"
        "Give specific, actionable, numbers-backed advice grounded in the user's profile, "
        "self-assessment, and recent spending. Keep replies concise (under 200 words unless the "
        "user asks for detail). Use bullets when listing."
    )


def ai_settings_from_user(user: Any) -> dict:
    """Pull AI settings off the User document with sensible defaults."""
    return {
        "provider": getattr(user, "ai_provider", None) or "local",
        "model": getattr(user, "ai_model", None) or "gemma4:e2b",
        "api_key": getattr(user, "ai_api_key", None),
    }


# Backward-compatible alias so existing imports (`from ... import _ai_settings_from_user`)
# keep working until callers are updated. Safe to remove once all imports are public.
_ai_settings_from_user = ai_settings_from_user


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
    # Reasoning models (gpt-5, o1, o3) share max_tokens with internal reasoning tokens
    # and reject the legacy `max_tokens` / `temperature` params. Use max_completion_tokens
    # everywhere (it's canonical for chat completions) and only send temperature for
    # non-reasoning models. Setting reasoning_effort=low keeps more of the budget for
    # the visible response, since structured advice output doesn't need deep deliberation.
    is_reasoning = model.startswith("gpt-5") or model.startswith("o1") or model.startswith("o3")
    payload: dict = {
        "model": model,
        "messages": messages,
        "max_completion_tokens": max_tokens,
    }
    if is_reasoning:
        payload["reasoning_effort"] = "low"
    else:
        payload["temperature"] = temperature
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        r.raise_for_status()
        data = r.json()
        choices = data.get("choices") or []
        if not choices:
            return ""
        return (choices[0].get("message", {}).get("content") or "").strip()


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
                "anthropic-version": "2024-06-15",
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


# ── Streaming variants ──────────────────────────────────────────────────────
#
# Each provider here returns an `AsyncIterator[str]` of text deltas. Callers
# (the SSE chat endpoint) accumulate the chunks for persistence and forward
# them to the browser as they arrive — so users see words as they're generated
# instead of waiting for the full paragraph.


async def _ollama_chat_stream(
    model: str, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
    settings = get_settings()
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {"temperature": temperature, "num_predict": max_tokens},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{settings.OLLAMA_HOST}/api/chat", json=payload) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                chunk = (obj.get("message") or {}).get("content") or ""
                if chunk:
                    yield chunk
                if obj.get("done"):
                    break


async def _iter_sse_data(raw_lines: AsyncIterator[str]) -> AsyncIterator[str]:
    """Yield the JSON payload of each `data: ...` line (skipping comments and [DONE])."""
    async for line in raw_lines:
        if not line or line.startswith(":"):
            continue
        if line.startswith("data: "):
            payload = line[6:].strip()
            if payload == "[DONE]":
                return
            yield payload


async def _openai_chat_stream(
    model: str, api_key: str, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
    is_reasoning = model.startswith("gpt-5") or model.startswith("o1") or model.startswith("o3")
    payload: dict = {
        "model": model,
        "messages": messages,
        "max_completion_tokens": max_tokens,
        "stream": True,
    }
    if is_reasoning:
        payload["reasoning_effort"] = "low"
    else:
        payload["temperature"] = temperature
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        ) as r:
            r.raise_for_status()
            async for payload_str in _iter_sse_data(r.aiter_lines()):
                try:
                    obj = json.loads(payload_str)
                except json.JSONDecodeError:
                    continue
                choices = obj.get("choices") or []
                if not choices:
                    continue
                delta = (choices[0].get("delta") or {}).get("content") or ""
                if delta:
                    yield delta


async def _anthropic_chat_stream(
    model: str, api_key: str, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
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
        "stream": True,
    }
    if system:
        payload["system"] = system
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2024-06-15",
                "content-type": "application/json",
            },
        ) as r:
            r.raise_for_status()
            async for payload_str in _iter_sse_data(r.aiter_lines()):
                try:
                    obj = json.loads(payload_str)
                except json.JSONDecodeError:
                    continue
                if obj.get("type") == "content_block_delta":
                    delta = (obj.get("delta") or {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text") or ""
                        if text:
                            yield text


async def _gemini_chat_stream(
    model: str, api_key: str, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
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
    # `streamGenerateContent` with `?alt=sse` flips Gemini into SSE mode.
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:streamGenerateContent?alt=sse&key={api_key}"
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as r:
            r.raise_for_status()
            async for payload_str in _iter_sse_data(r.aiter_lines()):
                try:
                    obj = json.loads(payload_str)
                except json.JSONDecodeError:
                    continue
                candidates = obj.get("candidates") or []
                if not candidates:
                    continue
                parts = candidates[0].get("content", {}).get("parts", []) or []
                text = "".join(p.get("text", "") for p in parts)
                if text:
                    yield text


async def _cohere_chat_stream(
    model: str, api_key: str, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.cohere.com/v2/chat",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        ) as r:
            r.raise_for_status()
            async for payload_str in _iter_sse_data(r.aiter_lines()):
                try:
                    obj = json.loads(payload_str)
                except json.JSONDecodeError:
                    continue
                if obj.get("type") == "content-delta":
                    text = (
                        obj.get("delta", {}).get("message", {}).get("content", {}).get("text")
                        or ""
                    )
                    if text:
                        yield text


async def _dispatch_stream(
    ai_settings: dict, messages: list, temperature: float, max_tokens: int
) -> AsyncIterator[str]:
    provider = ai_settings.get("provider") or "local"
    model = ai_settings.get("model") or "gemma4:e2b"
    api_key = ai_settings.get("api_key")

    if provider == "local":
        gen = _ollama_chat_stream(model, messages, temperature, max_tokens)
    else:
        if not api_key:
            raise ValueError(f"Provider '{provider}' requires an API key")
        if provider == "openai":
            gen = _openai_chat_stream(model, api_key, messages, temperature, max_tokens)
        elif provider == "anthropic":
            gen = _anthropic_chat_stream(model, api_key, messages, temperature, max_tokens)
        elif provider == "gemini":
            gen = _gemini_chat_stream(model, api_key, messages, temperature, max_tokens)
        elif provider == "cohere":
            gen = _cohere_chat_stream(model, api_key, messages, temperature, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    async for chunk in gen:
        yield chunk


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


async def get_ai_advice(
    profile: Any,
    user_type: str,
    ai_settings: Optional[dict] = None,
    user_id: Optional[PydanticObjectId] = None,
) -> Optional[str]:
    """One-shot financial advice. Runs knowledge RAG + memory RAG in parallel.

    Returns None if generation fails or returns empty text. Callers should
    treat None as "no advice yet" — don't persist it as cached advice, since
    that would mask future successful regenerations under the staleness window.
    """
    settings = ai_settings or {"provider": "local", "model": "gemma4:e2b", "api_key": None}
    data = _extract_essential_fields(profile, user_type)

    # Compact RAG query — the profile dict was too noisy for cosine similarity.
    # `goals` can be a string, list[str], or list[dict] depending on the user
    # type's model — stringify safely either way.
    goals_raw = data.get("goals") or ""
    goals = (str(goals_raw) if not isinstance(goals_raw, str) else goals_raw)[:120]
    rag_query = f"financial advice for {user_type}. Goals: {goals}".strip()
    query_vec = await embed_text(rag_query)

    knowledge_task = retrieve_knowledge(rag_query, query_vec=query_vec, user_type=user_type)
    memory_task = (
        retrieve_memory(rag_query, query_vec=query_vec, user_id=str(user_id))
        if user_id is not None and query_vec
        else asyncio.sleep(0, result=[])
    )
    spend_task = _fetch_recent_spend(user_id)
    knowledge, memory, recent_spend = await asyncio.gather(knowledge_task, memory_task, spend_task)

    context = format_knowledge(knowledge)
    history_context = format_memory(memory)

    prompt = _build_advice_prompt(
        user_type, data, context=context, history_context=history_context, recent_spend=recent_spend
    )
    messages = [{"role": "user", "content": prompt}]
    try:
        text = await _dispatch(settings, messages, temperature=0.9, max_tokens=1500)
        return text or None
    except Exception as exc:
        print(f"AI advice error ({settings.get('provider')}): {exc}")
        return None


async def get_ai_chat_response(
    profile: Any,
    user_type: str,
    history: list,
    message: str,
    ai_settings: Optional[dict] = None,
    user_id: Optional[PydanticObjectId] = None,
    conversation_id: Optional[PydanticObjectId] = None,
) -> tuple[str, list[float]]:
    """Conversational reply with profile + routed hybrid RAG.

    Returns `(reply, user_query_vector)`. The caller is responsible for
    Mongo+Qdrant persistence of both turns — this function has no side effects
    so the caller can pair Mongo IDs with the Qdrant upsert (needed for the
    `vector_id` correlation column).

    Flow:
      1. Embed the user message once (reused for retrieval AND returned to caller).
      2. Route the query (regex shortcut → optional LLM classifier).
      3. Run the chosen pipeline(s) in parallel.
      4. Build prompt, dispatch to provider.
    """
    settings = ai_settings or {"provider": "local", "model": "gemma4:e2b", "api_key": None}
    messages, query_vec = await build_chat_messages(
        profile, user_type, history, message, settings, user_id, conversation_id
    )

    try:
        text = await _dispatch(settings, messages, temperature=0.7, max_tokens=1000)
        reply = text or "Sorry, I couldn't generate a reply."
    except Exception as exc:
        print(f"AI chat error ({settings.get('provider')}): {exc}")
        reply = "I'm having trouble responding right now. Please try again."

    return reply, query_vec


async def build_chat_messages(
    profile: Any,
    user_type: str,
    history: list,
    message: str,
    ai_settings: Optional[dict] = None,
    user_id: Optional[PydanticObjectId] = None,
    conversation_id: Optional[PydanticObjectId] = None,
) -> tuple[list, list[float]]:
    """Build the LLM message list (system + history + user turn) and return the
    user-message embedding alongside it.

    Shared by the non-streaming and streaming chat paths so RAG / routing /
    prompt assembly stay in one place.
    """
    runtime_settings = get_settings()
    settings = ai_settings or {"provider": "local", "model": "gemma4:e2b", "api_key": None}
    data = _extract_essential_fields(profile, user_type)

    do_rag = bool(message) and len(message.strip()) >= runtime_settings.RAG_MIN_QUERY_CHARS
    query_vec: list[float] = await embed_text(message) if do_rag else []

    context = ""
    history_context = ""
    if query_vec:
        route = await route_query(message, settings)
        wants_knowledge = route in ("KNOWLEDGE", "BOTH")
        wants_memory = route in ("MEMORY", "BOTH") and user_id is not None

        knowledge_task = (
            retrieve_knowledge(message, query_vec=query_vec, user_type=user_type)
            if wants_knowledge
            else asyncio.sleep(0, result=[])
        )
        memory_task = (
            retrieve_memory(
                message,
                query_vec=query_vec,
                user_id=str(user_id),
                exclude_conversation_id=str(conversation_id) if conversation_id else None,
            )
            if wants_memory
            else asyncio.sleep(0, result=[])
        )
        knowledge, memory = await asyncio.gather(knowledge_task, memory_task)
        context = format_knowledge(knowledge)
        history_context = format_memory(memory)

    recent_spend = await _fetch_recent_spend(user_id)
    messages: list = [
        {
            "role": "system",
            "content": _build_chat_system(
                user_type, data, context=context, history_context=history_context, recent_spend=recent_spend
            ),
        }
    ]
    for h in history or []:
        content = h.get("content")
        if not content:
            continue
        role = "user" if (h.get("role") or "").lower() == "user" else "assistant"
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})
    return messages, query_vec


def dispatch_chat_stream(
    ai_settings: dict, messages: list, temperature: float = 0.7, max_tokens: int = 1000
) -> AsyncIterator[str]:
    """Public alias of the internal streaming dispatcher. Use with the messages
    returned by `build_chat_messages` to stream a chat completion."""
    return _dispatch_stream(ai_settings, messages, temperature, max_tokens)
