# CyberScope

## Product Requirements Document (PRD)

**Product Name:** CyberScope
**Tagline:** From Security Evidence to Actionable Insight
**Product Type:** AI-assisted cybersecurity operations, alert intelligence, incident investigation, and security evidence analytics platform.

---

# 1. Product Vision

CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security data into prioritized, explainable insights for SOC analysts.

CyberScope enables a SOC Analyst to:

1. Monitor incoming security events.
2. Automatically triage alerts.
3. Detect suspicious behavior.
4. Correlate related alerts.
5. Create and investigate incidents.
6. Understand potential impact.
7. Receive evidence-grounded AI intelligence.
8. Receive controlled response recommendations.
9. Approve or reject response actions.
10. Execute reversible sandbox response actions.
11. Resolve incidents.
12. Maintain a complete audit trail.
13. Analyze security operational evidence.
14. Detect execution gaps.
15. Detect negative-space indicators.
16. Detect anomalies.
17. Compare entities using peer benchmarks.
18. Generate explainable operational risk indicators.
19. Prioritize areas requiring review.
20. Generate evidence-backed reports.

CyberScope must remain usable when optional AI enrichment, enrichment data, connectors, or other non-critical subsystems are unavailable.

The application must support local and air-gapped deployment.

---

# 2. Core Product Transformations

## 2.1 Operational Security Intelligence

```text
Security Evidence
       ↓
Ingestion
       ↓
Validation + Normalization
       ↓
Data Store
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
```

## 2.2 Operational Evidence Analytics

```text
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
```

---

# 3. Product Roles

CyberScope has exactly two application roles.

## 3.1 SOC Analyst

Role identifier:

```text
SOC_ANALYST
```

The SOC Analyst is the primary operational user.

### Permissions

The SOC Analyst can:

* Login.
* Logout.
* View SOC dashboard.
* View live alerts.
* Search alerts.
* Filter alerts.
* Open alert details.
* View alert analysis.
* View risk score.
* View confidence score.
* View estimated false-positive likelihood.
* View affected users.
* View affected assets.
* View related alerts.
* View correlated incidents.
* Start investigations.
* View incident timelines.
* View AI-generated investigation intelligence.
* Add analyst notes.
* View operational analytics.
* View execution-gap findings.
* View negative-space findings.
* View peer benchmark results.
* View review priorities.
* Generate reports.
* Approve response actions.
* Reject response actions.
* Execute sandbox response actions.
* Roll back supported sandbox actions.
* Resolve incidents.
* View audit records relevant to their actions.

The SOC Analyst remains responsible for important security decisions.

---

# 4. Alert Source

Role identifier:

```text
ALERT_SOURCE
```

The Alert Source represents controlled external security-product simulation.

## 4.1 Alert Source Permissions

The Alert Source can:

* Login.
* Logout.
* View Alert Source interface.
* Select scenarios.
* Generate synthetic alerts.
* Generate multi-alert scenarios.
* Generate alert bursts.
* Generate individual alerts.
* Generate batches.
* Submit alerts.
* View submission success/failure status.

## 4.2 Alert Source Restrictions

The Alert Source cannot:

* Access SOC Analyst dashboard.
* Investigate incidents.
* Modify analysis.
* Modify risk scores.
* Execute response actions.
* Resolve incidents.
* View analyst notes.
* View internal investigation intelligence.
* View unrelated audit records.

Authorization must be enforced server-side.

---

# 5. Authentication and Authorization

## 5.1 Requirements

The system must provide:

* Secure login.
* Password authentication.
* Session/token management.
* Protected routes.
* Role-aware navigation.
* Server-side authorization.
* Logout.
* Authentication persistence.
* Expired-session handling.
* Unauthorized-access handling.

Authentication and authorization must be separate concerns.

UI hiding must never be the primary authorization mechanism.

## 5.2 Login Page

The Login page must contain:

* CyberScope branding.
* Username/email field.
* Password field.
* Sign In button.
* Validation feedback.
* Loading state.
* Authentication failure feedback.

Successful authentication redirects the user to the interface permitted for their role.

---

# 6. Application Architecture

CyberScope consists of:

```text
Alert Sources
      +
Data Sources
      ↓
Ingestion Layer
      ↓
Validation + Normalization
      ↓
PostgreSQL Data Store
      ↓
+----------------------------+
| Rule Engine                |
| ML / Anomaly Engine        |
| Correlation Engine         |
+----------------------------+
      ↓
Risk Engine
      ↓
+----------------------------+
| Alert / Incident Intel.   |
| Operational Analytics      |
+----------------------------+
      ↓
Local LLM
      ↓
SOC Analyst UI
      ↓
Response Engine
      ↓
Audit Logging
```

---

# 7. Technology Requirements

## 7.1 Frontend

* React.
* TypeScript.
* Vite.
* Tailwind CSS.
* shadcn/ui or equivalent local component system.
* React Router.
* TanStack Query.
* Recharts or ECharts.

## 7.2 Backend

* Python.
* FastAPI.
* Pydantic.
* Uvicorn.

## 7.3 Database

Development may use:

* Supabase PostgreSQL.
* Supabase Realtime.
* Supabase Authentication.

Architecture must remain portable.

Local deployment must support:

* PostgreSQL.
* Local realtime/event transport.
* Local authentication services where required.

CyberScope must not hard-code dependence on Supabase Cloud.

## 7.4 Analytics / ML

Use:

* pandas and/or Polars.
* NumPy.
* SciPy.
* scikit-learn.

Potential analytical techniques:

* Rule-based detection.
* Statistical baselines.
* Z-score analysis.
* Isolation Forest.
* Local Outlier Factor.
* Clustering.
* Frequency analysis.
* Time-window analysis.
* Peer deviation analysis.
* Correlation scoring.

## 7.5 Local AI

Use:

* Ollama.
* Local LLM.

## 7.6 Background Processing

Use:

* APScheduler and/or local worker processes.

## 7.7 Testing

* Pytest.
* Vitest.
* React Testing Library.
* Playwright.

## 7.8 Security Tooling

* Bandit.
* pip-audit.
* npm audit.
* ESLint.
* Ruff.

## 7.9 Deployment

* Docker.
* Docker Compose.
* Git.
* GitHub.

---

# 8. Frontend Application Areas

The application must provide the following major interfaces:

1. Login.
2. SOC Analyst Dashboard.
3. Live Alert Monitoring.
4. Alert Detail.
5. Incident List.
6. Incident Detail.
7. Investigation Workspace.
8. Operational Analytics.
9. Finding Detail.
10. Alert Source Dashboard.
11. Data Source Center.
12. Response workflow.
13. Reports.
14. Audit records relevant to the user.

No unrelated application area should be added.

---

# 9. SOC Analyst Dashboard

The dashboard is the primary operational interface.

## 9.1 Top Metrics

Display:

* Live Alerts.
* Critical Alerts.
* High-Risk Alerts.
* Active Incidents.
* Open Investigations.
* Execution-Gap Findings.
* Negative-Space Findings.
* Review Priorities.

## 9.2 Dashboard Components

The dashboard must contain:

* Live alert stream.
* Recent critical alerts.
* Incident queue.
* Risk distribution.
* Severity distribution.
* Alert-source distribution.
* Alerts by category.
* Recent incident activity.
* Latest findings.
* Top review priorities.
* Investigation-duration trend.
* Escalation trend.
* Closure trend.
* Peer deviation summary.
* Data-quality status.

## 9.3 Realtime Behavior

The dashboard must update automatically without manual refresh.

---

# 10. Live Alert Monitoring

Alert flow:

```text
Alert Source
     ↓
Ingestion API
     ↓
Database
     ↓
Realtime Event
     ↓
SOC Analyst Dashboard
```

Newly inserted alerts must become visible immediately.

Realtime events must support:

* New alert.
* Alert analysis completion.
* Risk update.
* Incident creation.
* Incident update.
* Finding creation.
* Response action.
* Incident resolution.

---

# 11. Alert Source Dashboard

The Alert Source dashboard provides scenario-based synthetic security-event generation.

## 11.1 Authentication Scenarios

* Brute Force.
* Credential Stuffing.
* Impossible Travel.
* Suspicious Login.
* Privileged Login.
* MFA Abuse.

## 11.2 Endpoint Scenarios

* Malware Detection.
* Suspicious PowerShell.
* Suspicious Process.
* Ransomware Behavior.
* Privilege Escalation.

## 11.3 Network Scenarios

* Port Scan.
* Command-and-Control Activity.
* Data Exfiltration.
* Suspicious DNS.
* Unusual Network Connection.

## 11.4 Database Scenarios

* Unusual Query.
* Bulk Data Read.
* Privilege Abuse.
* Suspicious Database Login.

## 11.5 Email Scenarios

* Phishing.
* Malicious Attachment.
* Suspicious Link.

## 11.6 Generation Modes

The generator must support:

* Single alert.
* Multi-alert attack sequence.
* High-volume burst.
* Repeated event scenario.
* Benign / false-positive scenario.
* Custom severity.
* Synthetic timestamps where appropriate.

---

# 12. Alert Ingestion

Incoming alerts enter through an ingestion API.

```text
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
```

The original alert must be stored before optional AI enrichment.

If later analysis fails, the original alert remains available.

---

# 13. Common Alert Schema

All supported alerts must be normalized into a common model.

Fields:

* `id`
* `source_id`
* `event_type`
* `event_category`
* `severity`
* `timestamp`
* `user_id`
* `user_name`
* `asset_id`
* `asset_name`
* `source_ip`
* `destination_ip`
* `source_port`
* `destination_port`
* `protocol`
* `action`
* `status`
* `description`
* `indicator`
* `technique`
* `raw_payload`
* `metadata`
* `created_at`

Source-specific information belongs in structured metadata.

---

# 14. Data Source Center

The SOC Analyst must be able to import structured security evidence.

## 14.1 Supported Inputs

Initial support:

* CSV.
* JSON.
* PostgreSQL/database exports.

Connector architecture may support:

* MongoDB.
* MySQL.
* Supabase.
* REST APIs.

## 14.2 Import Workflow

```text
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
```

Database credentials must not unnecessarily reach the frontend.

Connector processing must occur in the trusted backend.

---

# 15. Automatic Alert Triage

Every incoming alert must pass through the analytical pipeline.

```text
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
```

Output:

* Priority.
* Risk.
* Confidence.
* Estimated false-positive likelihood.
* Detection reasons.
* Related activity.
* Recommended analyst attention level.

---

# 16. Risk Engine

Risk is a score from:

```text
0–100
```

Potential contributors:

* Source severity.
* Asset criticality.
* User privilege.
* Event category.
* Correlation strength.
* Behavioral anomaly.
* Known malicious indicators.
* Historical activity.
* Repeated activity.
* Investigation context.
* Peer deviation.

Example:

```text
Severity                  +20
Asset Criticality         +18
Correlation               +22
Behavioral Anomaly        +15
Known Indicator           +10
Historical Context         +8
--------------------------------
Risk Score                 93
```

Actual implementation must normalize contributions to a known 0–100 range.

Risk is not proof of compromise.

---

# 17. Confidence Engine

Confidence measures how strongly the available evidence supports the current analysis.

Example:

```text
Risk:        93/100
Confidence:  89%
```

Risk and confidence must remain separate.

A high-risk alert with low confidence must be presented as uncertain and prioritized appropriately for investigation.

---

# 18. Estimated False-Positive Likelihood

CyberScope must estimate whether activity may have a legitimate explanation.

Reducing signals may include:

* Trusted IP.
* Approved maintenance.
* Known security scanner.
* Authorized administrator.
* Known automation.
* Duplicate alert.
* Historical legitimate behavior.

Example:

```text
Risk: 82
Confidence: 91%
Estimated False-Positive Likelihood: 8%
```

The interface must use terms such as:

* Estimated.
* Likelihood.

The system must never claim mathematical proof that an alert is real or fake.

---

# 19. Context Enrichment

Where available, enrich alerts using:

* Asset criticality.
* User privilege.
* Known source classification.
* Historical activity.
* Related events.
* Historical incidents.
* Threat indicators.
* Peer statistics.

Optional enrichment must never prevent the core pipeline from operating.

---

# 20. Detection Engine

CyberScope combines multiple analytical approaches.

## 20.1 Rule Engine

Detect known patterns.

Rules include examples such as:

* Multiple failed logins.
* Successful login after repeated failures.
* Impossible travel.
* Privileged login anomaly.
* Repeated suspicious process.
* Bulk database extraction.
* Suspicious DNS behavior.

Rules must be versioned.

Every rule finding must identify its rule.

## 20.2 Statistical Analysis

Detect deviations from baselines.

Examples:

* Unusually high login count.
* Unusually high alert rate.
* Unusually short investigation duration.
* Unusually fast closure.
* Abnormal escalation frequency.
* Sudden change in activity level.

## 20.3 Machine Learning

Use appropriate scikit-learn techniques including:

* Isolation Forest.
* Local Outlier Factor.
* Clustering.
* Behavioral baselines.

ML outputs must contain metadata sufficient for explainability.

---

# 21. Alert Correlation Engine

CyberScope must identify relationships between alerts.

Correlation signals include:

* Same user.
* Same asset.
* Same source IP.
* Same destination.
* Same hostname.
* Same indicator.
* Same event type.
* Similar category.
* Similar technique.
* Time proximity.
* Sequence relationships.

Example:

```text
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
```

Every correlation must explain why alerts were grouped.

Example explanation:

```text
Alerts were correlated because they involve the same
user and endpoint, share related indicators, and occurred
within a configured time window.
```

---

# 22. Incident Engine

An incident represents related alerts/activity forming a coherent security story.

## 22.1 Incident Fields

* `incident_id`
* `title`
* `severity`
* `risk_score`
* `confidence_score`
* `status`
* `primary_user`
* `primary_asset`
* `summary`
* `created_at`
* `updated_at`
* `resolved_at`

## 22.2 Incident States

```text
OPEN
IN_PROGRESS
RESOLVED
```

## 22.3 Analyst Actions

The SOC Analyst can:

* Open incident.
* Start investigation.
* Add notes.
* Review evidence.
* Approve response.
* Reject response.
* Execute sandbox response.
* Resolve incident.

---

# 23. Incident Timeline

Every incident must provide a chronological timeline.

Example:

```text
10:01  Multiple failed logins
10:03  Successful login
10:04  New device registered
10:05  Suspicious PowerShell execution
10:07  Privilege escalation
10:10  Malware detection
```

Every timeline item must link to its underlying alert/event.

---

# 24. Investigation Workspace

The Investigation Workspace must include:

## Incident Summary

* Title.
* Risk.
* Confidence.
* Severity.
* Status.

## What Happened

Evidence-based summary.

## Why Suspicious

Detected signals and relationships.

## Potential Impact

Potential impact areas:

* Users.
* Assets.
* Services.
* Data.
* Business operations.

Actual damage must not be claimed without evidence.

## Evidence

* Alert IDs.
* Event timestamps.
* Assets.
* Users.
* IPs.
* Indicators.
* Related incidents.
* Rule signals.
* ML signals.

## Investigation Recommendations

Suggested verification steps for the analyst.

## Response Recommendations

Potential containment actions.

## Analyst Notes

Analyst-authored notes.

---

# 25. Local LLM Layer

Use Ollama with a locally hosted LLM.

Architecture:

```text
Structured Security Evidence
           ↓
      Prompt Builder
           ↓
         Ollama
           ↓
       Local LLM
           ↓
 Structured Explanation
```

## 25.1 LLM Capabilities

The LLM can generate:

* Alert explanation.
* Incident summary.
* Investigation narrative.
* Potential impact explanation.
* Recommended investigation steps.
* Recommended response.
* Finding explanation.
* Report narrative.

## 25.2 LLM Restrictions

The LLM must not:

* Independently assign arbitrary irreversible actions.
* Execute shell commands.
* Directly control infrastructure.
* Invent evidence.
* Claim certainty without evidence.

---

# 26. Evidence-Grounded AI

The prompt must contain relevant structured evidence:

* Alert metadata.
* Related events.
* Risk contributors.
* Anomaly signals.
* Correlation evidence.
* User context.
* Asset context.
* Timeline.

The LLM must be instructed to:

* Use only supplied evidence.
* Separate facts from inference.
* State uncertainty.
* Avoid invented entities/events.
* Avoid invented damage.
* Avoid claiming actions already happened.
* Provide recommendations rather than unauthorized commands.

AI-generated intelligence must retain evidence references.

---

# 27. AI Failure Handling

AI must never be a single point of failure.

If Ollama is unavailable:

```text
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
```

AI processing states:

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

The alert must remain fully accessible.

---

# 28. Operational Evidence Analytics

CyberScope analyzes:

* Alerts.
* Cases.
* Investigations.
* Escalations.
* Dispositions.
* Closure records.
* Asset inventory.
* Event data.

The goal is to identify operational patterns requiring investigation.

---

# 29. Execution-Gap Detection

Execution-gap detection identifies situations where documented or expected security capability appears stronger than observed operational evidence.

## 29.1 Unusually Fast Closure

```text
Critical Alert
     ↓
Closed unusually quickly
     ↓
Limited investigation evidence
     ↓
Potential Execution Gap
```

## 29.2 Missing Escalation

```text
Critical Event
     ↓
Investigation Exists
     ↓
Expected Escalation Missing
     ↓
Potential Execution Gap
```

## 29.3 Repetitive Investigations

```text
Large Case Set
     ↓
Highly Similar Investigation Patterns
     ↓
Little Case-Specific Evidence
     ↓
Potential Execution Gap
```

Every finding must include:

* Finding type.
* Severity.
* Reason.
* Evidence.
* Supporting records.
* Relevant thresholds.
* Peer context where available.

---

# 30. Negative-Space Detection

Negative-space analysis identifies expected evidence that is missing or unexpectedly low.

Examples:

* Critical asset has little security activity.
* Expected alert category is absent.
* Expected investigation records are missing.
* Expected escalation records are missing.
* Monitoring coverage appears incomplete.
* Activity is unusually low compared with peers.

Example:

```text
Unexpectedly low security activity for a critical asset
compared with comparable environments.

Possible monitoring coverage gap requiring review.
```

Negative-space signals must not automatically be treated as compromise.

---

# 31. Anomaly and Behavioural Analytics

Detect:

* Unusual alert volume.
* Unusual closure rate.
* Unusual closure duration.
* Unusual investigation duration.
* Unusual escalation behavior.
* Repeated alerts without remediation evidence.
* Sudden activity changes.
* Activity inconsistent with peer entities.

Every anomaly must show:

* Metric.
* Baseline.
* Observed value.
* Deviation.
* Interpretation.

---

# 32. Peer Benchmarking

Compare comparable entities/environments.

Metrics include:

* Alert volume.
* Critical alert ratio.
* Investigation duration.
* Escalation frequency.
* Closure duration.
* Reopened cases.
* Repeated alerts.
* Coverage activity.
* Evidence completeness.

Peer result:

```text
Entity
Peer Group
Metric
Entity Value
Peer Median
Deviation
Interpretation
```

Normalized metrics must be used where entity sizes differ.

---

# 33. Supervisory / Operational Risk Indicator

Generate explainable risk indicators from analytical findings.

Example:

```text
Entity Risk: 87/100

+22  Critical alerts without escalation
+18  Investigation evidence deficiency
+14  Repeated unresolved asset activity
+12  Peer deviation
+11  Monitoring coverage concern
+10  Closure-time anomaly
```

Every contributor must link to evidence.

The risk indicator is a prioritization tool, not a declaration of compromise or organizational failure.

---

# 34. Review Prioritization

CyberScope must rank:

* Entities.
* Security processes.
* Controls.
* Alerts.
* Cases.
* Investigations.
* Findings.

Example:

```text
Priority 1
CSE-017 — Escalation weakness

Priority 2
CSE-004 — Monitoring coverage concern

Priority 3
CSE-011 — Investigation quality anomaly
```

Every priority must support drill-down to underlying evidence.

---

# 35. Evidence and Traceability

Every important finding must contain:

* Finding ID.
* Entity.
* Finding Type.
* Severity.
* Risk Score.
* Title.
* Summary.
* Reason.
* Evidence.
* Supporting Records.
* Analytical Signals.
* Peer Context.
* Rule/Model Information.
* Created At.

Navigation:

```text
Finding
   ↓
Case / Incident
   ↓
Investigation
   ↓
Alert / Event
   ↓
Normalized Evidence
```

The analyst must be able to answer:

> Why was this alert, incident, or finding prioritized?

---

# 36. Data Quality Engine

Incoming datasets must be inspected before analysis.

Checks:

* Missing timestamps.
* Missing severity.
* Missing entity.
* Missing case IDs.
* Missing investigation data.
* Invalid values.
* Duplicate records.
* Invalid time order.
* Orphan records.
* Unexpected categories.

Example report:

```text
Records processed: 125,430
Valid:               123,982
Duplicates:              812
Missing timestamps:      341
Missing case references: 295
```

Data-quality problems must be visible and may contribute to negative-space findings when appropriate.

---

# 37. Search and Filtering

Support:

* Alert ID.
* Incident ID.
* Case ID.
* User.
* Asset.
* Source IP.
* Event type.
* Alert source.
* Severity.
* Risk.
* Finding ID.
* Time range.
* Status.
* Finding type.

Large datasets must use pagination and server-side filtering.

---

# 38. Response Engine

CyberScope provides controlled response functionality for internal demonstration/testing.

Response concepts:

* Block IP.
* Disable user.
* Terminate session.
* Isolate endpoint.
* Quarantine artifact.
* Investigate further.

The response engine must use controlled actions.

No free-form AI commands are permitted.

---

# 39. Response Policy Engine

Policies deterministically evaluate structured data.

Example:

```text
IF
risk >= 90
AND
confidence >= 85
AND
malicious_indicator = true

THEN

recommend BLOCK_IP
```

Policy fields:

* `policy_id`
* `name`
* `conditions`
* `action`
* `enabled`
* `requires_approval`
* `created_at`
* `updated_at`

Policy execution must be auditable.

---

# 40. Analyst Approval

High-impact actions use:

```text
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
```

Default behavior for high-impact actions must require analyst approval.

---

# 41. Sandbox Response Environment

All demonstrated response actions occur inside controlled sandbox state.

## Sandbox User

```text
User: USR-4821
Previous State: ACTIVE
Action: DISABLE USER
New State: BLOCKED
Rollback: AVAILABLE
```

## Sandbox Endpoint

```text
Endpoint: EP-0017
Previous State: CONNECTED
Action: ISOLATE
New State: ISOLATED
Rollback: AVAILABLE
```

## Sandbox Firewall

```text
IP: 185.x.x.x
Action: BLOCK
Status: BLOCKED
Rollback: AVAILABLE
```

All simulated actions must be reversible.

---

# 42. Automatic Response

Supported workflow:

```text
Risk / Detection
       ↓
Policy Match
       ↓
Action
       ↓
Sandbox Execution
       ↓
Audit Log
```

Approval-required workflow:

```text
Risk / Detection
       ↓
Policy Match
       ↓
Analyst Approval
       ↓
Sandbox Execution
       ↓
Audit Log
```

---

# 43. Audit Logging

Record important actions.

Audit fields:

* `audit_id`
* `actor_user_id`
* `actor_role`
* `action`
* `target_type`
* `target_id`
* `reason`
* `previous_state`
* `new_state`
* `metadata`
* `timestamp`

Audit events include:

* Login.
* Logout.
* Alert submission.
* Alert analysis.
* Incident creation.
* Investigation start.
* Finding creation.
* Finding review.
* Response recommendation.
* Response approval.
* Response rejection.
* Response execution.
* Response rollback.
* Incident resolution.
* Dataset import.
* Data-source configuration.
* Rule updates.

Normal users must not silently modify historical audit records.

---

# 44. Database Design

Logical entities:

## Identity

* `profiles`
* `roles`

## Sources

* `alert_sources`
* `data_sources`
* `data_source_connections`
* `data_source_schemas`
* `data_source_mappings`

## Security Evidence

* `events`
* `alerts`
* `cases`
* `investigations`
* `escalations`
* `dispositions`
* `assets`
* `users_directory`

## Intelligence

* `alert_analysis`
* `risk_scores`
* `anomaly_scores`
* `correlation_results`
* `threat_indicators`
* `incidents`
* `incident_alerts`
* `incident_timeline`

## Analytics

* `execution_gap_findings`
* `negative_space_findings`
* `peer_benchmarks`
* `capability_scores`
* `review_priorities`
* `operational_findings`

## Evidence

* `evidence`

## Response

* `detection_rules`
* `response_policies`
* `response_actions`
* `sandbox_users`
* `sandbox_endpoints`
* `sandbox_firewall_rules`

## Audit / Reporting

* `audit_logs`
* `reports`

---

# 45. Representative Data Structures

## alerts

Fields:

```text
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
```

## alert_analysis

```text
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
```

## incidents

```text
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
```

## findings

```text
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
```

## evidence

```text
id
finding_id
source_type
source_id
evidence_type
evidence_value
metadata
created_at
```

---

# 46. Realtime Architecture

Realtime flow:

```text
PostgreSQL Change
       ↓
Realtime Layer
       ↓
WebSocket / Event
       ↓
React
       ↓
UI Update
```

Realtime must not require manual page refresh.

Realtime must support:

* Alerts.
* Alert analysis.
* Risk updates.
* Incident creation.
* Incident updates.
* Findings.
* Response actions.
* Resolution.

---

# 47. Background Processing

Background workers must handle computationally expensive operations.

Candidates:

* Alert analysis.
* Large dataset processing.
* Anomaly detection.
* Peer benchmarking.
* Report generation.
* Data-quality checks.
* Long-running analytical processing.

Expensive operations must not block normal API requests.

---

# 48. Reporting

Reports must support:

* PDF.
* CSV.
* JSON.

## Report Sections

### Executive Summary

* Overall findings.
* High-priority incidents.
* Operational risk indicators.

### Detailed Findings

* Execution gaps.
* Negative-space findings.
* Peer deviations.
* Behavioral anomalies.

### Evidence

* Supporting records.
* Alert IDs.
* Case IDs.
* Timestamps.
* Analytical signals.

### Recommendations

* Investigation priorities.
* Suggested response actions.

### Audit Information

* Dataset version.
* Rule version.
* Model version.
* Generation timestamp.

---

# 49. Alert Detail UI

Required sections:

1. Alert Identity.
2. Severity.
3. Risk.
4. Confidence.
5. Estimated False-Positive Likelihood.
6. Context.
7. Detected Signals.
8. Potential Threat.
9. Potential Impact.
10. Related Alerts.
11. Related Incident.
12. Evidence.
13. Timeline.
14. Recommended Investigation.
15. Recommended Response.
16. Audit History.

---

# 50. Incident Detail UI

Required sections:

1. Incident Header.
2. Risk.
3. Confidence.
4. Severity.
5. Status.
6. Summary.
7. What Happened.
8. Why Suspicious.
9. Potential Impact.
10. Related Alerts.
11. Timeline.
12. Affected Users.
13. Affected Assets.
14. Investigation Intelligence.
15. Evidence.
16. Recommendations.
17. Response Actions.
18. Audit Trail.

---

# 51. Operational Analytics UI

Analytics area must display:

* Execution gaps.
* Negative space.
* Anomalies.
* Peer benchmarks.
* Risk indicators.
* Review priorities.
* Trend analysis.

Every chart/indicator must support drill-down.

---

# 52. Finding Detail UI

Example finding:

```text
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
```

Finding detail must expose evidence and analytical reasoning.

---

# 53. Data Relationships

Core relationship:

```text
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
```

Additional:

```text
Entity
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
```

---

# 54. API Requirements

## Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Alerts

```text
POST /alerts
GET  /alerts
GET  /alerts/{id}
POST /alerts/{id}/reanalyze
```

## Alert Analysis

```text
GET  /alerts/{id}/analysis
POST /analysis/alert/{id}
```

## Incidents

```text
GET /incidents
GET /incidents/{id}
POST /incidents/{id}/start-investigation
POST /incidents/{id}/resolve
```

## Investigation

```text
GET /incidents/{id}/timeline
GET /incidents/{id}/intelligence
POST /incidents/{id}/notes
```

## Data Sources

```text
POST /sources/csv
POST /sources/json
POST /sources/database
POST /sources/validate
POST /sources/map-schema
POST /sources/import
```

## Analytics

```text
POST /analytics/run
GET  /analytics/findings
GET  /analytics/execution-gaps
GET  /analytics/negative-space
GET  /analytics/peer-benchmarks
GET  /analytics/review-priorities
```

## Response

```text
GET  /response/policies
POST /response/actions
POST /response/actions/{id}/approve
POST /response/actions/{id}/reject
POST /response/actions/{id}/rollback
```

## Reports

```text
POST /reports/generate
GET  /reports
GET  /reports/{id}
```

## Audit

```text
GET /audit
```

---

# 55. API Standards

Every API must:

* Validate request bodies.
* Enforce role permissions.
* Return consistent JSON.
* Use meaningful HTTP status codes.
* Support pagination.
* Record important errors.
* Avoid exposing secrets.
* Avoid returning credentials.
* Handle duplicate requests where required.
* Use Pydantic validation.

---

# 56. Error Handling

## Frontend

Handle:

* Loading.
* Empty states.
* Network failures.
* Unauthorized state.
* Server errors.
* Analysis pending.
* Analysis failure.

## Backend

Handle:

* Database errors.
* Validation errors.
* Connector failures.
* ML errors.
* LLM failures.
* Realtime failures.
* Background-task failures.

One failed subsystem must not crash the entire application.

---

# 57. Search and Performance

The prototype must support:

* Tens of thousands of alerts.
* Batch analysis.
* Pagination.
* Indexed queries.
* Incremental processing.
* Async expensive operations.
* Realtime updates.
* Large evidence tables.

The browser must not load entire datasets.

Large computations must execute server-side.

---

# 58. Security Requirements

Mandatory:

* RBAC.
* Server-side authorization.
* Input validation.
* Parameterized queries.
* Secret management.
* Audit logging.
* Protected APIs.
* Secure connector handling.
* No secrets in Git.
* No API keys in frontend.
* Sanitized error messages.
* Least-privilege database access.
* Safe logging.

---

# 59. Offline Deployment

CyberScope must operate locally without Internet access.

Target environment:

```text
Air-Gapped Network
       |
       +-- React frontend
       +-- FastAPI backend
       +-- PostgreSQL
       +-- Analytics engine
       +-- Ollama / Local LLM
       +-- Local realtime service
       +-- Local scheduler / worker
```

Runtime must not require:

* OpenAI.
* Gemini.
* Claude.
* Cloud database.
* SaaS authentication.
* Hosted AI.
* External threat-intelligence APIs.

Required libraries, models, and containers must be provisioned beforehand.

---

# 60. Docker Deployment

Expected services:

```text
frontend
backend
postgres
realtime
analytics-worker
scheduler
ollama
```

Support:

```text
docker compose up -d
```

Provide:

* `.env.example`
* Database migrations.
* Seed data.
* Health checks.
* Startup scripts.
* Model setup instructions.
* Local configuration.

---

# 61. Environment Configuration

Development:

```text
APP_ENV=development

DATABASE_MODE=supabase

LLM_MODE=ollama

REALTIME_MODE=supabase

OFFLINE_MODE=false
```

Local:

```text
APP_ENV=offline

DATABASE_MODE=local

LLM_MODE=ollama

REALTIME_MODE=local

OFFLINE_MODE=true

EXTERNAL_APIS=false
```

Credentials and deployment-specific values must never be hard-coded.

---

# 62. Synthetic Data

Synthetic datasets must exist for:

* Authentication.
* Endpoint.
* Network.
* Database.
* Email.
* Cases.
* Investigations.
* Escalations.
* Dispositions.
* Asset inventory.
* Multiple entities.
* Peer groups.

Datasets must include:

* Normal activity.
* Suspicious activity.
* Benign scenarios.
* Execution-gap scenarios.
* Negative-space scenarios.
* Peer-deviation scenarios.

---

# 63. Primary Demonstration Scenario

The primary live demonstration is an Account Takeover scenario.

Generate:

1. Multiple failed logins.
2. Successful login from unusual IP.
3. New device activity.
4. Suspicious PowerShell.
5. Privilege escalation.

Expected flow:

```text
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
```

Expected sample outcome:

```text
Possible Account Takeover

Risk: 96/100
Confidence: 92%
```

These values are demonstration outcomes, not guaranteed analytical outputs.

---

# 64. Supervisory Analytics Demonstration

Use a synthetic operational dataset with multiple entities.

Example:

```text
Critical Alerts:             120
Investigated:                118
Escalated:                    49
Closed:                      117
Median Investigation:         4 min
Peer Median:                 41 min
```

Expected finding:

```text
Potential Execution Gap
```

Indicators:

* Unusually short investigations.
* Low escalation rate.
* Limited investigation evidence.
* Significant peer deviation.

---

# 65. Negative-Space Demonstration

Example:

```text
Critical Asset: DB-PROD-04
Expected Activity: High
Observed Activity: Very Low
Peer Activity: High
```

Expected:

```text
Potential Negative-Space Signal
```

Interpretation:

```text
Possible monitoring coverage gap requiring review.
```

It must not be presented as proof of compromise.

---

# 66. Model / Rule / Prompt Versioning

Store:

* Rule version.
* Model version.
* Feature version.
* Prompt version.

Important analytical outputs must store the versions used.

This provides reproducibility.

---

# 67. Explainability

## Rule Outputs

Show:

* Rule ID.
* Conditions met.
* Observed values.
* Thresholds.

## ML Outputs

Show:

* Model.
* Input features.
* Anomaly score.
* Relevant indicators.

## LLM Outputs

Show:

* Model version.
* Prompt version.
* Evidence references.
* Generated explanation.
* Timestamp.

---

# 68. Auditability

Every important system result must be traceable to:

```text
Dataset
   ↓
Record
   ↓
Signal
   ↓
Rule / Model
   ↓
Score
   ↓
Explanation
   ↓
Analyst Action
```

The system must provide an inspectable evidence chain.

---

# 69. UI / UX Requirements

The UI must be:

* Professional.
* Enterprise-grade.
* Clean.
* High information density.
* Accessible.
* Responsive.
* Consistent.
* Easy to scan.

Use:

* Clear typography.
* Consistent severity indicators.
* Filterable tables.
* Useful metric cards.
* Charts for trends/comparisons.
* Incident timelines.
* Evidence panels.

Avoid:

* Excessive neon.
* Hacker imagery.
* Decorative animations.
* Unnecessary 3D effects.
* Visual clutter.

---

# 70. Maintainability

Backend modules:

```text
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
```

Frontend modules:

```text
components/
pages/
layouts/
hooks/
services/
types/
utils/
```

Business logic must not be placed directly inside UI components.

---

# 71. Project Structure

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
│   └── requirements.txt
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
├── docker/
├── tests/
├── docs/
├── scripts/
├── docker-compose.yml
├── .env.example
├── README.md
└── spec.md
```

---

# 72. Development Roadmap

## Phase 1 — Foundation

Implement:

* Repository.
* React/Vite.
* FastAPI.
* Database.
* Authentication.
* Two roles.
* Navigation.
* Layouts.

## Phase 2 — Alert Pipeline

Implement:

* Alert Source.
* Alert generation.
* Ingestion API.
* Validation.
* Normalization.
* Database storage.
* Realtime updates.

## Phase 3 — Triage

Implement:

* Rules.
* Risk scoring.
* Confidence.
* Estimated false-positive likelihood.
* Context enrichment.
* Alert details.

## Phase 4 — Correlation

Implement:

* Correlation engine.
* Incident creation.
* Incident UI.
* Timeline.
* Investigation workflow.

## Phase 5 — Local AI

Implement:

* Ollama.
* Prompt builder.
* Alert explanations.
* Incident summaries.
* Investigation intelligence.
* Failure handling.

## Phase 6 — Operational Analytics

Implement:

* Execution gaps.
* Negative space.
* Anomaly analysis.
* Peer benchmarking.
* Risk indicators.
* Review prioritization.

## Phase 7 — Response

Implement:

* Response policies.
* Approval workflow.
* Sandbox IP block.
* Sandbox account disable.
* Sandbox endpoint isolation.
* Rollback.
* Audit logs.

## Phase 8 — Data Sources

Implement:

* CSV.
* JSON.
* PostgreSQL.
* Schema mapping.
* Validation.

## Phase 9 — Reports

Implement:

* PDF.
* CSV.
* JSON.

## Phase 10 — Hardening

Implement:

* Testing.
* Security review.
* Performance optimization.
* Docker packaging.
* Offline validation.
* Demo datasets.
* Documentation.

---

# 73. MVP Requirements

The MVP must include:

* Two-role authentication.
* Alert Source dashboard.
* Synthetic alert generation.
* Alert ingestion.
* Normalization.
* Realtime alert feed.
* Automatic triage.
* Risk score.
* Confidence score.
* Estimated false-positive likelihood.
* Alert correlation.
* Incident creation.
* Incident timeline.
* Investigation interface.
* Local LLM explanation.
* Analyst dashboard.
* Execution-gap analytics.
* Negative-space analytics.
* Peer benchmarking.
* Evidence-backed findings.
* Audit logging.
* Sandbox response.
* CSV/JSON import.
* Offline Docker deployment.

---

# 74. Testing Requirements

## Test 1 — Valid Low-Risk Alert

Input:

Valid low-risk alert.

Expected:

```text
Accepted
↓
Stored
↓
Analyzed
↓
Visible
```

## Test 2 — Related Alerts

Input:

Related alerts.

Expected:

```text
Multiple Alerts
↓
Correlation
↓
Incident
```

## Test 3 — Malformed Data

Input:

Malformed alert.

Expected:

```text
Validation Error
```

## Test 4 — Local LLM Unavailable

Expected:

```text
Alert Stored
Rules Run
ML Runs
AI State = FAILED/PENDING
```

## Test 5 — Incident Resolution

Expected:

```text
Incident = RESOLVED
Dashboard Updates
Audit Entry Created
```

---

# 75. Analytics Validation

Analytics must be validated against expert-reviewed reference findings.

Workflow:

```text
Expert Review
      ↓
Reference Findings
      ↓
CyberScope
      ↓
Detected Findings
      ↓
Comparison
```

Measure where appropriate:

* Precision.
* Recall.
* False-positive rate.
* Evidence coverage.
* Ranking quality.
* Analyst agreement.

No invented accuracy percentages are permitted.

---

# 76. Performance Requirements

CyberScope must be designed for:

* Tens of thousands of alerts.
* Large datasets.
* Batch processing.
* Indexed queries.
* Pagination.
* Incremental processing.
* Background computation.
* Realtime updates.
* Large evidence tables.

The frontend must not retrieve entire datasets.

---

# 77. Reliability Requirements

The following must fail independently without taking down the whole platform:

* LLM.
* ML analysis.
* Realtime layer.
* Background workers.
* Database-dependent connector.
* Dataset import.
* Report generation.

Core alert storage must remain available even when optional enrichment fails.

---

# 78. Product Terminology

Use these terms consistently:

* CyberScope.
* SOC Analyst.
* Alert Source.
* Security Alert.
* Event.
* Incident.
* Investigation.
* Evidence.
* Risk Score.
* Confidence Score.
* Estimated False-Positive Likelihood.
* Execution Gap.
* Negative Space.
* Anomaly.
* Peer Benchmark.
* Review Priority.
* Evidence-Backed Finding.
* Local LLM.
* Air-Gapped.
* Sandbox Response.
* Audit Trail.

Avoid unsupported claims such as:

* AI proves an attack.
* 100% accuracy.
* Zero false positives.
* AI guarantees an alert is malicious.
* Real infrastructure control when using simulation.
* Guaranteed threat prevention.
* Guaranteed detection of every attack.

---

# 79. Final Operational Workflow

The complete operational workflow must be:

```text
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
```

---

# 80. Final Analytics Workflow

The analytics workflow must be:

```text
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
```

---

# 81. Product Positioning

CyberScope must be described as:

> CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security data into prioritized, explainable insights for SOC analysts.

Core operational transformation:

```text
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
```

Analytical transformation:

```text
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
```

---

# 82. Definition of Done

CyberScope is operationally complete only when the following workflow works end-to-end:

```text
Alert Source Login
        ↓
Generate Account Takeover Scenario
        ↓
Alerts Ingested
        ↓
Realtime Alert Feed
        ↓
Normalization
        ↓
Rules + ML
        ↓
Risk
        ↓
Confidence
        ↓
Estimated FP Likelihood
        ↓
Correlation
        ↓
Incident Creation
        ↓
Timeline
        ↓
Local LLM Intelligence
        ↓
Investigation
        ↓
Response Recommendation
        ↓
Approval / Policy
        ↓
Sandbox Response
        ↓
Audit Trail
        ↓
Resolution
```

The analytics workflow must also work end-to-end:

```text
Operational Dataset
        ↓
Data Quality
        ↓
Execution Gap Detection
        ↓
Negative Space Detection
        ↓
Anomaly Detection
        ↓
Peer Benchmarking
        ↓
Risk Indicators
        ↓
Review Priorities
        ↓
Evidence-Backed Findings
```

The final application must be:

* Integrated.
* Functional.
* Explainable.
* Auditable.
* Role-aware.
* Secure.
* Testable.
* Reversible where response actions are simulated.
* Locally deployable.
* Offline-capable.
* Dockerized.
* Demonstrable using synthetic data.

This PRD defines the complete CyberScope application scope and must be used as the implementation reference throughout development.
