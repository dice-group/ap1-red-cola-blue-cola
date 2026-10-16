# 0001: Stack for the simulated MVP

Status: accepted

## Context

The MVP runs scripted outcomes, so it needs no model provider or database. It must be easy to run during a presentation, on a laptop, without a network or package installs. The confidential recipe must stay on the server, outside the visitor's browser bundle.

## Options

1. TypeScript across all modules with Node.js, a frontend framework, and a bundler.
2. The Python standard library for the service and packages, with plain HTML, CSS, and JavaScript for the interface.
3. A hosted low-code tool.

## Decision

Option 2. Python 3.10+ standard library only: `http.server` for the service, `dataclasses` for contracts, and `unittest` for tests. The interface is static HTML, CSS, and JavaScript modules served by the same service. There are no third-party dependencies and no build step.

## Rationale

- Runs with `python3 -m apps.api` on any machine that has Python, which macOS and most Linux systems already include.
- The module boundaries in docs/architecture.md map directly to Python packages (`packages.domain`, `packages.security`, `packages.engine`, `packages.ai`).
- With no dependencies, there is no supply chain to audit for a security-education demo.
- The interface receives only data allowed by the service, so no framework is needed to keep secrets out of the bundle.

## Consequences

- `http.server` is fine for a local demo but is not a production server. Use a proper ASGI or WSGI server if the demo is ever hosted publicly.
- Sessions are kept in memory and are lost when the service restarts.
- A real-model adapter will add its first dependency (the provider SDK). Record that in a new decision.
- If the interface grows beyond a few screens, revisit the frontend choice in a new decision.
