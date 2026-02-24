# 001 – ETL Configurator

**Feature Branch**: `001-etl-configurator`

## Source-of-Truth Hierarchy

| Document | Role | Use When |
|----------|------|----------|
| **001-ETL-PRD.md** | Golden source – full product requirements | Running `/speckit.specify`, `/speckit.clarify`, or creating requirements |
| **spec.md** | Derived spec – user stories, acceptance scenarios | Planning and implementation |
| **plan.md** | Technical implementation plan | Tasks, implementation |
| **tasks.md** | Task breakdown (T001–T093) | Implementation execution |
| **research.md** | Tech choices and rationale | Reference during build |
| **quickstart.md** | Run instructions | Local development |
| **data-model.md** | Target schema summary | Implementation, API design, validation |

## Spec-Kit Workflow

See [../../speckit-toolkit.md](../../speckit-toolkit.md) for when to use each command (initiation vs post-implementation).

1. **Source**: Read `001-ETL-PRD.md` as the authoritative input.
2. **Specify**: Use `/speckit-specify` with the PRD as context to produce or refine `spec.md`.
3. **Clarify**: Use `/speckit-clarify` to resolve underspecified areas before planning.
4. **Plan**: Use `/speckit-plan` with tech stack; produces `plan.md`. ✓
5. **Tasks**: Use `/speckit-tasks`; produces `tasks.md`. ✓
6. **Implement**: Use `/speckit-implement` to execute.

## Key PRD Sections (for context)

- **Sections 1–2**: Overview, target users, goals, out of scope
- **Section 3**: Core user journeys (8 journeys)
- **Section 4**: Functional requirements (FR-1.x through FR-11.x)
- **Section 5**: Guardrails (GR-1.x through GR-10.x)
- **Section 6**: Interaction model (UX behaviour)
- **Section 7**: Data & domain concepts (entities, join order, dedup)
- **Section 8**: Success criteria
- **Section 9**: Edge cases & constraints

Reference the full PRD when adding requirements, clarifying scope, or validating implementations.
