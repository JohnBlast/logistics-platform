# Natural Language Interpretation Requirements

> **Spec-Kit aligned**: This document applies [Spec-Driven Development](https://github.com/github/spec-kit) principles—explicit acceptance scenarios, concrete example phrasings, and a general interpretation contract—to ensure NL features are specified precisely enough for consistent implementation.

## 1. General NL Interpretation Pattern

Natural language inputs in this ETL configurator follow a common interpretation contract:

| Aspect | Contract |
|--------|----------|
| **Input** | User-entered free text (plain English) |
| **Output** | Structured representation (JSON-like) that the system can execute |
| **Fallback** | Rule-based interpretation when AI unavailable (Mocked mode) |
| **Failure** | Show error; do not apply. User must rephrase or retry (GR-5.1, GR-9.3) |
| **Scope** | Joins and Filtering only; Mapping is manual/assisted (GR-9.1, GR-9.2) |

**General principle**: Specifications for NL features MUST include:
1. **Example phrasings** that MUST work (not just "natural language")
2. **Semantic taxonomy** (intent categories)
3. **Interpretation contract** (phrase → structured output)
4. **Edge cases** with concrete examples

---

## 2. NLP Filtering — Semantic Taxonomy

Filter rules fall into these intent categories:

| Category | Description | Example phrasings |
|----------|-------------|-------------------|
| **Location exclusion** | Exclude rows where a place appears in location fields | "remove London loads", "exclude Manchester loads" |
| **Location inclusion** | Include only rows with place in collection/delivery | "include loads from Manchester", "keep loads from London" |
| **Status exclusion** | Exclude rows by status value | "exclude cancelled loads", "remove rejected" |
| **Status inclusion** | Include only specific status(es) | "include only completed loads" |
| **Field presence** | Include/exclude by field non-null | "include loads that have capacity_kg", "remove loads without email" |
| **Numeric comparison** | <, >, <=, >=, between | "capacity_kg over 1000", "between 100 and 500 on quoted_price" |
| **Compound** | Field present AND numeric | "loads with capacity_kg and more than 1000kg" |
| **Vehicle type** | Include/exclude by vehicle_type | "only Luton and large_van", "remove small vans" |
| **Multi-value** | Multiple statuses or conditions | "exclude cancelled and rejected loads" |
| **Row-level null** | Exclude rows with any null cell | "Remove any row with a null value" |

---

## 3. Acceptance Scenarios (Given/When/Then)

### 3.1 Location Exclusion

| ID | Given | When | Then |
|----|-------|------|------|
| NL-F-01 | Flat table with rows containing London in collection_town, collection_city, delivery_town, or delivery_city | User enters "remove London loads" | System interprets as 4 exclusion rules (one per location field, contains London); rows with London in ANY such field are excluded |
| NL-F-02 | Same as above | User enters "exclude London collection_town" | System interprets as 1 exclusion rule: collection_town contains London; only that field is checked |
| NL-F-03 | Same as above | User enters "Remove all loads with a collection from Leeds" | System interprets as exclusion: collection_city contains Leeds |

### 3.2 Location Inclusion

| ID | Given | When | Then |
|----|-------|------|------|
| NL-F-04 | Flat table with collection_city values | User enters "include loads from Manchester" | System interprets as inclusion: collection_city contains Manchester |

### 3.3 Compound (Field Present + Numeric)

| ID | Given | When | Then |
|----|-------|------|------|
| NL-F-05 | Flat table with capacity_kg | User enters "loads with capacity_kg and with more than 1000kg" | System interprets as 2 rules: (1) capacity_kg is not null, (2) capacity_kg > 1000; both applied as inclusion (AND) |

### 3.4 Status & Multi-Value

| ID | Given | When | Then |
|----|-------|------|------|
| NL-F-06 | Flat table with status | User enters "exclude cancelled loads" | System interprets as exclusion: status = cancelled |
| NL-F-07 | Same | User enters "exclude cancelled and rejected loads" | System interprets as 2 exclusion rules: status = cancelled, status = rejected |

### 3.5 Field Presence

| ID | Given | When | Then |
|----|-------|------|------|
| NL-F-08 | Flat table | User enters "remove loads that don't have capacity_kg" | System interprets as exclusion: capacity_kg is null |
| NL-F-09 | Same | User enters "include loads that have email" | System interprets as inclusion: email is not null |

---

## 4. Interpretation Contract (Filtering)

The system MUST map user phrases to one or more structured rules of the form:

```
{ field, op, value?, type: 'inclusion' | 'exclusion' }
```

Where `op` ∈ { `=`, `!=`, `contains`, `in`, `is_null`, `is_not_null`, `<`, `<=`, `>`, `>=`, `has_any_null` }.

| Phrase pattern | Structured output | Notes |
|----------------|-------------------|-------|
| "remove [place] loads" | 4 rules: each location field `contains` place, type exclusion | Place in ANY location → exclude |
| "exclude [place] [field]" | 1 rule: field `contains` place, type exclusion | Field-specific |
| "exclude ... from [place]" | 1 rule: collection_city `contains` place, type exclusion | |
| "include loads from [place]" | 1 rule: collection_city `contains` place, type inclusion | |
| "exclude [status] loads" | 1 rule: status `=` value, type exclusion | status ∈ valid enum |
| "exclude [status1] and [status2]" | 2 rules: status `=` each, type exclusion | |
| "loads with [field] and more than [N]" | 2 rules: field is_not_null, field `>` N, type inclusion | Compound |
| "between [lo] and [hi] on [field]" | 2 rules: field `>=` lo, field `<=` hi, type inclusion | Range |
| "remove loads that don't have [field]" | 1 rule: field `is_null`, type exclusion | |
| "include loads that have [field]" | 1 rule: field `is_not_null`, type inclusion | |
| "Remove any row with a null value" | 1 rule: op `has_any_null`, type exclusion | Row-level; no field |

**Critical**: "remove [place] loads" MUST NOT be interpreted as `has_any_null` or `!=` (would incorrectly exclude non-matching rows and wipe dataset).

---

## 5. Edge Cases (Concrete)

| ID | Edge case | Expected behaviour |
|----|-----------|--------------------|
| NL-EC-01 | "exclude bad loads" | Ambiguous; AI may misinterpret. Show parsed rule; user can edit. On failure: error, retry (EC-4.2) |
| NL-EC-02 | "asdfasdf" | Unparseable; show error; user must rephrase (EC-8.2) |
| NL-EC-03 | Filter references non-existent field | Reject; show error (GR-5.4) |
| NL-EC-04 | "remove London loads" with no London in data | All rows pass filters; before/after same (correct behaviour) |
| NL-EC-05 | "remove London loads" misinterpreted as exclude non-London | Wrong: would wipe dataset. MUST use contains, type exclusion (see NL-EC-04 contract) |
| NL-EC-06 | Compound phrase with typo in field name | May fail or partial match; show error; user corrects |
| NL-EC-07 | Empty input | Reject; no filter applied (EC-4.5) |

---

## 6. Extending to Other NL Features (Joins, Future)

The same pattern applies to Joins and any future NL input:

1. **Define semantic taxonomy** for that feature's intent categories
2. **List example phrasings** that MUST work
3. **Specify interpretation contract** (phrase → structured output)
4. **Add Given/When/Then** acceptance scenarios
5. **Document edge cases** with concrete examples

For Joins, the contract would map phrases like "join quote to load on load_id" to `{ leftEntity, rightEntity, leftKey, rightKey, fallbackKey? }`.

---

## 7. Traceability to PRD

| PRD reference | This doc |
|---------------|----------|
| FR-8.2, FR-8.3 | §2 Taxonomy, §3 Acceptance Scenarios |
| GR-5.1 | §1 Fallback, §5 NL-EC-02 |
| GR-5.4 | §5 NL-EC-03 |
| EC-4.2 | §5 NL-EC-01 |
| EC-8.2 | §5 NL-EC-02 |
| filter-scenarios.md | Implementation-level reference; this doc is requirements-level |
