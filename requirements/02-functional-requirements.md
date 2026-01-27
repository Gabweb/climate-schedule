# Functional Requirements

## Schedule model
- Support a single daily schedule from 00:00 to 23:59 (applies to every day).
- Each block has a target temperature (no HVAC mode changes).
- Adjusting start/end times auto-shifts adjacent blocks to avoid gaps.
- Time granularity is fixed to 10-minute steps.
- Use a fixed timezone of `Europe/Berlin` (not configurable).
- Support one-time overrides with an expiry time.
- Allow 1–10 time blocks per schedule.

## Entity mapping
- Allow mapping schedules per room/zone to one or more climate entities.
- Show entity availability and current state in the UI.
- Allow per-entity override (opt-out) of a shared schedule.

## Rooms
- Maintain a static list of rooms with fields: `name` and `floor` (UG, EG, 1OG, 2OG).
- Room definitions are stored in a `/data` file and editable via the UI.
- Each room maps to one or more climate entities.
- Room definitions include the climate entity mapping.
- Room `name` is unique and used as the identifier.

## Execution
- Evaluate schedules at 10-minute precision (fixed).
- Apply changes via Home Assistant services (e.g., `climate.set_temperature`).
- Avoid redundant service calls when target already matches.
- Provide a "dry-run" or "test" action.
- Apply schedules per room/zone based on the room's active mode.
- Scheduler loop runs continuously (minute-level tick) and applies targets via a climate adapter.

## Climate adapter
- Define a generic interface for applying schedule targets to a room.
- Provide a Home Assistant climate adapter implementation that uses HA services via Supervisor proxy.

## UI
- Sidebar entry for the add-on UI.
- CRUD for schedules, with validation (time overlaps, missing fields).
- Calendar-like view or timeline view to visualize schedule blocks.
- Activity log view with timestamps and applied actions.
- UI text is English only; date/time formatting uses German locale.
- CRUD for room configuration (name, floor, mapped climate entities).
- Single-page layout: room overview and active schedules on top, add-room form below.
- Room edit opens a right-side drawer panel.
- Inline validation for schedule times (invalid input highlighted).

## Modes
- Support room-specific modes (e.g., Holiday, Weekend, Workday).
- Each room defines its own set of modes.
- Each mode has exactly one daily schedule for that room.
- Switching a room's mode changes the active schedule for that room.
- Mode `name` is unique within a room and used as the identifier.

## Defaults
- Create a default mode per room.
- Create a default schedule with three blocks and no gaps:
  - Night: 00:00–08:00 at 19°C
  - Day: 08:00–20:00 at 20°C
  - Night: 20:00–23:59 at 19°C
