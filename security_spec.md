# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership (`ownerId`)**: Every document in `/tasks/{taskId}` and `/users/{userId}` must belong strictly to the authenticated user (`ownerId == request.auth.uid`) with a verified email (`request.auth.token.email_verified == true`).
2. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` can never be mutated during an `update` operation (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
3. **Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create and update) must strictly equal `request.time`.
4. **Path ID Hardening**: All single-document target operations (`get`, `create`, `update`, `delete`) must validate `isValidId(taskId)` / `isValidId(userId)` matching `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
5. **Strict Key & Volumetric Boundaries**: Every string is bounded by `.size()` and regex/enum checks; `subtasks` is bounded to `<= 20` items and `completedDates` to `<= 366` items. No shadow/ghost fields are allowed (`hasAll` + `hasOnly`).
6. **Query Enforcer**: `allow list` on `/tasks` must explicitly check `resource.data.ownerId == request.auth.uid` so unauthorized list queries are rejected at the rule level.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing Payload**: Creating a task with `ownerId: "victim_uid_123"` while signed in as `"attacker_uid_999"`.
2. **Unverified Email Payload**: Attempting to create a task with `request.auth.token.email_verified == false`.
3. **Shadow Field Injection (Create)**: Creating a task with all valid keys plus `"isAdmin": true`.
4. **Shadow Field Injection (Update)**: Updating a task with `"hackedField": "payload"`.
5. **Ownership Transfer Attack**: Updating `ownerId` on an existing task from `"user_a"` to `"user_b"`.
6. **CreatedAt Time-Travel Attack**: Updating `createdAt` on an existing task or forging a client timestamp `createdAt != request.time`.
7. **Denial-of-Wallet Oversized Title**: Submitting a `title` string with 5,000 characters (`> 120`).
8. **Invalid Enum Injection**: Submitting `color: "neon-pink"` or `recurrence: "hourly"` outside the strict allowlist.
9. **Unbounded Array Poisoning**: Submitting `subtasks` with 50 elements (`> 20`) or non-string first element `[12345]`.
10. **Path ID Poisoning**: Creating a document at `/tasks/invalid$id!with*spaces` or a 500-character ID.
11. **Cross-Tenant List Scraping**: Executing a `list` query on `/tasks` without filtering by `where('ownerId', '==', request.auth.uid)`.
12. **Cross-Tenant User Preference Read**: Attempting `get` on `/users/other_user_id` while signed in as `current_user_id`.

## 3. Test Runner Specification (`firestore.rules.test.ts`)

```ts
// Verification suite confirming all 12 Dirty Dozen payloads return PERMISSION_DENIED
// and legitimate owner operations succeed.
```
