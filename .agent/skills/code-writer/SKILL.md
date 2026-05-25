# Skill: code-writer
**Description:** Instructions for writing or modifying source files within the project.

This skill governs the coding standards, patterns, and architectural rules for all source files in the codebase. These guidelines are categorized into **Project-Wide Coding Standards** (applicable globally to all source files) and **Feature-Specific Architectural Standards** (applicable when implementing endpoint features under `src/features/`).

---

## 🛠️ Project-Wide Coding Standards (Global Guidelines)

These standards must be strictly followed for **every single file** written or modified across the entire workspace (including core layers, shared utilities, workers, tests, and feature endpoints).

### 1. No Code Comments (Important)
- **Zero Comments**: Do NOT write any comments (e.g., `//`, `/* ... */`, JSDoc, etc.) in the generated code. The code must be written in a clean, self-documenting manner without explanatory inline comments or block documentation.

### 2. Strict Type Safety & Compiler Compliance

> [!WARNING]
> **Strict Typing: Use of 'any' is strictly BANNED!**
> - **Absolute Ban**: Do NOT write `any` under any circumstances in the project. Any use of `any` will trigger TypeScript compiler errors under `strict: true` and ESLint errors (`@typescript-eslint/no-explicit-any` and all `@typescript-eslint/no-unsafe-*` rules), causing build failures in the CI/CD pipeline.
> - **Corrective Actions**: Always use proper interfaces, types, schemas, or Zod-inferred types instead.

- **Explicit Function Types (Arguments & Return Values)**: Every single function must explicitly specify types for all its parameters and its return type (e.g., `async functionName(arg: Type): Promise<ReturnType>`). Never rely on implicit parameter typing or implicit return type inference.
- **Verbatim Module Syntax**: When importing types or interfaces only, you **must** use type-only imports to prevent compiler and build warnings under TypeScript's strict rules:
  - *Correct:* `import type { IScheduleModule } from '#/worker/schedule/schedule.type'`
  - *Incorrect:* `import { IScheduleModule } from '#/worker/schedule/schedule.type'`

### 3. Path Aliases (Highly Critical)
Before writing any imports, you **must** check `tsconfig.json` to verify the configured path aliases (such as `~/*` or `#/*`). You must strictly and consistently use these aliases.
- **Inspect tsconfig.json**: Always read the `tsconfig.json` compiler options to know the active aliases.
- **Strict Ban on Relative Paths**: Do NOT use relative path markers (`./` or `../`) under any circumstances in the codebase.
- **Same-Directory Rule**: Even when importing another file located in the exact same directory, you **must** use the root path alias instead of a relative import.
  - *Correct:* `import type { IChatContext } from '#/core/chat/chat.type'`
  - *Incorrect:* `import type { IChatContext } from './chat.type'`
  - *Incorrect:* `import type { IChatContext } from '../chat/chat.type'`

### 4. Function Reuse, Enforcing Utilities & Version Segregation (Important)
- **Search and Enforce Utility Functions**: Before writing any helper function, database operations, or native constructs, you must search and reuse the project's existing utility functions (e.g., datetime formatting, common calculations, database helper functions). Always import and leverage core utilities (e.g., `getLocalTime`, `convertToLocalTime`, `convertToUtcTime`, `getUtcTime` from `#/common/utils/datetime.util`) to maintain consistency and timezone safety.
- **Strict Prohibition of Native Date Class**: Do NOT use the native JavaScript `new Date()` class constructor or manual timezone calculations anywhere in the feature components or services. Timezone-safe and consistent datetime operations must be strictly enforced using the core utility helpers from `#/common/utils/datetime.util`. For instance, use `getUtcTime()` instead of `new Date()`, and `getUtcTime(arg).isAfter(getUtcTime())` instead of native `new Date(arg) > new Date()`.
- **Avoid Redundant Functions**: Reuse existing functions, modules, and library helpers rather than creating new, redundant ones. Keep the codebase thin, highly cohesive, and free of duplicate logic.
- **Strict Major Version Segregation**: Feature components belonging to a specific major version folder (e.g., `src/features/[feature_name]/v2/`) must never import, extend, or cross-reference any schemas, repositories, controllers, services, or types belonging to a different version folder of the same feature or any other feature (e.g., `src/features/[feature_name]/v1/`). Each major version must be strictly self-contained or depend only on the core shared layers (e.g., `src/common/...`), to prevent cross-version dependency pollution and compile-time cascading bugs.

### 5. Testing Patterns
- **Test Tool**: Bun Test.
- **Mocks**: Use `spyOn` for repository and service methods.
- **Type Casting in Tests**: When mocking Prisma objects, use the generated types from `#/generated/prisma` or custom types from `*.type.ts`.
- **Validation**: Ensure tests check for both the data and the structure (e.g., `toHaveLength`, `toBe`).

### 6. Centralized Structured Logging & Banned console.log
- **Ban console.log**: Do NOT use `console.log`, `console.warn`, `console.error` or other `console.*` methods. They bypass our Pino log stream.
- **Pino Logger Usage**: Always import and use the central `logger` from `#/common/libs/logger.lib`.
- **Structured Argument Passing**: Pass dynamic properties as an object in the first argument, and the static log description as the second argument (e.g., `logger.info({ userId }, 'Processed successfully')`).
- **Error Serialization**: When catching errors, always pass the error object itself as the first argument to serialize stack traces: `logger.error(error, 'An error occurred')`.

---

## 📁 Project Directory Structure & Core Modules

The repository follows a clean, modular layered architecture. Below is the strict layout and responsibility mapping for each directory:

### 1. `src/common/` (Shared Modules)
This directory houses all globally shared, feature-agnostic utility files, configurations, and common layers:
* **`src/common/constants/`**: Globally immutable configurations, shared static lists, and enum maps.
* **`src/common/exceptions/`**: Custom application exception classes (e.g., standard HTTP errors, entity not found errors).
* **`src/common/libs/`**: Wrappers and instantiations for third-party libraries (e.g., Firestore `db` connection, Pino `logger` library, SSE broker).
* **`src/common/schemas/`**: Shared Zod schemas (e.g., general request/response schemas, shared datetime filters, pagination inputs).
* **`src/common/types/`**: Shared global TypeScript types and core application types (e.g., Context configurations, app bindings, Hono variables).
* **`src/common/utils/`**: Reusable pure helper functions (e.g., datetime parsers, UUID generators, cryptography, payload sanitizers).

### 2. `src/core/` (Core Business Logic)
* Stores the domain-driven, core **Business Logic** and high-level orchestrators of the system that are independent of HTTP delivery frameworks (e.g., the ReAct AI Agent execution loops, agent memory processors, prompt templates, core tasks, and AI tools).

### 3. `src/infrastructure/` (Delivery Framework & Drivers)
This layer handles incoming HTTP delivery, Hono-specific adapters, core application middlewares, and standard OpenAPI documentation metadata:
* **`src/infrastructure/http/middlewares/`**: All global and route-specific Hono HTTP middlewares (e.g., `authMiddleware` for JWT/API key validation, `zValidator` for input mapping, CORS, error boundaries).
* **`src/infrastructure/http/openapi/`**: Global OpenAPI/Swagger setup configurations, generic doc formats, and base metadata schema configurations.
* **`src/infrastructure/http/routes/[version]/`**: Hono route routers organized by API version (e.g., `routes/v1/`). Houses individual `.route.ts` files registering paths, applying middlewares, and invoking controllers, mapped in `index.ts` of the version directory.

### 4. `src/features/[name]/[version]/` (Feature-Specific Domain Scaffolding)
Houses the modular feature domains, divided by plural feature directories (e.g., `features/chats/v1/`):
* Contains singular feature layers (`chat.schema.ts`, `chat.type.ts`, `chat.repository.ts`, `chat.service.ts`, `chat.controller.ts`, `chat.openapi.ts`).

---

## 🏗️ Feature-Specific Architectural Standards (src/features/[plural_name]/v1/)

When building or modifying API endpoints inside the feature directories, follow these precise structural patterns:

### 1. Project Architecture & File Naming
Each feature must be located in `src/features/[plural_name]/v1/` where the folder name is strictly **plural** (e.g., `src/features/users/v1/`).
However, all the internal files of that feature must be named using the strictly **singular** form of the feature (e.g., `user.controller.ts`):
1. `[singular_name].schema.ts`: Zod schemas for validation (e.g., `user.schema.ts`).
2. `[singular_name].type.ts`: TypeScript types (e.g., `user.type.ts`).
3. `[singular_name].repository.ts`: Database queries (e.g., `user.repository.ts`).
4. `[singular_name].service.ts`: Business logic & orchestration (e.g., `user.service.ts`).
5. `[singular_name].controller.ts`: Hono HTTP handlers (e.g., `user.controller.ts`).
6. `[singular_name].openapi.ts`: OpenAPI documentation middleware built using `hono-openapi`'s `describeRoute` (e.g., `user.openapi.ts`). This file must strictly configure and apply `describeRoute` directly, exporting the constructed middleware handlers. It must not contain Hono router instantiations or active path routing logic.

### 2. Type Safety & Zod in Features
- **Schema Alignment**: Ensure Zod schemas in `*.schema.ts` exactly match the data returned by the service.
- **No Manual Duplication**: In `[name].type.ts`, all types derived from schemas must strictly be inferred using `z.infer`. Manually duplicating type definitions or interfaces that mirror schema shapes is strictly prohibited.
- **Schema-Derived Database Types (Option A)**: Do NOT declare manual interfaces for database creations or updates (such as a separate `IScheduleCreateInput`). Instead, define a Zod schema in `[name].schema.ts` (e.g., `scheduleCreateInputSchema` using Zod v4 validation primitives such as `z.uuid()`) and infer the database creation type (`TScheduleCreateInput`) via `z.infer` in `[name].type.ts`.
- **Database Model Naming and Properties**: The Zod schema for database inputs must use pure `snake_case` keys (e.g., `user_id`, `created_at`, `updated_at`) to match the Firestore database columns exactly, preventing property mismatches when storing documents.
- **Computed Fields**: If the service adds computed fields (e.g., `children_count`), these **must** be included in the Zod schema and types, usually with `.default(0)`.
- **Optional vs Default**: Prefer `.default([])` or `.default(0)` over `.optional()` for fields that are always provided by the service (like relation counts or child arrays). This avoids "possibly undefined" errors in tests and frontend.
- **Schema Reuse**: Before defining a new schema in `*.schema.ts`, always check for existing base schemas or common schemas (e.g., `#/common/schemas/...`) that can be extended or reused. Avoid redundant field definitions.
- **Datetime Schema Reuse**: Always import and reuse common datetime validation schemas (e.g., `dateTimeType` from `#/common/schemas/share.schema.ts`) for query parameter and date filtering validations instead of defining custom datetime regex checks manually in separate features.
- **Respect File Deletion**: Do NOT restore, recreate, or modify files that have been explicitly deleted in the workspace unless requested by the user. Let deleted components remain removed.
- **Type Naming Convention**: All TypeScript type/interface/enum declarations must follow a strict prefix rule:
  - **`type` keyword → prefix `T`**: e.g., `export type TUserCreatePayload = z.infer<typeof userCreatePayloadSchema>`
  - **`interface` keyword → prefix `I`**: e.g., `export interface IUserCreateInput { ... }`
  - **`enum` keyword → prefix `E`**: e.g., `export enum EUserStatus { ... }`
  - The remainder of the name mirrors the schema variable name without the `Schema` suffix. For example, `userCreatePayloadSchema` → `TUserCreatePayload`.
  - Internal DB entity interfaces that are NOT directly derived from a Zod schema (e.g., used as repository input shapes) must also use the `I` prefix, e.g., `IExpenseEntity`, `ITodoCreateInput`.
  - **Schema-Derived Types**: Types derived from database schemas must follow the `T` prefix convention as they use the `type` keyword, e.g., `export type TScheduleCreateInput = z.infer<typeof scheduleCreateInputSchema>`.
- **CRUD Schema Naming Standards**: Zod schemas for CRUD (Create, Read, Update, Delete) resource operations must strictly adhere to the following variable naming conventions (using `[name]` as the singular form of the feature, e.g. `expense` or `todo`):
  - **Create Operations**:
    1. JSON request body payload: `[name]CreatePayloadSchema`
    2. Response payload: `[name]ResponseSchema`
  - **Update Operations**:
    1. JSON request body payload: `[name]UpdatePayloadSchema`
  - **Read Operations**:
    1. Query filter payload: `[name]FilterPayloadSchema`
    2. Path parameter payload: `[name]ParamPayloadSchema`
    3. Single item response payload: `[name]ResponseSchema`
    4. List response wrapper payload: `[name]ItemResponseSchema`
  - **Delete Operations**:
    1. Path parameter payload: `[name]ParamPayloadSchema`


### 3. Service & Repository Pattern
- **Return Types**: Services should return Zod-inferred types (`T...Response`).
- **Includes**: Repositories should use Prisma `include` to fetch relations or `_count` for child counts.
- **Mapping**: Services are responsible for mapping Prisma results (e.g., `_count.children`) to the public API format (e.g., `children_count`).

### 4. Controller Implementation
- Use the generic signature for Hono handlers:
      ```typescript
      method = async <E, P, I>(c: Context<E, P, I>) => { ... }
      ```
- **Strict Input Typing for Multi-Validation Routes**: When a route applies one or more validators (e.g., `param`, `query`, or `json` validation) via `zValidator` in the router, the controller's type parameter `I` must strictly reflect this by extending the appropriate schemas from `#/common/types/app.type`:
  - **Single JSON payload validation**: `I extends JsonInputSchema<TPayload>`
  - **Single Param validation**: `I extends ParamInputSchema<TParam>`
  - **Single Query validation**: `I extends QueryInputSchema<TQuery>`
  - **Combined validation (e.g., PUT request with both ID in path param and fields in JSON body)**: Use intersection types to combine them: `I extends ParamInputSchema<TParam> & JsonInputSchema<TJson>`
- **No Manual Casting / Safely Reading Validated Data**:
  - Do NOT use manual type assertions like `c.req.param('id') as string` or `c.req.valid('param' as any) as ...`.
  - When the type parameter `I` is typed properly with `ParamInputSchema` or `QueryInputSchema`, read values safely using `const { id } = c.req.valid('param')` or `const query = c.req.valid('query')` with perfect native type inference.
- Always use `schema.parse(data)` before returning JSON to ensure runtime validation and proper type inference.
- **CRUD Response Schema Standards**: Each CRUD operation must use the correct response schema when calling `c.json(schema.parse(result))`:
  - **create** → parse and return with `[name]ResponseSchema`
  - **get** (single item) → parse and return with `[name]ResponseSchema`
  - **list** → parse and return with `[name]ItemResponseSchema`
  - **update** → return `successResponseSchema` (no body parsing needed: `c.json<TSuccessResponse>(successResponseSchema.parse({}))`)
  - **delete** → return `successResponseSchema` (no body parsing needed: `c.json<TSuccessResponse>(successResponseSchema.parse({}))`)

### 5. Routing Infrastructure Standards (src/infrastructure/http/routes/)
When registering Hono routers under `src/infrastructure/http/routes/[version]/` (e.g., `src/infrastructure/http/routes/v1/`):
- **Separate Route Files**: Each resource or router group must be separated and written into its own dedicated route file (e.g. `users.route.ts`), instead of registering all routes inside a single registry.
- **Index-Only Registration**: The `index.ts` file under the route version directory must act strictly as a registry entry point. It imports each separate route file and registers/mounts it under Hono using `.route()`.
- **Router and OpenAPI Spec Separation**:
  - The `[singular_name].openapi.ts` file under `src/features/[plural_name]/v1/` strictly configures, generates, and exports the `describeRoute` middleware handlers. It must contain zero Hono routing setup.
  - The `[name].route.ts` file under `src/infrastructure/http/routes/[version]/` is where the Hono routing is actively defined. It instantiates repository, service, and controller dependencies, sets up the Hono group router, applies the imported `describeRoute` middleware handlers directly to the routes, executes input validator middleware, and delegates requests to the controller handlers.
  - **Input and Parameter Validation**: For validating request components like `form`, `json`, `query`, `param`, `header`, and `cookie`, you **must** use the custom `zValidator` middleware imported from `#/core/middlewares/validator.middleware` within the Hono route files, rather than raw/direct validators from other packages.



---
*Note: If you encounter "Property does not exist" or "Possibly undefined" errors during scaffolding, check the Zod schemas in `*.schema.ts` first. They are the source of truth for types.*
