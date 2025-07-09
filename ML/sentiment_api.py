from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import uvicorn

app = FastAPI()
model_path = "sentiment_model"
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSequenceClassification.from_pretrained(model_path)
label_map = {0: "Negative", 1: "Neutral", 2: "Positive"}

class TextIn(BaseModel):
    text: str

@app.post("/predict")
def predict_sentiment(data: TextIn):
    inputs = tokenizer(data.text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        logits = model(**inputs).logits
    pred = torch.argmax(logits, dim=1).item()
    return {"sentiment": label_map[pred], "score": int(pred)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 