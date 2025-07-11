## Important Note: Reddit API Limitations & Data Source Transparency

> **Honest Transparency:**
>
> This backend was built to fetch and analyze live Reddit posts for real-time crypto sentiment analysis. However, due to Reddit’s API restrictions and aggressive blocking/rate-limiting of cloud server IPs (including Google Cloud and Render), it is not possible to fetch live Reddit data from the deployed backend. This is a well-known issue affecting many developers and is outside my control.
>
> - **In Production (Render/Google Cloud):** The backend serves realistic static sample Reddit data for Bitcoin, Ethereum, and Dogecoin. This ensures the platform remains fully functional and demonstrates all sentiment analysis features, even though the data is not live.
> - **Locally:** When running the backend on your own machine, it will attempt to fetch live Reddit data as intended (assuming your Reddit API credentials are set up and your IP is not blocked).
>
> #### Why This Approach?
> I did my best to provide a realistic, robust experience. Despite correct API credentials, whitelisting, and multiple deployment strategies, Reddit’s API blocks most cloud-hosted requests. This limitation is transparently documented here so you know exactly what to expect.
>
> #### How to Run with Live Reddit Data Locally
> 1. Clone the repo and install dependencies.
> 2. Set up your `.env` file with valid Reddit API credentials.
> 3. Start the backend locally (`npm run dev`).
> 4. The backend will fetch live Reddit posts for sentiment analysis.
>
> **Note:** In production/demo deployments, you will see static sample data due to the above limitations.

---

# Crypto Sentiment Backend

This backend powers a full-stack crypto sentiment analysis platform, integrating real-time price and Reddit data with ML-powered sentiment analysis.

## Dataset
- **Source:** [Crypto Tweets Sentiment Dataset (Kaggle)](https://www.kaggle.com/datasets/leoth9/crypto-tweets)
- **Usage:** Used for training and evaluating the DistilBERT sentiment model.
- **Preprocessing:** Tweets were auto-labeled for sentiment using TextBlob, and the model was trained to classify as Positive, Neutral, or Negative.
- **Note:** The raw dataset is not included in this repo due to size and licensing. Please download it directly from Kaggle if you wish to reproduce the results.

## Features
- Node.js + Express API for data processing and serving
- MongoDB for persistent storage
- Python FastAPI microservice for DistilBERT-based sentiment analysis (91%+ accuracy)
- Robust data pipelines for fetching, analyzing, and storing live crypto social data

## Tech Stack
- Node.js, Express
- MongoDB
- Python 3.10+, FastAPI
- Hugging Face Transformers (DistilBERT)

## Setup

### 1. Clone the repo and install dependencies
```sh
npm install
```

### 2. Configure Environment
- Copy `.env.example` to `.env` and fill in your MongoDB URI and Reddit API credentials.

### 3. Start the Python ML Service
- Go to the `ML` folder:
  ```sh
  cd ML
  pip install -r requirements.txt  # or pip install fastapi uvicorn transformers torch
  python sentiment_api.py
  ```
- Place your trained model in `ML/sentiment_model/` (not included in repo).
- See `train_sentiment_model.ipynb` for the full training pipeline and evaluation process.
- The `classification_report.json` file is included to show model evaluation metrics (91%+ accuracy).

### 4. Start the Backend
```sh
npm run dev
```

## Notes
- Do **NOT** commit model weights, large data files, or secrets to the repo.
- The backend calls the Python ML service at `http://127.0.0.1:8000/predict` for sentiment analysis.

