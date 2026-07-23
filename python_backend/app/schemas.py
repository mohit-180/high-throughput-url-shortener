import datetime
from pydantic import BaseModel, HttpUrl, Field, field_validator

class URLShortenRequest(BaseModel):
    url: str = Field(..., description="The long URL to be shortened.")
    custom_code: str | None = Field(
        None, 
        min_length=3, 
        max_length=20, 
        pattern=r"^[a-zA-Z0-9_-]+$", 
        description="Optional custom code. Must be alphanumeric (plus '-' or '_')."
    )
    expiry_hours: float | None = Field(
        None, 
        gt=0, 
        description="Optional custom link lifetime in hours."
    )

    @field_validator("url")
    @classmethod
    def validate_absolute_url(cls, v: str) -> str:
        # Simple URL shape check to accommodate custom domains or local hosts
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class URLResponse(BaseModel):
    code: str
    original_url: str
    short_url: str
    created_at: datetime.datetime
    expires_at: datetime.datetime | None
    clicks: int

    class Config:
        from_attributes = True


class AnalyticsEventResponse(BaseModel):
    id: int
    code: str
    timestamp: datetime.datetime
    browser: str
    os: str
    country: str
    ip_address: str
    referrer: str
    device_type: str
    cache_status: str
    latency_ms: int

    class Config:
        from_attributes = True


class CacheStats(BaseModel):
    hits: int
    misses: int
    total_calls: int
    hit_ratio_percent: float
    connected: bool


class DatabaseStats(BaseModel):
    total_records: int
    active_connections: int
    idle_connections: int
    max_connections: int


class SystemStatsResponse(BaseModel):
    database: DatabaseStats
    cache: CacheStats

class AnalyticsSummary(BaseModel):
    totalClicks: int
    cacheHits: int
    cacheMisses: int
    averageLatency: float

class DistributionItem(BaseModel):
    name: str
    value: int


class TimelineItem(BaseModel):
    date: str
    clicks: int     


class AnalyticsDashboardResponse(BaseModel):
    summary: AnalyticsSummary
    browserDistribution: list[DistributionItem]
    osDistribution: list[DistributionItem]
    countryDistribution: list[DistributionItem]
    deviceDistribution: list[DistributionItem]

    clickTimeline: list[TimelineItem]

    recentClicks: list[AnalyticsEventResponse]

    class Config:
        from_attributes = True           
