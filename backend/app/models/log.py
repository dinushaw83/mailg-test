from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Index, Sequence
from sqlalchemy.sql import func
from app.db.base import Base


class ApiLog(Base):
    """API request logging model for audit trail and monitoring.
    
    Stores request metadata, response status, and performance metrics.
    """
    __tablename__ = "api_logs"

    id = Column(Integer, Sequence('api_logs_id_seq', start=1, increment=1), primary_key=True, autoincrement=True, index=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    level = Column(String, nullable=False, index=True)  # INFO, WARNING, ERROR
    operation = Column(
        String, nullable=False, index=True
    )  # CREATE, READ, UPDATE, DELETE, RESTORE
    resource = Column(
        String, nullable=False, index=True
    )  # ticket, user, organization, article, group
    resource_id = Column(String, index=True)  # ID of the resource being operated on
    method = Column(String, nullable=False)  # HTTP method
    endpoint = Column(String, nullable=False)  # API endpoint
    status_code = Column(Integer, index=True)  # HTTP status code
    user_id = Column(
        Integer, index=True
    )  # User performing the operation (if available)
    ip_address = Column(String)  # Client IP address
    request_data = Column(JSON)  # Request payload (for create/update)
    response_data = Column(JSON)  # Response data (limited)
    error_message = Column(Text)  # Error message if operation failed
    duration_ms = Column(Integer)  # Request duration in milliseconds
    created_at = Column(DateTime, server_default=func.now(), index=True)

    __table_args__ = (
        # Common analytics/debug drill-downs:
        Index("ix_api_logs_resource_resource_id_timestamp", "resource", "resource_id", "timestamp"),
        Index("ix_api_logs_level_timestamp", "level", "timestamp"),
        Index("ix_api_logs_status_code_timestamp", "status_code", "timestamp"),
    )
