---
name: logger-debug
description: Explains how to perform type-safe, structured logging and debugging using the central Pino logger. Restricts console.log in favor of the pino logger library.
---

# Logger & Debugging Skill

This skill defines the guidelines for performing logging and debugging across the codebase. We use **Pino** as our central structured logging library.

## 🚫 Native Console Banned

You **MUST NOT** use native `console.log`, `console.warn`, `console.error`, or other `console.*` methods. They bypass our Pino log stream and pretty-printing transport configurations.

- **Bad**: `console.log("Starting job...", jobId)`
- **Good**: `logger.info({ jobId }, 'Starting job...')`

---

## 📦 Importing the Logger

Always import the central `logger` from the common libs path:

```typescript
import { logger } from '#/common/libs/logger.lib'
```

---

## 💡 Best Practices

### 1. Structured Logging (Pino Style)
Pino is a structured logger. Do **not** use string interpolation or concatenation for dynamic variables. Pass dynamic properties as an object in the **first argument**, and the static log description as the **second argument**.

- **Incorrect**: `logger.info("Processed user " + userId + " successfully.")`
- **Correct**: `logger.info({ userId }, 'Processed user successfully')`

### 2. Error Logging in Catch Blocks
When catching errors, always pass the error object itself as the **first argument**. This allows Pino to serialize and display the full stack trace correctly.

- **Incorrect**: `logger.error("Failed to fetch: " + error.message)`
- **Correct**: `logger.error(error, 'Failed to fetch user details')`

### 3. Log Levels
Ensure you use the correct log level:
- `logger.debug`: Low-level details, query payloads, execution tracing, and developer-only context.
- `logger.info`: Significant lifecycle events, successful operation completions, worker pickups, and server actions.
- `logger.warn`: Fallbacks, minor non-critical anomalies, missing optional properties, or expected recoverable errors.
- `logger.error`: Fatal errors, database transaction failures, critical pipeline crashes, or failed API executions.
