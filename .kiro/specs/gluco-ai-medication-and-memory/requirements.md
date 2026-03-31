# Requirements Document

## Introduction

This spec covers two related changes to GlucoAI:

1. **Medication Feature Redesign** — Replace the current daily medication intake log with a prescription-based model. Each medication is stored as a single ongoing record per user (name, dosage, frequency, time-of-day), with no date field. The DynamoDB schema changes accordingly.

2. **AgentCore Long-Term Memory (LTM) Integration** — The Strands agent running on AgentCore Runtime gains persistent memory. On session start, the agent loads user profile and current prescriptions from LTM. Profile and medication saves trigger LTM writes. The agent can write back observations (e.g., detected glucose patterns) to LTM during conversations. Daily intake events (food, glucose readings) are never stored in LTM — only in DynamoDB.

## Glossary

- **Agent**: The Strands-based AI assistant running on AWS AgentCore Runtime (BedrockAgentCoreApp).
- **AgentCore_Memory**: The AWS AgentCore Memory service accessed via the `bedrock-agentcore` SDK, configured in `eu-central-1`.
- **LTM**: Long-Term Memory — the persistent memory tier within AgentCore_Memory (STM_AND_LTM mode).
- **STM**: Short-Term Memory — the session-scoped memory tier within AgentCore_Memory (STM_ONLY mode).
- **Prescription**: An ongoing medication record containing name, dosage, frequency, and time(s) of day. Has no date field and persists until the user removes it.
- **Prescription_Store**: The DynamoDB table that stores one Prescription record per medication per user.
- **Profile**: The user's health profile containing diabetes type, age, weight, height, target glucose range, and preferred units.
- **Profile_Store**: The DynamoDB table that stores the user's Profile record.
- **Daily_Store**: The DynamoDB tables that store time-series records: glucose readings, food entries. These are never written to LTM.
- **Frontend**: The React + Vite + Tailwind application authenticated via AWS Amplify/Cognito.
- **API**: The AWS API Gateway + Lambda layer between Frontend and backend data stores.
- **Session**: A single continuous interaction between a user and the Agent, identified by a `sessionId`.
- **Observation**: An agent-generated insight about a user's glucose patterns (e.g., "post-meal spikes typically +40 mg/dL"), written to LTM by the Agent.

---

## Requirements

### Requirement 1: Prescription Data Model

**User Story:** As a diabetic patient, I want to record my medications as ongoing prescriptions, so that the app reflects my actual treatment plan rather than a daily event log.

#### Acceptance Criteria

1. THE Prescription SHALL contain exactly the following fields: `medicationName` (string), `dosage` (string), `frequency` (enum: `once_daily` | `twice_daily` | `three_times_daily` | `as_needed`), and `timesOfDay` (array of enum values: `morning` | `evening` | `with_meals`).
2. THE Prescription SHALL NOT contain a `date` field or any timestamp representing when the medication was taken.
3. THE Prescription_Store SHALL store at most one active Prescription per `(userId, medicationName)` composite key.
4. WHEN a user saves a Prescription with the same `medicationName` as an existing record, THE Prescription_Store SHALL overwrite the existing record rather than create a duplicate.
5. THE Prescription_Store SHALL retain a Prescription record until the user explicitly deletes it.

---

### Requirement 2: Medication Form Redesign

**User Story:** As a diabetic patient, I want a medication form that captures my prescription details, so that I can manage my ongoing treatment schedule without logging daily intake events.

#### Acceptance Criteria

1. THE Frontend SHALL present a medication form with input fields for: medication name, dosage, frequency (dropdown), and time(s) of day (multi-select: morning, evening, with meals).
2. THE Frontend SHALL NOT present a date input or time-of-day clock input on the medication form.
3. WHEN a user submits the medication form with all required fields populated, THE Frontend SHALL send a `POST` request to the `API` `/medicine` endpoint with the Prescription payload.
4. IF a required field (name, dosage, frequency) is empty when the user submits the form, THEN THE Frontend SHALL display a validation message and SHALL NOT submit the request.
5. WHEN the API returns a success response, THE Frontend SHALL add the new Prescription to the displayed medication list without requiring a page reload.
6. WHEN a user clicks delete on a Prescription in the list, THE Frontend SHALL send a `DELETE` request to the `API` `/medicine` endpoint and remove the entry from the displayed list upon success.
7. THE Frontend SHALL display each Prescription in the medication list showing: medication name, dosage, frequency label, and time(s) of day.

---

### Requirement 3: Prescription API and Storage

**User Story:** As a system operator, I want the medication API to persist prescriptions as single records per user, so that the data model accurately represents ongoing treatment rather than daily events.

#### Acceptance Criteria

1. WHEN the `API` receives a `POST /medicine` request with a valid Prescription payload, THE API SHALL write the record to Prescription_Store using `(userId, medicationName)` as the composite key.
2. WHEN the `API` receives a `GET /medicine` request, THE API SHALL return all active Prescriptions for the authenticated user.
3. WHEN the `API` receives a `DELETE /medicine` request with a `medicationName` parameter, THE API SHALL remove the matching Prescription from Prescription_Store.
4. IF the `POST /medicine` request payload is missing `medicationName`, `dosage`, or `frequency`, THEN THE API SHALL return HTTP 400 with a descriptive error message.
5. THE API SHALL NOT store `date`, `timestamp`, or intake-event fields on Prescription records.

---

### Requirement 4: AgentCore Memory Configuration

**User Story:** As a system operator, I want the AgentCore agent configured with memory support, so that user context persists across sessions.

#### Acceptance Criteria

1. THE Agent SHALL be configured with `memory.mode` set to `STM_ONLY` as the initial stable configuration.
2. WHERE the `STM_ONLY` configuration is stable and validated, THE Agent SHALL support migration to `STM_AND_LTM` mode by updating the `memory.mode` and `memory_id` fields in `.bedrock_agentcore.yaml`.
3. THE Agent SHALL use a named AgentCore_Memory resource identified by `memory_name` in the configuration.
4. THE Agent SHALL be deployed in `eu-central-1` region for all memory operations.

---

### Requirement 5: Session Context Loading

**User Story:** As a diabetic patient, I want the AI agent to know my profile and medications at the start of every conversation, so that I don't have to re-explain my health context each time.

#### Acceptance Criteria

1. WHEN a new Session starts, THE Agent SHALL retrieve the user's Profile from LTM before processing the first user message.
2. WHEN a new Session starts, THE Agent SHALL retrieve the user's active Prescription list from LTM before processing the first user message.
3. WHEN a new Session starts, THE Agent SHALL retrieve any stored Observations from LTM before processing the first user message.
4. WHEN LTM contains no stored context for a user, THE Agent SHALL proceed without context and SHALL NOT return an error to the user.
5. THE Agent SHALL incorporate retrieved Profile, Prescription list, and Observations into its system prompt or context window for the duration of the Session.
6. IF the LTM retrieval call fails, THEN THE Agent SHALL log the error and continue the Session without memory context rather than failing the Session.

---

### Requirement 6: Profile Save Triggers LTM Write

**User Story:** As a diabetic patient, I want my health profile automatically stored in AI memory when I save it, so that the agent always has up-to-date context about me.

#### Acceptance Criteria

1. WHEN a user saves their Profile via the Frontend, THE Frontend SHALL send the profile data to the `API` `/profile` endpoint.
2. WHEN the `API` successfully writes the Profile to Profile_Store, THE API SHALL also write the Profile to AgentCore_Memory LTM under the user's memory namespace.
3. THE LTM Profile record SHALL contain: `diabetesType`, `age`, `weight`, `height`, `targetGlucoseRange`, and `preferredUnits`.
4. THE LTM Profile record SHALL NOT contain PII fields beyond what is listed in criterion 3 (e.g., no full name, no email).
5. IF the LTM write fails after a successful DynamoDB write, THEN THE API SHALL log the LTM error and return success to the Frontend — the DynamoDB write is authoritative.
6. WHEN a user saves their Profile a second time, THE API SHALL overwrite the existing LTM Profile record rather than append a new one.

---

### Requirement 7: Medication Save Triggers LTM Write

**User Story:** As a diabetic patient, I want my prescription list automatically stored in AI memory when I add or remove a medication, so that the agent always knows my current treatment plan.

#### Acceptance Criteria

1. WHEN the `API` successfully writes a new Prescription to Prescription_Store, THE API SHALL also write the updated full Prescription list for that user to AgentCore_Memory LTM.
2. WHEN the `API` successfully deletes a Prescription from Prescription_Store, THE API SHALL also update the LTM Prescription list to reflect the removal.
3. THE LTM Prescription record SHALL contain: `medicationName`, `dosage`, `frequency`, and `timesOfDay`.
4. THE LTM Prescription record SHALL NOT contain `date`, `timestamp`, intake counts, or any daily event data.
5. IF the LTM write fails after a successful DynamoDB write, THEN THE API SHALL log the LTM error and return success to the Frontend — the DynamoDB write is authoritative.

---

### Requirement 8: Agent Observation Writing

**User Story:** As a diabetic patient, I want the AI agent to remember patterns it detects in my glucose data, so that future conversations benefit from accumulated insights.

#### Acceptance Criteria

1. WHEN the Agent detects a recurring glucose pattern during a conversation (e.g., post-meal spikes, nocturnal lows), THE Agent SHALL write an Observation to AgentCore_Memory LTM.
2. THE Observation SHALL contain: a plain-language description of the pattern, the date the pattern was detected, and a confidence indicator (low / medium / high).
3. THE Agent SHALL NOT write daily glucose readings, food entries, or medication intake events as Observations to LTM.
4. WHEN the Agent writes an Observation that describes the same pattern as an existing Observation, THE Agent SHALL update the existing Observation rather than append a duplicate.
5. THE Agent SHALL limit the total number of stored Observations per user to 20, replacing the oldest Observation when the limit is reached.

---

### Requirement 9: LTM / DynamoDB Separation of Concerns

**User Story:** As a system operator, I want a clear boundary between what goes to LTM and what stays in DynamoDB, so that the memory system is not polluted with high-frequency time-series data.

#### Acceptance Criteria

1. THE Agent SHALL write to LTM only the following data types: Profile, Prescription list, and Observations.
2. THE Agent SHALL NOT write glucose readings, food entries, or medication intake events to LTM.
3. THE Daily_Store SHALL remain the authoritative source for all time-series data (glucose, food).
4. THE Prescription_Store SHALL remain the authoritative source for Prescription records; LTM is a read-optimised cache for agent context.
5. WHEN LTM data and Prescription_Store data differ, THE API SHALL treat Prescription_Store as the source of truth and overwrite LTM on the next save operation.
