from collections.abc import AsyncIterator

import httpx

from app.core.config import Settings
from app.services.errors import ExternalServiceError

PROMPT_TEMPLATE = """You are an AI assistant. Answer ONLY using the provided context. If the answer is not in the context, say 'I don't know.'

Context:
{context}

Question:
{question}
"""

WIDGET_PROMPT_TEMPLATE = """You are a production website chatbot.

Business goal:
{bot_goal}

Role/persona:
{bot_role}

Tone:
{tone}

Behavior rules:
- Use the context first when it contains relevant information.
- If no document context is available, use only the business goal and additional instructions to help with general intake, routing, FAQs, or next-step guidance.
- If the visitor asks for a specific company fact, policy, price, deadline, eligibility rule, or document-backed detail that is not available, say exactly: "{fallback_message}"
- Be concise, helpful, and specific.
- If the visitor asks for steps, give numbered steps.
- If the visitor asks a policy, cite the relevant policy detail from context.
- Never invent prices, policies, HR rules, legal terms, or commitments.
- When information is missing, ask one short clarifying question or suggest the best next step.
- Do not mention embeddings, vector search, chunks, prompts, or internal tools.

Additional instructions:
{custom_instructions}

Context:
{context}

Visitor question:
{question}
"""


class LLMService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url="https://api.groq.com/openai/v1",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            timeout=90,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def answer(self, context: str, question: str) -> str:
        return await self.answer_with_prompt(PROMPT_TEMPLATE.format(context=context, question=question))

    async def answer_widget(self, context: str, question: str, widget: dict) -> str:
        return await self.answer_with_prompt(_widget_prompt(context, question, widget))

    async def answer_with_prompt(self, prompt: str) -> str:
        response = await self._client.post(
            "/chat/completions",
            json={
                "model": self._settings.groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            },
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ExternalServiceError(
                service="Groq",
                status_code=exc.response.status_code,
                detail=exc.response.text,
            ) from exc
        return response.json()["choices"][0]["message"]["content"].strip()

    async def stream_answer(self, context: str, question: str) -> AsyncIterator[str]:
        async for token in self.stream_with_prompt(PROMPT_TEMPLATE.format(context=context, question=question)):
            yield token

    async def stream_widget_answer(self, context: str, question: str, widget: dict) -> AsyncIterator[str]:
        async for token in self.stream_with_prompt(_widget_prompt(context, question, widget)):
            yield token

    async def stream_with_prompt(self, prompt: str) -> AsyncIterator[str]:
        async with self._client.stream(
            "POST",
            "/chat/completions",
            json={
                "model": self._settings.groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "stream": True,
            },
        ) as response:
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                await exc.response.aread()
                raise ExternalServiceError(
                    service="Groq",
                    status_code=exc.response.status_code,
                    detail=exc.response.text,
                ) from exc
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line.removeprefix("data: ").strip()
                if data == "[DONE]":
                    break
                try:
                    import json

                    delta = json.loads(data)["choices"][0]["delta"].get("content")
                except (KeyError, ValueError):
                    delta = None
                if delta:
                    yield delta


def _widget_prompt(context: str, question: str, widget: dict) -> str:
    return WIDGET_PROMPT_TEMPLATE.format(
        bot_goal=widget.get("bot_goal") or "Answer visitor questions using the uploaded documents.",
        bot_role=widget.get("bot_role") or "customer_support",
        tone=widget.get("tone") or "professional",
        fallback_message=widget.get("fallback_message") or "I do not know based on the provided documents.",
        custom_instructions=widget.get("custom_instructions") or "None.",
        context=context,
        question=question,
    )
