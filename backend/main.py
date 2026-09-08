from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, List, Optional
from contextlib import asynccontextmanager
import ollama
import json
import os
import tempfile
import threading
from faster_whisper import WhisperModel

# Whisper speech-to-text model (lazy-loaded on first use / warmed up at startup)
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

_whisper_model = None
_whisper_lock = threading.Lock()


def get_whisper_model():
    """Load the Whisper model once and cache it (thread-safe)."""
    global _whisper_model
    if _whisper_model is None:
        with _whisper_lock:
            if _whisper_model is None:
                _whisper_model = WhisperModel(
                    WHISPER_MODEL_NAME,
                    device=WHISPER_DEVICE,
                    compute_type=WHISPER_COMPUTE_TYPE,
                )
    return _whisper_model


def _warmup_whisper():
    try:
        get_whisper_model()
        print("Whisper model ready.")
    except Exception as e:
        print(f"Whisper warm-up failed (will lazy-load on first use): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload Whisper in the background so the first /transcribe call is fast
    threading.Thread(target=_warmup_whisper, daemon=True).start()
    yield


app = FastAPI(title="DealPulse AI Backend", lifespan=lifespan)

# Configure CORS to allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class CRMData(BaseModel):
    budget: str
    authority: str
    need: str
    timeline: str
    interest_level: Literal["High", "Medium", "Low"]
    objections: List[str]
    next_steps: List[str]
    current_solution: Optional[str] = None
    competitors_mentioned: List[str] = []
    decision_maker_status: Optional[str] = None
    sentiment: str = "Neutral"

class TranscriptInput(BaseModel):
    transcript: str

@app.post("/analyze", response_model=CRMData)
async def analyze_transcript(input_data: TranscriptInput):
    try:
        response = ollama.chat(
            model='qwen2.5:7b',
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a helpful assistant that extracts CRM data from a sales transcript. '
                        "For 'decision_maker_status', guess if they are the final buyer, an evaluator, or unknown. "
                        "For 'competitors_mentioned', list any rival products they name. If none, return an empty list []. "
                        "For 'sentiment', use one word: Positive, Neutral, Hesitant, or Negative. "
                        "Never invent information. If a field isn't discussed, return null or an empty list."
                    )
                },
                {
                    'role': 'user',
                    'content': input_data.transcript
                }
            ],
            format=CRMData.model_json_schema(),
            options={
                'temperature': 0
            }
        )
        
        # Parse the JSON response
        crm_data = json.loads(response['message']['content'])
        return CRMData(**crm_data)
    
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Ollama or process the transcript. Ensure Ollama is running.")

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        # Save the uploaded audio to a temporary file so Whisper can read it.
        # Chrome records audio/webm (Opus); Firefox may send audio/ogg.
        suffix = os.path.splitext(file.filename or "")[1] or ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        try:
            model = get_whisper_model()
            segments, info = model.transcribe(
                tmp_path,
                language="en",
                vad_filter=True,
            )
            text = " ".join(seg.text.strip() for seg in segments).strip()
            return {"transcription": text, "language": info.language}
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    except Exception as e:
        print(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio. Ensure the Whisper model can be loaded or the audio format is supported.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
