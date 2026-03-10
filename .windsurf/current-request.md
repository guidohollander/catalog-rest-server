# Equalize Indexes on Production with Localhost

## Feature Description

Version switching via `ProcessImplementationExternals` (triggered when SVN externals are switched) is not working on production. DB procedures and views are confirmed identical between localhost and production. User suggests:
1. Clear all materialized data on production, re-materialize, check for errors
2. Check for duplicate indexes or constraint issues
3. User will provide an example call to test with

---

## Functional Requirements

### FR-1: Check for duplicate/conflicting indexes on production
Compare indexes between localhost and production for key tables.

### FR-2: Clear all materialized data on production
Truncate/delete all `mvw_*` tables, then re-run `usp_materialize_all_groups`.

### FR-3: Check for errors during re-materialization
Monitor for constraint violations, duplicate key errors, etc.

### FR-4: Test ProcessImplementationExternals on production
Wait for user example call or test with a known implementation.

---

## Non-Functional Requirements

- **NFR-1**: mvw_* tables CAN be cleared and rebuilt (they are materialized views)
- **NFR-2**: Never touch base table data or structure

## Production Connection

```
SERVER: DCSCDBH02\DBS22
PORT: 18022
USER: guido.hollander
PASSWORD: 1ZPwe7JvDqaFM8huvUOy
DATABASE: SERVICECATALOG-D
```

---

## Acceptance Criteria

- [ ] Indexes compared and any duplicates identified
- [ ] mvw_* data cleared and re-materialized successfully
- [ ] No errors during re-materialization
- [ ] ProcessImplementationExternals tested on production

---

## Tests
No Playwright tests — SQL error monitoring.