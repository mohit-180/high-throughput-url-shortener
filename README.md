<div align="center">

# 🚀 High Throughput Distributed URL Shortener & Analytics Engine

### A production-inspired URL shortening platform engineered with **FastAPI**, **React**, **PostgreSQL**, and **Redis**, featuring asynchronous request handling, distributed caching, real-time analytics, automated testing, and containerized deployment.

<br>

![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-Async_API-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker)
![Pytest](https://img.shields.io/badge/Pytest-Tested-0A9EDC?style=for-the-badge&logo=pytest)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI-success?style=for-the-badge&logo=githubactions)
![License](https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge)

<br>

Production-Inspired • Async Architecture • Redis Caching • REST API • Docker • Automated Testing

</div>

---

# 📖 Table of Contents

- [Overview](#-overview)
- [Why This Project?](#-why-this-project)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [GitHub Actions](#-continuous-integration)
- [Performance Optimizations](#-performance-optimizations)
- [Future Improvements](#-future-improvements)
- [License](#-license)

---

# 📌 Overview

This project is a **production-inspired distributed URL shortening platform** designed to demonstrate backend engineering principles commonly used in modern web applications.

The application provides an end-to-end solution for shortening URLs, serving high-speed redirects, collecting analytics, caching frequently accessed data, and exposing a fully documented REST API through FastAPI.

Instead of focusing solely on CRUD operations, this project emphasizes real-world software engineering concepts including asynchronous programming, caching strategies, background processing, automated testing, containerization, and continuous integration.

The platform consists of a React dashboard communicating with an asynchronous FastAPI backend. URL metadata is stored in PostgreSQL while Redis accelerates redirect performance through low-latency cache lookups. Analytics are collected for every redirect request, providing insights into application usage.

---

# 🎯 Why This Project?

Many portfolio URL shorteners demonstrate only basic database operations.

This project extends beyond that by implementing several concepts found in production systems:

- Asynchronous API development with FastAPI
- Cache-first redirect optimization using Redis
- Persistent storage with PostgreSQL
- Background cleanup of expired URLs
- Automated API testing using Pytest
- Continuous Integration with GitHub Actions
- Dockerized development environment
- REST API documentation with Swagger/OpenAPI
- Modular backend architecture
- Scalable project structure

The primary goal was to build a project that reflects software engineering practices rather than simply implementing application features.

---

# ✨ Key Features

## URL Management

- Create shortened URLs
- Generate unique short codes
- Support custom aliases
- Delete existing URLs
- URL expiration support

---

## High Performance Redirects

- Fast redirect endpoint
- Redis cache integration
- Reduced database lookups
- Automatic cache fallback
- Asynchronous request handling

---

## Analytics

The application records useful metadata for each redirect, including:

- Total click count
- Browser information
- Operating System
- Device type
- Geographic information (when available)
- Timestamp tracking

---

## Backend

- FastAPI
- SQLAlchemy Async ORM
- PostgreSQL
- Redis
- Alembic migrations
- REST API
- OpenAPI documentation

---

## Frontend

- React
- TypeScript
- Vite
- Responsive dashboard
- Analytics visualization

---

## DevOps

- Docker support
- Docker Compose
- GitHub Actions
- Automated testing
- Pytest
- Coverage reporting
- Load testing with Locust

---


## 🌐 Live Demo

🚀 **Application:** https://high-throughput-url-shortener.vercel.app  
⚡ **Backend API:** https://high-throughput-url-shortener-production-990e.up.railway.app/docs  
💡 Experience real-time URL shortening, Redis-powered caching, analytics, and production-grade API workflows.

---

# 🖼️ Screenshots

---

## Dashboard

![Dashboard](Screenshots/Dashboard.png)

```text

```


## URL Creation

![Dashboard](Screenshots/URL-Create.png)


---

## Analytics Dashboard

![Dashboard](Screenshots/Analytics.png)

---

## Swagger API Documentation

![Dashboard](Screenshots/Swagger-ui.png)


---

## Docker Deployment

![Dashboard](Screenshots/Docker.png)


---

# 🏗️ System Architecture

The application follows a modular full-stack architecture where the React frontend communicates with an asynchronous FastAPI backend. PostgreSQL serves as the persistent datastore while Redis accelerates redirect performance through in-memory caching.

```mermaid
flowchart TD

A[User] --> B[React Dashboard]

B --> C[FastAPI Backend]

C --> D[URL API]

C --> E[Analytics API]

C --> F[Redirect Service]

F --> G{Redis Cache}

G -- Cache Hit --> H[Return Original URL]

G -- Cache Miss --> I[PostgreSQL]

I --> J[Store in Redis]

J --> H

E --> I

D --> I

C --> K[Background Tasks]

K --> I
```

---

# 🔄 Request Lifecycle

## URL Shortening Flow

```text
User
   │
   ▼
React Dashboard
   │
   ▼
POST /api/v1/shorten
   │
   ▼
FastAPI
   │
   ▼
Generate Short Code
   │
   ▼
Store Metadata
(PostgreSQL)
   │
   ▼
Return Short URL
```

---

## Redirect Flow

```text
Client

   │

GET /r/{code}

   │

FastAPI

   │

Check Redis Cache

 ┌───────────────┐
 │               │
 │ Cache Hit     │
 │               │
 ▼               ▼

Redirect      PostgreSQL Lookup

                  │

          Cache Result in Redis

                  │

             HTTP Redirect
```

---

# ⚡ Caching Strategy

To minimize database queries and improve redirect latency, the application implements a **cache-aside pattern** using Redis.

### Redirect Process

1. Client requests a shortened URL.
2. FastAPI checks Redis for the original URL.
3. If present, the redirect is performed immediately.
4. If absent, PostgreSQL is queried.
5. The retrieved value is cached in Redis.
6. Future requests are served directly from Redis.

### Advantages

- Lower response latency
- Reduced PostgreSQL load
- Better scalability
- Improved throughput
- Efficient repeated lookups

---

# 📊 Analytics Pipeline

Every redirect request contributes analytics data that can later be visualized within the dashboard.

The analytics workflow includes:

- URL lookup
- Click counter update
- Timestamp recording
- Browser detection
- Operating system detection
- Device type detection
- Persistent storage

This design allows the application to provide usage insights while maintaining a lightweight redirect workflow.

---

# 📁 Project Structure

```text
high-throughput-url-shortener/
│
├── src/                           # React frontend
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── assets/
│
├── python_backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   ├── crud/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── tasks/
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 🛠️ Technology Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React, TypeScript, Vite |
| Backend | FastAPI, Python, SQLAlchemy Async |
| Database | PostgreSQL |
| Cache | Redis |
| API Documentation | Swagger / OpenAPI |
| Testing | Pytest |
| Load Testing | Locust |
| Containerization | Docker, Docker Compose |
| Database Migration | Alembic |
| CI/CD | GitHub Actions |

---

# 🎨 Frontend Highlights

The frontend provides an intuitive interface for interacting with the backend services.

Features include:

- URL shortening interface
- Responsive dashboard
- Analytics visualization
- System statistics
- API interaction
- Error handling
- Loading indicators
- Modern React architecture

---

# ⚙️ Backend Highlights

The backend is designed around asynchronous programming and modular architecture.

Key characteristics include:

- FastAPI asynchronous request handling
- Modular API routing
- SQLAlchemy Async ORM
- Redis cache integration
- Background task execution
- Health monitoring endpoints
- OpenAPI documentation
- Structured project organization
- Scalable service design

---

# 💾 Database

PostgreSQL serves as the primary persistent datastore.

It stores:

- Original URLs
- Short codes
- Click counts
- Creation timestamps
- Expiration timestamps
- Analytics metadata

Redis complements PostgreSQL by caching frequently requested URLs to minimize database access during redirect operations.

---

# 📈 Scalability Considerations

Several architectural choices were made with scalability in mind.

- Asynchronous request processing
- Separation of frontend and backend
- Stateless REST API
- Independent caching layer
- Modular routing
- Database migrations
- Containerized deployment
- Automated testing
- Continuous integration

These practices allow the project to scale more effectively than a traditional monolithic CRUD application.

# 🚀 Installation

## Prerequisites

Before running the project locally, ensure the following software is installed:

| Software | Version |
|-----------|---------|
| Python | 3.11+ (Recommended: 3.13) |
| Node.js | 20+ |
| npm | Latest |
| PostgreSQL | 16+ |
| Redis | 7+ |
| Docker | Latest |
| Git | Latest |

---

## 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/high-throughput-url-shortener.git

cd high-throughput-url-shortener
```

---

## 2. Frontend Setup

Install frontend dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Frontend will be available at:

```
http://localhost:3000
```

---

## 3. Backend Setup

Navigate to the backend directory:

```bash
cd python_backend
```

Create a virtual environment:

### Windows

```bash
python -m venv .venv
```

Activate it:

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

---

## 4. Configure Environment Variables

Create a `.env` file inside the `python_backend` directory.

Example configuration:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/url_shortener

REDIS_URL=redis://localhost:6379/0

SECRET_KEY=your-secret-key

ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **Note:** Replace the example values with your own local configuration.

---

## 5. Run Database Migrations

Initialize the database schema using Alembic:

```bash
alembic upgrade head
```

---

## 6. Start the Backend

```bash
uvicorn app.main:app --reload
```

Backend:

```
http://127.0.0.1:8000
```

Swagger Documentation:

```
http://127.0.0.1:8000/docs
```

OpenAPI JSON:

```
http://127.0.0.1:8000/openapi.json
```

---

# 🔧 Environment Variables

| Variable | Description |
|-----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis server URL |
| SECRET_KEY | Secret key used by the application |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token expiration duration |

---

# 📚 REST API

The backend exposes a RESTful API documented automatically using Swagger/OpenAPI.

## URL Management

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/shorten` | Create a shortened URL |
| DELETE | `/api/v1/urls/{code}` | Delete an existing URL |

---

## Redirect

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/r/{code}` | Redirect to the original URL |

---

## Analytics

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/analytics` | Retrieve analytics information |

---

## System

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/system/stats` | System statistics |
| GET | `/api/v1/health` | Health check |

---

# 🧪 Testing

The project includes automated backend tests to verify API functionality.

Run all tests:

```bash
pytest
```

Verbose mode:

```bash
pytest -v
```

Run a specific test:

```bash
pytest tests/test_health.py
```

---

## Test Coverage

Generate coverage reports:

```bash
pytest --cov=app --cov-report=term-missing
```

Coverage helps identify untested areas and maintain code quality as the project evolves.

---

# ⚡ Load Testing

Performance testing is supported using **Locust**.

Start Locust:

```bash
locust -f locustfile.py
```

Open the dashboard:

```
http://localhost:8089
```

Configure:

- Number of users
- Spawn rate
- Host URL

Observe metrics such as:

- Requests per second
- Response time
- Failure rate
- Average latency

---

# 🐳 Docker Deployment

The application can be started using Docker Compose.

Build and run:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

Docker Compose orchestrates:

- React frontend
- FastAPI backend
- PostgreSQL
- Redis

providing a consistent local development environment.

---

# 🔄 Continuous Integration

This repository includes a GitHub Actions workflow that automatically validates backend changes.

The workflow performs the following tasks:

- Checks out the repository
- Installs Python dependencies
- Creates the test environment
- Executes the backend test suite
- Reports failures for pull requests and pushes

Continuous Integration ensures that new changes do not break existing functionality and helps maintain code quality over time.

# 🚀 Performance Optimizations

Performance was a key consideration during the design and implementation of this project.

The following optimizations have been incorporated to improve responsiveness, scalability, and maintainability.

---

## ⚡ Asynchronous Backend

The backend is built using **FastAPI** and **Python's asynchronous programming model**, allowing the application to efficiently handle multiple concurrent requests without blocking the event loop.

**Benefits**

- Higher throughput
- Lower response latency
- Better resource utilization
- Improved scalability under concurrent workloads

---

## 🚀 Redis Cache

Frequently accessed URLs are cached in Redis to minimize database queries during redirect operations.

The application follows a **Cache-Aside Pattern**:

1. Check Redis
2. Cache hit → Redirect immediately
3. Cache miss → Query PostgreSQL
4. Store result in Redis
5. Redirect user

This significantly reduces database load for popular links.

---

## 💾 Persistent Storage

PostgreSQL serves as the primary datastore for:

- Original URLs
- Short codes
- Click statistics
- Creation timestamps
- Expiration timestamps
- Analytics metadata

Its reliability and transactional guarantees make it well-suited for persistent URL storage.

---

## 🔄 Background Processing

Certain operations execute outside the main request lifecycle to keep API responses fast.

Examples include:

- Expired URL cleanup
- Analytics updates
- Maintenance tasks

This approach helps reduce request latency while improving overall application responsiveness.

---

## 🧩 Modular Architecture

The backend is organized into dedicated modules responsible for:

- API routing
- Database models
- CRUD operations
- Business logic
- Services
- Configuration
- Testing

This separation of concerns improves maintainability and simplifies future feature development.

---

# 🔒 Security Considerations

Although this project is intended as a portfolio demonstration, several good engineering practices have been incorporated.

- Environment variables for configuration
- Parameterized database queries via SQLAlchemy
- Separation of application configuration
- Input validation using Pydantic
- RESTful API design
- Modular architecture
- Docker-based isolation

Potential future improvements include:

- JWT Authentication
- Role-Based Access Control (RBAC)
- HTTPS enforcement
- Rate limiting
- Request throttling
- Audit logging

---

# 📈 Future Improvements

The project is designed with extensibility in mind.

Potential enhancements include:

## Authentication

- JWT authentication
- OAuth 2.0
- Google Sign-In

---

## Analytics

- Geographic heat maps
- Real-time dashboards
- Trend analysis
- Custom reports

---

## Performance

- Distributed Redis cluster
- Horizontal API scaling
- CDN integration
- Message queue integration

---

## Infrastructure

- Kubernetes deployment
- NGINX reverse proxy
- Prometheus metrics
- Grafana dashboards
- Terraform infrastructure
- Cloud deployment (AWS/GCP/Azure)

---

## User Experience

- QR Code generation
- Bulk URL shortening
- CSV import/export
- User accounts
- URL management dashboard
- Dark mode

---

# 💡 Lessons Learned

Building this project provided valuable experience in modern backend engineering and full-stack application development.

Key takeaways include:

- Designing asynchronous REST APIs
- Implementing caching strategies
- Working with relational databases
- Managing database migrations
- Structuring scalable backend projects
- Writing automated tests
- Containerizing applications with Docker
- Building CI pipelines using GitHub Actions
- Integrating frontend and backend services
- Applying clean architecture principles

---

# 🤝 Contributing

Contributions are welcome.

If you'd like to improve the project:

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes.

```bash
git commit -m "Add amazing feature"
```

4. Push your branch.

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request.

Please ensure that all tests pass before submitting changes.

---

# 📄 License

This project is licensed under the **Apache License 2.0**.

See the `LICENSE` file for additional information.

---

# 👨‍💻 Author

## Mohit Goswami

Computer Science Engineering Student

Backend Developer • Full-Stack Developer • Software Engineering Enthusiast

### Connect With Me

- GitHub: **https://github.com/mohit-180**
- LinkedIn: **https://linkedin.com/in/mohit-goswami-batch2026**

---

<div align="center">

## ⭐ If you found this project useful, consider giving it a star!

Thank you for visiting this repository.

This project was built to demonstrate modern backend engineering practices including asynchronous programming, distributed caching, automated testing, containerization, and scalable software architecture.

**Happy Coding! 🚀**

</div>
