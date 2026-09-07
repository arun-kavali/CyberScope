# CyberScope — Complete UI/UX Design Specification

## 1. Document Purpose

This document defines the complete UI/UX design system, application layout, navigation, screens, components, interaction patterns, states, and visual behavior for CyberScope.

CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security evidence into prioritized, explainable insights for SOC Analysts.

The UI must represent the complete CyberScope workflow:

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

The operational analytics workflow is:

Security Operational Evidence
↓
Execution Gaps
+
Negative Space
+
Anomalies
+
Peer Deviations
↓
Explainable Risk
↓
Review Priority
↓
Evidence-Backed Finding

The interface must feel like a professional enterprise SOC platform.

The design must NOT look like:
- A gaming dashboard
- A hacker-themed website
- A neon cyberpunk interface
- A cryptocurrency dashboard
- A generic AI chatbot
- A decorative landing page

The interface must look like:
- Enterprise cybersecurity software
- SOC/SIEM investigation software
- Evidence-driven analytics software
- Professional security operations tooling

---

# 2. Primary Design Direction

## 2.1 Theme

Use a LIGHT GREEN + WHITE enterprise theme.

Do NOT use a dark theme.

Primary visual colors:

- White: primary background
- Very light green: secondary backgrounds
- Green: primary action color
- Dark green: headings and important navigation
- Red: critical/high-risk states
- Orange/amber: warnings and medium severity
- Blue: informational/AI/evidence states
- Gray: secondary information

The interface must maintain strong readability and accessibility.

---

# 3. Brand Identity

## Product Name

CyberScope

## Tagline

From Security Evidence to Actionable Insight

## Product Description

Evidence-driven cybersecurity intelligence for SOC Analysts.

## Brand Symbol

Use a simple shield/security icon.

Avoid:
- Hacker masks
- Skulls
- Circuit-board logos
- Excessive cyber imagery

---

# 4. Global Layout

The authenticated application uses a persistent enterprise dashboard layout.

Structure:

------------------------------------------------------------
| Top Header                                               |
------------------------------------------------------------
| Sidebar | Main Content                                   |
|         |                                                |
|         |                                                |
|         |                                                |
------------------------------------------------------------

## 4.1 Top Header

The header contains:

Left:
- CyberScope shield logo
- CyberScope
- Small environment indicator:
  "Simulated SOC Environment"

Right:
- Notification indicator
- Current user display name
- Role badge
- Profile/avatar
- Logout

Example:

CyberScope   [Simulated SOC Environment]                  Arun
                                                          SOC Analyst
                                                          Logout

The header should remain visually lightweight.

---

# 5. Sidebar Navigation

## SOC Analyst Navigation

The SOC Analyst sidebar contains:

MAIN

1. Dashboard
2. Alerts
3. Incidents
4. Investigations
5. Data Sources
6. Analytics
7. Findings
8. Review Priorities
9. Response
10. Reports
11. Audit Trail

The sidebar must clearly highlight the currently selected page.

Use simple line icons.

Do not use excessive icons.

---

# 6. Alert Source Navigation

The Alert Source role must NOT see the SOC Analyst navigation.

Alert Source navigation:

1. Submit Alert
2. Scenario Generator
3. Submission History

Header:

CyberScope
Alert Source Portal

Right side:
- Current Alert Source identity
- Role badge
- Logout

Alert Source must never have access to:
- Analyst dashboard
- Incidents
- Investigations
- Findings
- Analyst notes
- Internal AI intelligence
- Response actions
- Unrelated audit records

Authorization must be enforced server-side.

---

# 7. Global UI Components

Use a consistent component system.

Required components:

- Button
- Input
- Password Input
- Select
- Multi-select
- Search Input
- Date Range Picker
- Filter Dropdown
- Badge
- Severity Badge
- Risk Badge
- Confidence Indicator
- Status Badge
- Card
- Data Table
- Pagination
- Tabs
- Modal
- Confirmation Dialog
- Drawer
- Timeline
- Tooltip
- Toast
- Alert Banner
- Progress Indicator
- Skeleton Loader
- Empty State
- Error State
- Loading State
- Evidence Card
- Metric Card
- Chart Container
- AI Explanation Panel
- Audit Record
- Approval Panel

Use consistent spacing, border radius and typography.

---

# 8. Severity System

Severity levels:

LOW
MEDIUM
HIGH
CRITICAL

Visual behavior:

LOW:
- Green indicator

MEDIUM:
- Amber indicator

HIGH:
- Orange/red indicator

CRITICAL:
- Strong red indicator

Severity must always be represented using:
- Text
- Badge
- Optional icon

Never rely only on color.

---

# 9. Risk Score System

Risk score:

0–100

Display format:

Risk
93 / 100

Use a compact horizontal indicator or progress visualization.

Risk ranges:

0–24:
Low

25–49:
Moderate

50–74:
High

75–89:
Very High

90–100:
Critical

Risk is an analytical prioritization score.

Never display it as proof of compromise.

---

# 10. Confidence Score

Display separately from Risk.

Example:

Risk
93/100

Confidence
89%

These must never be visually combined into a single score.

If risk is high but confidence is low, show:

High Risk
Low Confidence
Investigation Recommended

---

# 11. False-Positive Likelihood

Use exact terminology:

Estimated False-Positive Likelihood

Example:

Estimated False-Positive Likelihood
8%

Use neutral language.

Never display:

"False Positive"
"Definitely Safe"
"Definitely Malicious"

unless referring to analyst disposition rather than automated certainty.

---

# 12. Login Screen

Route:

/auth/login

Design:

Two-column layout.

LEFT:

Green gradient/light-green branded panel.

Display:

CyberScope

From Security Evidence to Actionable Insight

Short description:

Evidence-driven cybersecurity intelligence for SOC operations.

Bottom:

"Local-first security intelligence"

RIGHT:

White authentication card.

Heading:

Welcome back

Subtitle:

Sign in to your account to continue.

Fields:

Email / Username
Password

Controls:

Show/hide password

Button:

Sign In

Validation:
- Required field
- Invalid credentials
- Session expired
- Server unavailable

Do not show role selection on login.

Role is determined by authenticated account.

---

# 13. Authentication State Screens

Support:

Loading authentication
Session expired
Unauthorized
Forbidden
Invalid credentials
Server unavailable

Unauthorized screen:

403
Access Denied

Message:

You do not have permission to access this resource.

Button:

Return to Dashboard

---

# 14. SOC Analyst Dashboard

Route:

/dashboard

Purpose:

Provide a real-time operational view of the SOC.

Page header:

SOC Dashboard

Subtitle:

Real-time overview of security posture and operational risk.

---

## 14.1 Top Metric Cards

Display:

1. Live Alerts
2. Critical Alerts
3. High-Risk Alerts
4. Active Incidents
5. Open Investigations
6. Execution-Gap Findings
7. Negative-Space Findings
8. Review Priorities

Each card contains:

- Label
- Value
- Small trend/context indicator
- Relevant icon

Example:

LIVE ALERTS
56

CRITICAL ALERTS
12

ACTIVE INCIDENTS
14

OPEN INVESTIGATIONS
6

---

# 15. Dashboard Charts

## Alerts Over Time

Line chart.

Controls:
- Last 24 hours
- Last 7 days
- Last 30 days

Show:
- Alert count
- Critical alerts if appropriate

---

## Risk Distribution

Donut chart.

Segments:
- Low
- Medium
- High
- Critical

Clicking a segment opens filtered alerts.

---

## Severity Distribution

Display:

Low
Medium
High
Critical

---

## Alert Source Distribution

Horizontal bar chart.

Example sources:

- EDR
- Email Gateway
- Firewall
- Network Monitor
- Cloud IAM
- Database Monitor

Clicking a source filters the Alerts page.

---

## Alerts by Category

Categories:

Authentication
Endpoint
Network
Database
Email

---

## Incident Status

Chart:

OPEN
IN_PROGRESS
RESOLVED

---

# 16. Dashboard Tables

## Recent Critical Alerts

Columns:

Alert ID
Event Type
Severity
Risk
Source
User
Asset
Time
Status

Click row:
Open Alert Detail

---

## Active Incidents

Columns:

Incident ID
Title
Severity
Risk
Confidence
Status
Created
Updated

Click row:
Open Incident Detail

---

## Latest Findings

Columns:

Finding ID
Type
Severity
Risk
Entity
Status

---

## Top Review Priorities

Columns:

Priority
Entity
Finding
Risk
Reason

Click:
Open Finding Detail

---

# 17. Dashboard Operational Trends

Display:

Investigation Duration Trend

Escalation Trend

Closure Trend

Peer Deviation Summary

Data Quality Status

Each chart must support drill-down.

---

# 18. Live Realtime Behavior

Dashboard updates automatically.

Realtime events:

New alert
Alert analysis completion
Risk update
Incident creation
Incident update
Finding creation
Response action
Incident resolution

Do not require manual refresh.

Show a subtle realtime status indicator:

● Live

or

● Reconnecting

Do not use distracting animations.

---

# 19. Alerts Page

Route:

/alerts

Header:

Security Alerts

Subtitle:

View, search and analyze incoming security events.

---

## 19.1 Search

Search by:

Alert ID
Event Type
User
Asset
Source IP
Alert Source

---

## 19.2 Filters

Filters:

Severity
Risk
Status
Event Type
Alert Source
Time Range
Category

Button:

Clear Filters

---

# 20. Alerts Table

Columns:

Alert ID
Event Type
Category
Severity
Risk Score
Confidence
False-Positive Likelihood
Source
User
Asset
Status
Timestamp

Actions:

View
Open Incident
View Analysis

Use server-side pagination.

Do not load thousands of records into browser.

---

# 21. Alert Detail

Route:

/alerts/:id

Header:

Alert Details

Display:

Alert ID
Severity
Risk Score
Confidence
Estimated False-Positive Likelihood
Status

Actions:

View Incident
Reanalyze
Start Investigation if applicable

---

## 21.1 Alert Information

Show:

Alert ID
Event Type
Category
Source
Timestamp
User
Asset
Source IP
Destination IP
Ports
Protocol
Action
Status
Technique
Indicator

---

# 22. Alert Detail — What Happened

Evidence-grounded explanation.

Heading:

What Happened

Content should describe only available evidence.

---

# 23. Alert Detail — Why Suspicious

Display detected signals.

Examples:

- Multiple failed logins
- Successful login after repeated failures
- Unusual source location
- Suspicious process
- Known malicious indicator
- Behavioral anomaly

Each signal should be inspectable.

---

# 24. Alert Detail — Recommended Investigation

Show analyst verification steps.

Example:

1. Verify recent login activity.
2. Check source IP history.
3. Confirm user activity.
4. Review endpoint process history.
5. Validate privilege changes.

These are recommendations, not automatically executed commands.

---

# 25. Alert Detail — Potential Impact

Possible categories:

Users
Assets
Services
Data
Business Operations

Use wording:

Potential Impact

Never claim actual damage without evidence.

---

# 26. Alert Detail — Related Alerts

Table:

Alert ID
Type
Source
User
Asset
Severity
Risk
Timestamp

Click any alert to open its details.

---

# 27. Alert Detail — Related Incident

Display:

Incident ID
Title
Severity
Risk
Confidence
Status

Button:

View Incident

---

# 28. Alert Detail — Evidence

Display structured evidence:

Alert fields
Raw payload
Indicators
Timestamps
Users
Assets
IPs
Rule signals
ML signals
Correlation signals

Raw payload must be collapsible.

---

# 29. Alert Detail — Timeline

Display relevant chronological events.

Example:

10:01 Failed login
10:03 Successful login
10:04 New device
10:05 Suspicious PowerShell
10:07 Privilege escalation

Each timeline item links to underlying evidence.

---

# 30. Alert Analysis / Explainability

Use tabbed structure:

Rule Engine
Machine Learning
Correlation
AI Analysis

---

## Rule Engine

Display:

Rule ID
Rule Version
Conditions Met
Observed Values
Thresholds
Result

Example:

Rule:
AUTH-004

Condition:
Failed logins > 5

Observed:
9

Threshold:
>5

Result:
Matched

---

## Machine Learning

Display:

Model
Model Version
Anomaly Score
Input Features
Relevant Indicators
Result

Example:

Model:
Isolation Forest

Anomaly Score:
0.87

Result:
Anomalous

---

## Correlation

Display:

Correlation Score

Related signals:

Same user
Same asset
Same IP
Time proximity
Technique relationship

Explain why the events were grouped.

---

## AI Analysis

Display:

Local LLM
Model Version
Prompt Version
Generated At

Sections:

Explanation
Potential Impact
Recommended Investigation
Recommended Response

Include evidence references.

---

# 31. Incident List

Route:

/incidents

Header:

Incidents

Subtitle:

View correlated security incidents and investigations.

Search:

Incident ID
Title
User
Asset

Filters:

Severity
Status
Risk
Time Range

---

## Incident Table

Columns:

Incident ID
Title
Severity
Risk
Confidence
Status
Primary User
Primary Asset
Created
Updated

Statuses:

OPEN
IN_PROGRESS
RESOLVED

---

# 32. Incident Detail

Route:

/incidents/:id

Header:

Incident Details

Display:

Incident ID
Title
Severity
Risk
Confidence
Status

Actions:

Start Investigation
Add Note
Generate Intelligence
Approve Response
Reject Response
Resolve Incident

---

# 33. Incident Information

Show:

Title
Trigger Rule
Correlation Drivers
Created
Last Updated
Resolved At
Primary User
Primary Asset

---

# 34. Incident Summary

Sections:

What Happened
Why Suspicious
Potential Impact

---

# 35. Incident Timeline

Chronological timeline.

Every event must link to its source alert/event.

Example:

10:01 Multiple failed logins
10:03 Successful login
10:04 New device registered
10:05 Suspicious PowerShell
10:07 Privilege escalation
10:10 Malware detection

---

# 36. Related Alerts

Table:

Alert ID
Event Type
Source
User
Asset
Severity
Risk
Timestamp

---

# 37. Affected Users

Display:

User ID
User Name
Privilege
Related Alerts
Risk

---

# 38. Affected Assets

Display:

Asset ID
Asset Name
Criticality
Related Alerts
Risk

---

# 39. Investigation Workspace

Route:

/investigations/:incidentId

Header:

Investigation Workspace

Display:

Investigation status

OPEN
IN_PROGRESS
COMPLETED

Actions:

Add Note
Mark Investigation Complete

---

## Investigation Layout

LEFT:

Investigation information

CENTER:

Evidence and intelligence

RIGHT:

Recommendations

---

# 40. Investigation Intelligence

Sections:

What Happened
Why Suspicious
Potential Impact
Evidence Summary
Recommended Investigation Steps
Recommended Response

All AI output must be evidence-grounded.

---

# 41. Investigation Notes

Provide:

Text area

Button:

Save Note

Show existing notes:

Analyst
Timestamp
Note

Analyst notes must not be visible to Alert Source users.

---

# 42. Evidence Overview

Display counts:

Alerts
Events
Users
Assets
Indicators
Rules
ML Signals

Each item should be clickable.

---

# 43. Investigation Recommendations

Checklist:

Verify user activity
Check source IP
Review endpoint activity
Validate privilege changes
Review related alerts
Confirm expected business activity

Recommendations should be evidence-driven.

---

# 44. Data Source Center

Route:

/data-sources

This is a major SOC Analyst feature.

Purpose:

Allow the SOC Analyst to import and connect structured security evidence.

The Data Source Center must be accessible only to SOC Analysts.

---

# 45. Data Source Center Main Screen

Header:

Data Source Center

Subtitle:

Import or connect security evidence for analysis.

Top actions:

Upload Data
Connect Data Source

---

# 46. Supported Data Sources

Display source cards for:

1. CSV
2. JSON
3. XLS
4. XLSX
5. PostgreSQL
6. MongoDB
7. MySQL
8. Supabase
9. REST API

Each card contains:

Icon
Source name
Description
Connect / Import button

Example:

CSV

Import structured security evidence from CSV files.

Button:

Upload CSV

---

# 47. Upload Data Flow

Flow:

Upload
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

Supported files:

.csv
.json
.xls
.xlsx

---

# 48. Upload Interface

Large drag-and-drop area.

Text:

Drag & drop your security evidence file here

or

Browse Files

Display:

Supported:
CSV, JSON, XLS, XLSX

Maximum file size should be clearly communicated based on backend configuration.

---

# 49. File Upload Progress

Display:

Uploading
Processing
Schema Discovery
Validating
Importing
Completed

Progress indicator.

---

# 50. Schema Discovery Screen

Display detected fields:

Field Name
Detected Type
Sample Value
Null Count
Unique Count

Example:

timestamp | datetime | 2026-07-29...
severity | string | HIGH
user_id | string | USR-4821
asset_id | string | EP-0017

---

# 51. Field Mapping Screen

Display:

Source Field
→
CyberScope Field

Examples:

event_time → timestamp
severity_level → severity
username → user_id
hostname → asset_id
src_ip → source_ip

Allow analyst to review mappings.

Required fields must be clearly identified.

---

# 52. Validation Results

Display:

Records Processed
Valid Records
Duplicates
Missing Timestamps
Missing Severity
Missing Entity
Orphan Records
Invalid Values

Example:

Records Processed: 125,430

Valid: 123,982

Duplicates: 812

Missing timestamps: 341

Missing case references: 295

---

# 53. Data Import Completion

Display:

Import Completed

Dataset ID
Source
Records Imported
Valid Records
Warnings
Data Quality Status

Buttons:

View Dataset
Run Analytics

---

# 54. Connected Database Screen

For database connectors display:

Connection Name
Database Type
Host
Port
Database
Schema
Username

Password must never be displayed after submission.

Database credentials must never be unnecessarily exposed to the frontend.

Connection processing must happen in the trusted backend.

---

# 55. PostgreSQL Connector

Fields:

Connection Name
Host
Port
Database
Schema
Username
Password
SSL Mode

Actions:

Test Connection
Save Connection

---

# 56. MySQL Connector

Fields:

Connection Name
Host
Port
Database
Username
Password
SSL Mode

Actions:

Test Connection
Save Connection

---

# 57. MongoDB Connector

Fields:

Connection Name
Connection String
Database
Collection

Do not expose stored credentials after saving.

Actions:

Test Connection
Save Connection

---

# 58. Supabase Connector

Fields:

Project URL
Database Host
Database Name
Username
Password

Credentials must remain backend-controlled.

Actions:

Test Connection
Save Connection

---

# 59. REST API Connector

Fields:

Connection Name
API URL
HTTP Method
Authentication Type
Headers
Request Configuration

Do not expose secrets in frontend logs.

---

# 60. Data Source Status

Each source displays:

Connected
Disconnected
Testing
Error
Importing
Processing

Use clear status badges.

---

# 61. Data Source History

Table:

Dataset ID
Source Type
Dataset Name
Records
Status
Imported At
Data Quality
Actions

Actions:

View
Analyze
Delete/Remove where supported by implementation

---

# 62. Analytics Main Page

Route:

/analytics

Header:

Operational Analytics

Subtitle:

Identify execution gaps, negative-space signals, anomalies and peer deviations.

Top metrics:

Execution Gaps
Negative Space
Anomalies
Peer Deviations
Risk Indicators
Review Priorities

---

# 63. Analytics Dashboard

Charts:

Findings Over Time
Findings by Type
Top Risk Indicators
Operational Trend Analysis

Every chart must support drill-down.

---

# 64. Execution Gap Findings

Route:

/analytics/execution-gaps

Header:

Execution Gap Findings

Filters:

Severity
Status
Entity
Finding Type
Time Range

Table:

Finding ID
Finding Type
Title
Severity
Risk
Entity
Status
Created

---

# 65. Execution Gap Detail

Example:

Potential Execution Gap

Severity: HIGH

Risk: 86/100

Reason:

Critical investigations show unusually short duration and limited evidence.

Signals:

Investigation duration below baseline
Missing escalation record
Low evidence count
Peer deviation

Supporting Evidence:

CASE-1024
CASE-1041
ALERT-8821
ALERT-8899

Recommended Review:

Inspect investigation quality and escalation handling.

---

# 66. Negative-Space Findings

Route:

/analytics/negative-space

Display:

Finding ID
Finding Type
Entity
Severity
Risk
Expected Activity
Observed Activity
Peer Activity
Status

Example:

Critical Asset:
DB-PROD-04

Expected Activity:
High

Observed:
Very Low

Peer:
High

Interpretation:

Possible monitoring coverage gap requiring review.

Do not state that compromise occurred.

---

# 67. Negative-Space Detail

Show:

Expected Evidence
Observed Evidence
Missing Evidence
Peer Context
Threshold
Reason
Supporting Records
Recommended Review

---

# 68. Anomaly Analytics

Route:

/analytics/anomalies

Display metrics:

Alert Volume
Closure Rate
Closure Duration
Investigation Duration
Escalation Frequency
Repeated Alerts

Each anomaly shows:

Metric
Baseline
Observed Value
Deviation
Interpretation

---

# 69. Peer Benchmarking

Route:

/analytics/peer-benchmarks

Table:

Entity
Peer Group
Metric
Entity Value
Peer Median
Deviation
Interpretation

Metrics:

Alert Volume
Critical Alert Ratio
Investigation Duration
Escalation Frequency
Closure Duration
Reopened Cases
Repeated Alerts
Coverage Activity
Evidence Completeness

Use normalized metrics.

---

# 70. Risk Indicators

Display:

Entity Risk

Example:

87/100

Contributors:

+22 Critical alerts without escalation
+18 Investigation evidence deficiency
+14 Repeated unresolved asset activity
+12 Peer deviation
+11 Monitoring coverage concern
+10 Closure-time anomaly

Every contributor must link to evidence.

---

# 71. Review Priorities

Route:

/review-priorities

Display ranked priorities.

Example:

Priority 1
CSE-017
Escalation weakness
Risk 87

Priority 2
CSE-004
Monitoring coverage concern
Risk 82

Priority 3
CSE-011
Investigation quality anomaly
Risk 78

Each priority must drill down to its evidence.

---

# 72. Findings Page

Route:

/findings

Filters:

Finding Type
Severity
Status
Entity
Risk
Time Range

Table:

Finding ID
Type
Title
Severity
Risk
Entity
Status
Created

---

# 73. Finding Detail

Header:

Evidence-Backed Finding

Display:

Finding ID
Entity
Finding Type
Severity
Risk Score
Status

Sections:

Summary
Reason
Evidence
Supporting Records
Analytical Signals
Peer Context
Rule/Model Information
Recommended Review

Navigation:

Finding
↓
Case / Incident
↓
Investigation
↓
Alert / Event
↓
Normalized Evidence

---

# 74. Response Engine

Route:

/response

Purpose:

Controlled security response in the sandbox environment.

Available actions:

Block IP
Disable User
Terminate Session
Isolate Endpoint
Quarantine Artifact
Investigate Further

Never provide free-form AI command execution.

---

# 75. Response Recommendation UI

For each recommended action show:

Action
Reason
Risk
Confidence
Policy
Approval Required

Example:

Recommended Action

BLOCK IP

Reason:
Risk >= 90 and malicious indicator detected.

Approval:

Required

Button:

Review Action

---

# 76. Response Approval

Flow:

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
↓
Sandbox Execution
↓
Audit Log

Approval modal must display:

Target
Action
Reason
Policy
Risk
Confidence
Evidence
Previous State
Expected New State

Buttons:

Approve
Reject
Cancel

---

# 77. Sandbox Response

Route:

/response/sandbox

Display three sandbox areas.

## Sandbox User

User:

USR-4821

Previous State:
ACTIVE

Action:
DISABLE USER

New State:
BLOCKED

Rollback:
AVAILABLE

---

## Sandbox Endpoint

Endpoint:

EP-0017

Previous State:
CONNECTED

Action:
ISOLATE

New State:
ISOLATED

Rollback:
AVAILABLE

---

## Sandbox Firewall

IP:

185.x.x.x

Action:

BLOCK

Status:

BLOCKED

Rollback:

AVAILABLE

---

# 78. Response Action History

Table:

Action ID
Action
Target
Status
Approved By
Executed At
Rollback

Statuses:

PENDING_APPROVAL
APPROVED
REJECTED
EXECUTED
ROLLED_BACK
FAILED

---

# 79. Rollback UI

Every supported sandbox action must show:

Rollback Available

Click:

Rollback

Confirmation:

Are you sure you want to roll back this sandbox action?

Show:

Previous State
Current State
Restored State

After rollback:

Audit record created.

---

# 80. Audit Trail

Route:

/audit

Header:

Audit Trail

Subtitle:

Trace important system and analyst actions.

Filters:

Action
Actor
Target
Role
Time Range

Table:

Audit ID
Actor
Role
Action
Target
Reason
Timestamp

---

# 81. Audit Detail

Display:

Audit ID
Actor User ID
Actor Role
Action
Target Type
Target ID
Reason
Previous State
New State
Metadata
Timestamp

Audit records must be immutable to normal users.

---

# 82. Audit Events

Display events such as:

Login
Logout
Alert Submission
Alert Analysis
Incident Creation
Investigation Start
Finding Creation
Finding Review
Response Recommendation
Response Approval
Response Rejection
Response Execution
Response Rollback
Incident Resolution
Dataset Import
Data Source Configuration
Rule Updates

---

# 83. Reports

Route:

/reports

Header:

Reports

Actions:

Generate Report

Supported formats:

PDF
CSV
JSON

---

# 84. Generate Report Screen

Fields:

Report Type
Time Range
Format
Dataset Version
Rule Version
Model Version

Report sections:

Executive Summary
Overall Findings
High-Priority Incidents
Operational Risk Indicators
Detailed Findings
Execution Gaps
Negative-Space Findings
Peer Deviations
Behavioral Anomalies
Evidence
Recommendations
Audit Information

Button:

Generate Report

---

# 85. Reports History

Table:

Report ID
Report Type
Format
Generated At
Dataset Version
Rule Version
Model Version
Status

Statuses:

GENERATING
COMPLETED
FAILED

---

# 86. Report Detail

Display:

Executive Summary

Overall Findings

High-Priority Incidents

Operational Risk Indicators

Detailed Findings

Evidence

Recommendations

Audit Information

Dataset Version
Rule Version
Model Version
Generation Timestamp

---

# 87. Alert Source Portal

The Alert Source has a separate UI.

Route:

/source

Header:

CyberScope

Alert Source Portal

Subtitle:

Submit security events to the SOC for processing.

---

# 88. Submit Security Alert

Fields:

Source System
Alert Type
Severity
Timestamp where appropriate
User
Asset
Source IP
Destination IP
Description
Raw Log Data

Button:

Submit Alert

---

# 89. Scenario Generator

Section:

Scenario-Based Alert Injection

Purpose:

Generate realistic synthetic multi-alert attack scenarios.

Scenario selector:

Authentication
Endpoint
Network
Database
Email

---

# 90. Supported Scenarios

Authentication:

Brute Force
Credential Stuffing
Impossible Travel
Suspicious Login
Privileged Login
MFA Abuse

Endpoint:

Malware Detection
Suspicious PowerShell
Suspicious Process
Ransomware Behavior
Privilege Escalation

Network:

Port Scan
Command-and-Control Activity
Data Exfiltration
Suspicious DNS
Unusual Network Connection

Database:

Unusual Query
Bulk Data Read
Privilege Abuse
Suspicious Database Login

Email:

Phishing
Malicious Attachment
Suspicious Link

---

# 91. Scenario Generator Controls

Controls:

Scenario
Number of Alerts
Start Time
Severity
Repeated Event Mode

Buttons:

Generate
Generate & Submit

---

# 92. Multi-Alert Attack Sequence

Support demonstration scenario:

Account Takeover

Generate:

1. Multiple failed logins
2. Successful login from unusual IP
3. New device activity
4. Suspicious PowerShell
5. Privilege escalation

Expected UI progression:

Alerts Generated
↓
Alerts Ingested
↓
Realtime Alert Feed
↓
Automatic Triage
↓
Risk Calculation
↓
Correlation
↓
Incident Created
↓
Timeline
↓
Local LLM Explanation
↓
Investigation
↓
Response Recommendation
↓
Approval
↓
Sandbox Action
↓
Audit
↓
Resolution

---

# 93. Alert Source Submission History

Table:

Submission ID
Scenario
Alerts Generated
Successful
Failed
Timestamp
Status

Click:

View Submission

Alert Source must only see its own submission information.

---

# 94. Local LLM UI

All AI functionality must be labeled:

Local LLM

Never imply cloud AI if Ollama/local processing is being used.

AI states:

PENDING
PROCESSING
COMPLETED
FAILED

---

# 95. AI Loading State

Display:

Generating evidence-grounded intelligence...

Do not block alert availability.

The alert remains visible while AI processing occurs.

---

# 96. AI Failure State

Display:

Local LLM unavailable

Rule analysis:
Completed

ML analysis:
Completed

Risk:
Available

AI:
Failed

Message:

AI enrichment is currently unavailable. Core security analysis remains available.

Button:

Retry AI Analysis

---

# 97. AI Explanation Component

Display:

Local LLM Analysis

Model:
<model version>

Prompt:
<prompt version>

Evidence References:
<record IDs>

Sections:

Explanation
Potential Impact
Recommended Investigation
Recommended Response

Footer:

Generated from supplied application evidence.

---

# 98. Evidence Traceability

Every important finding must expose its evidence chain.

Example:

Finding FG-001
↓
CASE-1024
↓
INV-0091
↓
ALERT-8821
↓
EVENT-21981

Use clickable breadcrumb-style evidence navigation.

---

# 99. Data Quality UI

Display data quality status globally where relevant.

Statuses:

Healthy
Warnings
Critical Issues

Metrics:

Records Processed
Valid
Duplicates
Missing Timestamps
Missing Severity
Missing Entity
Missing Case References
Invalid Values
Orphan Records

---

# 100. Empty States

Every table/page must have an intentional empty state.

Example:

No security alerts found.

Try changing your filters or submit a new security alert.

Buttons:

Clear Filters
Submit Alert

Do not leave blank white space.

---

# 101. Loading States

Use skeleton loaders for:

Tables
Cards
Charts
Incident details
Finding details

Avoid full-screen spinners unless the entire application is loading.

---

# 102. Error States

Display clear errors.

Example:

Unable to load security alerts.

The server could not complete the request.

Actions:

Retry

Never expose:
- Database credentials
- Stack traces
- Internal paths
- Secrets
- Tokens

---

# 103. Network Failure

Display:

Connection Lost

CyberScope is attempting to reconnect.

When connection returns:

Connection Restored

Realtime data synchronization resumes.

---

# 104. Responsive Design

Desktop is the primary target.

Support:

Large desktop
Laptop
Tablet

At smaller widths:

Sidebar collapses.

Tables become horizontally scrollable.

Cards stack.

Charts resize.

Do not remove critical functionality on smaller screens.

---

# 105. Tables

Tables must:

- Support pagination
- Support sorting where appropriate
- Support filtering
- Have sticky headers where useful
- Use compact row heights
- Provide row hover state
- Make rows clickable where appropriate

Avoid extremely large row heights.

---

# 106. Charts

Charts must be:

- Clean
- Minimal
- Enterprise-style
- Easy to interpret

Use charts only when they communicate meaningful information.

Required chart types:

Line
Bar
Horizontal Bar
Donut
Trend

Every chart should have:

Title
Time/filter context
Legend where required
Tooltip
Drill-down behavior where applicable

---

# 107. Cards

Cards should communicate meaningful metrics or grouped evidence.

Avoid:

- Excessive card nesting
- Decorative cards
- Giant empty cards
- Cards with unnecessary icons

---

# 108. Typography

Use a clean modern sans-serif font.

Hierarchy:

Page title:
Large / bold

Section title:
Medium / semibold

Body:
Regular

Metadata:
Small / muted

Risk/severity:
Semibold

Avoid oversized typography.

---

# 109. Spacing

Use consistent spacing.

Recommended spacing system:

4px
8px
12px
16px
24px
32px

Main content should have comfortable padding.

---

# 110. Borders and Shadows

Use subtle borders.

Cards:

1px light border

Shadows should be subtle.

Do not use heavy shadows.

Do not use glassmorphism.

Do not use excessive gradients.

---

# 111. Buttons

Primary button:

Green background
White text

Secondary:

White background
Green border

Danger:

Red background/text

Important actions such as response execution must use confirmation dialogs.

---

# 112. Status Badges

Statuses:

OPEN
IN_PROGRESS
RESOLVED

AI:

PENDING
PROCESSING
COMPLETED
FAILED

Response:

PENDING_APPROVAL
APPROVED
REJECTED
EXECUTED
ROLLED_BACK
FAILED

Data Source:

CONNECTED
DISCONNECTED
TESTING
ERROR
PROCESSING

---

# 113. Modal Design

Use modals for:

Response approval
Response rejection
Rollback
Resolve incident
Connector configuration
Delete/remove confirmation where applicable

Modal structure:

Title
Context
Evidence
Impact
Confirmation
Cancel

Never hide important evidence inside a tiny modal.

---

# 114. Confirmation Requirements

Require confirmation before:

Response execution
Response rollback
Incident resolution where appropriate
Important configuration changes

Display exactly what will happen.

---

# 115. AI Safety UI

AI recommendations must never look like automatically executed actions.

Separate:

AI Recommendation

from:

Approved Response

from:

Executed Response

Use clear status labels.

---

# 116. Investigation Status

Display:

Not Started
In Progress
Completed

Buttons change based on state.

---

# 117. Incident Status

Display:

OPEN
IN_PROGRESS
RESOLVED

Use consistent badges across dashboard, incidents and details.

---

# 118. Navigation and Drill-Down

The application must support evidence-driven navigation.

Example:

Dashboard
→ Critical Alert
→ Alert Detail
→ Related Incident
→ Incident Timeline
→ Investigation
→ Finding
→ Evidence
→ Response
→ Audit

Another:

Analytics
→ Execution Gap
→ Finding Detail
→ Supporting Case
→ Investigation
→ Alert
→ Evidence

Another:

Review Priority
→ Entity Risk
→ Contributors
→ Finding
→ Evidence

---

# 119. Global Search

Where practical, search should support:

Alert ID
Incident ID
Case ID
Finding ID
User
Asset
Source IP
Event Type

Search results should identify object type.

Example:

ALERT-8821
Security Alert

INC-001
Incident

FG-001
Finding

---

# 120. User Role Indicators

SOC Analyst header:

SOC Analyst

Alert Source header:

Alert Source

Role must always be visible somewhere in the authenticated interface.

---

# 121. Security UI Rules

Never display:

Passwords
Database credentials
API keys
Tokens
Secrets

Do not expose backend connector configuration unnecessarily.

Do not expose analyst-only information to Alert Source users.

---

# 122. Accessibility

The UI must provide:

Keyboard navigation
Visible focus states
Readable contrast
Accessible labels
Semantic buttons
Accessible form validation
Tooltips for unfamiliar icons

Never communicate important information using color alone.

---

# 123. Realtime Indicators

Use a small status component:

LIVE

RECONNECTING

OFFLINE

When realtime connection fails, existing data must remain usable.

---

# 124. System State Components

The application must support visible system states:

Loading
Empty
Error
Unauthorized
Forbidden
AI Pending
AI Processing
AI Failed
Processing
Completed
Realtime Connected
Realtime Reconnecting
Realtime Offline

These states should have consistent visual treatment throughout the application.

---

# 125. Complete Application Screen Map

CyberScope must contain the following major UI sections:

01. Login

02. SOC Analyst Dashboard

03. Alerts

04. Alert Detail

05. Alert Analysis / Explainability

06. Incidents

07. Incident Detail

08. Investigation Workspace

09. Data Source Center

10. Data Source Upload

11. Schema Discovery

12. Field Mapping

13. Data Validation

14. Data Source Connections

15. Operational Analytics

16. Execution Gap Findings

17. Negative Space Findings

18. Anomaly Analytics

19. Peer Benchmarking

20. Risk Indicators

21. Review Priorities

22. Findings

23. Finding Detail

24. Response Engine

25. Response Approval

26. Sandbox Response

27. Response History

28. Reports

29. Report Generation

30. Report History

31. Audit Trail

32. Audit Detail

33. Alert Source Portal

34. Submit Alert

35. Scenario Generator

36. Submission History

37. Loading States

38. Empty States

39. Error States

40. Unauthorized / Forbidden States

41. AI Processing States

42. Realtime Connection States

---

# 126. Primary Demonstration UI Flow

The main hackathon demonstration should be visually easy to follow.

START:

Alert Source Portal

↓

Scenario Generator

↓

Account Takeover

↓

Generate & Submit

↓

SOC Dashboard

↓

Live Alerts increase

↓

Critical Alert appears

↓

Open Alert

↓

Automatic Analysis

↓

Risk:
96/100

Confidence:
92%

↓

Related Alerts

↓

Incident Created

↓

Possible Account Takeover

↓

Open Incident

↓

Incident Timeline

↓

Start Investigation

↓

Local LLM Intelligence

↓

Evidence-backed investigation

↓

Recommended Response

↓

Response Policy

↓

Approval Required

↓

SOC Analyst Approves

↓

Sandbox Response

↓

Action Executed

↓

Audit Trail

↓

Resolve Incident

↓

Dashboard updates

---

# 127. Operational Analytics Demonstration Flow

START:

Data Source Center

↓

Upload CSV/XLSX or connect structured source

↓

Schema Discovery

↓

Field Mapping

↓

Validation

↓

Import

↓

Run Analytics

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

Evidence-Backed Finding

↓

Finding Detail

↓

Supporting Records

↓

Recommended Review

---

# 128. Main Account Takeover Example

Use the following sample UI content for the primary demonstration.

Incident:

Possible Account Takeover

Risk:

96/100

Confidence:

92%

Timeline:

10:01
Multiple failed logins

10:03
Successful login from unusual IP

10:04
New device activity

10:05
Suspicious PowerShell

10:07
Privilege escalation

Potential Impact:

User account
Endpoint
Privileged access
Potential data exposure

Important:

The interface must describe impact as potential unless supported by evidence.

---

# 129. Operational Analytics Example

Example dataset:

Critical Alerts:
120

Investigated:
118

Escalated:
49

Closed:
117

Median Investigation Duration:
4 minutes

Peer Median:
41 minutes

Expected finding:

Potential Execution Gap

Signals:

Unusually short investigations
Low escalation rate
Limited investigation evidence
Significant peer deviation

---

# 130. Negative Space Example

Entity:

DB-PROD-04

Expected Activity:

High

Observed Activity:

Very Low

Peer Activity:

High

Finding:

Potential Negative-Space Signal

Interpretation:

Possible monitoring coverage gap requiring review.

Never label this as confirmed compromise.

---

# 131. UI Copy Rules

Use consistent terminology.

Always use:

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

Avoid:

"AI proves attack"

"100% accurate"

"Zero false positives"

"AI guarantees malicious activity"

"Guaranteed prevention"

"Guaranteed detection"

"Real infrastructure control"

When using sandbox actions, clearly communicate:

Sandbox Response

or

Simulated Environment

---

# 132. Visual Density

CyberScope is an enterprise SOC application.

Prioritize information density over decorative whitespace.

However:

Do not overcrowd individual cards.

Use:

- Compact tables
- Clear sections
- Structured panels
- Consistent spacing
- Small metadata labels
- Evidence grouping

The dashboard should allow an analyst to understand the current security posture quickly.

---

# 133. Reference Visual Direction

The provided reference application images are visual inspiration only.

Use them for:

- Overall enterprise layout
- Green and white theme
- Sidebar navigation
- Dashboard composition
- Tables
- Alert detail structure
- Incident detail structure
- Evidence panels
- Action panels
- Investigation sections
- Analytics cards

Do NOT copy the reference application's:

- Branding
- Exact layout
- Exact text
- Exact colors
- Exact component styling
- Exact spacing
- Exact data
- Exact UI structure

CyberScope must have its own coherent design.

---

# 134. Final Design Principles

Every CyberScope screen must follow these principles:

1. Evidence first.

2. Analyst decisions remain human-controlled.

3. Risk and confidence remain separate.

4. AI recommendations are clearly separated from executed actions.

5. Important actions are auditable.

6. Security information must be traceable.

7. Every finding should lead to supporting evidence.

8. Realtime updates should not require manual refresh.

9. AI failure must not break the core application.

10. Data-source failures must not break existing data.

11. Backend authorization is authoritative.

12. Sensitive connector credentials must remain protected.

13. The interface must work with synthetic data and local deployment.

14. The interface must support the complete CyberScope workflow.

15. The design must remain professional, clean, accessible and enterprise-grade.

---

# 135. Final UI Objective

The final CyberScope interface must communicate one complete story:

SECURITY EVIDENCE
↓
INGEST
↓
NORMALIZE
↓
DETECT
↓
ANALYZE
↓
SCORE
↓
CORRELATE
↓
UNDERSTAND
↓
INVESTIGATE
↓
RECOMMEND
↓
APPROVE
↓
RESPOND
↓
AUDIT

And separately:

OPERATIONAL EVIDENCE
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

The entire UI must feel like one integrated CyberScope security intelligence platform rather than a collection of unrelated pages.

The final product must be visually consistent across all screens and must preserve the green-and-white enterprise SOC aesthetic.

No dark theme.

No unnecessary decorative effects.

No hacker imagery.

No excessive animation.

No unsupported product features.

Every screen must serve the CyberScope product specification and the defined SOC Analyst / Alert Source workflows.