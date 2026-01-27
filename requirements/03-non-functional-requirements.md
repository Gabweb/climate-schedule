# Non-Functional Requirements

## Reliability
- Schedule evaluation must resume correctly after Home Assistant restart.
- Persistent storage for schedules and state.
- Scheduler loop must not crash the backend on individual room errors.

## Performance
- UI should load within 2 seconds on a typical Home Assistant host.
- Schedule evaluation should handle at least 50 climate entities without noticeable delay.

## Security
- UI access governed by Home Assistant authentication.
- Only authenticated users can create or edit schedules.

## Usability
- Clear validation errors and inline guidance.
- Desktop-first UI; mobile use should be possible but is not a priority.
- English-only UI; date/time formatted for German locale.
- Save errors are surfaced via toast notifications.

## Observability
- Logs for schedule evaluation and service calls.
- Diagnostics endpoint or view for troubleshooting.

## Testing
- Backend logic has unit and end-to-end tests.
- Core scheduling logic is covered by unit tests.
- No tests are required for the React UI; only the underlying logic is tested.
