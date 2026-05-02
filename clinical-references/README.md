# Clinical References — Source of Truth

> **⚠️ This folder is NOT application code.**
> It contains the original validated clinical instruments used as the source of truth
> for every scale in Terapily's `activity_catalog`.

## Purpose

Every item, score, cutoff, and severity band in Terapily was verified against
the original published instrument stored in this folder. **Zero invention.**

This folder serves as:
1. **Audit trail** — proof that our digital scales match the originals
2. **Validation reference** — for future item-by-item comparisons
3. **Transparency guarantee** — 100% sourced from peer-reviewed literature

## Structure

```
clinical-references/
├── depression/      PHQ-9, CES-D, EPDS, DASS-21
├── anxiety/         GAD-7, SPIN, K10
├── trauma/          PCL-5, PC-PTSD-5, IES-R, ACE
├── substance/       AUDIT, CAGE, DAST-10, Fagerström
├── eating/          EAT-26, SCOFF
├── sleep/           PSQI, Epworth-ESS
├── ocd/             OCI-R, Y-BOCS
├── wellbeing/       WHO-5, SWLS, AAQ-II
├── functional/      CFQ-7, WSAS
├── mood/            MDQ
├── cognitive/       (ATQ-30 — literature-sourced, see index)
├── suicide/         (C-SSRS — literature-sourced, see index)
├── REFERENCE-INDEX.md
└── CLINICAL-VALIDATION-CERTIFICATE.md
```

## Scales without standalone files (6)

These scales were verified via their published journal articles:

| Scale | Citation |
|-------|----------|
| PHQ-2 | Subset of PHQ-9 (items 1-2) |
| GAD-2 | Subset of GAD-7 (items 1-2) |
| AUDIT-C | Subset of AUDIT (items 1-3) |
| PSWQ | Meyer et al. (1990). Clin Psychol Rev, 10, 535-548 |
| PDSS-SR | Shear et al. (1997). Am J Psychiatry, 154, 1571-1575 |
| ATQ-30 | Hollon & Kendall (1980). Cog Therapy Res, 4, 383-395 |
| C-SSRS | Posner et al. (2011). Columbia University. Free |

## Legal

All instruments in this folder are **freely available** for clinical and research use.
No copyrighted or licensed scales (e.g., Pearson assessments, ISI, SCS-SF) are included.

## Validation Process

See `CLINICAL-VALIDATION-CERTIFICATE.md` for the complete audit methodology
and `REFERENCE-INDEX.md` for per-scale source citations.
