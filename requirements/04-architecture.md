# Technical Architecture (Draft)

## High-level components
- **UI (Ingress)**: web UI for user/admin tasks, exposed via Home Assistant sidebar/ingress.
- **Backend service**: Node.js/TypeScript service for schedule evaluation, storage, and API.
- **Scheduler engine**: evaluates schedule rules and triggers service calls.
- **Climate adapter interface**: generic interface for applying schedule targets.
- **HA climate adapter**: implementation that calls Home Assistant services.
- **Storage**: persistent data store for schedules, mappings, overrides, and room config (`/data`).

## Data flow
1. User edits schedules in the UI.
2. UI calls add-on API to save changes.
3. Scheduler engine evaluates schedules on a timer.
4. When a change is due, add-on calls Home Assistant service APIs.
5. Results and logs are stored and shown in the UI.

## Integration points
- Home Assistant Supervisor for add-on lifecycle.
- Home Assistant Core API for entity state and service calls.
- Ingress for UI access.

## Technology candidates (to confirm)
- Backend: Node.js TypeScript service inside the add-on.
- UI: React (Ant Design components).
- Storage: SQLite or JSON file-based storage under add-on `/data`.

## Fixed localization
- UI language: English only.
- Locale formatting: German (e.g., date/time).
- Timezone: `Europe/Berlin` (fixed).

## Open decisions
- Add-on only (initially); consider custom integration later if needed.
- Whether to use Home Assistant's existing scheduling capabilities under the hood.
- Conflict handling with manual changes or other automations.
