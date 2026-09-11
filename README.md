# CyberScope
### Evidence-Driven Supervisory Intelligence for SOC Assessment

[![SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-orange)](https://www.sih.gov.in/)
[![Problem Statement](https://img.shields.io/badge/PS-SIH26157-blue)](https://www.sih.gov.in/)
[![Category](https://img.shields.io/badge/Category-Software-success)](https://www.sih.gov.in/)
[![Python](https://img.shields.io/badge/Python-3.x-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org/)
[![Ollama](https://img.shields.io/badge/AI-Ollama-black)](https://ollama.com/)

> **Smart India Hackathon 2026 — Problem Statement SIH26157**  
> **Supervisory Analytics Tool for SOC Assessment (SAT-SA)**

---

## 📌 Overview

**CyberScope** is an evidence-driven supervisory analytics platform designed to assess the operational effectiveness of Security Operations Centers (SOCs).

Instead of evaluating a SOC only through reported metrics, policies, or manually selected samples, CyberScope analyses **actual operational security evidence** to identify weaknesses, behavioural deviations, missing activity, and areas requiring deeper supervisory examination.

The platform transforms:

**SOC Evidence → Analytics → Findings → Review Priorities**

CyberScope is designed for environments where security evidence may be sensitive and therefore supports **local, offline-first and air-gapped deployment** without requiring cloud-based AI services.

---

## 🎯 Problem Statement

### SIH26157 — Supervisory Analytics Tool for SOC Assessment (SAT-SA)

Traditional SOC assessment can involve large volumes of alerts, cases, investigations, escalations, dispositions, and other operational evidence.

Manual examination of such evidence can be:

- Time-consuming
- Difficult to scale
- Dependent on sampling
- Inconsistent across assessment cycles
- Unable to easily identify missing operational evidence
- Less effective at revealing behavioural deviations

The challenge is therefore to develop a system capable of analysing SOC operational evidence and helping supervisors identify potential weaknesses and prioritize areas for examination.

---

# 💡 CyberScope Solution

CyberScope provides a supervisory analytics layer over SOC operational evidence.

The platform can:

- Ingest security evidence from multiple sources
- Validate and normalize incoming data
- Evaluate data quality
- Perform automated alert triage
- Calculate risk and confidence indicators
- Detect anomalous behaviour
- Correlate related security activity
- Identify execution gaps
- Detect negative space
- Perform peer benchmarking
- Generate evidence-backed findings
- Support investigations
- Provide local AI-assisted explanations
- Execute controlled response actions
- Maintain an immutable audit trail
- Generate reports for supervisory review

The objective is not to replace human examiners.

Instead:

> **CyberScope provides evidence-backed intelligence that helps human supervisors make faster, more consistent and better-informed assessment decisions.**

---

# 🧠 Core Capabilities

## 1. Multi-Source Evidence Ingestion

CyberScope supports structured security evidence including:

- CSV
- JSON
- XLS
- XLSX
- PostgreSQL

The architecture is designed to support additional sources such as:

- MySQL
- MongoDB
- Supabase
- REST APIs

Incoming evidence passes through validation, normalization and data-quality processing.

---

## 2. Alert Generation & Ingestion

CyberScope supports:

- Individual alert ingestion
- Batch ingestion
- Synthetic scenario generation
- Multiple security scenarios
- Burst and repeated event generation
- Alert validation
- Normalization
- Fingerprinting
- Data-quality evaluation

This allows the platform to work with both imported evidence and controlled demonstration scenarios.

---

## 3. Automated Alert Triage

Incoming alerts are evaluated using deterministic analytical logic.

The triage pipeline considers:

- Detection rules
- Alert characteristics
- Risk indicators
- Confidence
- False-positive likelihood
- Priority
- Enrichment data

This creates a structured analytical representation of each alert before it reaches higher-level supervisory analytics.

---

## 4. Risk & Confidence Scoring

CyberScope calculates deterministic security indicators including:

- Risk score
- Confidence score
- Estimated false-positive likelihood
- Priority

The scoring process is evidence-based and does not depend on an external AI service.

---

## 5. Anomaly Detection

CyberScope uses machine-learning based anomaly detection to identify unusual operational behaviour.

The anomaly engine considers multiple features and historical baselines.

The implementation uses **scikit-learn Isolation Forest** with deterministic processing and historical data windows.

When insufficient historical data exists, the system handles the condition explicitly instead of producing misleading anomaly results.

---

## 6. Alert Correlation

Related security activity can be correlated using multiple signals and entity/time relationships.

Correlation helps identify patterns that may not be visible when alerts are examined independently.

Correlated activity can contribute to:

- Incident creation
- Incident updates
- Alert linking
- Investigation timelines
- Supervisory findings

---

# 🔍 Supervisory Analytics

The core differentiator of CyberScope is its ability to analyse SOC behaviour rather than simply display security events.

## Execution Gap Detection

Identifies situations where reported or expected capabilities do not sufficiently match the available operational evidence.

### Example

A SOC may report that a particular security process is operational, while the evidence contains little or no corresponding execution activity.

CyberScope can surface this as a potential execution gap for examination.

---

## Negative-Space Detection

Identifies **missing or unexpectedly low evidence** where activity would normally be expected.

Rather than treating absence of data as proof that something did not happen, CyberScope evaluates the absence as a signal requiring further examination.

---

## Behavioural & Anomaly Analysis

CyberScope identifies unusual operational patterns using:

- Historical baselines
- Statistical indicators
- Anomaly detection
- Entity behaviour
- Time-based activity

---

## Peer Benchmarking

CyberScope compares comparable entities and time periods to identify significant deviations.

This reduces the limitations of using only absolute thresholds.

For example:

> An activity level may appear normal in isolation but significantly deviate from comparable entities.

---

## Evidence-Backed Supervisory Prioritization

Multiple analytical signals are combined to prioritize:

- Entities
- Controls
- Alerts
- Cases
- Samples
- Review areas

Each finding is intended to provide traceable reasoning and supporting evidence for human examination.

---

# 🤖 Local AI Intelligence

CyberScope integrates **Ollama with a locally running LLM**.

The AI layer can assist with:

- Alert explanations
- Incident intelligence
- Investigation narratives
- Evidence summaries
- Finding explanations
- Report-oriented narratives

### AI is not the source of the core risk decision.

The architecture separates:

```text
Deterministic Analytics
        ↓
Risk / Findings / Indicators
        ↓
Local AI
        ↓
Explanation / Summary / Narrative
