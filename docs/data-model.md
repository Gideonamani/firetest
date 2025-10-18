# FireTrack Data Model

This document captures the working Firestore schema for FireTrack along with notes on rules, indexes, and emulator testing.

## Collections

### `users/{uid}`
Stores profile metadata for a Firebase Authentication user.

- `displayName` (string, ≤120 chars)
- `photoURL` (string, optional)
- `timezone` (string, optional IANA name)
- `createdAt` (timestamp, server timestamp recommended)
- `updatedAt` (timestamp)

Security: users can read/update/delete only their own profile document.

### `habits/{habitId}`
Top-level documents describing a habit.

- `ownerId` (string, Auth UID)
- `title` (string, ≤120 chars)
- `description` (string, optional, ≤500 chars)
- `visibility` (`"private" | "shared" | "public"`, defaults to `"private"`)
- `sharedWith` (array of UIDs allowed to collaborate, optional, max 20)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `reminderMinutes` (number of minutes after midnight for reminders, optional)
- `currentStreak` (int, optional, maintained by Cloud Function)
- `longestStreak` (int, optional, maintained by Cloud Function)
- `lastEntryAt` (timestamp of the latest logged entry, maintained client-side for now)

Security: owners can read/write/delete. Collaborators in `sharedWith` can read. Public habits are readable by anyone signed in.

### `habits/{habitId}/entries/{entryId}`
Log entries for a habit.

- `performedAt` (timestamp of completion)
- `note` (string, optional, ≤500 chars)
- `mood` (string, optional placeholder for future expansion)

Security: only habit owners can create/update/delete entries; collaborators read-only.

## Emulator Testing

1. Start the suite: `firebase emulators:start --only auth,firestore,functions`.
2. Seed data (example – create a JSON payload in `temp-seed.json` first):
   ```bash
   curl -X POST http://127.0.0.1:8080/emulator/v1/projects/<PROJECT_ID>/databases/(default)/documents \
     -H "Content-Type: application/json" \
     -d @temp-seed.json
   ```
   or use the Emulator UI.
3. Run security tests with the Firebase Emulator Suite:
   ```bash
   npx @firebase/rules-unit-testing test --project <PROJECT_ID>
   ```
4. Trigger the streak Cloud Function locally once data is seeded:
   ```bash
   curl http://127.0.0.1:5001/<PROJECT_ID>/europe-west1/calculateStreaks
   ```
   The function scans each `habits` document, summarises recent `entries`, and updates `currentStreak`, `longestStreak`, and `lastEntryAt`.

> Tip: to persist emulator state between runs, start with `firebase emulators:start --import=.emulator-data --export-on-exit`.
