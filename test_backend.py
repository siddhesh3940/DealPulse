import requests
import json
import sys

url = "http://localhost:8000/analyze"

payload = {
    "transcript": "Hi, this is Sarah. We love the software, but $10,000 is a bit out of our budget right now. If we can do $8,000, my manager John can sign off by next Tuesday. Send me the revised contract when you can."
}

print(f"Testing DealPulse AI Backend ({url})...")
print("-" * 50)
print(f"Transcript Payload:\n{payload['transcript']}")
print("-" * 50)
print("Sending request... (This may take a moment if the model is loading)")

try:
    response = requests.post(url, json=payload)
    response.raise_for_status()
    print("\n✅ Success! Response Received:")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.ConnectionError:
    print("\n❌ Error: Could not connect to the backend.")
    print("Please ensure the FastAPI server is running (uvicorn backend.main:app --reload).")
    sys.exit(1)
except requests.exceptions.HTTPError as e:
    print(f"\n❌ HTTP Error: {e}")
    print(f"Response: {response.text}")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ An unexpected error occurred: {e}")
    sys.exit(1)
