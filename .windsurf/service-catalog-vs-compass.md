# Service Catalog vs Jira Compass: Strategic Analysis & Recommendation

**Prepared for:** Blyce  
**Date:** March 2026  
**Author:** Architecture / Platform Team

---

## 1. Executive Summary

The Blyce Service Catalog is a self-maintaining, SVN-driven registry purpose-built for BeInformed solution implementations and their component versions. Jira Compass is an Atlassian product designed for centralizing component ownership and health across Git-based software ecosystems. The two tools address overlapping concerns from fundamentally different angles: the Service Catalog excels at automatic data acquisition from SVN and deep integration with the BeInformed component model, while Compass excels at organizational governance, scorecards, and dependency visualization across any technology stack — but only where Git is the source control system. This document analyzes both tools, identifies the gaps in each, and recommends a pragmatic path forward.

---

## 2. The Service Catalog Today

The Service Catalog is a production system running on BeInformed (frontend) and a Next.js REST API server (backend), backed by a SQL Server database.

### How it works

1. **SVN is the source of truth.** Every SVN commit to a component or solution implementation triggers a post-commit hook that calls the REST API (`/api/svn/propset`, `/api/svn/copy`, etc.), which writes structured data to the database.
2. **Auto-materialization.** Stored procedures (`usp_materialize_solution_implementation`, `usp_materialize_all_groups`) maintain denormalized materialized views (`mvw_solution_implementation`, `mvw_implementation_component`, `mvw_component_version`) that power fast reads without joins.
3. **SVN externals = dependency graph.** Component versions are linked to solution implementations via SVN `svn:externals` properties. The catalog reads these to build the implementation-to-component relationship — no manual linking required.
4. **Jira integration.** The catalog has a Jira integration layer for linking components and implementations to Jira issues/epics.
5. **Jenkins integration.** Build state per component version is surfaced via the Jenkins API.
6. **REST API for automation.** The catalog exposes endpoints used by the BeInformed toolchain for copy operations, existence checks, bulk queries, and property sets — it is actively used as an automation backend, not just a reporting tool.

### What it stores

| Entity | Description |
|--------|-------------|
| `component` | A reusable BeInformed module (e.g. `Person_Registration`) |
| `component_version` | A specific SVN path (trunk, tag, branch) of a component |
| `solution_implementation` | A deployable product (e.g. `mts grenada tags/2.6.1`) |
| `implementation_component_project` | Which component versions are in which SI (from SVN externals) |
| `customer` | The customer for whom an SI is deployed |

### Strengths

- **Zero manual data entry** — all data flows from SVN automatically
- **Always in sync** with SVN (post-commit driven)
- **Deep BeInformed model** — understands bi-version numbers, solution names, customer codes
- **Proven in production** with hundreds of components and solution implementations
- **Self-hostable** — no Atlassian license required
- **Jira-linked** — can correlate components to Jira issues

### Current limitations

- **BeInformed-only** — the data model assumes SVN externals-based component composition; non-BeInformed components (e.g. OutSystems, custom APIs) are not supported
- **No ownership model** — there is no concept of "team owns this component"
- **No health/scorecard concept** — there is no automated quality gate or score per component
- **No dependency visualization** — data exists but there is no graph UI
- **SVN-only** — components not in SVN cannot be registered automatically

---

## 3. Jira Compass Overview

Jira Compass is an Atlassian developer experience platform (part of the Jira ecosystem) that provides:

- **Component registry** — a central place to register all software components across teams
- **Ownership model** — each component has a designated owning team
- **Scorecards** — configurable quality/maturity scores per component (e.g. "has documentation", "has on-call runbook", "CI passing")
- **Dependency graphs** — visualize which components depend on which
- **Health metrics** — integrates with PagerDuty, Opsgenie, incident trackers
- **Integrations** — GitHub, GitLab, Bitbucket auto-discovery; Jira issues, Confluence docs

### Key constraint

**Compass auto-discovery is Git-only.** The automatic component registration and dependency detection features require a Git repository. There is no SVN connector, no SVN externals parser, and no mechanism to auto-populate component data from an SVN-based workflow. All SVN-managed components would need to be registered and maintained manually.

---

## 4. Why Compass Was Not Previously an Option

| Constraint | Impact |
|------------|--------|
| SVN is Blyce's version control system | Compass has no SVN support |
| Component dependencies live in `svn:externals` | Compass cannot read or interpret SVN externals |
| BeInformed component versioning is SVN path-based | Compass has no concept of SVN path = version |
| Automatic discovery requires Git webhooks | No Git = no auto-discovery |
| Data entry would be 100% manual | Not maintainable at scale; defeats the purpose |

Without SVN support, adopting Compass for BeInformed components would mean:
- Manually registering ~150+ components
- Manually updating dependencies when SVN externals change
- Maintaining two systems that would rapidly diverge
- No guarantee of data accuracy

This is why the Service Catalog was built: to fill exactly the gap that Compass cannot fill.

---

## 5. Feature Comparison

| Capability | Service Catalog | Jira Compass |
|------------|----------------|--------------|
| **SVN auto-discovery** | ✅ Full (post-commit hooks) | ❌ Not supported |
| **Git auto-discovery** | ❌ Not implemented | ✅ Full (GitHub, GitLab, Bitbucket) |
| **Component registry** | ✅ BeInformed components | ✅ Any component type |
| **Dependency visualization** | ⚠️ Data exists, no graph UI | ✅ Built-in graph |
| **Ownership model** | ❌ No team ownership concept | ✅ Team-level ownership |
| **Health / scorecards** | ❌ Not present | ✅ Configurable scorecards |
| **Jira integration** | ✅ Issue linking | ✅ Native (same platform) |
| **Jenkins integration** | ✅ Build status per version | ⚠️ Via third-party plugins |
| **Non-BI components (e.g. OutSystems)** | ❌ Not supported | ✅ Manual entry or API |
| **Self-maintaining** | ✅ Fully automatic | ⚠️ Manual or Git-only |
| **BeInformed version model** | ✅ Deep (bi_version, semver, branch types) | ❌ Generic only |
| **SVN externals as dependency source** | ✅ Native | ❌ Not applicable |
| **Deployment tracking** | ✅ Per-customer, per-SI | ⚠️ Limited |
| **Self-hosted / license-free** | ✅ | ❌ Atlassian license required |
| **Custom data model** | ✅ Fully customizable | ⚠️ Fixed schema |

---

## 6. Positioning: Complementary, Not Competing

The Service Catalog and Jira Compass are **not competing tools** — they occupy different layers:

```
┌─────────────────────────────────────────────────────┐
│              Organizational Layer                    │
│  Jira Compass: team ownership, scorecards,           │
│  health metrics, architectural governance            │
├─────────────────────────────────────────────────────┤
│              Automation / Source Layer               │
│  Service Catalog: SVN-driven component registry,    │
│  implementation tracking, version dependencies,     │
│  BeInformed-specific metadata, Jenkins builds        │
└─────────────────────────────────────────────────────┘
```

The Service Catalog operates **below** Compass — it is the machine-readable, automatically maintained source of truth. Compass could operate **above** it — providing the human-facing governance, ownership, and health layer.

A hybrid integration is viable: Compass components could be kept in sync with Service Catalog data via the REST API, feeding Compass with accurate component lists without manual entry.

---

## 7. Expansion Scenario: Supporting Non-BeInformed Components

The question of whether to support non-BeInformed components (e.g. OutSystems, custom middleware, third-party APIs) in the Service Catalog is valid regardless of Compass.

### What "non-BeInformed component" means here

- A software artifact not managed via SVN externals (e.g. an OutSystems module, a SOAP/REST service, a shared database)
- Has a version, an owner, dependencies — but no SVN path

### What would need to change in the Service Catalog

| Change | Effort |
|--------|--------|
| Add `component_type` to the data model (`beinformed`, `outsystems`, `api`, `database`, `other`) | Low |
| Allow manual creation of component versions (no SVN URL required) | Medium |
| Add `team_owner` to `component` table | Low |
| Build a UI form for manual component registration | Medium |
| Optional: API endpoint for external systems to push component data | Medium |
| Dependency linking without SVN externals (manual or API-driven) | Medium–High |

### Verdict on expanding vs adopting Compass for non-BI components

**Expand the Service Catalog** if:
- The non-BeInformed components are few and well-known
- You want a single catalog UI for all components
- You want to avoid Atlassian licensing costs
- The team can maintain the extended data model

**Use Compass** for non-BeInformed components if:
- The components span many teams and technologies
- Scorecard/health/ownership governance is the primary need
- Git is already used for those components (enabling auto-discovery)
- Atlassian licensing is acceptable

---

## 8. Risks & Considerations

### If Compass is adopted alongside the Service Catalog

| Risk | Mitigation |
|------|------------|
| Two sources of truth diverge | Build a sync mechanism (SC → Compass via API) |
| Manual Compass data becomes stale | Automate or do not use Compass for SVN components |
| Governance overhead doubles | Define clear ownership: SC owns SVN data, Compass owns governance layer |
| Teams confused about which tool to use | Define clear user journeys per role |

### If the Service Catalog is expanded to cover non-BI components

| Risk | Mitigation |
|------|------------|
| Manual data entry at scale is unmaintainable | Only expand for components with a clear owner and update process |
| Data model becomes too generic | Keep BeInformed-specific fields; add optional fields for other types |
| Scope creep erodes the tool's clarity | Define and enforce boundaries; the SC is a component/version registry, not a full ALM |

---

## 9. Recommendation

### Short term (now)

1. **Keep the Service Catalog as the primary system of record for all SVN/BeInformed components.** It is self-maintaining, proven, and irreplaceable for this use case.
2. **Do not migrate BeInformed component data to Compass.** There is no SVN connector; it would require full manual maintenance with no benefit over the current system.
3. **Evaluate Compass specifically for the governance layer** — team ownership, scorecards, and architectural documentation — where it genuinely adds value that the SC does not provide.

### Medium term (3–6 months)

4. **Extend the Service Catalog to support non-BeInformed components** (OutSystems, APIs) as lightweight, manually-entered records. Start with `component_type` and `team_owner` fields. This keeps a single catalog for all Blyce software assets.
5. **Add a dependency visualization UI** to the Service Catalog — the data already exists in `mvw_implementation_component`; a graph view would unlock significant value without any new data collection.
6. **If Compass is licensed**, integrate it as a read layer on top of the SC: push component list + ownership data from SC to Compass via the Compass REST API. This gives governance features without duplicating maintenance.

### Long term (6–12 months)

7. **Introduce a scorecard/health concept** in the Service Catalog — e.g., flag components where the latest tag is older than 12 months, where no active SI uses the component, or where no BeInformed version is specified.
8. **Consider Compass only for Git-based components** (if Blyce adopts Git for new projects) where auto-discovery would genuinely work.

---

## 10. Summary Table

| Question | Answer |
|----------|--------|
| Should we use Jira Compass for BeInformed components? | **No** — SVN is not supported; manual maintenance is not viable |
| Should we replace the Service Catalog with Compass? | **No** — the SC does things Compass cannot do |
| Can Compass and the SC coexist? | **Yes** — as complementary layers (SC = data, Compass = governance) |
| Should we expand the SC to support non-BI components? | **Yes, recommended** — small data model change, high value |
| Should we adopt Compass for non-BI Git-based components? | **Possibly** — if Git is adopted and governance is the primary need |
| Is the Service Catalog well-positioned? | **Yes** — it is self-maintaining, accurate, and deeply integrated |

---

*The Service Catalog's defining advantage is that it requires no human intervention to stay current. That is a rare and valuable property. Any expansion strategy should preserve and reinforce that advantage rather than compromise it with manual maintenance overhead.*
