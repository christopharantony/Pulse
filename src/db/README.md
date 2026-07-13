# Pulse Database Layer

The backend data foundation for Pulse: MongoDB access, a repository pattern, query utilities, typed
errors, and idempotent index initialization. It implements
[docs/architecture/database-architecture.md](../../docs/architecture/database-architecture.md) — read
that first for the *why*; this README is the *how*.

## Layering (dependency direction)

```
schemas/ · lib/query/ · lib/mongo/   (leaf utilities, no DB imports)
        ↓
db/ (client, base-repository, errors, transaction, collections, indexes)
        ↓
features/<domain>/ (types → validators → repositories)
        ↓
services / route handlers   (out of scope for this layer)
```

Dependencies only ever point downward, so the graph is acyclic. A repository imports from `db/` and
`lib/`; nothing in `db/` or `lib/` imports a feature.

## Key building blocks

| Module | Responsibility |
| --- | --- |
| `db/client.ts` | Lazy singleton `MongoClient` (HMR-safe in dev), `getDb`, `getClient`, generic `getCollection`, and the pre-existing auth `ensureIndexes`. |
| `db/collections.ts` | `COLLECTIONS` registry — the single source of truth for collection names. |
| `db/base-repository.ts` | `createRepository<TDoc>()` factory: `findById/findOne/findMany/insertOne/updateById/softDeleteById/hardDeleteById/count`, cursor pagination, soft-delete scoping, and E11000 → `DuplicateKeyError` translation. The one module allowed to cast at the driver boundary. |
| `db/errors.ts` | `DatabaseError` hierarchy: `DuplicateKeyError`, `InvalidObjectIdError`, `DocumentNotFoundError`, plus `translateMongoError`. |
| `db/transaction.ts` | `withTransaction()` for multi-document atomicity (requires a replica set). |
| `db/indexes.ts` | `ensureAllIndexes()` — composes every domain's `ensure<Domain>Indexes(db)`; run once at startup from `src/instrumentation.ts`. |
| `lib/query/*` | `cursor`, `offset`, `filter` (incl. `withWorkspaceScope`), `sort`, `search`, `date-range`, `projection`, `pagination`. |
| `lib/mongo/object-id.ts` | `toObjectId` / `toObjectIdOrNull` / `isValidObjectId` — the untrusted-string → ObjectId boundary. |
| `schemas/*` | Cross-domain Zod: `objectIdSchema`, `schedulableSchema` (shared recurrence/reminders), pagination inputs. |

## Conventions

- **Repositories are data-only.** No business rules, no authorization, no cross-collection
  orchestration, no side effects (notifications/webhooks). Those belong in the service layer. A
  repository touches one collection (the transactional `createWithOwner` is the deliberate
  exception, and it's explicitly a two-collection atomic write).
- **Tenancy everywhere.** Every tenant-scoped query goes through `withWorkspaceScope`, and every
  tenant-scoped repository method takes `workspaceId` as its first argument.
- **ObjectIds at the boundary.** Repositories accept `ObjectId`, not strings. Convert with
  `toObjectId` in the caller (service/route). Validators use `objectIdStringSchema`.
- **Not-found is `null`, not an exception.** `find*` returns `null`; only operations that require
  existence throw `DocumentNotFoundError`. Writes translate driver errors via the base repository.
- **Append-only collections** (`time_sessions`, `habit_logs`, `notifications`,
  `analytics_daily_rollups`, memberships/invitations/comments) are created with
  `softDelete: false`.
- **JSDoc explains *why*** (rationale/trade-offs), not *what* — matching the existing codebase.

## Adding a new repository

1. **Type** — `features/<domain>/types/<entity>.ts`: one `interface` with `_id: ObjectId`,
   `workspaceId` if tenant-scoped, `createdAt`/`updatedAt`, and `deletedAt: Date | null` if
   soft-deletable.
2. **Validators** — `features/<domain>/validators/<domain>.schema.ts`: `create<Entity>Schema` +
   `update<Entity>Schema` with `z.infer` types and explicit error messages. Reuse
   `schemas/schedulable.schema.ts` for anything schedulable and `schemas/object-id.schema.ts` for id
   fields.
3. **Collection name** — add it to `COLLECTIONS` in `db/collections.ts`.
4. **Repository** — `features/<domain>/repositories/<entity>.repository.ts`:
   ```
   const base = createRepository<Entity>({ collectionName: COLLECTIONS.entity });
   export const entityRepository = { ...base, /* domain-specific data methods */ };
   ```
   Compose `lib/query/*` helpers instead of re-implementing pagination/filtering.
5. **Indexes** — `features/<domain>/repositories/<domain>.indexes.ts` exporting
   `ensure<Domain>Indexes(db)`, then register it in `db/indexes.ts`.
6. **Test** — `<entity>.repository.test.ts`: cover CRUD, unique-key violations, soft-delete
   scoping, and any domain invariants. Tests run against a real in-memory replica set.

## Testing

`pnpm test` runs Vitest against `mongodb-memory-server` (a real in-memory replica set, so index
constraints and transactions are genuinely exercised — not mocked). The mongod binary is cached
after the first download. `server-only` is aliased to a no-op stub for the node test environment
(see `vitest.config.ts`).

## Operational notes

- **Transactions require a replica set.** `withTransaction` (used by `workspaceRepository.createWithOwner`)
  throws on a standalone `mongod`. Run local dev against a single-node replica set, or MongoDB Atlas
  (a replica set by default).
- **Index creation runs at startup** via `src/instrumentation.ts` → `ensureAllIndexes()`. It is
  idempotent, so booting repeatedly is safe.
