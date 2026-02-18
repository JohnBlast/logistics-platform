# Platform Constitution

**Logistics Platform** – Governing principles for development.

## Purpose

This constitution guides all specification, planning, and implementation across platform products (ETL Configurator, Data Discovery, Job Market).

## Principles

### 1. User-Centric Design
- Target users are operations managers and admin staff with Excel experience, not technical developers
- Plain language and AI assistance where complex configuration is needed
- Visibility and feedback: step indicators, before/after previews, error suggestions

### 2. Data Integrity
- Data model is the source of truth; no mapping to invalid fields
- Validation gates prevent invalid states; save only when pipeline succeeds
- Guardrails protect against destructive or inconsistent actions

### 3. Specification-First
- Requirements drive implementation; no "vibe coding"
- Specifications are executable; they generate implementation guidance
- Edge cases and constraints documented before build

### 4. Incremental Delivery
- MVP scope is explicit; out-of-scope items documented
- Success criteria are measurable and testable
- Products are numbered for extensibility (001, 002, 003)

### 5. AI-Assisted Development
- AI aids configuration (mapping, joins, filters) and error remediation
- User retains control; suggestions are actionable, not auto-applied
- Mocked AI option for prototyping without live API

## Governance

When in doubt:
1. Refer to the feature spec and its guardrails
2. Prioritize non-technical user experience
3. Preserve data integrity over convenience
4. Document decisions in specs, not only in code
