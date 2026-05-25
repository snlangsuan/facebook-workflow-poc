---
name: post-mortem
description: Strict guidelines for writing post-mortem records after resolving bugs. Enforces refusal of writing a post-mortem under uncertainty or hypothetical guesses.
---

# 📝 Post-Mortem Guidelines (การบันทึกหลังแก้บั๊กเสร็จ)

This skill defines the strict requirements and structured template for creating post-mortem documentation after resolving a bug.

---

## 🛡️ Strict Rule: Refuse to Write Under Uncertainty

You **MUST REFUSE** to write a post-mortem document if you lack any of the following 3 vital prerequisites:

1. **❌ A Reliable Repro** (A verified set of steps or script that consistently triggers the bug)
2. **❌ An Identifiable Root Cause** (A verified explanation of the primary source of failure—not a mere guess)
3. **❌ A Validated Fix** (A solution that has been rigorously tested and verified to resolve the bug without regressions)

> [!CAUTION]
> **"A post-mortem of hypotheses is worse than no post-mortem."**
>
> Constructing a post-mortem based on unverified assumptions, guesswork, or hypotheticals is highly damaging. It introduces incorrect historical context, leads future developers astray, and pollutes repository intelligence with false assumptions.

---

## 📋 Structured Post-Mortem Template

Once all 3 prerequisites are fully met (Reliable Repro + Identified Root Cause + Validated Fix), construct the post-mortem report strictly following this template layout:

### 1. Summary
* A concise explanation of the incident, its timeline, and user-facing or technical impacts.

### 2. Reliable Repro Steps
* The concrete inputs, environment conditions, API payloads, or unit tests required to reliably reproduce the failure.

### 3. Root Cause Analysis
* The primary structural flaw, logic error, or race condition that caused the bug, validated through Trace and Falsify steps.

### 4. Applied Fix & Validation
* A description of the code changes applied, paired with the precise method used to validate the solution (e.g., test suite results or manual replication logs).

### 5. Cross-Reference Checklist
* A checklist of related systems, files, configuration files, or schemas that were also checked for similar vulnerabilities.
