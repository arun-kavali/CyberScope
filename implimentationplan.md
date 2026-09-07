# CyberScope — Complete Implementation Plan

## From Security Evidence to Actionable Insight

Version: 1.0
Implementation Phases: 24
Primary Product Specification: `spec.md`
Supporting Documents: `prd.md`, `design.md`
Development Environment: Local-first / Offline-capable
Primary Database: Native local PostgreSQL
Local AI: Ollama
Frontend: React + TypeScript + Vite
Backend: Python + FastAPI
Realtime: FastAPI WebSocket / local event transport
Background Processing: APScheduler and/or local worker processes
Version Control: Git + GitHub

---

# 0. IMPLEMENTATION GOVERNANCE

This document is the implementation roadmap for CyberScope.

The implementation agent must treat:

1. `spec.md` as the authoritative product specification.
2. `prd.md` as supporting product requirements.
3. `design.md` as the authoritative UI/UX direction.
4. This `implementationplan.md` as the implementation sequence.

If there is a conflict:

`spec.md` > `prd.md` > `design.md` > implementation assumptions.

Do not invent product capabilities that are not specified.

Do not remove specified capabilities merely because they are difficult.

Do not replace required functionality with mock UI when the corresponding backend behavior is required.

Mocks/stubs may only be used temporarily during development and must be replaced before the final definition of done.

---

# 1. PRODUCT IDENTITY

Product:

CyberScope

Tagline:

"From Security Evidence to Actionable Insight"

Product description:

CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security data into prioritized, explainable insights for SOC analysts.

Core operational transformation:

RAW SECURITY DATA
        ↓
UNDERSTAND
        ↓
ENRICH
        ↓
SCORE
        ↓
CORRELATE
        ↓
EXPLAIN
        ↓
INVESTIGATE
        ↓
RESPOND
        ↓
AUDIT

Analytical transformation:

SOC / SECURITY EVIDENCE
        ↓
EXECUTION GAPS
+
NEGATIVE SPACE
+
ANOMALIES
+
PEER DEVIATIONS
        ↓
EXPLAINABLE RISK
        ↓
REVIEW PRIORITY
        ↓
EVIDENCE-BACKED FINDING

---

# 2. NON-NEGOTIABLE IMPLEMENTATION RULES

## 2.1 Exactly two application roles

The application must contain exactly:

- `SOC_ANALYST`
- `ALERT_SOURCE`

Do not create additional application roles.

## 2.2 SOC Analyst capabilities

SOC Analyst must be able to:

- Login
- Logout
- View SOC dashboard
- View live alerts
- Search alerts
- Filter alerts
- Open alert details
- View alert analysis
- View risk score
- View confidence score
- View estimated false-positive likelihood
- View affected users
- View affected assets
- View related alerts
- View correlated incidents
- Start investigations
- View incident timelines
- View AI-generated intelligence
- Add analyst notes
- View operational analytics
- View execution-gap findings
- View negative-space findings
- View peer benchmark results
- View review priorities
- Generate reports
- Approve controlled response actions
- Reject controlled response actions
- Execute sandbox response actions
- Roll back supported sandbox actions
- Resolve incidents
- View audit records relevant to their actions

## 2.3 Alert Source capabilities

Alert Source must be able to:

- Login
- Logout
- Access Alert Source interface
- Select scenarios
- Generate synthetic alerts
- Generate multi-alert sequences
- Generate high-volume bursts
- Generate repeated events
- Generate benign/false-positive events
- Choose custom severity
- Submit individual alerts
- Submit batches
- View submission success/failure
- View submission history

Alert Source must NOT be able to:

- Access SOC Analyst dashboard
- Investigate incidents
- Modify risk
- Modify analysis
- Execute response actions
- Resolve incidents
- View analyst notes
- View internal investigation intelligence
- View unrelated audit records

Authorization must be enforced server-side.

Hiding UI elements is not sufficient authorization.

---

# PHASE 1 — PROJECT FOUNDATION

## Objectives

Create the complete maintainable repository and development foundation.

## Required structure

```text
cyberscope/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── ingestion/
│   │   ├── analytics/
│   │   ├── correlation/
│   │   ├── risk/
│   │   ├── ai/
│   │   ├── response/
│   │   ├── audit/
│   │   └── main.py
│   ├── requirements.txt
│   └── alembic.ini
│
├── ml/
│   ├── models/
│   ├── features/
│   ├── training/
│   └── inference/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
│
├── data/
│   ├── alerts/
│   ├── cases/
│   ├── investigations/
│   ├── entities/
│   └── assets/
│
├── ollama/
│   └── model-setup/
│
├── tests/
│   ├── backend/
│   ├── frontend/
│   ├── integration/
│   └── e2e/
│
├── docs/
├── scripts/
│
├── docker/
│
├── .env.example
├── .gitignore
├── README.md
├── spec.md
├── prd.md
├── design.md
└── implementationplan.md
Technology foundation

Frontend:

React
TypeScript
Vite
Tailwind CSS
shadcn/ui or equivalent local component system
React Router
TanStack Query
Recharts or ECharts

Backend:

Python
FastAPI
Pydantic
Uvicorn
SQLAlchemy
Alembic
PostgreSQL driver

Analytics/ML:

pandas and/or Polars
NumPy
SciPy
scikit-learn

AI:

Ollama
Local LLM

Background processing:

APScheduler and/or local workers

Testing:

Pytest
Vitest
React Testing Library
Playwright

Security:

Bandit
pip-audit
npm audit
ESLint
Ruff
Environment

Development must support:

Frontend: http://localhost:5173
Backend:  http://localhost:8000
Database: localhost:5432
Ollama:   localhost:11434

The application must not require internet access during normal runtime.

PHASE 2 — LOCAL DATABASE AND BACKEND FOUNDATION
Database

Use native local PostgreSQL as the primary CyberScope database.

Do not make Supabase Cloud the primary database.

Do not hard-code cloud database dependency.

Supabase remains an optional external connector in the Data Source Center.

Environment variables

Create .env.example containing appropriate variables such as:

APP_ENV=development
DATABASE_MODE=local
DATABASE_URL=postgresql://postgres:<PASSWORD>@localhost:5432/cyberscope
LLM_MODE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=<configured-local-model>
REALTIME_MODE=local
OFFLINE_MODE=true
EXTERNAL_APIS=false
SECRET_KEY=<development-secret>

Never commit actual secrets.

.env must be ignored by Git.

Backend

Create:

FastAPI application
API router structure
configuration management
database session management
SQLAlchemy engine
health endpoint
database connectivity check
error handling
logging configuration
CORS for local frontend
startup/shutdown handling

Required basic endpoints:

GET /health
GET /api/test/database

Expected database test behavior:

{
  "database": "connected",
  "status": "healthy"
}
PHASE 3 — DATABASE SCHEMA AND MIGRATIONS

Implement database migrations with Alembic.

The logical entities must cover all required domains.

Identity
profiles
roles
Sources
alert_sources
data_sources
data_source_connections
data_source_schemas
data_source_mappings
Security evidence
events
alerts
cases
investigations
escalations
dispositions
assets
users_directory
Intelligence
alert_analysis
risk_scores
anomaly_scores
correlation_results
threat_indicators
incidents
incident_alerts
incident_timeline
Analytics
execution_gap_findings
negative_space_findings
peer_benchmarks
capability_scores
review_priorities
operational_findings
evidence
Response
detection_rules
response_policies
response_actions
sandbox_users
sandbox_endpoints
sandbox_firewall_rules
Audit/report
audit_logs
reports
Requirements

Use:

primary keys
foreign keys
timestamps
indexes
uniqueness constraints where required
appropriate status fields
JSON/JSONB where flexible evidence payloads are required
referential integrity

Important indexes must exist for frequently searched fields.

Do not retrieve entire large datasets into the frontend.

PHASE 4 — AUTHENTICATION, SESSION MANAGEMENT AND RBAC

Implement secure authentication.

Required:

password authentication
secure password hashing
login
logout
session/token management
authentication persistence
protected routes
role-aware navigation
server-side authorization
expired session handling
unauthorized handling

Required endpoints:

POST /auth/login
POST /auth/logout
GET  /auth/me
Login behavior

Successful login:

Login
 ↓
Credentials verified
 ↓
Session created
 ↓
Role loaded
 ↓
Role-specific application

Invalid login must return a sanitized error.

Do not leak whether a username exists unnecessarily.

RBAC

Every protected backend endpoint must verify:

authenticated user
required role
permitted action

Never rely solely on frontend route protection.

Seed accounts

Create development/demo accounts for:

SOC Analyst
Alert Source

Credentials must be documented safely for local development without hard-coding production secrets.

PHASE 5 — GLOBAL UI FOUNDATION AND APPLICATION SHELL

Implement the complete visual system from design.md.

Visual direction

The application must be:

light theme
green and white
enterprise SOC style
professional
high density
clean
accessible
responsive
easy to scan

Do NOT use:

dark theme
neon cyberpunk styling
hacker imagery
unnecessary 3D graphics
decorative animations
unrelated visual effects
Global shell

Implement:

application header
sidebar
navigation
user/session area
breadcrumbs where needed
page titles
consistent cards
tables
badges
filters
dialogs
drawers
loading states
empty states
error states
confirmation dialogs
pagination
responsive behavior
Navigation

SOC Analyst:

Dashboard
Alerts
Incidents
Investigations
Data Sources
Analytics
Findings
Review Priorities
Response
Reports
Audit Trail

Alert Source:

Submit Alert
Scenario Generator
Submission History

Do not expose unrelated analyst navigation to Alert Source.

PHASE 6 — ALERT SOURCE AND SYNTHETIC SCENARIO GENERATOR

Implement the Alert Source application.

Authentication scenarios

Support:

Brute Force
Credential Stuffing
Impossible Travel
Suspicious Login
Privileged Login
MFA Abuse
Endpoint scenarios

Support:

Malware Detection
Suspicious PowerShell
Suspicious Process
Ransomware Behavior
Privilege Escalation
Network scenarios

Support:

Port Scan
Command-and-Control Activity
Data Exfiltration
Suspicious DNS
Unusual Network Connection
Database scenarios

Support:

Unusual Query
Bulk Data Read
Privilege Abuse
Suspicious Database Login
Email scenarios

Support:

Phishing
Malicious Attachment
Suspicious Link
Generation modes

Support:

Single alert
Multi-alert sequence
High-volume burst
Repeated events
Benign/false-positive scenario
Custom severity
Synthetic timestamps
Required behavior

Generated data must use the common alert schema.

Scenario generation must submit through the same ingestion pipeline used by external-style alert submission.

Do not bypass validation and normalization simply because data is synthetic.

PHASE 7 — ALERT INGESTION, VALIDATION AND NORMALIZATION

Implement the complete ingestion pipeline.

Alert Source / External Source
        ↓
Ingestion API
        ↓
Authentication / Source Validation
        ↓
Schema Validation
        ↓
Data Quality Validation
        ↓
Normalization
        ↓
Storage
        ↓
Realtime Event
        ↓
Analysis
Required endpoint
POST /alerts
Common alert schema

Implement fields including:

id
source_id
event_type
event_category
severity
timestamp
user_id
user_name
asset_id
asset_name
source_ip
destination_ip
source_port
destination_port
protocol
action
status
description
indicator
technique
raw_payload
metadata
created_at
Validation

Validate:

required fields
severity values
timestamps
IDs
IP addresses where applicable
ports
event categories
payload structure

Malformed alerts must fail safely.

Original valid alerts must remain stored even if downstream analysis fails.

PHASE 8 — REALTIME ALERT PIPELINE

Implement local realtime event transport using FastAPI WebSockets.

Architecture:

PostgreSQL state change
        ↓
Backend event publisher
        ↓
Local realtime transport
        ↓
WebSocket
        ↓
React Query/UI update

Realtime events must support:

new alert
analysis completion
risk update
incident creation
incident update
finding creation
response action
incident resolution
Requirements

New alerts must appear without manual browser refresh.

Implement:

connection handling
reconnect behavior
event validation
subscription management
frontend cache invalidation/update
graceful failure if realtime is unavailable

Realtime failure must not prevent core database operations.

PHASE 9 — AUTOMATIC TRIAGE, DETECTION RULES AND CONTEXT ENRICHMENT

Implement the automatic triage pipeline.

Validation
 ↓
Normalization
 ↓
Context Enrichment
 ↓
Rules
 ↓
Anomaly Analysis
 ↓
Correlation
 ↓
Risk
 ↓
Confidence
 ↓
Estimated FP Likelihood
 ↓
Priority
Detection rules

Implement versioned rule definitions.

Initial rule patterns include:

repeated failed logins
successful login after repeated failures
impossible travel
privileged login
suspicious process
bulk database extraction
suspicious DNS behavior
other scenario-specific patterns required by the specification

Each rule result must identify the rule/version that generated the finding.

Context enrichment

Use available information such as:

asset criticality
user privilege
source classification
historical activity
previous incidents
indicators
peer statistics

Enrichment must be optional.

If enrichment data is unavailable, the pipeline must continue.

PHASE 10 — RISK, CONFIDENCE AND FALSE-POSITIVE LIKELIHOOD

These three concepts must remain separate.

Risk score

Range:

0–100

Risk must be based on normalized contributions such as:

severity
suspicious behavior
indicators
affected asset criticality
user privilege
rule evidence
anomaly signal
correlation
contextual factors

Risk is a prioritization signal.

Risk is NOT proof of compromise.

Confidence score

Range:

0–100

Confidence represents confidence in the analytical assessment.

Confidence must not simply duplicate risk.

Estimated false-positive likelihood

Provide:

0–100%

or an equivalent normalized representation.

Always use neutral wording:

"Estimated False-Positive Likelihood"

Never claim certainty.

Required outputs

For each analyzed alert:

risk score
confidence score
estimated FP likelihood
risk contributors
analytical reasons
related activity
recommended analyst attention
PHASE 11 — ML AND ANOMALY ANALYSIS

Implement statistical and ML analysis where appropriate.

Supported analytical techniques include:

statistical baselines
Z-score
Isolation Forest
Local Outlier Factor
clustering
frequency analysis
time-window analysis
peer deviation analysis
correlation scoring

Do not claim arbitrary accuracy.

Anomaly outputs

Each anomaly must expose:

metric
baseline
observed value
deviation
interpretation

Anomaly analysis must support:

unusual alert volume
unusual closure rate
unusual closure duration
unusual investigation duration
unusual escalation behavior
repeated alerts without remediation evidence
sudden activity changes
peer inconsistency

ML failure must not break ingestion.

PHASE 12 — CORRELATION ENGINE AND INCIDENT CREATION

Implement correlation between related alerts/events.

Correlation signals may include:

same user
same asset
same source IP
same destination
same hostname
same indicator
same event category
same technique
time proximity
sequence relationships

The system must explain why records were grouped.

Incident creation

When correlation meets configured conditions:

Related Alerts
     ↓
Correlation
     ↓
Incident

Incident must contain appropriate:

ID
title
severity
risk
confidence
status
start time
end time where applicable
affected entities
summary
evidence references

Incident states:

OPEN
IN_PROGRESS
RESOLVED
Required endpoints
GET  /incidents
GET  /incidents/{id}
POST /incidents/{id}/start-investigation
POST /incidents/{id}/resolve
PHASE 13 — INCIDENT TIMELINE AND INVESTIGATION WORKSPACE

Implement incident timeline.

Required endpoint:

GET /incidents/{id}/timeline

Timeline must be chronological.

Each timeline item must link back to underlying alert/event/evidence.

Investigation

Implement:

POST /incidents/{id}/start-investigation

Investigation workspace must show:

incident summary
title
risk
confidence
severity
status
what happened
why suspicious
potential impact
affected users
affected assets
services
data
business operations
evidence
related incidents
rule signals
ML signals
recommendations
response recommendations
Analyst notes

Implement:

POST /incidents/{id}/notes

Notes must be associated with the authenticated SOC Analyst.

Alert Source cannot see analyst notes.

PHASE 14 — LOCAL LLM / OLLAMA INTELLIGENCE

Install and configure Ollama for local development.

The application must not require OpenAI, Gemini, Claude, or another hosted AI service.

Architecture:

Structured Security Evidence
        ↓
Prompt Builder
        ↓
Ollama
        ↓
Local LLM
        ↓
Structured Explanation
        ↓
CyberScope UI
AI capabilities

Implement:

alert explanation
incident summary
investigation narrative
potential impact
recommended investigation steps
recommended response
finding explanation
report text
Evidence-grounded prompt

Prompt context must include relevant:

alert metadata
related events
risk contributors
anomaly signals
correlation evidence
user context
asset context
timeline

The prompt must explicitly instruct the model:

use only supplied evidence
do not invent evidence
state uncertainty
distinguish evidence from inference
do not claim certainty without evidence
do not execute commands
do not directly control infrastructure
do not assign arbitrary irreversible actions
AI processing states
PENDING
PROCESSING
COMPLETED
FAILED
AI failure behavior

If Ollama is unavailable:

Alert
 ↓
Stored
 ↓
Rules run
 ↓
ML runs
 ↓
Risk generated
 ↓
AI = FAILED/PENDING

The alert must remain usable.

AI must never be a single point of failure.

PHASE 15 — SOC ANALYST DASHBOARD

Implement the primary SOC dashboard.

Top metrics

Display:

Live Alerts
Critical Alerts
High-Risk Alerts
Active Incidents
Open Investigations
Execution-Gap Findings
Negative-Space Findings
Review Priorities
Dashboard components

Implement:

live alert stream
recent critical alerts
incident queue
risk distribution
severity distribution
alert-source distribution
alerts by category
recent incident activity
latest findings
top review priorities
investigation-duration trend
escalation trend
closure trend
peer deviation summary
data-quality status
Realtime

Dashboard updates automatically.

Do not require manual refresh.

Performance

Use:

server-side pagination
indexed database queries
aggregation endpoints
incremental updates
TanStack Query caching
realtime events

Never load all alerts into the browser.

PHASE 16 — ALERT MONITORING AND ALERT DETAIL UI

Implement:

Alert list

Search/filter by:

Alert ID
Incident ID
Case ID
user
asset
source IP
event type
source
severity
risk
finding ID
time range
status
finding type

Support:

server-side pagination
sorting where appropriate
filter combinations
loading states
empty states
errors
Alert detail

Display:

alert identity
source
timestamp
severity
status
event category
event type
affected user
affected asset
source IP
destination IP
action
indicator
technique
description
normalized fields
raw payload where appropriate
risk
confidence
estimated FP likelihood
reasons
rules
ML/anomaly signals
related alerts
incident
AI intelligence
evidence traceability

Required:

GET /alerts
GET /alerts/{id}
GET /alerts/{id}/analysis
POST /alerts/{id}/reanalyze
POST /analysis/alert/{id}
PHASE 17 — OPERATIONAL EVIDENCE ANALYTICS

Implement analytics over:

alerts
cases
investigations
escalations
dispositions
closure records
asset inventory
event data

Analytics workflow:

Dataset Imported
        ↓
Data Quality Checks
        ↓
Normalization
        ↓
Execution Gap Analysis
        ↓
Negative Space Analysis
        ↓
Anomaly Analysis
        ↓
Peer Benchmarking
        ↓
Risk Indicators
        ↓
Review Priorities
        ↓
Evidence-Backed Findings

Required endpoint:

POST /analytics/run

Analytics must operate on structured evidence.

PHASE 18 — EXECUTION GAPS, NEGATIVE SPACE AND ANOMALIES
Execution Gap Detection

Identify cases where expected/documented security capability appears stronger than observed evidence.

Required signal types:

Unusually fast closure
Critical Alert
 ↓
Closed unusually quickly
 ↓
Limited investigation evidence
 ↓
Potential Execution Gap
Missing escalation
Critical Event
 ↓
Investigation exists
 ↓
Expected escalation missing
 ↓
Potential Execution Gap
Repetitive investigations
Large case set
 ↓
Highly similar investigation patterns
 ↓
Little case-specific evidence
 ↓
Potential Execution Gap

Every execution-gap finding must contain:

finding type
severity
reason
evidence
supporting records
relevant thresholds
peer context where available
Negative Space

Look for expected evidence that is missing or unexpectedly low.

Examples:

critical asset has little security activity
expected alert category absent
expected investigation records missing
expected escalation records missing
monitoring coverage appears incomplete
activity unusually low compared with peers

Every negative-space finding must be presented as a potential indicator.

Never automatically label it compromise.

Example wording:

"Unexpectedly low security activity for a critical asset compared with comparable environments. Possible monitoring coverage gap requiring review."

Anomaly analytics

Support:

alert volume
closure rate
closure duration
investigation duration
escalation behavior
repeated alerts
sudden changes
peer inconsistency

Every anomaly must display:

metric
baseline
observed value
deviation
interpretation
PHASE 19 — PEER BENCHMARKING, RISK INDICATORS AND REVIEW PRIORITIES
Peer Benchmarking

Compare comparable entities/environments.

Metrics may include:

alert volume
critical alert ratio
investigation duration
escalation frequency
closure duration
reopened cases
repeated alerts
coverage activity
evidence completeness

Peer result:

Entity
Peer Group
Metric
Entity Value
Peer Median
Deviation
Interpretation

Use normalized metrics when entity sizes differ.

Supervisory / Operational Risk Indicator

Generate explainable risk indicators from multiple analytical findings.

Range:

0–100

Each contributor must link to evidence.

Example structure:

Entity Risk: 87/100

Contributors:
+22 Critical alerts without escalation
+18 Investigation evidence deficiency
+14 Repeated unresolved asset activity
+12 Peer deviation
+11 Monitoring coverage concern
+10 Closure-time anomaly

This is a prioritization tool.

It is NOT a declaration of compromise or organizational failure.

Review Priorities

Rank:

entities
security processes
controls
alerts
cases
investigations
findings

Every priority must allow drill-down to evidence.

Required endpoint:

GET /analytics/review-priorities
PHASE 20 — EVIDENCE-BACKED FINDINGS AND TRACEABILITY

Every important finding must include:

finding ID
entity
finding type
severity
risk score
title
summary
reason
evidence
supporting records
analytical signals
peer context
rule/model information
created timestamp
Traceability

Support:

Finding
 ↓
Case / Incident
 ↓
Investigation
 ↓
Alert / Event
 ↓
Normalized Evidence

The user must be able to navigate through this chain.

Findings APIs

Implement:

GET /analytics/findings
GET /analytics/execution-gaps
GET /analytics/negative-space
GET /analytics/peer-benchmarks
GET /analytics/review-priorities

Do not display findings without supporting evidence when evidence is required.

PHASE 21 — DATA SOURCE CENTER AND IMPORT PIPELINE

Implement the SOC Analyst Data Source Center.

Supported sources:

CSV
JSON
XLS
XLSX
PostgreSQL
MongoDB
MySQL
Supabase
REST API
Initial implementation

At minimum fully implement:

CSV
JSON
XLS
XLSX
PostgreSQL

Architecture must support:

MongoDB
MySQL
Supabase
REST API
Import flow
Upload / Connect
      ↓
Schema Discovery
      ↓
Field Mapping
      ↓
Validation
      ↓
Normalization
      ↓
Storage
      ↓
Analytics
Required APIs
POST /sources/csv
POST /sources/json
POST /sources/database
POST /sources/validate
POST /sources/map-schema
POST /sources/import
Schema discovery

Show:

source fields
inferred types
sample values
required fields
mapping status
Mapping

Allow source fields to map to normalized CyberScope fields.

Validation

Detect:

missing timestamps
missing severity
missing entities
missing case IDs
missing investigation data
invalid values
duplicate records
invalid time order
orphan records
unexpected categories
Security

Database credentials:

never unnecessarily exposed to frontend
handled by trusted backend
never logged
never stored in Git
sanitized in error messages

Connector failure must not crash CyberScope.

PHASE 22 — RESPONSE ENGINE, POLICIES, SANDBOX AND AUDIT

Implement controlled response only.

Supported response actions
Block IP
Disable user
Terminate session
Isolate endpoint
Quarantine artifact
Investigate further

Do not provide free-form AI commands.

Response policy

Policies contain:

policy_id
name
conditions
action
enabled
requires_approval
created_at
updated_at

Example policy:

risk >= 90
AND confidence >= 85
AND malicious_indicator = true

→ recommend BLOCK_IP

Important actions should require analyst approval.

High-impact actions default to approval.

Response workflow
Finding / Alert
      ↓
Recommendation
      ↓
Policy Evaluation
      ↓
Approval Required?
      ↓
Analyst Approval
      ↓
Sandbox Action
      ↓
Audit
Required endpoints
GET  /response/policies
POST /response/actions
POST /response/actions/{id}/approve
POST /response/actions/{id}/reject
POST /response/actions/{id}/rollback
Sandbox

Use only simulated controlled state.

Required examples:

USR-4821 ACTIVE
        ↓
BLOCKED
EP-0017 CONNECTED
        ↓
ISOLATED
185.x.x.x
        ↓
BLOCKED

All supported sandbox actions must be reversible.

Never claim real infrastructure control when using simulation.

Audit

Audit fields:

audit_id
actor_user_id
role
action
target_type
target_id
reason
previous_state
new_state
metadata
timestamp

Audit events include:

login
logout
alert submission
analysis
incident creation
investigation
finding
recommendation
approval
rejection
execution
rollback
resolution
dataset import
data source configuration
rule updates

Normal users must not silently modify audit history.

PHASE 23 — REPORTS, QUALITY, SECURITY, PERFORMANCE AND TESTING
Reports

Implement:

POST /reports/generate
GET /reports
GET /reports/{id}

Supported formats:

PDF
CSV
JSON

Reports should contain:

executive summary
findings
incidents
risk indicators
detailed findings
execution gaps
negative space
peer deviations
anomalies
evidence
recommendations
audit information
dataset version
rule version
model version
prompt version
generation timestamp
Data quality reporting

Show:

records processed
invalid records
duplicate records
missing fields
orphan records
unexpected categories
normalization errors
Testing
Backend

Use Pytest for:

authentication
authorization
alert validation
normalization
database operations
rules
risk
confidence
FP likelihood
correlation
incidents
investigations
analytics
response policies
sandbox
audit
report generation
Frontend

Use Vitest and React Testing Library for:

routing
role-aware navigation
tables
filters
alert details
incident details
analytics
response dialogs
realtime state changes
error states
End-to-end

Use Playwright for complete workflows.

Security

Run:

Bandit
pip-audit
npm audit
ESLint
Ruff

Review:

authentication
authorization
secrets
input validation
SQL injection protection
parameterized queries
XSS
CORS
sanitized errors
secure connector handling
audit integrity
least privilege
logging safety
Performance

System must support:

tens of thousands of alerts
large datasets
batch processing
indexed queries
pagination
incremental processing
background computation
realtime updates
large evidence tables

Frontend must never request entire datasets.

Use:

database indexes
pagination
filtering at backend
aggregation queries
async processing
background jobs
lazy loading where appropriate
incremental realtime updates
PHASE 24 — COMPLETE INTEGRATION, OFFLINE VALIDATION AND HACKATHON DEMO

This is the final integration phase.

No phase is considered complete merely because the UI exists.

The complete operational workflow must work end-to-end.

FINAL OPERATIONAL WORKFLOW
Alert Source Login
        ↓
Generate Scenario
        ↓
Alert Ingested
        ↓
Alert Appears in Realtime
        ↓
Normalized
        ↓
Rules + ML Analysis
        ↓
Risk + Confidence + FP Likelihood
        ↓
Correlation
        ↓
Incident Created
        ↓
Timeline Generated
        ↓
Local LLM Intelligence
        ↓
Analyst Investigation
        ↓
Response Recommendation
        ↓
Controlled Action
        ↓
Audit Record
        ↓
Incident Resolved
FINAL ANALYTICS WORKFLOW
Dataset Imported
        ↓
Data Quality Checks
        ↓
Normalization
        ↓
Execution Gap Analysis
        ↓
Negative Space Analysis
        ↓
Anomaly Analysis
        ↓
Peer Benchmarking
        ↓
Risk Indicators
        ↓
Review Priorities
        ↓
Evidence-Backed Findings
24.1 ACCOUNT TAKEOVER DEMONSTRATION

Create the complete demonstration scenario.

The demo should contain five related events representing an account takeover sequence.

Example conceptual sequence:

Repeated failed login attempts
        ↓
Suspicious login
        ↓
Impossible travel
        ↓
Privileged login
        ↓
Suspicious follow-up activity

The events must be correlated into an incident.

Expected demonstration sample from the specification:

Risk: 96
Confidence: 92

These values are demonstration/reference values only.

Do not claim they represent measured model accuracy.

The UI must clearly show:

alert sequence
risk contributors
confidence
estimated FP likelihood
correlation explanation
incident
timeline
AI explanation
investigation
response recommendation
approval
sandbox action
rollback if demonstrated
audit trail
resolution
24.2 ANALYTICS DEMONSTRATION

Prepare synthetic operational evidence demonstrating:

Critical alerts: 120
Investigated: 118
Escalated: 49
Closed: 117
Median investigation duration: 4 minutes
Peer median: 41 minutes

Use the dataset to demonstrate a potential execution gap.

Also demonstrate negative-space analytics using a critical asset such as:

DB-PROD-04

Example conceptual finding:

Expected activity: high
Observed activity: unusually low
Peer activity: higher
Interpretation:
Possible monitoring coverage gap requiring review.

Do not label this as compromise.

24.3 FAILURE TESTS

Explicitly test failure isolation.

Test 1 — Valid alert
Alert
 ↓
Accepted
 ↓
Stored
 ↓
Analyzed
 ↓
Visible
Test 2 — Related alerts
Multiple Alerts
 ↓
Correlation
 ↓
Incident
Test 3 — Malformed data
Malformed Alert
 ↓
Validation Error
Test 4 — Ollama unavailable

Expected:

Alert Stored
Rules Run
ML Runs
AI State = FAILED/PENDING

The platform must remain usable.

Test 5 — Realtime unavailable

Expected:

database remains functional
alert remains stored
manual API/UI refresh can retrieve it
realtime reconnect can resume later
Test 6 — Connector unavailable

Expected:

connector error is isolated
existing platform remains usable
credentials are not exposed
error is sanitized
Test 7 — Incident resolution

Expected:

Incident = RESOLVED
Dashboard Updates
Audit Entry Created
24.4 OFFLINE VALIDATION

After dependencies and local models are installed:

Disable internet access.

Verify CyberScope still supports:

login
dashboard
Alert Source
synthetic alerts
alert ingestion
normalization
rules
ML/statistical analysis
risk
confidence
estimated FP likelihood
correlation
incidents
investigations
timelines
local LLM
operational analytics
execution gaps
negative space
peer benchmarking
review priorities
sandbox response
rollback
audit
local reports

The runtime must not require:

OpenAI
Gemini
Claude
hosted AI
Supabase Cloud
external threat APIs
SaaS authentication
mandatory external APIs
24.5 VERSIONING AND TRACEABILITY

Track:

application version
dataset version
rule version
model version
feature version
prompt version

Important analytical results must be reproducible where practical.

Findings must identify the relevant rule/model information.

24.6 ANALYTICS VALIDATION

Analytics must be validated against expert-reviewed reference findings.

Workflow:

Expert Review
      ↓
Reference Findings
      ↓
CyberScope
      ↓
Detected Findings
      ↓
Comparison

Where appropriate measure:

precision
recall
false-positive rate
evidence coverage
ranking quality
analyst agreement

Never invent accuracy percentages.

Never state:

100% accuracy
zero false positives
guaranteed detection
guaranteed prevention
24.7 FINAL UI REVIEW

Verify all pages against design.md.

Required major interfaces:

Login
SOC Analyst Dashboard
Live Alert Monitoring
Alert Detail
Incident List
Incident Detail
Investigation Workspace
Operational Analytics
Finding Detail
Alert Source Dashboard
Data Source Center
Response Workflow
Reports
Audit Records

No unrelated application area should be added.

UI requirements

Verify:

green/white enterprise theme
no dark theme
consistent typography
consistent spacing
readable tables
severity indicators
useful cards
charts
timelines
evidence panels
accessible contrast
responsive layout
useful loading states
useful empty states
useful error states
no excessive animations
no decorative cyberpunk effects
24.8 FINAL SECURITY REVIEW

Confirm:

passwords are securely hashed
sessions are protected
RBAC is server-enforced
protected APIs require authentication
secrets are not committed
secrets are not sent unnecessarily to frontend
connector credentials are protected
SQL uses parameterized/ORM queries
user input is validated
errors are sanitized
audit records are created for important actions
sandbox actions cannot control real infrastructure
AI cannot execute arbitrary commands
AI cannot invent evidence
AI cannot independently execute irreversible actions
logs do not expose credentials
24.9 FINAL PERFORMANCE REVIEW

Verify:

alerts are paginated
findings are paginated
evidence is paginated
server-side filtering works
indexes exist
large imports are background processed where needed
analytics do not block the API unnecessarily
reports can be generated asynchronously where needed
realtime events are incremental
browser does not load entire datasets
database queries are monitored for obvious inefficiencies
24.10 FINAL DEFINITION OF DONE

CyberScope is considered complete only when:

Authentication
 SOC Analyst can login
 Alert Source can login
 Logout works
 Sessions persist correctly
 Expired sessions are handled
 Unauthorized access is rejected
 Server-side RBAC works
Alert Source
 All required scenarios exist
 Single alert generation works
 Multi-alert generation works
 Burst generation works
 Repeated events work
 Benign scenarios work
 Custom severity works
 Synthetic timestamps work
 Submission history works
Alert Pipeline
 Alert ingestion works
 Validation works
 Normalization works
 Alerts are stored
 Realtime updates work
 Analysis failure does not delete alerts
Triage
 Rules work
 Rules are versioned
 ML/statistical analysis works
 Risk works
 Confidence works
 Estimated FP likelihood works
 Context enrichment works when available
 Missing enrichment does not break pipeline
Correlation
 Related alerts are detected
 Correlation explanation exists
 Incidents are created
 Incident states work
 Timeline works
Investigation
 Investigation can start
 Investigation workspace works
 Notes work
 Evidence is visible
 Related alerts/incidents are linked
 Recommendations are visible
Local AI
 Ollama works locally
 Alert explanation works
 Incident summary works
 Investigation narrative works
 Potential impact works
 Investigation recommendations work
 Response recommendations work
 Finding explanation works
 Report text works
 AI states work
 AI failure is isolated
 AI is evidence-grounded
Operational Analytics
 Data quality works
 Execution gaps work
 Negative space works
 Anomalies work
 Peer benchmarks work
 Operational risk indicators work
 Review priorities work
 Findings are evidence-backed
 Findings are traceable
Data Source Center
 CSV works
 JSON works
 XLS works
 XLSX works
 PostgreSQL works
 MongoDB connector architecture exists
 MySQL connector architecture exists
 Supabase connector architecture exists
 REST API connector architecture exists
 Schema discovery works
 Mapping works
 Validation works
 Normalization works
 Import works
 Connector failures are isolated
Response
 Response policies work
 Recommendation workflow works
 Approval works
 Rejection works
 Sandbox IP block works
 Sandbox user disable works
 Sandbox endpoint isolation works
 Supported rollback works
 No real infrastructure is controlled
Audit
 Login/logout audited
 Alert submission audited
 Analysis audited
 Incident creation audited
 Investigation audited
 Findings audited
 Recommendations audited
 Approvals audited
 Rejections audited
 Executions audited
 Rollbacks audited
 Resolution audited
 Dataset imports audited
 Data source configuration audited
 Rule updates audited
Reports
 PDF works
 CSV works
 JSON works
 Reports contain required sections
 Version information is included
 Audit information is included
Testing
 Backend tests pass
 Frontend tests pass
 Integration tests pass
 Playwright workflows pass
 Security scans pass or findings are reviewed
 Performance checks completed
 Offline test completed
3. IMPLEMENTATION ORDER RULE

Antigravity must implement the phases sequentially.

Do not jump directly to UI polish while core backend behavior is missing.

Recommended sequence:

Phase 1
  ↓
Phase 2
  ↓
Phase 3
  ↓
Phase 4
  ↓
Phase 5
  ↓
Phase 6
  ↓
Phase 7
  ↓
Phase 8
  ↓
Phase 9
  ↓
Phase 10
  ↓
Phase 11
  ↓
Phase 12
  ↓
Phase 13
  ↓
Phase 14
  ↓
Phase 15
  ↓
Phase 16
  ↓
Phase 17
  ↓
Phase 18
  ↓
Phase 19
  ↓
Phase 20
  ↓
Phase 21
  ↓
Phase 22
  ↓
Phase 23
  ↓
Phase 24

Each phase must end with:

implementation
local verification
tests appropriate to that phase
error handling verification
regression check
documentation update where needed
Git commit

Do not mark a phase complete if only the frontend is implemented while required backend behavior is missing.

4. ANTIGRAVITY EXECUTION RULES

When implementing any phase:

Rule 1 — Read before modifying

Before changing code:

inspect existing project files
inspect spec.md
inspect relevant prd.md sections
inspect relevant design.md sections
inspect previous implementation
preserve working functionality
Rule 2 — No unnecessary rewrites

Do not rewrite the whole project for a small feature.

Modify the smallest appropriate modules.

Rule 3 — No invented features

Do not add:

unrelated dashboards
unrelated user roles
unrelated AI features
unrelated integrations
unnecessary gamification
unnecessary animations
unnecessary infrastructure controls
unrelated SaaS dependencies
Rule 4 — Backend is authoritative

Frontend must consume backend APIs.

Do not put security authorization logic only in React.

Do not expose database credentials to the browser.

Rule 5 — Evidence first

Security intelligence must be derived from available structured evidence.

Never fabricate evidence to make a finding look impressive.

Rule 6 — AI is advisory

The Local LLM:

explains
summarizes
recommends
assists investigation

The Local LLM must not:

prove an attack
invent evidence
execute shell commands
directly control infrastructure
independently execute irreversible actions
claim certainty without evidence
Rule 7 — Failure isolation

The following must fail independently:

LLM
ML analysis
realtime
background workers
database connectors
dataset imports
report generation

Core alert storage must remain available whenever optional services fail.

Rule 8 — No unsupported claims

Never claim:

100% accuracy
zero false positives
guaranteed detection
guaranteed threat prevention
guaranteed attack identification
real infrastructure control when using sandbox simulation
Rule 9 — Terminology

Use consistently:

CyberScope
SOC Analyst
Alert Source
Security Alert
Event
Incident
Investigation
Evidence
Risk Score
Confidence Score
Estimated False-Positive Likelihood
Execution Gap
Negative Space
Anomaly
Peer Benchmark
Review Priority
Evidence-Backed Finding
Local LLM
Air-Gapped
Sandbox Response
Audit Trail
Rule 10 — No fake completion

A feature is complete only when:

UI
+
API
+
Database
+
Business Logic
+
Validation
+
Authorization
+
Error Handling
+
Tests

are implemented as required.

5. REQUIRED API INVENTORY

The implementation must ultimately provide the APIs specified by the product.

Authentication
POST /auth/login
POST /auth/logout
GET  /auth/me
Alerts
POST /alerts
GET  /alerts
GET  /alerts/{id}
POST /alerts/{id}/reanalyze
Alert analysis
GET  /alerts/{id}/analysis
POST /analysis/alert/{id}
Incidents
GET  /incidents
GET  /incidents/{id}
POST /incidents/{id}/start-investigation
POST /incidents/{id}/resolve
GET  /incidents/{id}/timeline
GET  /incidents/{id}/intelligence
POST /incidents/{id}/notes
Data Sources
POST /sources/csv
POST /sources/json
POST /sources/database
POST /sources/validate
POST /sources/map-schema
POST /sources/import
Analytics
POST /analytics/run
GET  /analytics/findings
GET  /analytics/execution-gaps
GET  /analytics/negative-space
GET  /analytics/peer-benchmarks
GET  /analytics/review-priorities
Response
GET  /response/policies
POST /response/actions
POST /response/actions/{id}/approve
POST /response/actions/{id}/reject
POST /response/actions/{id}/rollback
Reports
POST /reports/generate
GET  /reports
GET  /reports/{id}
Audit
GET /audit

Additional internal APIs may be created only when required to implement the specified functionality, and they must follow the same architecture and authorization standards.

6. REQUIRED COMMON STATUS VALUES

Use consistent statuses.

Incident
OPEN
IN_PROGRESS
RESOLVED
AI
PENDING
PROCESSING
COMPLETED
FAILED

Do not create duplicate or conflicting terminology such as:

DONE
FINISHED
CLOSED
COMPLETE

when they conflict with specified statuses.

7. REQUIRED CORE DATA FLOW

The final application must behave as one integrated system.

                    ALERT SOURCE
                         │
                         ▼
                  Scenario Generator
                         │
                         ▼
                   Ingestion API
                         │
                         ▼
                 Validation Layer
                         │
                         ▼
                  Normalization
                         │
                         ▼
                  PostgreSQL
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
        Realtime                  Analysis
             │                       │
             ▼                       ▼
      SOC Analyst UI        Rules + ML + Context
                                     │
                                     ▼
                               Risk/Confidence
                                     │
                                     ▼
                              FP Likelihood
                                     │
                                     ▼
                                Correlation
                                     │
                                     ▼
                                  Incident
                                     │
                                     ▼
                                  Timeline
                                     │
                                     ▼
                               Local LLM
                                     │
                                     ▼
                               Investigation
                                     │
                                     ▼
                              Recommendation
                                     │
                                     ▼
                                  Policy
                                     │
                                     ▼
                                  Approval
                                     │
                                     ▼
                              Sandbox Action
                                     │
                                     ▼
                                  Audit
                                     │
                                     ▼
                                Resolution
8. REQUIRED ANALYTICS DATA FLOW
Security Evidence
      │
      ▼
Data Quality
      │
      ▼
Normalization
      │
      ├───────────────┐
      ▼               ▼
Execution Gap    Negative Space
      │               │
      └───────┬───────┘
              ▼
          Anomalies
              │
              ▼
       Peer Benchmarking
              │
              ▼
     Operational Risk Indicator
              │
              ▼
       Review Priorities
              │
              ▼
    Evidence-Backed Findings
              │
              ▼
          Traceability
9. PROJECT QUALITY GATE

Before final submission, verify:

Specification
     ↓
Architecture
     ↓
Database
     ↓
Backend
     ↓
Frontend
     ↓
AI
     ↓
Analytics
     ↓
Response
     ↓
Audit
     ↓
Testing
     ↓
Offline
     ↓
Demo

No critical stage may be bypassed.

10. FINAL PROJECT PRINCIPLE

CyberScope is not merely a dashboard.

It must operate as an integrated evidence-driven cybersecurity workflow:

INGEST
  ↓
NORMALIZE
  ↓
UNDERSTAND
  ↓
ENRICH
  ↓
DETECT
  ↓
SCORE
  ↓
CORRELATE
  ↓
EXPLAIN
  ↓
INVESTIGATE
  ↓
RECOMMEND
  ↓
RESPOND
  ↓
AUDIT

And separately:

SECURITY OPERATIONAL EVIDENCE
  ↓
EXECUTION GAPS
+
NEGATIVE SPACE
+
ANOMALIES
+
PEER DEVIATIONS
  ↓
EXPLAINABLE RISK
  ↓
REVIEW PRIORITY
  ↓
EVIDENCE-BACKED FINDING

The final implementation must remain:

local-first
offline-capable
evidence-grounded
explainable
auditable
role-secured
modular
testable
performant
maintainable
faithful to spec.md

No mandatory runtime dependency on cloud AI, hosted databases, external threat APIs, or internet services is permitted.

END OF IMPLEMENTATION PLAN


### One important point

I deliberately made **Phase 21** include the full Data Source Center you asked for:

**CSV + JSON + XLS + XLSX + PostgreSQL + MongoDB + MySQL + Supabase + REST API**

while keeping **local PostgreSQL as CyberScope's own database**. So Supabase is treated as an **external data source connector**, not as the application's primary database.

Also, your existing `spec.md` explicitly requires failure isolation, evidence-grounded AI, the two-role model, the operational analytics chain, and the end-to-end workflows; those are reflected in the plan rather than being left as vague future work. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2}

**Do not ask Antigravity to implement all 24 phases in one prompt.** Keep this file in the project as the master roadmap, and we'll give Antigravity a controlled prompt **one phase at a time**, verifying each phase before moving to the next.