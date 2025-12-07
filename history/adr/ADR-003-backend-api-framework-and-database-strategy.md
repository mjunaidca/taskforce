# ADR-003: Backend API Framework and Database Strategy

- **Status:** Accepted
- **Date:** 2025-12-07
- **Feature:** 003-backend-api
- **Context:** specs/003-backend-api/spec.md

## Decision

Built a production-ready REST API using FastAPI with SQLModel ORM on Neon PostgreSQL serverless. The architecture uses async-first patterns throughout to handle serverless connection constraints and maintains schema compatibility with Phase I CLI models.

**Technology Stack:**
- **API Framework**: FastAPI (over Flask or Django REST)
- **ORM**: SQLModel (SQLAlchemy + Pydantic hybrid)
- **Database**: Neon PostgreSQL serverless with asyncpg driver
- **Auth Integration**: JWT/JWKS verification against Better Auth SSO
- **HTTP Client**: httpx for async external calls

**Async Database Architecture:**
- SQLAlchemy async engine with asyncpg driver
- Connection pooling: pool_size=5, max_overflow=10
- pool_pre_ping=True for Neon serverless (connections close after idle)
- pool_recycle=300 (5 min) to handle Neon connection lifecycle
- URL transformation: postgresql:// → postgresql+asyncpg://, sslmode → ssl

**JWT/JWKS Verification Pattern:**
- JWKS cached for 1 hour to minimize SSO dependency
- Fallback to expired cache if SSO unavailable
- RS256 signature verification done locally (no per-request SSO call)
- Dev mode bypass for local development without SSO

**Schema Continuity:**
- SQLModel schemas use identical field names and types to Phase I Pydantic models
- Enables zero-friction migration from JSON → PostgreSQL
- Audit log structure persists across all phases

## Consequences

### Positive
- FastAPI's automatic OpenAPI docs accelerate frontend integration
- SQLModel provides Pydantic validation + SQLAlchemy ORM in single class
- Async patterns maximize throughput for I/O-bound operations
- JWKS caching enables continued operation during SSO outages
- Schema compatibility enables data migration from CLI

### Negative
- SQLModel is less mature than pure SQLAlchemy; some advanced features unavailable
- Async session patterns require careful context management (MissingGreenlet errors)
- Neon serverless requires special pooling configuration
- Two separate database connections needed (main DB + ChatKit store)

## Alternatives Considered

### Alternative A: Django REST Framework + psycopg2
- Pros: Mature ecosystem, built-in admin, extensive middleware
- Cons: Sync-first architecture, heavier weight, ORM less flexible
- Why rejected: FastAPI's async-first design better matches Neon serverless constraints

### Alternative B: FastAPI + raw SQLAlchemy Core
- Pros: Maximum query control, no ORM abstraction overhead
- Cons: Manual model serialization, more boilerplate, no Pydantic integration
- Why rejected: SQLModel's Pydantic hybrid provides better DX and automatic validation

### Alternative C: Flask + Tortoise ORM
- Pros: Async ORM designed for FastAPI, similar API to Django ORM
- Cons: Smaller ecosystem, less Pydantic integration, different patterns
- Why rejected: SQLModel maintains consistency with Phase I Pydantic models; better long-term maintainability

## Implementation Patterns

**Database URL Conversion:**
```python
# Handle Neon URL quirks
if url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
params["ssl"] = params.pop("sslmode")  # asyncpg uses 'ssl' not 'sslmode'
```

**JWKS Caching:**
```python
if _jwks_cache and (now - _jwks_cache_time) < JWKS_CACHE_TTL:
    return _jwks_cache  # Use cache
# ... fetch from SSO, update cache
```

## References
- Spec: specs/003-backend-api/spec.md
- Plan: specs/003-backend-api/plan.md
- Implementation: packages/api/src/taskflow_api/
- Key files: database.py, auth.py, models/
