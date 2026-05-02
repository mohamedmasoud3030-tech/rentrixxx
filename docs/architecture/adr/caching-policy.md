# ADR: Caching Policy

- **Status**: Accepted
- **Date**: 2026-05-02

## Context
Read-heavy screens require responsiveness while data freshness remains important.

## Decision
Adopt **stale-while-revalidate** at hook level:
- Return cached last-known-good data immediately.
- Trigger background refresh for active views.
- Invalidate cache on successful writes affecting related entities.
- Use bounded TTL per domain based on volatility.

## Consequences
- Better perceived performance and resilience to transient outages.
- Requires clear cache-key ownership and invalidation rules.
