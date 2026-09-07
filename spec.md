CyberScope — Complete Product Specification

Project Identity

Product Name: CyberScope
Tagline: From Security Evidence to Actionable Insight
Project Type: AI-assisted cybersecurity operations, alert intelligence, incident investigation, and security evidence analytics platform.

1. Product Vision

CyberScope is a unified cybersecurity intelligence platform designed to help a SOC Analyst monitor incoming security events, automatically triage alerts, detect suspicious behavior, correlate related alerts into incidents, investigate incidents, understand potential impact, and take controlled response actions.

The platform also analyzes structured security evidence such as alerts, cases, investigations, escalations, dispositions, closure behavior, and asset activity to identify unusual operational patterns, execution gaps, negative-space signals, anomalies, and peer deviations.

CyberScope combines deterministic rules, statistical analysis, machine learning, correlation, risk scoring, and a locally hosted Large Language Model (LLM).

The application is designed with local processing and offline deployment in mind.

Core transformation:

Security Evidence
      ↓
Ingestion
      ↓
Normalization
      ↓
Detection + Analytics
      ↓
Risk + Confidence
      ↓
Correlation
      ↓
Incident Intelligence
      ↓
Investigation
      ↓
Recommended Response
      ↓
Controlled Action
      ↓
Audit Trail

A second analytical transformation is:

Operational Evidence
      ↓
Execution Gaps
+
Negative Space
+
Anomalies
+
Peer Deviations
      ↓
Supervisory / Operational Risk
      ↓
Review Priority
      ↓
Evidence-Backed Finding

2. Application Roles

CyberScope has exactly two application roles.

2.1 SOC Analyst

The SOC Analyst is the primary operational user.

The SOC Analyst can:

Login and logout

View the main SOC dashboard

View live incoming alerts

Search and filter alerts

Open alert details

View alert analysis

View risk score

View confidence score

View false-positive likelihood

View affected users and assets

View related alerts

View correlated incidents

Start investigations

View incident timelines

View AI-generated investigation intelligence

Add analyst notes

Review operational analytics

View execution-gap findings

View negative-space findings

View peer benchmark results

View review priorities

Generate reports

Approve or reject controlled response actions

Execute sandbox response actions

Roll back supported sandbox actions

Resolve incidents

View audit records relevant to their actions

The SOC Analyst remains responsible for important security decisions.

2.2 Alert Source

The Alert Source role simulates external security products and sends security alerts into CyberScope.

The Alert Source can:

Login

View the Alert Source interface

Select security scenarios

Generate synthetic alerts

Generate multi-alert scenarios

Generate alert bursts

Submit individual alerts

Submit batches of alerts

View submission success/failure status

The Alert Source cannot:

Access the SOC Analyst dashboard

Investigate incidents

Modify analysis

Modify risk scores

Execute response actions

Resolve incidents

View analyst notes

View internal investigation intelligence

View unrelated audit records

The Alert Source role is a controlled source simulation for development, testing, and demonstration.

3. Authentication and Authorization

Use secure authentication with exactly these roles:

SOC_ANALYST
ALERT_SOURCE

Requirements:

Secure login

Password-based authentication

Session/token management

Protected routes

Role-aware navigation

Server-side authorization

Logout

Authentication state persistence

Expired-session handling

Unauthorized-access handling

Authentication and authorization must be implemented separately.

Do not rely on hiding UI buttons as the primary authorization mechanism.

4. High-Level Architecture

                         CYBERSCOPE
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
       ALERT SOURCES                      DATA SOURCES
             |                                 |
             |                                 |
             +----------------+----------------+
                              |
                              v
                    INGESTION LAYER
                              |
                              v
                  VALIDATION + NORMALIZATION
                              |
                              v
                        DATA STORE
                              |
         +--------------------+---------------------+
         |                    |                     |
         v                    v                     v
    RULE ENGINE          ML / ANOMALY         CORRELATION
                              ENGINE             ENGINE
         |                    |                     |
         +--------------------+---------------------+
                              |
                              v
                        RISK ENGINE
                              |
          +-------------------+-------------------+
          |                                       |
          v                                       v
   ALERT / INCIDENT                         OPERATIONAL
     INTELLIGENCE                            ANALYTICS
          |                                       |
          v                              +--------+--------+
    LOCAL LLM / AI                       |        |        |
          |                              v        v        v
          v                           GAPS    NEGATIVE   PEER
   EXPLANATION +                       /GAPS   SPACE     BENCH
   INVESTIGATION                         |        |        |
          |                              +--------+--------+
          +-------------------+------------------------+
                              |
                              v
                       SOC ANALYST UI
                              |
                              v
                        RESPONSE ENGINE
                              |
                              v
                         AUDIT LOGGING

5. Technology Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

shadcn/ui or equivalent local component system

React Router

TanStack Query

Recharts or ECharts

Backend

Python

FastAPI

Pydantic

Uvicorn

Database

Development can use:

Supabase PostgreSQL

Supabase Realtime

Supabase Authentication

The architecture must remain portable to local deployment.

For local deployment:

PostgreSQL

Local realtime/event transport

Local authentication services where required

Do not hard-code dependence on Supabase Cloud.

Analytics and ML

Python

pandas and/or Polars

NumPy

SciPy

scikit-learn

Potential techniques:

Rule-based detection

Statistical baselines

Z-score analysis

Isolation Forest

Local Outlier Factor

Clustering

Frequency analysis

Time-window analysis

Peer deviation analysis

Correlation scoring

Local AI

Ollama

Local LLM

Use the local LLM for:

Alert explanation

Incident summarization

Investigation intelligence

Potential impact explanation

Finding explanation

Recommended investigation steps

Report narrative generation

The LLM must use structured evidence and must not invent facts.

Scheduling and Background Jobs

Use:

APScheduler and/or local worker processes

Use scheduled processing for:

Batch analysis

Benchmark refresh

Data-quality checks

Report generation

Synthetic test-data generation

Cleanup

Realtime updates must not depend on the scheduler.

Deployment

Docker

Docker Compose

Version Control

Git

GitHub

Testing

Pytest

Vitest

React Testing Library

Playwright

Security Tooling

Bandit

pip-audit

npm audit

ESLint

Ruff

6. Application Pages

6.1 Login

Display:

CyberScope branding

Login form

Email/username

Password

Sign in

Validation feedback

Redirect users to the correct interface according to role.

7. SOC Analyst Dashboard

The main dashboard must present a live operational view.

Top metrics

Live Alerts

Critical Alerts

High-Risk Alerts

Active Incidents

Open Investigations

Execution-Gap Findings

Negative-Space Findings

Review Priorities

Main dashboard components

Live alert stream

Recent critical alerts

Incident queue

Risk distribution

Severity distribution

Alert-source distribution

Alerts by category

Recent incident activity

Latest findings

Top review priorities

Investigation duration trend

Escalation trend

Closure trend

Peer deviation summary

Data-quality status

The dashboard should update automatically without manual page refresh.

8. Live Alert Monitoring

CyberScope must continuously display newly ingested security events.

Flow:

Alert Source
      ↓
Ingestion API
      ↓
Database Insert
      ↓
Realtime Event
      ↓
SOC Analyst Dashboard

The analyst should see a newly inserted alert immediately.

Realtime updates must occur for:

New alert

Alert analysis completion

Risk update

Incident creation

Incident update

Finding creation

Response action

Incident resolution

9. Alert Source Dashboard

The Alert Source interface provides scenario-based generation.

Authentication scenarios

Brute Force

Credential Stuffing

Impossible Travel

Suspicious Login

Privileged Login

MFA Abuse

Endpoint scenarios

Malware Detection

Suspicious PowerShell

Suspicious Process

Ransomware Behavior

Privilege Escalation

Network scenarios

Port Scan

Command-and-Control Activity

Data Exfiltration

Suspicious DNS

Unusual Network Connection

Database scenarios

Unusual Query

Bulk Data Read

Privilege Abuse

Suspicious Database Login

Email scenarios

Phishing

Malicious Attachment

Suspicious Link

The generator must support:

Single alert

Multi-alert attack sequence

High-volume burst

Repeated event scenario

Benign/false-positive scenario

Custom severity

Synthetic timestamps where appropriate

10. Alert Ingestion

Incoming alerts enter through an ingestion API.

Flow:

Incoming Alert
      ↓
Request Validation
      ↓
Authentication / Source Validation
      ↓
Normalization
      ↓
Data Quality Checks
      ↓
Database Storage
      ↓
Analytics Pipeline

Alerts must be stored before optional AI enrichment.

If later analysis fails, the original alert remains available.

11. Common Alert Schema

Normalize different sources into a common internal model.

Recommended fields:

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

Source-specific information can be stored in structured metadata.

12. Data Source Center

The SOC Analyst can import or connect structured security evidence.

Initial supported inputs:

CSV

JSON

PostgreSQL/database exports

Additional connector architecture can support:

MongoDB

MySQL

Supabase

REST APIs

Flow:

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

Database credentials must never be unnecessarily exposed to the frontend.

Connector processing must occur in a trusted backend environment.

13. Automatic Alert Triage

Every incoming alert should pass through an analytical pipeline.

Incoming Alert
      ↓
Validation
      ↓
Normalization
      ↓
Context Enrichment
      ↓
Rule Evaluation
      ↓
Anomaly Detection
      ↓
Correlation
      ↓
Risk Calculation
      ↓
Confidence Estimation
      ↓
False-Positive Estimation
      ↓
Priority

Output:

Priority

Risk

Confidence

False-positive likelihood

Detection reasons

Related activity

Recommended analyst attention level

14. Risk Scoring

Risk is an analytical score from 0 to 100.

Potential contributors include:

Source severity

Asset criticality

User privilege

Event category

Correlation strength

Behavioral anomaly

Known malicious indicators

Historical activity

Repeated activity

Investigation context

Peer deviation

Example:

Severity                 +20
Asset Criticality        +18
Correlation              +22
Behavioral Anomaly       +15
Known Indicator          +10
Historical Context        +8
----------------------------
Risk Score                93

The actual implementation must normalize contributions so the final score remains in a known range.

Risk is not proof of compromise.

15. Confidence Score

Confidence measures how strongly the available evidence supports the current analysis.

Example:

Risk:       93/100
Confidence: 89%

Risk and confidence must remain separate.

A high-risk alert with low confidence must be displayed as uncertain and should be prioritized appropriately for investigation.

16. False-Positive Likelihood

CyberScope estimates whether activity may have a legitimate explanation.

Possible reducing signals:

Trusted IP

Approved maintenance

Known security scanner

Authorized administrator

Known automation

Duplicate alert

Historical legitimate behavior

Example:

Risk: 82
Confidence: 91%
Estimated False-Positive Likelihood: 8%

Use "estimated" or "likelihood" language.

Never claim an alert has been mathematically proven real or fake.

17. Context Enrichment

Where data is available, enrich alerts with:

Asset criticality

User privilege

Known source classification

Historical activity

Related events

Historical incidents

Threat indicators

Peer statistics

The pipeline must continue to work when optional enrichment is unavailable.

18. Detection Engine

CyberScope must combine multiple analytical approaches.

18.1 Rule Engine

Detect known patterns.

Examples:

Multiple failed logins

Successful login after repeated failures

Impossible travel

Privileged login anomaly

Repeated suspicious process

Bulk database extraction

Suspicious DNS behavior

Rules should be versioned.

Each finding should identify the rule that triggered.

18.2 Statistical Analysis

Analyze deviations from baselines.

Examples:

Unusually high login count

Unusually high alert rate

Unusually short investigation duration

Unusually fast closure

Abnormal escalation frequency

Sudden change in activity level

18.3 Machine Learning

Use scikit-learn methods where appropriate:

Isolation Forest

Local Outlier Factor

clustering

behavioral baselines

ML output must include enough metadata to support explainability.

19. Alert Correlation Engine

CyberScope must identify relationships between alerts.

Correlation signals:

Same user

Same asset

Same source IP

Same destination

Same hostname

Same indicator

Same event type

Similar event category

Similar technique

Time proximity

Sequence relationships

Example:

Failed Login
      +
Successful Login
      +
New Device
      +
Suspicious PowerShell
      +
Privilege Escalation
      =
Possible Account Takeover

The system must explain why events were grouped.

Example:

Alerts were correlated because they involve the same user and endpoint, share related indicators, and occurred within a configured time window.

20. Incident Engine

An incident represents related alerts and activity that form a coherent security story.

Incident fields:

incident_id
title
severity
risk_score
confidence_score
status
primary_user
primary_asset
summary
created_at
updated_at
resolved_at

Incident states:

OPEN
IN_PROGRESS
RESOLVED

The SOC Analyst can:

Open an incident

Start investigation

Add notes

Review evidence

Approve response

Reject response

Execute sandbox response

Resolve incident

21. Incident Timeline

Every incident should show a chronological timeline.

Example:

10:01  Multiple failed logins
10:03  Successful login
10:04  New device registered
10:05  Suspicious PowerShell execution
10:07  Privilege escalation
10:10  Malware detection

Each timeline item must link to the underlying alert/event record.

22. Investigation Workspace

The incident investigation screen must include:

Incident summary

Title

Risk

Confidence

Severity

Current status

What happened

Evidence-based summary.

Why suspicious

Detected signals and relationships.

Potential impact

Possible impact to:

Users

Assets

Services

Data

Business operations

Do not claim actual damage without evidence.

Evidence

Alert IDs

Event timestamps

Assets

Users

IPs

Indicators

Related incidents

Rule/ML signals

Investigation recommendations

Suggested verification steps for the analyst.

Response recommendations

Potential containment actions.

23. Local LLM / AI Layer

Use Ollama to run a local LLM.

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

The LLM can provide:

Alert explanation

Incident summary

Investigation narrative

Potential impact

Recommended investigation steps

Recommended response

Finding explanation

Report text

The LLM must not independently:

assign arbitrary irreversible actions

execute shell commands

directly control infrastructure

invent evidence

claim certainty without evidence

24. Evidence-Grounded AI

Every AI-generated statement must be grounded in structured application data.

The prompt should contain:

Alert metadata

Related events

Risk contributors

Anomaly signals

Correlation evidence

User context

Asset context

Timeline

The model should be instructed to state uncertainty when evidence is insufficient.

25. AI Failure Handling

If the local LLM is unavailable:

Alert
  |
  +--> Stored
  |
  +--> Rule Analysis
  |
  +--> ML Analysis
  |
  +--> Risk
  |
  +--> AI = FAILED/PENDING

Alerts must remain available.

AI processing states:

PENDING
PROCESSING
COMPLETED
FAILED

AI failure must never become a single point of failure for ingestion.

26. Operational Evidence Analytics

CyberScope analyzes structured evidence from:

Alerts

Cases

Investigations

Escalations

Dispositions

Closure records

Asset inventory

Event data

The system analyzes how security operations behave over time.

The goal is to identify patterns requiring additional investigation.

27. Execution-Gap Detection

Execution-gap detection identifies cases where documented or expected security capability appears stronger than observed operational evidence.

Signal examples

Unusually Fast Closure

Critical Alert
      ↓
Closed unusually quickly
      ↓
Limited investigation evidence
      ↓
Potential Execution Gap

Missing Escalation

Critical Event
      ↓
Investigation Exists
      ↓
Expected Escalation Missing
      ↓
Potential Execution Gap

Repetitive Investigations

Large Case Set
      ↓
Highly Similar Investigation Patterns
      ↓
Little Case-Specific Evidence
      ↓
Potential Execution Gap

Every finding must provide:

Finding type

Severity

Reason

Evidence

Supporting records

Relevant thresholds

Peer context where available

28. Negative-Space Detection

Negative-space analysis looks for expected evidence that is missing or unexpectedly low.

Examples:

Critical asset has little security activity

Expected alert category is absent

Expected investigation records are missing

Expected escalation records are missing

Monitoring coverage appears incomplete

Activity is unusually low compared with peers

The system should label these as potential indicators.

Example:

Unexpectedly low security activity for a critical asset compared with comparable environments. Possible monitoring coverage gap requiring review.

Negative space is not automatically treated as compromise.

29. Anomaly and Behavioural Analytics

CyberScope should detect unusual operational behavior such as:

Unusual alert volume

Unusual closure rate

Unusual closure duration

Unusual investigation duration

Unusual escalation behavior

Repeated alerts without remediation evidence

Sudden changes in activity

Activity inconsistent with peer entities

Each anomaly must show:

Metric

Baseline

Observed value

Deviation

Interpretation

30. Peer Benchmarking

CyberScope compares comparable entities or environments.

Potential metrics:

Alert volume

Critical alert ratio

Investigation duration

Escalation frequency

Closure duration

Reopened cases

Repeated alerts

Coverage activity

Evidence completeness

Peer result structure:

Entity
Peer Group
Metric
Entity Value
Peer Median
Deviation
Interpretation

Use normalized metrics instead of raw counts where entity sizes differ.

31. Supervisory / Operational Risk Indicator

Generate explainable risk indicators from multiple analytical findings.

Example:

Entity Risk: 87/100

Contributors:

+22  Critical alerts without escalation
+18  Investigation evidence deficiency
+14  Repeated unresolved asset activity
+12  Peer deviation
+11  Monitoring coverage concern
+10  Closure-time anomaly

Every contributor must link to evidence.

The risk indicator is a prioritization tool, not a declaration of compromise or organizational failure.

32. Review Prioritization

CyberScope must rank:

Entities

Security processes

Controls

Alerts

Cases

Investigations

Findings

Example:

Priority 1
CSE-017 — Escalation weakness

Priority 2
CSE-004 — Monitoring coverage concern

Priority 3
CSE-011 — Investigation quality anomaly

The user should be able to drill from the priority to the underlying evidence.

33. Evidence and Traceability

Every important finding must contain:

Finding ID
Entity
Finding Type
Severity
Risk Score
Title
Summary
Reason
Evidence
Supporting Records
Analytical Signals
Peer Context
Rule/Model Information
Created At

Navigation must support:

Finding
  ↓
Case / Incident
  ↓
Investigation
  ↓
Alert/Event
  ↓
Normalized Evidence

34. Data Quality Engine

Before analysis, inspect incoming datasets.

Checks:

Missing timestamps

Missing severity

Missing entity

Missing case IDs

Missing investigation data

Invalid values

Duplicate records

Invalid time order

Orphan records

Unexpected categories

Example report:

Records processed: 125,430
Valid: 123,982
Duplicates: 812
Missing timestamps: 341
Missing case references: 295

Data-quality problems must be visible to the analyst and may contribute to negative-space findings when appropriate.

35. Search and Filtering

Provide search/filtering by:

Alert ID

Incident ID

Case ID

User

Asset

Source IP

Event type

Alert source

Severity

Risk

Finding ID

Time range

Status

Finding type

Use pagination and server-side filtering for large datasets.

36. Response Engine

CyberScope includes a controlled response layer for internal demonstration and testing.

Response concepts:

Block IP

Disable user

Terminate session

Isolate endpoint

Quarantine artifact

Investigate further

The implementation should use a controlled action service.

Do not allow free-form AI commands.

37. Response Policy Engine

Response policies are deterministic rules that evaluate structured data.

Example:

IF
risk >= 90
AND
confidence >= 85
AND
malicious_indicator = true

THEN
recommend BLOCK_IP

Policy fields:

policy_id
name
conditions
action
enabled
requires_approval
created_at
updated_at

Policy execution must be auditable.

38. Analyst Approval

For important response actions:

Detection
   ↓
Recommendation
   ↓
Policy Evaluation
   ↓
Approval Required
   ↓
SOC Analyst
   ├── Approve
   └── Reject

The default for high-impact actions should be analyst approval.

39. Sandbox Response Environment

Provide simulated environments for demonstrations.

Sandbox User

User: USR-4821
Previous State: ACTIVE
Action: DISABLE USER
New State: BLOCKED
Rollback: AVAILABLE

Sandbox Endpoint

Endpoint: EP-0017
Previous State: CONNECTED
Action: ISOLATE
New State: ISOLATED
Rollback: AVAILABLE

Sandbox Firewall

IP: 185.x.x.x
Action: BLOCK
Status: BLOCKED
Rollback: AVAILABLE

All simulated actions must be reversible.

40. Automatic Response

The application can demonstrate automated response policies in the controlled sandbox environment.

Possible flows:

Risk / Detection
      ↓
Policy Match
      ↓
Action
      ↓
Sandbox Execution
      ↓
Audit Log

For actions configured as approval-required:

Risk / Detection
      ↓
Policy Match
      ↓
Analyst Approval
      ↓
Sandbox Execution
      ↓
Audit Log

41. Audit Logging

Record important actions.

Audit fields:

audit_id
actor_user_id
actor_role
action
target_type
target_id
reason
previous_state
new_state
metadata
timestamp

Audit events include:

Login

Logout

Alert submission

Alert analysis

Incident creation

Investigation start

Finding creation

Finding review

Response recommendation

Response approval

Response rejection

Response execution

Response rollback

Incident resolution

Dataset import

Data-source configuration

Rule updates

Normal users should not be able to silently modify historical audit records.

42. Database Design

Recommended logical entities:

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

Audit and reporting

audit_logs
reports

43. Representative Table Structures

alerts

id
source_id
event_type
event_category
severity
timestamp
user_id
asset_id
source_ip
destination_ip
description
status
raw_payload
metadata
created_at

alert_analysis

id
alert_id
rule_score
anomaly_score
correlation_score
risk_score
confidence_score
false_positive_likelihood
threat_type
explanation
potential_impact
recommended_actions
analysis_status
model_version
analyzed_at

incidents

id
title
severity
risk_score
confidence_score
status
primary_user
primary_asset
summary
created_at
updated_at
resolved_at

findings

id
entity_id
finding_type
severity
risk_score
title
summary
rationale
status
created_at

evidence

id
finding_id
source_type
source_id
evidence_type
evidence_value
metadata
created_at

44. Realtime Architecture

Use realtime events for dashboard synchronization.

Example:

PostgreSQL Change
       ↓
Realtime Layer
       ↓
WebSocket/Event
       ↓
React
       ↓
UI Update

Realtime behavior should not require manual refresh.

45. Background Processing

Use background workers for computational tasks.

Candidates:

Alert analysis

Large dataset processing

Anomaly detection

Peer benchmarking

Report generation

Data quality checks

Long-running work must not block normal API requests.

46. Report Generation

Reports must support:

PDF

CSV

JSON

Report sections:

Executive Summary

Overall findings

High-priority incidents

Operational risk indicators

Detailed Findings

Execution gaps

Negative-space findings

Peer deviations

Behavioral anomalies

Evidence

Supporting records

Alert IDs

Case IDs

Timestamps

Analytical signals

Recommendations

Investigation priorities

Suggested response actions

Audit Information

Dataset version

Rule version

Model version

Generation timestamp

47. Dashboard UI Requirements

The design should be:

Professional

Enterprise-grade

Clean

High information density

Accessible

Responsive

Consistent

Easy to scan

Use:

Clear typography

Consistent severity indicators

Tables with filtering

Cards only where they communicate useful metrics

Charts for trend/comparison data

Timeline visualizations for incidents

Evidence panels for findings

Avoid:

Excessive neon

Hacker imagery

Decorative animations

Unnecessary 3D effects

Visual clutter

48. Alert Detail UI

Required sections:

Alert Identity
Severity / Risk
Confidence
False-Positive Likelihood
Context
Detected Signals
Potential Threat
Potential Impact
Related Alerts
Related Incident
Evidence
Timeline
Recommended Investigation
Recommended Response
Audit History

49. Incident Detail UI

Required sections:

Incident Header
Risk
Confidence
Severity
Status

Summary
What Happened
Why Suspicious
Potential Impact

Related Alerts
Timeline
Affected Users
Affected Assets

Investigation Intelligence
Evidence
Recommendations

Response Actions
Audit Trail

50. Operational Analytics UI

Create an analytics area showing:

Execution gaps

Negative space

Anomalies

Peer benchmarks

Risk indicators

Review priorities

Trend analysis

Every chart or indicator must support drill-down.

51. Finding Detail UI

Example:

Potential Execution Gap

Severity: HIGH
Risk: 86

Reason:
Critical investigations show unusually short duration
and limited investigation evidence.

Signals:
- Investigation duration below baseline
- Missing escalation record
- Low evidence count
- Peer deviation

Supporting Evidence:
CASE-1024
CASE-1041
ALERT-8821
ALERT-8899

Recommended Review:
Inspect investigation quality and escalation handling.

52. Data Model Relationships

Core relationships:

Alert Source
    ↓
Alerts
    ↓
Alert Analysis
    ↓
Correlation
    ↓
Incident
    ↓
Investigation
    ↓
Response
    ↓
Audit

Additional relationships:

CSE / Entity
    ↓
Assets
    ↓
Alerts / Cases
    ↓
Investigations
    ↓
Findings
    ↓
Evidence

53. Performance Requirements

The prototype should be designed for:

Tens of thousands of alerts in a dataset

Batch analysis

Pagination

Indexed database queries

Incremental processing

Async processing for expensive analysis

Realtime updates

Large evidence tables

Do not load entire datasets into the browser.

Large computations must happen server-side.

54. Security Requirements

Mandatory practices:

RBAC

Server-side authorization

Input validation

Parameterized queries

Secret management

Audit logging

Protected APIs

Secure connector handling

No secrets in Git

No API keys in frontend

Sanitized error messages

Least-privilege database access

Safe logging

55. API Design

Authentication

POST /auth/login
POST /auth/logout
GET  /auth/me

Alerts

POST /alerts
GET /alerts
GET /alerts/{id}
POST /alerts/{id}/reanalyze

Alert analysis

GET /alerts/{id}/analysis
POST /analysis/alert/{id}

Incidents

GET /incidents
GET /incidents/{id}
POST /incidents/{id}/start-investigation
POST /incidents/{id}/resolve

Investigation

GET /incidents/{id}/timeline
GET /incidents/{id}/intelligence
POST /incidents/{id}/notes

Data sources

POST /sources/csv
POST /sources/json
POST /sources/database
POST /sources/validate
POST /sources/map-schema
POST /sources/import

Analytics

POST /analytics/run
GET /analytics/findings
GET /analytics/execution-gaps
GET /analytics/negative-space
GET /analytics/peer-benchmarks
GET /analytics/review-priorities

Response

GET /response/policies
POST /response/actions
POST /response/actions/{id}/approve
POST /response/actions/{id}/reject
POST /response/actions/{id}/rollback

Reports

POST /reports/generate
GET /reports
GET /reports/{id}

Audit

GET /audit

56. API Standards

All APIs must:

Validate request bodies

Enforce role permissions

Return consistent JSON

Use meaningful HTTP status codes

Support pagination

Record important errors

Avoid exposing secrets

Avoid returning credentials

Handle duplicate requests where required

Use Pydantic models for validation.

57. Error Handling

Frontend must handle:

Loading

Empty state

Network failure

Unauthorized state

Server error

Analysis pending state

Analysis failure state

Backend must handle:

Database errors

Validation errors

Connector failures

ML errors

LLM failures

Realtime failures

Background-task failures

One failed subsystem must not crash the whole application.

58. Offline Deployment

CyberScope must be capable of local execution without an Internet connection.

Target environment:

Air-Gapped Network
        |
        +-- React frontend
        +-- FastAPI backend
        +-- PostgreSQL
        +-- Analytics engine
        +-- Ollama / Local LLM
        +-- Local realtime service
        +-- Local scheduler / worker

Runtime dependencies should not require:

OpenAI

Gemini

Claude

Cloud database

SaaS authentication

Hosted AI

External threat-intelligence API

Required libraries, models and containers must be provisioned before deployment.

59. Docker Deployment

Expected services:

frontend
backend
postgres
realtime
analytics-worker
scheduler
ollama

Support:

docker compose up -d

Provide:

.env.example

Database migrations

Seed data

Health checks

Startup scripts

Model setup instructions

Local configuration

60. Environment Configuration

Example development configuration:

APP_ENV=development
DATABASE_MODE=supabase
LLM_MODE=ollama
REALTIME_MODE=supabase
OFFLINE_MODE=false

Example local configuration:

APP_ENV=offline
DATABASE_MODE=local
LLM_MODE=ollama
REALTIME_MODE=local
OFFLINE_MODE=true
EXTERNAL_APIS=false

Never hard-code credentials or deployment-specific values.

61. Synthetic Data

Provide synthetic datasets for:

Authentication

Endpoint

Network

Database

Email

Cases

Investigations

Escalations

Dispositions

Asset inventory

Multiple entities

Peer groups

Datasets must contain:

Normal activity

Suspicious activity

Benign scenarios

Execution-gap scenarios

Negative-space scenarios

Peer-deviation scenarios

62. Demonstration Scenario

The main live demonstration should show an end-to-end security incident.

Account Takeover scenario

Generate:

1. Multiple failed logins
2. Successful login from unusual IP
3. New device activity
4. Suspicious PowerShell
5. Privilege escalation

Expected workflow:

Alerts Generated
       ↓
Realtime Ingestion
       ↓
Automatic Triage
       ↓
Risk Calculation
       ↓
Correlation
       ↓
Incident Created
       ↓
Timeline Generated
       ↓
Local LLM Explanation
       ↓
Analyst Investigation
       ↓
Recommended Response
       ↓
Analyst Approval / Policy
       ↓
Sandbox Action
       ↓
Audit Log
       ↓
Incident Resolution

Expected sample outcome:

Possible Account Takeover
Risk: 96/100
Confidence: 92%

63. Supervisory Analytics Demonstration

Use a synthetic operational dataset containing multiple entities.

Example:

Critical Alerts: 120
Investigated: 118
Escalated: 49
Closed: 117

Median Investigation Duration: 4 min
Peer Median: 41 min

Expected finding:

Potential Execution Gap

Indicators:
- Unusually short investigations
- Low escalation rate
- Limited investigation evidence
- Significant peer deviation

Negative-space example:

Critical Asset: DB-PROD-04
Expected Activity: High
Observed Activity: Very Low
Peer Activity: High

Potential Negative-Space Signal
Possible monitoring coverage gap requiring review.

64. Testing Strategy

Alert tests

Test 1

Submit valid low-risk alert.

Expected:

Accepted
Stored
Analyzed
Visible

Test 2

Submit related alerts.

Expected:

Multiple Alerts
→ Correlation
→ Incident

Test 3

Submit malformed data.

Expected:

Validation Error

Test 4

Make local LLM unavailable.

Expected:

Alert Stored
Rules Run
ML Runs
AI State = FAILED/PENDING

Test 5

Resolve incident.

Expected:

Incident = RESOLVED
Dashboard Updates
Audit Entry Created

65. Analytics Validation

Validate against expert-reviewed reference findings.

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

Measure where appropriate:

Precision

Recall

False-positive rate

Evidence coverage

Ranking quality

Analyst agreement

Do not report invented accuracy percentages.

66. Model, Rule and Prompt Versioning

Record:

Rule version

Model version

Feature version

Prompt version

Each important analytical output should store the versions used.

This provides reproducibility.

67. Explainability Requirements

For rule-based outputs, show:

Rule ID
Conditions Met
Observed Values
Thresholds

For ML:

Model
Input Features
Anomaly Score
Relevant Indicators

For LLM:

Model Version
Prompt Version
Evidence References
Generated Explanation
Timestamp

68. Local LLM Prompt Requirements

Prompts must instruct the model to:

Use only supplied evidence

Clearly separate facts from inference

State uncertainty

Avoid inventing entities or events

Avoid inventing damage

Avoid inventing actions already taken

Explain reasoning in plain language

Provide recommendations rather than unauthorized commands

69. Auditability Requirements

Every important system result must be traceable to:

Dataset
Record
Signal
Rule/Model
Score
Explanation
Analyst Action

The analyst should be able to answer:

Why was this alert/incident/finding prioritized?

The system should provide an inspectable evidence chain.

70. Maintainability

Code must be modular.

Backend modules should be separated into:

auth/
api/
models/
schemas/
ingestion/
analytics/
correlation/
risk/
ai/
response/
audit/
services/

Frontend modules:

components/
pages/
layouts/
hooks/
services/
types/
utils/

Avoid putting business logic directly inside UI components.

71. Project Folder Structure

cyberscope/
|
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
|
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
│   └── requirements.txt
|
├── ml/
│   ├── models/
│   ├── features/
│   ├── training/
│   └── inference/
|
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
|
├── data/
│   ├── alerts/
│   ├── cases/
│   ├── investigations/
│   ├── entities/
│   └── assets/
|
├── ollama/
│   └── model-setup/
|
├── docker/
├── tests/
├── docs/
├── scripts/
├── docker-compose.yml
├── .env.example
├── README.md
└── spec.md

72. Development Order

Phase 1 — Foundation

Repository

React/Vite

FastAPI

Database

Authentication

Two roles

Navigation/layouts

Phase 2 — Alert Pipeline

Alert Source

Alert generation

Ingestion API

Validation

Normalization

Database storage

Realtime updates

Phase 3 — Triage

Rules

Risk scoring

Confidence

False-positive likelihood

Context enrichment

Alert details

Phase 4 — Correlation

Correlation engine

Incident creation

Incident UI

Timeline

Investigation workflow

Phase 5 — Local AI

Ollama

Prompt builder

Alert explanations

Incident summaries

Investigation intelligence

Failure handling

Phase 6 — Operational Analytics

Execution gaps

Negative space

Anomaly analysis

Peer benchmarking

Risk indicators

Review prioritization

Phase 7 — Response

Response policies

Approval workflow

Sandbox IP block

Sandbox account disable

Sandbox endpoint isolation

Rollback

Audit logs

Phase 8 — Data Sources

CSV

JSON

PostgreSQL

Schema mapping

Validation

Phase 9 — Reports

PDF

CSV

JSON

Phase 10 — Hardening

Testing

Security review

Performance optimization

Docker packaging

Offline validation

Demo datasets

Documentation

73. MVP Definition

The MVP must include:

Two-role authentication

Alert Source dashboard

Synthetic alert generation

Alert ingestion

Normalization

Realtime alert feed

Automatic triage

Risk score

Confidence score

False-positive likelihood

Alert correlation

Incident creation

Incident timeline

Investigation interface

Local LLM explanation

Analyst dashboard

Execution-gap analytics

Negative-space analytics

Peer benchmarking

Evidence-backed findings

Audit logging

Sandbox response

CSV/JSON import

Offline Docker deployment

74. Definition of Done

The operational workflow is complete when:

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
Local LLM Explanation
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

The analytics workflow is complete when:

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

75. Product Positioning

CyberScope should be described as:

CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security data into prioritized, explainable insights for SOC analysts.

The core operational transformation is:

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

The analytical transformation is:

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

76. Terminology Rules

Use these terms consistently:

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

Avoid unsupported claims such as:

AI proves an attack

100% accuracy

Zero false positives

AI guarantees an alert is malicious

Real infrastructure control when using simulation

Guaranteed threat prevention

Guaranteed detection of every attack

77. Final Product Behavior

CyberScope must behave as one integrated application.

The Alert Source supplies realistic synthetic security events.

CyberScope ingests and normalizes those events.

The analytics pipeline automatically evaluates the events using rules, statistical methods, ML, context, and correlation.

The system calculates risk, confidence, and estimated false-positive likelihood.

Related events are grouped into incidents.

Incidents receive timelines and evidence-grounded local LLM explanations.

The SOC Analyst investigates incidents and receives recommended actions.

Controlled response policies can execute sandbox actions with approval where required.

Every important action is recorded in an audit trail.

Separately, CyberScope analyzes security operational evidence to identify execution gaps, negative-space indicators, anomalies and peer deviations, then converts those signals into explainable risk indicators and review priorities.

The application must remain usable when optional AI enrichment, enrichment data, or a connector is unavailable.

The complete platform should be capable of running locally using Docker, PostgreSQL, Python analytics, and Ollama with no mandatory runtime Internet connection.