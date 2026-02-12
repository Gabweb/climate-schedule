# Climate Schedule Add-on — Current State (Agent Start Point)

## Purpose
- Home Assistant add-on with a React UI + Node.js backend to manage room-based climate schedules.
- Schedules are evaluated continuously and applied to mapped Home Assistant climate entities.
- MQTT discovery is used to expose per-room virtual climate entities.

## Fixed Product Decisions
- Language: English UI only.
- Time/locale: fixed timezone `Europe/Berlin`; German-style time/date formatting in UI.
- Schedule granularity: fixed 10-minute steps.
- Desktop-first UI; mobile should be usable but not optimized.
- No onboarding flow.
- No import/export.
- No dedicated holiday schedule; holiday is a global offset.
- No manual override handling yet.

## Core Domain Model
- Room identity is derived from `floor + name` (via shared helper), no persisted room ID.
- Floors: `UG | EG | 1OG | 2OG`.
- Each room has:
  - `name`, `floor`
  - mapped climate entities (`ha_climate`, one or more)
  - `modes[]` (room-local mode names)
  - `activeModeName`
- Each mode has exactly one daily schedule (`00:00` to `23:59`).
- Schedule block: `start`, `end`, `targetC`.
- 1 to 10 blocks per mode, contiguous without gaps.
- Water heater is a single dedicated configuration (not a room) with:
  - one HA climate entity mapping
  - room-like modes and schedules
  - one global heating temperature (`30..65C`)
  - schedule blocks that only control on/off heating.

## Defaults
- New room gets one mode: `Default`.
- Default schedule:
  - `00:00-08:00` -> `19C`
  - `08:00-20:00` -> `20C`
  - `20:00-23:59` -> `19C`

## Global Settings
- Persistent file: `/data/settings.json`
- Schema:
  - `version: 1`
  - `holidayModeEnabled: boolean`
- API:
  - `GET /api/settings`
  - `PUT /api/settings`
- Holiday behavior:
  - Effective target = `scheduledTarget - 2C`
  - Clamp minimum to `5C`
  - Calculation is shared between backend + UI through shared code (`shared/temperature.ts`)
  - Water heater is always off while holiday mode is enabled.

## Persistence
- Rooms file: `/data/rooms.json`
  - Contains `version`, `updatedAt`, `rooms[]`
- Settings file: `/data/settings.json`
- Water heater file: `/data/water-heater.json`
- `/data` is expected to be persistent in Home Assistant add-on runtime.
- Persistent JSON files must support explicit versioned migrations.
- On load, backend must run migrations before validation/use and persist migrated files back to disk.
- Migrations must be stepwise (`n -> n+1`) and deterministic.
- Backend must fail with a clear error when file version is newer than supported.
- Current state: `settings.json` is at initial version `1`; no migration step is required yet, only migration scaffolding.

## Backend Behavior
- Express API serves both JSON API and static UI.
- Schedule loop runs every minute.
- For each room on each tick:
  - evaluate active mode schedule for current Berlin minute
  - compute effective target using shared global settings logic
  - set target temperature on mapped HA climate entities (skip redundant writes)
  - poll current temperature from primary mapped entity (if available)
  - publish MQTT state for virtual room entity
- For water heater on each tick:
  - evaluate active schedule with holiday override
  - if block is off (or holiday mode enabled), call `climate.turn_off`
  - if block is on, set target temperature to configured global heating temperature.
- Startup checks log warnings/errors but do not hard-stop:
  - MQTT connectivity (when configured)
  - mapped HA climate entity existence
- Backend exposes transient startup status via `GET /api/status` with `startupSuccessful: boolean`.

## MQTT Integration (Current Implementation)
- Optional: enabled only when `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` are set.
- If MQTT URL is missing, MQTT is disabled (no-op behavior, logged).
- Per room, a Home Assistant MQTT climate discovery entity is published.
- Water heater is intentionally not published via MQTT.
- Unique ID format: `climateSchedule_<floor>_<name-normalized>`.
- Presets map to room modes.
- Selecting preset in HA updates room `activeModeName`.
- Target temperature commands from MQTT entity are intentionally ignored.
- Current temperature is published from polled real climate entity when available.

## UI Behavior
- Single-page layout.
- Top: global holiday mode toggle.
- If startup checks reported any failure, UI shows a warning banner above cards: "Something is wrong, please check the logs."
- Main: room cards sorted by floor (`UG`, `EG`, `1OG`, `2OG`) then room name.
- Dedicated water heater section/card with:
  - active mode selection
  - current effective state (`Off` or global heating temperature)
  - schedule visualization with active block highlight.
- Room card shows:
  - floor tag + room name
  - active mode (dropdown if multiple modes)
  - current effective target temperature
  - schedule list with currently active block highlighted
- Add-room form is collapsible and displayed in same grid/list area.
- Edit room opens right-side drawer:
  - room fields (name, floor, primary climate entity id)
  - mode tabs (including add mode tab)
  - mode rename via debounced input
  - schedule table with start/end `TimePicker` + target temp input
  - add/remove slots
  - save schedule per mode
  - delete mode with confirmation
- UI validates schedule inputs inline (including invalid time formats/continuity).
- Save/API errors are shown as toast messages.

## API Endpoints (Current)
- `GET /api/hello`
- `GET /api/status`
- `GET /api/rooms`
- `PUT /api/rooms`
- `POST /api/rooms`
- `DELETE /api/rooms/:roomKey`
- `PUT /api/rooms/:roomKey`
- `POST /api/rooms/:roomKey/modes`
- `DELETE /api/rooms/:roomKey/modes/:modeName`
- `PATCH /api/rooms/:roomKey/active-mode`
- `PUT /api/rooms/:roomKey/modes/:modeName/schedule`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/water-heater`
- `PUT /api/water-heater`
- `PATCH /api/water-heater/active-mode`
- `POST /api/water-heater/modes`
- `DELETE /api/water-heater/modes/:modeName`
- `PUT /api/water-heater/modes/:modeName/schedule`

## Testing Expectations
- Backend: unit + endpoint/e2e tests are required for logic and API changes.
- UI: no component tests required currently.
- Shared business logic should stay in `shared/` and be reused by backend/UI to avoid drift.

## Architecture Constraints
- Add-on first; custom HA integration is not part of current scope.
- TypeScript everywhere; keep strong typing and avoid `any`.
- Prefer extending existing shared abstractions (`shared/*`, climate adapter, MQTT service) over duplicating logic.
