# Schema Preview UX Research – Ingestion Step

## Current Problems

The target schema preview in Ingestion has several UX issues:

- **Cramped**: `max-h-32` (128px), `text-xs`, minimal breathing room
- **Truncated**: Only first 8 fields shown; "+N more" hides the rest
- **Hidden info**: Description column hidden on small screens; descriptions truncated
- **No entity context**: Missing entity descriptions; schema feels like raw metadata
- **No full view**: No way to see the complete schema without leaving the flow

## Industry Patterns

### 1. Progressive Disclosure (Delphix, Payload CMS, shadcn)

- **Collapsible sections** per entity with expand/collapse
- Show a summary when collapsed (e.g. "Quote • 12 fields")
- Keeps the screen uncluttered while allowing drill-down

### 2. Clear Information Hierarchy (Microsoft Fabric, Elastic UI)

- Entity-level description and icons
- Field details: type, required/optional, description
- Grouping by entity; optional type badges (UUID, enum, etc.)

### 3. Context-Rich Interface (Informatica, dbt)

- Combine schema with short guidance (e.g. "Map your source columns to these fields")
- Data preview alongside schema when available
- Minimap/overview for large schemas

### 4. Schema Preview as Reference (n8n)

- Expose expected fields without mock data
- Users use schema to understand what to provide
- Drag-and-drop or click-to-select where applicable

### 5. ETL Mapping Tools (Informatica, Hightouch)

- Source and target shown side by side
- Mapping lines between fields
- Auto-suggest matching destination fields

## Recommended Improvements

| Improvement | Rationale |
|-------------|-----------|
| **Collapsible per-entity cards** | Reduce clutter, support progressive disclosure |
| **Readable sizing** | Use `text-sm`, more padding, no aggressive truncation |
| **Entity descriptions** | Add short entity description above each field list |
| **Full schema access** | "View full data model" link → modal with full schema |
| **Show all fields with scroll** | Replace "first 8 + N more" with a scrollable list |
| **Type badges** | Small pills for UUID, enum, DATE, etc. |
| **Required indicator** | Clear visual for required fields (e.g. asterisk, badge) |

## Implementation Approach

1. Replace the crammed table with a collapsible card per object (Quote, Load, Driver+Vehicle).
2. Each card shows: entity name, short description, expandable field list (all fields, scrollable).
3. Add a shared "View full data model" link that opens the DataModelPopover modal.
4. Use larger text and clearer hierarchy.
5. Keep schema preview contextual: "Target fields for [Quote] – you’ll map source columns to these in Mapping."
