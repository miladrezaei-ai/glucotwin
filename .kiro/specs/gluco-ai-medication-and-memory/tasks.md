# Implementation Plan: Medication Redesign & AgentCore Long-Term Memory

## Overview

Implement the prescription-based medication model in the React frontend and integrate AgentCore Long-Term Memory into the Strands agent. API Lambda functions (POST/GET/DELETE /medicine, POST /profile) are external to this repo — those changes must be made manually in AWS (see infrastructure notes below).

## Tasks

- [ ] 1. Update frontend medication form state and UI
  - [ ] 1.1 Remove date/time fields and add frequency + timesOfDay inputs in `App.jsx`
    - Remove `date` and `time` keys from `newMed` useState initializer
    - Add `frequency: ''` and `timesOfDay: []` to `newMed` state
    - Remove date input and time/clock input elements from the medication form JSX
    - Add a `<select>` dropdown for `frequency` with options: `once_daily`, `twice_daily`, `three_times_daily`, `as_needed`
    - Add multi-select checkboxes for `timesOfDay`: morning, evening, with_meals
    - _Requirements: 2.1, 2.2_

  - [ ]* 1.2 Write property test for form field presence (Property 4)
    - **Property 4: Form validation blocks submission on missing required fields**
    - **Validates: Requirements 2.4, 3.4**
    - Use fast-check to generate random subsets of missing required fields; assert no fetch call is made and a validation message is shown

- [ ] 2. Update `addMedication()` and form validation in `App.jsx`
  - [ ] 2.1 Rewrite `addMedication()` to send the new prescription payload
    - Validate that `name`, `dosage`, and `frequency` are non-empty; show inline error and return early if not
    - Remove date/time validation
    - Build POST body: `{ userId, medicationName: newMed.name, dosage: newMed.dosage, frequency: newMed.frequency, timesOfDay: newMed.timesOfDay }`
    - Reset `newMed` to `{ name: '', dosage: '', frequency: '', timesOfDay: [] }` on success
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write property test for POST payload shape (Property 5)
    - **Property 5: Prescription POST payload shape**
    - **Validates: Requirements 2.3, 3.5**
    - Use fast-check to generate valid form states; assert POST body contains `medicationName`, `dosage`, `frequency`, `timesOfDay` and does NOT contain `date`, `timestamp`, or `timeOfDay`

- [ ] 3. Update `fetchMedications()` mapping and medication list display in `App.jsx`
  - [ ] 3.1 Update `fetchMedications()` to map new prescription fields
    - Map `id: item.medicationName` (stable key, no timestamp)
    - Map `frequency: item.frequency` and `timesOfDay: item.timesOfDay`
    - Remove any mapping of `date` or `time` fields
    - _Requirements: 2.7, 3.2_

  - [ ] 3.2 Update medication list JSX to display frequency label and timesOfDay
    - Show: `name • dosage • <frequency label> • <timesOfDay labels>`
    - Frequency display labels: `once_daily` → "Once daily", `twice_daily` → "Twice daily", `three_times_daily` → "Three times daily", `as_needed` → "As needed"
    - _Requirements: 2.7_

  - [ ]* 3.3 Write property test for medication list rendering (Property 6)
    - **Property 6: Medication list renders all required fields**
    - **Validates: Requirements 2.7**
    - Use fast-check to generate random Prescription objects; render each list item; assert name, dosage, frequency label, and timesOfDay are all present in the output

- [ ] 4. Add DELETE medication support in `App.jsx`
  - [ ] 4.1 Implement delete handler and wire to list UI
    - Add a delete button to each medication list item
    - On click, send `DELETE /medicine?medicationName=<name>` with the user's auth token
    - On success response, remove the entry from local medications state
    - _Requirements: 2.6, 3.3_

  - [ ]* 4.2 Write property test for add-then-delete round-trip (Property 7)
    - **Property 7: Add then delete round-trip restores list**
    - **Validates: Requirements 2.6, 3.3**
    - Use fast-check to generate a random Prescription; simulate add then delete; assert list length is unchanged and DELETE was called with the correct `medicationName`

- [ ] 5. Checkpoint — Ensure all frontend tests pass
  - Run `npm test -- --run` in `frontend/` and confirm no failures; ask the user if questions arise.

- [ ] 6. Update AgentCore memory configuration in `.bedrock_agentcore.yaml`
  - [ ] 6.1 Change `memory.mode` from `NO_MEMORY` to `STM_ONLY` and set `memory_name`
    - Set `memory.mode: STM_ONLY`
    - Set `memory_name: gluco-ai-memory`
    - _Requirements: 4.1, 4.3_

- [ ] 7. Refactor `gluco_agent.py` — add LTM context loading
  - [ ] 7.1 Add imports and `MemoryClient` initialisation
    - Import `MemoryClient` from `bedrock_agentcore.memory`
    - Import `os`, `logging`
    - Instantiate `memory_client = MemoryClient(region_name="eu-central-1")`
    - Define `BASE_SYSTEM_PROMPT` constant with the existing system prompt text
    - Add `logger = logging.getLogger(__name__)`
    - _Requirements: 4.4, 5.1_

  - [ ] 7.2 Implement `load_session_context(user_id, memory_id)` function
    - Call `memory_client.retrieve(...)` for namespaces `profile`, `prescriptions`, and `observations`
    - Build and return a formatted context block string from the retrieved data
    - Catch all exceptions, log the error, and return `""` on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ]* 7.3 Write property test for `load_session_context` LTM failure handling (Property 10)
    - **Property 10: LTM failure does not fail session or API response**
    - **Validates: Requirements 5.6, 6.5, 7.5**
    - Use Hypothesis to mock `MemoryClient.retrieve` to raise arbitrary exceptions; assert `load_session_context` returns `""` and does not raise

  - [ ]* 7.4 Write property test for session context loading (Property 9)
    - **Property 9: Session start loads all context types from LTM**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
    - Use Hypothesis to generate random profile/prescription/observation data; mock LTM to return it; assert all data appears in the dynamic system prompt passed to the Agent

- [ ] 8. Refactor `gluco_agent.py` — update entrypoint and add `write_observation` tool
  - [ ] 8.1 Update `@app.entrypoint` to accept `userId`, build dynamic system prompt, and pass `write_observation` tool
    - Read `user_id = payload.get("userId")` and `memory_id = os.environ.get("MEMORY_ID")`
    - Call `load_session_context(user_id, memory_id)` and concatenate with `BASE_SYSTEM_PROMPT`
    - Instantiate `Agent` per-request with `system_prompt=dynamic_system_prompt` and `tools=[write_observation]`
    - _Requirements: 5.5, 8.1_

  - [ ] 8.2 Implement `write_observation` Strands tool
    - Decorate with `@tool`; accept `description: str` and `confidence: str` parameters
    - Retrieve existing observations from LTM; enforce 20-item cap by dropping the oldest when at limit
    - Append new observation with `description`, `detectedDate` (today's date), and `confidence`
    - Write updated list back to LTM; catch and log exceptions without raising
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 8.3 Write property test for observation structure invariant (Property 13)
    - **Property 13: Observation structure invariant**
    - **Validates: Requirements 8.1, 8.2**
    - Use Hypothesis to generate random `description` and `confidence` values; call `write_observation`; assert each stored observation contains `description`, `detectedDate`, and `confidence`

  - [ ]* 8.4 Write property test for observation count cap (Property 14)
    - **Property 14: Observation count cap at 20**
    - **Validates: Requirements 8.4, 8.5**
    - Use Hypothesis to generate sequences of more than 20 observation writes; assert stored count never exceeds 20 and the oldest entry is replaced

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Run backend tests with `pytest backend/` and frontend tests with `npm test -- --run` in `frontend/`; ensure all pass; ask the user if questions arise.

## Infrastructure Notes (Manual — Not in This Repo)

The following changes must be made outside this codebase, directly in the AWS Lambda functions for `/medicine` and `/profile`:

- **POST /medicine Lambda**: validate `medicationName`, `dosage`, `frequency` (return 400 if missing); DynamoDB `PutItem` with `PK=userId SK=medicationName`; after successful write, fetch full prescription list and write to LTM (fire-and-forget). Remove any `date`/`timestamp` fields from the item.
- **GET /medicine Lambda**: DynamoDB `Query` by `userId`; return `{ data: [...prescriptions] }` with new fields.
- **DELETE /medicine Lambda**: DynamoDB `DeleteItem` by `(userId, medicationName)`; fetch updated list; write to LTM (fire-and-forget); return 200.
- **POST /profile Lambda**: after existing DynamoDB write, build LTM payload with only `diabetesType`, `age`, `weight`, `height`, `targetGlucoseRange`, `preferredUnits`; write to LTM (fire-and-forget); log on failure.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** (JS) for frontend and **Hypothesis** (Python) for backend
- Each property test references the design document property number for traceability
- LTM writes are always fire-and-forget — DynamoDB is the source of truth
- `bedrock-agentcore` is already present in `backend/requirements.txt`; no new dependencies needed
