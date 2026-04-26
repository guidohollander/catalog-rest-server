# Service Catalog vs Jira Compass: Strategic Analysis & Recommendation

**Prepared for:** Blyce Management  
**Date:** March 2026  
**Author:** Architecture / Platform Team

---

## 1. Executive Summary

Blyce currently operates a **Service Catalog** — a self-maintaining internal tool that automatically tracks all software components and solution implementations, keeping itself up to date without any manual intervention. Jira Compass is an Atlassian product that centralizes component ownership, quality scoring, and governance across development teams. While the two tools address overlapping concerns, they operate in fundamentally different ways and serve complementary purposes. This document assesses both options, explains why they are not mutually exclusive, and recommends a pragmatic path forward — including whether to expand the Service Catalog to cover non-BeInformed technologies such as OutSystems.

---

## 2. The Service Catalog Today

### What it is

The Service Catalog is a production tool built and operated by Blyce. It serves as the single source of truth for all BeInformed software components and solution implementations. Its defining characteristic is that it **maintains itself automatically**: whenever a developer makes a change in the version control system, the catalog updates itself within seconds — no manual data entry, no maintenance overhead.

### What it does

- **Tracks every software component** Blyce uses, including all versions (development versions, release versions, hotfix branches)
- **Tracks every solution implementation** — the complete, customer-specific product deployed for each client
- **Maps dependencies automatically** — knows exactly which component versions are included in each solution implementation, without anyone having to specify this manually
- **Integrates with Jira** — links components and implementations to Jira issues and epics
- **Integrates with Jenkins** — shows the build status for each component version
- **Covers all customers** — knows which solution implementation is deployed at which customer

### Key strengths

- **No manual data entry required** — all information flows in automatically when developers work
- **Always accurate** — data is updated in real time as development happens
- **Deep understanding of the BeInformed product model** — understands versioning conventions, solution structures, and customer relationships
- **Proven in production** — currently tracking hundreds of components and solution implementations
- **No licensing cost** — fully owned and operated by Blyce

### Development status and availability

The Service Catalog is **actively under development**. It is not yet available to all user groups and projects across Blyce. Currently, access is limited to a select set of **Anglo project users** for evaluation purposes. The evaluation is ongoing and the tool is being refined based on feedback before any broader rollout is considered.

This limited availability is intentional — it allows the platform team to validate the approach, address gaps, and ensure the tool meets the needs of a wider audience before scaling adoption.

### Current gaps

- **BeInformed-only** — components built on other technologies (e.g. OutSystems) cannot currently be registered
- **No team ownership model** — there is no formal way to record which team is responsible for which component
- **No quality scoring** — there is no automated health check or maturity score per component
- **No visual dependency map** — while the dependency data exists, there is no graphical view of it
- **Version control system dependent** — components that do not live in the Blyce version control system cannot be automatically tracked
- **Strategic dependency on BeInformed** — if BeInformed is phased out at some point, the current Service Catalog loses most of its value unless it has been successfully expanded to cover other technologies in the meantime

---

## 3. Jira Compass Overview

### What it is

Jira Compass is an Atlassian product designed to help organizations manage their software landscape at scale. It provides a centralized registry of components, combined with team ownership, quality scorecards, and dependency visualization.

### What it offers

- **Central component registry** — one place to see all software components across all teams
- **Team ownership** — every component has a clearly assigned responsible team
- **Quality scorecards** — configurable checklists and health scores per component (e.g. "has documentation", "has automated tests", "no open incidents")
- **Dependency visualization** — a graphical map showing which components depend on which
- **Incident integration** — connects to monitoring and incident management tools to surface component health
- **Atlassian integration** — native links to Jira issues, Confluence documentation, and Bitbucket/GitHub repositories

### Critical limitation

**Compass only works automatically with Git-based version control systems** (GitHub, GitLab, Bitbucket). Blyce uses SVN. Compass has no SVN support and no way to automatically discover, import, or track SVN-based components. Everything would need to be registered and updated manually.

---

## 4. Why Compass Was Not Previously a Viable Option for Blyce

Compass was evaluated but could not be adopted for BeInformed components for the following reasons:

| Issue | Consequence |
|-------|-------------|
| Blyce uses SVN, not Git | Compass cannot auto-discover SVN components |
| Component dependencies are tracked automatically via SVN | Compass cannot read this information; all dependencies would require manual input |
| BeInformed uses a specific versioning and branching structure | Compass has no awareness of this; all version information would be lost or oversimplified |
| 150+ components in the catalog | Registering and maintaining all of these manually is not feasible |
| Dependencies change with every new release | Keeping Compass up to date would require constant manual work after every release |

Attempting to use Compass for BeInformed components would mean maintaining a separate, manually-managed system that would quickly fall out of sync with reality — creating exactly the kind of fragmentation and data quality problem that Compass is meant to solve.

The Service Catalog was built precisely to fill the gap that Compass cannot fill.

---

## 5. Feature Comparison

| Capability | Service Catalog | Jira Compass |
|------------|----------------|--------------|
| **Automatic component discovery** | ✅ Fully automatic | ❌ Git-only; SVN not supported |
| **Keeps itself up to date** | ✅ Yes, in real time | ⚠️ Only for Git; manual for SVN |
| **Component registry** | ✅ BeInformed components | ✅ Any technology |
| **Dependency mapping** | ✅ Automatic | ✅ Visual graph (manual input for SVN) |
| **Team ownership model** | ❌ Not yet | ✅ Built-in |
| **Quality scorecards** | ❌ Not yet | ✅ Configurable |
| **Jira integration** | ✅ Issue linking | ✅ Native (same platform) |
| **Build status visibility** | ✅ Per component version | ⚠️ Requires additional setup |
| **Non-BeInformed components (e.g. OutSystems)** | ❌ Not yet supported | ✅ Supported (manually) |
| **Customer / deployment tracking** | ✅ Per customer | ❌ Not available |
| **No licensing cost** | ✅ | ❌ Atlassian license required |
| **Tailored to Blyce's product model** | ✅ Deeply | ❌ Generic only |

---

## 6. How the Two Tools Relate

The Service Catalog and Jira Compass are **not competing tools** — they serve different purposes and can coexist:

```
┌──────────────────────────────────────────────────────────────┐
│                    Governance Layer                          │
│  Jira Compass — team ownership, quality scorecards,          │
│  health dashboards, architectural overview                   │
├──────────────────────────────────────────────────────────────┤
│                  Source of Truth Layer                       │
│  Service Catalog — automatically maintained component        │
│  registry, version tracking, dependency mapping,             │
│  customer deployments, build status                          │
└──────────────────────────────────────────────────────────────┘
```

The Service Catalog is the **accurate, automatically maintained foundation**. Compass could serve as the **governance and communication layer** on top — showing ownership, maturity scores, and strategic dashboards to management and architects. If Compass is adopted, it could be fed data from the Service Catalog automatically rather than requiring manual entry.

---

## 7. Expanding the Service Catalog to Support Non-BeInformed Components

Blyce is not exclusively a BeInformed house. Components built on OutSystems, shared APIs, or other platforms also form part of the software landscape. The question is whether these should be tracked in the Service Catalog or in a separate tool.

### The case for expanding the Service Catalog

- Provides a **single catalog** for all Blyce software assets, regardless of technology
- Components like OutSystems modules or shared services can be registered with basic information (name, version, owner, description) without needing automatic discovery
- Avoids creating yet another siloed system
- Allows the same dependency view and customer relationship tracking that currently only works for BeInformed

### What expansion would require

| What changes | Estimated effort |
|--------------|------------------|
| Support for multiple component types (BeInformed, OutSystems, API, etc.) | Low |
| Simple form for manually registering non-SVN components | Medium |
| Recording which team owns each component | Low |
| Linking non-BeInformed components to solution implementations | Medium |

The automatic nature of the catalog would be preserved for BeInformed components. Non-BeInformed components would require a small amount of manual registration — but updates would be infrequent compared to BeInformed components.

### Important caveat: expansion is not free

Expanding the Service Catalog requires **development time and resources**. The catalog is actively being developed but has limited capacity. Specific capabilities — such as quality scorecards, deep incident management integration, or the tight native Jira integration that Compass offers as a built-in feature — would need to be built from scratch and are unlikely to reach the same level of depth or polish as a dedicated, commercially backed product. The Service Catalog can cover the fundamentals well; matching all Compass functionality is neither realistic nor necessarily desirable.

### When to use Compass instead

Compass makes more sense for non-BeInformed components if:
- Blyce adopts Git for new projects (enabling full auto-discovery)
- Governance, scorecards, and organizational ownership are the primary goals for those components
- The native Jira integration and Atlassian ecosystem depth are important (Compass integrates more tightly with Jira than a custom-built integration could)
- Atlassian licensing is already in place and the cost is acceptable

---

## 8. Risks

### Strategic risk: BeInformed phase-out

The Service Catalog was built around BeInformed's component model and SVN-based development workflow. If BeInformed is phased out over time — whether partially or fully — the catalog's relevance diminishes significantly unless it has been extended to cover other technologies before that transition occurs.

This is arguably the most important strategic consideration for the Service Catalog:

- If Blyce moves toward technologies that use **Git** (e.g. for new OutSystems projects or custom development), **Compass becomes significantly more attractive** — auto-discovery would work, and the investment in the Service Catalog's SVN-specific plumbing would no longer apply.
- If the transition away from BeInformed happens before the Service Catalog is broadened, the catalog may become a legacy tool with a shrinking user base.
- Investing in Service Catalog expansion now only makes long-term sense if there is a credible commitment to maintaining it beyond the BeInformed era.

This risk does not mean the Service Catalog should be abandoned today — for current BeInformed operations it remains the right tool. But it should inform how much additional development investment is justified, and whether a gradual migration toward Compass (as Git-based projects grow) is the more future-proof path.

### Adopting Compass alongside the Service Catalog

| Risk | How to manage it |
|------|------------------|
| Two systems with overlapping data become inconsistent | Establish clear boundaries: SC owns component/version data; Compass owns governance metadata |
| Teams are unsure which system to consult | Publish clear guidelines per role and use case |
| Compass data for SVN components becomes outdated | Mitigated by the SC→Compass sync: the Service Catalog continuously pushes up-to-date component data to Compass via the API, so Compass always reflects the current state without manual intervention |
| Compass license cost | Evaluate against the cost of building equivalent governance features in the Service Catalog |

### Expanding the Service Catalog

| Risk | How to manage it |
|------|------------------|
| Non-BeInformed component data is not kept up to date | Assign a component owner who is responsible for keeping the record current |
| The catalog becomes too broad and loses focus | Limit scope to component registry and version tracking; do not try to replicate full ALM functionality |
| Development capacity is limited | Prioritize high-value, low-effort additions; accept that some Compass capabilities (scorecards, deep Jira integration) may not be replicated |
| Custom Jira integration will always lag behind Compass's native integration | Accept this as a trade-off; use Compass if tight Jira integration is a hard requirement |

---

## 9. Recommendation

### Short term — immediately actionable (no new tooling required)

1. **Introduce cross-project component labels in Jira** using Labels or a custom field (e.g. "Product Component"), with a curated and governed list of component names that is consistent across all projects. This makes issues filterable and reportable by component in JQL and dashboards today — without waiting for Compass. The Service Catalog is well-positioned to manage this label list: it already knows every BeInformed component by name and can be extended with simple additional functionality to publish and synchronize the approved component list to all relevant Jira projects via the Jira API. This is a stepping stone, not a destination — Labels do not provide ownership, scorecards, dependency visualization, or structural enforcement; Compass addresses all of those.

2. **Continue using and maintaining the Service Catalog** for its current purpose: tracking BeInformed components and solution implementations automatically. Keep the Anglo evaluation running.

3. **Do not expand the Service Catalog to cover non-BeInformed components.** The development investment is not justified, and Compass handles this better.

### Medium term (3–6 months) — adopt Compass

4. **Adopt Jira Compass as the organization-wide component governance platform.** Compass is the natural evolution of the Jira Labels approach — it provides structured component records with team ownership, quality scorecards, dependency visualization, and deep native Jira integration. The groundwork laid in the short term (consistent naming, agreed component list) makes Compass adoption significantly easier.

5. **Integrate the Service Catalog with Compass via the Compass API.** BeInformed components should be automatically synchronized from the Service Catalog into Compass so that no manual registration is needed for the BeInformed component set:
   - Components registered in the Service Catalog are automatically created or updated in Compass
   - Compass becomes the unified governance view; the Service Catalog remains the accurate data source for BeInformed
6. **Register all other (non-BeInformed) components directly in Compass** — either manually or via Git auto-discovery for Git-based projects.
7. **Define clear team ownership in Compass** for all components.

### Long term (2028 and beyond) — transition

8. **As BeInformed is gradually phased out**, the Service Catalog naturally reduces in scope. Because data is already in Compass, no migration is needed.
9. **Compass becomes the single source of truth** for all components once BeInformed is no longer the primary platform.

---

## 10. Summary

| Question | Answer |
|----------|--------|
| Should we use Jira Compass for BeInformed components directly? | **No** — Compass has no SVN support; the Service Catalog must remain the data source |
| Should we expand the Service Catalog to cover non-BeInformed components? | **No** — too costly, limited return, and Compass already supports this |
| Should we adopt Compass as the governance platform? | **Yes** — for all components, all teams, all technologies |
| How should the two tools work together? | **SC feeds Compass via API** — SC auto-discovers BeInformed data, Compass provides governance |
| What happens when BeInformed is phased out? | **Compass continues** — the transition is smooth because data is already there |
| Is the Service Catalog still valuable? | **Yes, today** — as the automated data acquisition layer for BeInformed components |
| What is the recommended long-term platform? | **Jira Compass** — with the Service Catalog as a transitional data source |

---

*The recommended path is clear: use the Service Catalog for what it does uniquely well — automatically capturing BeInformed component data from SVN — and feed that data into Compass, which provides the governance, ownership, and visibility layer that works across all technologies. This avoids duplication, avoids unnecessary development investment in the catalog, and positions Blyce well for a future where BeInformed is no longer the only platform in use.*
