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

## Coverage: 33/33 scales

### Original PDFs downloaded (25)

| # | File | Scale | Source |
|---|------|-------|--------|
| 1 | `depression/PHQ-9.pdf` | Patient Health Questionnaire-9 | Kroenke et al. (2001). phqscreeners.com |
| 2 | `depression/CES-D.pdf` | Center for Epidemiologic Studies Depression | Radloff (1977). NIMH/NIDA |
| 3 | `depression/EPDS.pdf` | Edinburgh Postnatal Depression Scale | Cox et al. (1987). AAP |
| 4 | `depression/DASS-21.pdf` | Depression Anxiety Stress Scales-21 | Lovibond & Lovibond (1995). UNSW |
| 5 | `anxiety/GAD-7.pdf` | Generalized Anxiety Disorder-7 | Spitzer et al. (2006). AHRQ |
| 6 | `anxiety/SPIN.pdf` | Social Phobia Inventory | Connor et al. (2000) |
| 7 | `anxiety/K10.pdf` | Kessler Psychological Distress Scale | Kessler et al. (2002) |
| 8 | `trauma/PCL-5.pdf` | PTSD Checklist for DSM-5 | Weathers et al. (2013). VA NCPTSD |
| 9 | `trauma/PC-PTSD-5.pdf` | Primary Care PTSD Screen | Prins et al. (2015). VA NCPTSD |
| 10 | `trauma/IES-R.pdf` | Impact of Event Scale-Revised | Weiss & Marmar (1997) |
| 11 | `trauma/ACE.pdf` | Adverse Childhood Experiences | Felitti et al. (1998). ACEs Aware |
| 12 | `substance/AUDIT.pdf` | Alcohol Use Disorders ID Test | Babor et al. / WHO (2001) |
| 13 | `substance/CAGE.pdf` | CAGE Alcohol Screening | Ewing (1984) |
| 14 | `substance/DAST-10.pdf` | Drug Abuse Screening Test | Skinner (1982). NIDA |
| 15 | `substance/Fagerstrom.pdf` | Fagerström Nicotine Dependence Test | Heatherton et al. (1991) |
| 16 | `eating/EAT-26.pdf` | Eating Attitudes Test-26 | Garner et al. (1982). eat-26.com |
| 17 | `eating/SCOFF.pdf` | SCOFF Eating Disorder Screen | Morgan et al. (1999). NHS |
| 18 | `sleep/PSQI.pdf` | Pittsburgh Sleep Quality Index | Buysse et al. (1989). Univ. Pittsburgh |
| 19 | `sleep/Epworth-ESS.pdf` | Epworth Sleepiness Scale | Johns (1991) |
| 20 | `ocd/OCI-R.pdf` | Obsessive-Compulsive Inventory-R | Foa et al. (2002) |
| 21 | `ocd/Y-BOCS.pdf` | Yale-Brown OCD Scale | Goodman et al. (1989) |
| 22 | `wellbeing/WHO-5.pdf` | WHO Well-Being Index | Bech (1998) / WHO |
| 23 | `wellbeing/SWLS.pdf` | Satisfaction with Life Scale | Diener et al. (1985) |
| 24 | `wellbeing/AAQ-II.pdf` | Acceptance & Action Questionnaire-II | Bond et al. (2011) |
| 25 | `suicide/C-SSRS.pdf` | Columbia Suicide Severity Rating Scale | Posner et al. (2011). Columbia Univ. |

### Full reference docs with all items (5)

| # | File | Scale | Citation |
|---|------|-------|----------|
| 26 | `anxiety/PSWQ_REFERENCE.md` | Penn State Worry Questionnaire | Meyer et al. (1990). Behav Res Ther, 28(6), 487-495 |
| 27 | `anxiety/PDSS-SR_REFERENCE.md` | Panic Disorder Severity Scale-SR | Houck et al. (2002). Depress Anxiety, 15(4), 183-185 |
| 28 | `cognitive/ATQ-30_REFERENCE.md` | Automatic Thoughts Questionnaire | Hollon & Kendall (1980). Cog Ther Res, 4(4), 383-395 |
| 29 | `mood/MDQ_REFERENCE.md` | Mood Disorder Questionnaire | Hirschfeld et al. (2000). Am J Psychiatry, 157(11), 1873 |
| 30 | `functional/WSAS_REFERENCE.md` | Work and Social Adjustment Scale | Mundt et al. (2002). BJP, 180(5), 461-464 |

### Subset scales (3 — reference notes pointing to parent PDF)

| # | File | Scale | Parent |
|---|------|-------|--------|
| 31 | `depression/PHQ-2_SUBSET_NOTE.md` | PHQ-2 (items 1-2) | PHQ-9.pdf |
| 32 | `anxiety/GAD-2_SUBSET_NOTE.md` | GAD-2 (items 1-2) | GAD-7.pdf |
| 33 | `substance/AUDIT-C_SUBSET_NOTE.md` | AUDIT-C (items 1-3) | AUDIT.pdf |

### Additional files

| File | Purpose |
|------|---------|
| `functional/CFQ-7.html` | CFQ-7 original web source |
| `functional/CFQ-7_REFERENCE.md` | CFQ-7 items + scoring + citation |

## Structure

```
clinical-references/
├── depression/      PHQ-9, PHQ-2, CES-D, EPDS, DASS-21
├── anxiety/         GAD-7, GAD-2, SPIN, K10, PSWQ, PDSS-SR
├── trauma/          PCL-5, PC-PTSD-5, IES-R, ACE
├── substance/       AUDIT, AUDIT-C, CAGE, DAST-10, Fagerström
├── eating/          EAT-26, SCOFF
├── sleep/           PSQI, Epworth-ESS
├── ocd/             OCI-R, Y-BOCS
├── wellbeing/       WHO-5, SWLS, AAQ-II
├── functional/      CFQ-7, WSAS
├── cognitive/       ATQ-30
├── mood/            MDQ
├── suicide/         C-SSRS
├── drag-drop/           CBT-03..06 (Burns, Beck, Padesky), ACT-01..02 (Harris), DBT-06 (Linehan)
├── REFERENCE-INDEX.md
└── CLINICAL-VALIDATION-CERTIFICATE.md
```

## Legal

All 33 instruments are **freely available** for clinical and research use.
No copyrighted or licensed scales (e.g., Pearson, ISI, SCS-SF) are included.

## Validation

See `CLINICAL-VALIDATION-CERTIFICATE.md` for the complete audit methodology
and `REFERENCE-INDEX.md` for the master source citation index.
