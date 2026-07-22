import datetime
from sqlalchemy import String, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class URLMapping(Base):
    __tablename__ = "url_mappings"

    code: Mapped[str] = mapped_column(String(20), primary_key=True, nullable=False)
    original_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    expires_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    analytics: Mapped[list["AnalyticsEvent"]] = relationship(
        "AnalyticsEvent", back_populates="url_mapping", cascade="all, delete-orphan"
    )

    # Explicit B-tree index on short_code (covered by primary key, but we declare index explicitly to show intent)
    __table_args__ = (
        Index("ix_url_mappings_code_btree", "code", postgresql_using="btree"),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(
        String(20), ForeignKey("url_mappings.code", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    browser: Mapped[str] = mapped_column(String(50), nullable=False)
    os: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False) # Supports IPv4 and IPv6 lengths
    referrer: Mapped[str] = mapped_column(String(512), nullable=False)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)
    cache_status: Mapped[str] = mapped_column(String(10), nullable=False) # "HIT" or "MISS"
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    url_mapping: Mapped["URLMapping"] = relationship("URLMapping", back_populates="analytics")

    __table_args__ = (
        Index("ix_analytics_events_code", "code"),
        Index("ix_analytics_events_timestamp", "timestamp"),
    )
