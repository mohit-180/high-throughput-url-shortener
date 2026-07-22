# High Throughput Distributed URL Shortener and Analytics Engine

A production-inspired full-stack URL shortening platform built with **FastAPI**, **React**, **PostgreSQL**, and **Redis**.

The application provides URL shortening, analytics collection, cache-optimized redirection, background processing, and a web dashboard for monitoring system activity.

---

## Features

- URL shortening with optional custom aliases
- Fast HTTP redirects
- Click analytics
- Redis cache for low-latency lookups
- PostgreSQL persistent storage
- Background analytics processing
- REST API with Swagger documentation
- React dashboard
- Docker support
- Database migrations with Alembic
- Load testing with Locust

---

## Tech Stack

### Frontend

- React
- TypeScript
- Vite

### Backend

- FastAPI
- SQLAlchemy (Async)
- PostgreSQL
- Redis
- Alembic

### Tools

- Docker
- Locust
- Pytest

---

## System Architecture

```
                React Dashboard
                       │
                       ▼
                FastAPI Backend
               /              \
              ▼                ▼
      PostgreSQL           Redis Cache
```

---

## Repository Structure

```
.
├── src/                    # React frontend
├── assets/
├── python_backend/
│   ├── app/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── package.json
└── README.md
```

---

## Running Locally

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd high-throughput-url-shortener
```

---

### 2. Frontend

Install dependencies

```bash
npm install
```

Start the dashboard

```bash
npm run dev
```

Frontend

```
http://localhost:3000
```

---

### 3. Backend

Navigate to the backend

```bash
cd python_backend
```

Create a virtual environment

Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

Linux/macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Configure Environment

Create a `.env` file.

Example

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/url_shortener
REDIS_URL=redis://127.0.0.1:6379/0
```

---

### 5. Run Database Migrations

```bash
alembic upgrade head
```

---

### 6. Start the API

```bash
uvicorn app.main:app --reload
```

Backend

```
http://127.0.0.1:8000
```

Swagger

```
http://127.0.0.1:8000/docs
```

---

## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/shorten` | Create short URL |
| GET | `/r/{code}` | Redirect |
| DELETE | `/api/v1/urls/{code}` | Delete URL |
| GET | `/api/v1/system/stats` | System statistics |
| GET | `/api/v1/health` | Health check |

---

## Testing

Run tests

```bash
pytest
```

Coverage

```bash
pytest --cov=app tests/
```

Load testing

```bash
locust -f locustfile.py
```

---

## Docker

```bash
docker compose up --build
```

---

## Future Improvements

- JWT authentication
- Rate limiting
- Distributed caching
- CI/CD pipeline
- Kubernetes deployment
- Monitoring with Prometheus and Grafana

---

## License

This project is licensed under the Apache 2.0 License.