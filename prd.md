# CONTENTS

Abstract  
Business Objectives  
KPI  
Success Criteria  
User Journeys  
Scenarios  
User Flow  
Model Requirements  
Data Requirements  
Prompt Requirements  
Testing & Measurement  
Risks & Mitigations  
Costs  
Assumptions & Dependencies  
Compliance/Privacy/Legal  
GTM/Rollout Plan

---

## 📝 Abstract

This product is a web-based, offline-first expense tracker designed for busy professionals who dislike manual data entry. Instead of filling out multi-step forms, users can type a single natural-language sentence containing multiple expenses (e.g., “$15 lunch and $40 fuel”), which is parsed by an LLM-powered engine into structured transactions. These transactions are stored locally and displayed instantly in a clean ledger with real-time totals.  
Version 1 focuses exclusively on **text-based, zero-friction entry** while prioritizing accuracy, trust, and cost efficiency under free-tier constraints.

---

## 🎯 Business Objectives

- Reduce friction in expense logging to increase capture frequency and accuracy.
- Build user trust by preventing silent AI errors in financial data.
- Validate natural-language expense entry as a strong differentiator before expanding scope.
- Establish early habit formation and retention without bank integrations.

---

## 📊 KPI

| GOAL                      | METRIC                            | QUESTION                                              |
| ------------------------- | --------------------------------- | ----------------------------------------------------- |
| NL Adoption               | % NL transactions                 | Do users prefer natural-language entry?               |
| Logging Speed             | Median time to save (P50 seconds) | How fast can a user log expenses end-to-end?           |
| Early Retention           | D7 Retention                      | Does the product create repeat usage in week one?     |

**Targets (Default):**
- ≥ 60% of transactions created via natural language  
- ≤ 10 seconds median logging time  
- ≥ 25% Day-7 retention

---

## 🏆 Success Criteria

- Users can log multiple expenses accurately with one sentence.
- No silent balance errors caused by AI hallucination.
- Users understand, trust, and can easily correct auto-parsed data.
- Retention and usage meet KPI targets within 8–12 weeks.

---

## 🚶‍♀️ User Journeys

1. **Quick Capture:**  
   User opens web app → types one sentence with multiple expenses → reviews parsed results → confirms → ledger updates instantly.

2. **Correction Journey:**  
   User edits incorrect amount/category before saving → system learns from correction.

3. **Review Journey:**  
   User opens ledger → reviews daily/monthly totals → scans categorized expenses.

---

## 📖 Scenarios

- Logging expenses from memory after shopping.
- Parsing ambiguous sentences that require user confirmation.
- Offline usage where data is stored locally and synced later if enabled.

---

## 🕹️ User Flow

**Happy Path**
- Open web app
- Click “+ Add”
- Enter natural-language sentence
- System parses into multiple transactions
- User reviews and confirms
- Transactions saved locally
- Ledger and totals update in real time

**Alternative Paths**
- Low-confidence parse → highlighted fields → mandatory user confirmation
- Offline mode → save as unverified → review later

---

## 🧰 Functional Requirements

| SECTION        | SUB-SECTION     | USER STORY & EXPECTED BEHAVIORS                                               | SCREENS      |
|---------------|-----------------|-------------------------------------------------------------------------------|--------------|
| Capture       | NL Text Input   | User can input one sentence with multiple expenses                            | Add Modal    |
| Parsing       | Review Screen   | Parsed results shown with confidence indicators                                | Preview      |
| Editing       | Inline Edit     | User can correct any field before saving                                       | Preview      |
| Storage       | Local DB        | Transactions stored locally and available offline                               | Ledger       |
| Ledger        | View & Totals  | Real-time totals update instantly                                               | Ledger       |
| Categories    | Auto + Manual   | System suggests category; user can override                                     | Edit Row     |
| Auth          | Optional        | App usable without login; login enables future sync                             | TBD          |

---

## 📐 Model Requirements

| SPECIFICATION       | REQUIREMENT                               | RATIONALE |
|---------------------|-------------------------------------------|-----------|
| Model Type          | Rule-first + lightweight LLM fallback     | Reduce hallucination and cost |
| Context Window      | Small (≤ 512 tokens)                      | Short sentences only |
| Modalities          | Text only                                 | Voice excluded in v1 |
| Fine-tuning         | Optional                                  | Depends on free-tier feasibility |
| Latency             | P50 < 500ms, P95 < 2s                     | Maintain fast UX |
| Cost Control        | Minimal token usage                       | Free-tier constraint |

---

## 🧮 Data Requirements

- **Purpose:** Improve parsing accuracy and reduce hallucination.
- **Initial Dataset:** 500–2,000 labeled sentences (synthetic + real).
- **Coverage:** Multiple expenses, currencies, merchants, ambiguous phrasing.
- **Collection:** Optional opt-in logging of user corrections (anonymized).
- **Iteration:** Periodic updates to rules or few-shot examples.

---

## 💬 Prompt Requirements

- Never invent or merge amounts.
- Return confidence score per transaction.
- Flag ambiguous cases as `needs_review`.
- Output must strictly follow a predefined JSON schema.
- Prioritize correctness over completeness.

---

## 🧪 Testing & Measurement

**Offline Testing**
- Golden dataset with exact expected outputs.
- Amount extraction accuracy target: 99.5%.

**Online Testing**
- Monitor correction rates and confidence distributions.
- Alert if balance discrepancies exceed safe thresholds.

**Guardrails**
- No auto-save for low-confidence parses.
- Mandatory user confirmation before affecting totals.

---

## ⚠️ Risks & Mitigations

| RISK                              | MITIGATION |
|----------------------------------|------------|
| AI hallucination breaks totals   | Rule-first parsing, review-before-save, confidence indicators |
| Users distrust auto-categorization | Inline edits, transparency, learning from corrections |
| Free-tier limits exceeded        | Minimize LLM calls, cache patterns, degrade gracefully |
| Offline + AI mismatch            | Save as unverified, confirm later |

---

## 💰 Costs

**Development**
- Frontend (web)
- Parsing engine
- QA and dataset creation

**Operational**
- Minimal LLM inference (free tier)
- Lightweight backend (optional auth only)
- Local encrypted storage

---

## 🔗 Assumptions & Dependencies

- Web-only v1
- Text-only input
- No bank sync or export
- Users accept review step for accuracy
- Model/provider selection affects final cost and latency

---

## 🔒 Compliance/Privacy/Legal

- Offline-first storage by default
- Encrypted local database
- Opt-in telemetry only
- No financial advice or payments processing
- Clear consent for any data sharing

---

## 📣 GTM/Rollout Plan

**Milestones**
- Weeks 1–4: Parser + UI prototype
- Weeks 5–8: Ledger, offline support, testing
- Weeks 9–12: Closed beta
- Week 13: Public web launch

**Launch Strategy**
- Target busy professionals and early adopters
- Position around speed, simplicity, and trust

**Rollout**
- Internal testing
- Closed beta
- Public release
