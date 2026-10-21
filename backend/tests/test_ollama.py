import httpx

if __name__ == "__main__":
    payload = {
        "model": "qwen3:4b",
        "prompt": "Respond with only JSON: {\"status\": \"ok\"}",
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 300,
            "num_thread": 6
        }
    }

    res = httpx.post("http://localhost:11434/api/generate", json=payload, timeout=60.0)
    data = res.json()
    print("Keys:", list(data.keys()))
    print("Thinking field:", repr(data.get("thinking")))
    print("Response field:", repr(data.get("response")))
