# AI Twin chat API

The frontend talks to the chat backend through `ChatService` in `src/services/chat.ts`.
Without configuration it uses a **mock** that answers only from `src/data` and
`src/config`, and the UI shows a "Demo" badge. No AI model is connected.

To connect a backend, create `.env.local`:

```
VITE_CHAT_API_URL=http://localhost:8000
```

## Contract

`POST {VITE_CHAT_API_URL}/chat`

```json
{
  "message": "What did you build during your internship?",
  "history": [
    { "role": "assistant", "content": "Hi, I'm PhearakBoth's AI Twin..." },
    { "role": "user", "content": "..." }
  ]
}
```

Response `200`:

```json
{
  "answer": "During my internship I ...",
  "sources": [{ "title": "Internship notes", "url": "https://..." }]
}
```

`sources` is optional. Non-2xx responses show the error state with a retry button.

## FastAPI sketch

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "https://your-domain"],
                   allow_methods=["POST"], allow_headers=["*"])

class Turn(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[Turn] = []

@app.post("/chat")
def chat(req: ChatRequest):
    docs = retrieve(req.message)            # vector search over your portfolio knowledge base
    answer = generate(req.message, req.history, docs)  # LLM call grounded in docs
    return {"answer": answer, "sources": [{"title": d.title, "url": d.url} for d in docs]}
```

Keep the LLM key on the server. Rate-limit the endpoint, because it's public.
