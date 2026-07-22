import random
from locust import HttpUser, task, between

class URLShortenerLoadTester(HttpUser):
    # Wait between 0.1 to 1.5 seconds between tasks to simulate highly concurrent, intensive traffic
    wait_time = between(0.1, 1.5)

    def on_start(self):
        """Initializes virtual user state by pre-populating some common targets."""
        self.common_urls = [
            "https://www.google.com",
            "https://github.com",
            "https://www.youtube.com",
            "https://fastapi.tiangolo.com",
            "https://news.ycombinator.com"
        ]
        self.created_codes = ["goog89", "github", "ytbe12", "fastap"] # Seeded fallbacks

    @task(3)
    def redirect_url(self):
        """Simulates high-throughput redirect behavior. This hits the main Cache-Aside pipeline."""
        if self.created_codes:
            code = random.choice(self.created_codes)
            # Redirect triggers headers mapping browser/OS and records asynchronous background telemetry
            self.client.get(
                f"/r/{code}", 
                headers={
                    "user-agent": random.choice([
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
                        "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0"
                    ]),
                    "cf-ipcountry": random.choice(["US", "CA", "DE", "JP", "IN", "GB", "AU"]),
                    "referer": random.choice(["https://github.com", "https://t.co", "https://google.com", ""])
                },
                name="/r/[code]",
                allow_redirects=False # Do not spend load-agent resources on loading target redirect domains
            )

    @task(1)
    def shorten_url(self):
        """Simulates users creating short links periodically."""
        target_url = random.choice(self.common_urls) + f"?query={random.randint(1000, 9999)}"
        payload = {
            "url": target_url,
            "expiry_hours": random.choice([1, 24, None])
        }
        with self.client.post("/api/v1/shorten", json=payload, name="/api/v1/shorten") as response:
            if response.status_code == 201:
                try:
                    data = response.json()
                    self.created_codes.append(data["code"])
                except Exception:
                    pass

    @task(1)
    def fetch_statistics(self):
        """Simulates admin dashboards reading system performance telemetry."""
        self.client.get("/api/v1/system/stats", name="/api/v1/system/stats")

    @task(1)
    def check_health(self):
        """Simulates liveness check probes hitting the health gateway."""
        self.client.get("/api/v1/health", name="/api/v1/health")
