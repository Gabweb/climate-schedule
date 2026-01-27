# Climate Schedule Addon — Requirements Overview

## Goals
- Provide a dedicated UI to manage climate schedules.
- Apply target temperatures from schedules to existing Home Assistant climate entities.
- Make schedule execution reliable, transparent, and easy to troubleshoot.

## Non-goals (initially)
- Replacing Home Assistant's built-in schedule/automation systems entirely.
- Managing devices outside Home Assistant.
- Complex optimization (e.g., energy pricing, predictive control).

## Stakeholders / Personas
- Home occupants who want predictable comfort.
- Power users who manage multiple climate entities and zones.
- Installers/admins who need easy setup and debugging.

## Scope assumptions (validate)
- This is a Home Assistant **Add-on** with a **companion UI** exposed in the sidebar.
- All code is TypeScript with strict typing; UI is React.
- UI language is English only; date/time formatting uses German formats.
- Timezone is fixed to `Europe/Berlin` and is not configurable.
- Schedules are stored and evaluated by the add-on, not by external services.
- The add-on calls Home Assistant services (e.g., `climate.set_temperature`).
- Schedules apply per zone (room), not globally.
- Room names are unique and used as identifiers.
- Home Assistant API access is via Supervisor proxy (`/core`) and `SUPERVISOR_TOKEN` (no manual token entry).

## Success criteria (draft)
- A user can create a daily schedule and apply it to one or more climate entities within 5 minutes.
- Schedule execution has visible logs and a test mode.
- The system can recover gracefully after Home Assistant restarts.

## Open questions
- Do we need a custom integration later for deeper HA integration?
