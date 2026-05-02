# Habit Tracker Links

## Overview

Habit links are **reusable** tokens for mindfulness/habit activities. Unlike magic links (single-use, `used_at` marks consumption), habit links allow multiple executions and track a history of entries.

## Architecture

### Tables

- **`habit_links`** — Reusable tokens tied to workspace+patient+activity
  - One active link per patient+activity+workspace (unique constraint)
  - Status: `active` | `expired` | `revoked`
  - Counters: `total_entries`, `last_entry_at` (updated by trigger)
  - Token stored as SHA-256 hash (same pattern as magic links)

- **`habit_entries`** — Individual execution records (immutable)
  - Fields: `duration_seconds`, `cycles_completed`, `metadata_encrypted`
  - No client INSERT — server function only (same pattern as `activity_responses`)
  - `metadata_encrypted` uses AES-256 with `PHI_ENCRYPTION_KEY`

### Public Route

`/h/$token` — renders the breathing/guided runner, submits entries on completion, shows history with streak tracking.

### Category Gating

Only activities in `HABIT_LINK_CATEGORIES` (currently `mindfulness`) can generate habit links. Expand the set in `habits.functions.ts` to enable more categories.

### Tier-based Expiration

| Tier     | Expiration |
|----------|-----------|
| Trial    | 7 days    |
| Solo     | 7 days    |
| Basic    | 30 days   |
| Practice | 90 days   |
| Clinic   | 90 days   |

## Flow

1. Therapist clicks "Enviar link" on a mindfulness activity in the Acervo
2. PatientPickerSheet detects `category=mindfulness` + `mode=shared_link`
3. Creates a `habit_link` via `createHabitLink()` server function
4. Shows the URL for the therapist to copy/share via their preferred channel
5. Patient opens `/h/$token` → exercises → completion records a `habit_entry`
6. Patient can repeat as many times as they want until expiration
7. Therapist sees entry history in the patient profile

## Security

- RLS on both tables (workspace member + assigned therapist or owner)
- No client INSERT on `habit_entries` (server function with service role)
- Audit triggers log link creation, status changes, and entries
- `metadata_encrypted` for any additional data beyond duration/cycles
- Token hash prevents token recovery from database

## Differences from Magic Links

| Aspect | Magic Link (`/p/$token`) | Habit Link (`/h/$token`) |
|--------|--------------------------|--------------------------|
| Usage | Single-use (`used_at`) | Reusable until expiration |
| Expiration | Tier-based (24h–14d) | Longer (7d–90d) |
| Data model | `activity_responses` (scored) | `habit_entries` (lightweight) |
| Categories | All | `HABIT_LINK_CATEGORIES` only |
| Consent | Per-activity consent gate | Not required (no PHI collected) |

## Files

- `src/features/habits/habits.server.ts` — Server-only DB helpers
- `src/features/habits/habits.functions.ts` — Server functions (createServerFn)
- `src/routes/h.$token.tsx` — Public habit link route
- `src/features/library/PatientPickerSheet.tsx` — Updated to detect mindfulness + create habit links
