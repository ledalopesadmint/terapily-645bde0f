# CBT-04 — Hierarquia de Exposição (Exposure Hierarchy)

## Protocol Origin
- **Creator:** Joseph Wolpe, MD (systematic desensitization, 1958/1969)
- **Modernized by:** Michelle G. Craske, PhD & Jonathan S. Abramowitz, PhD
- **Source:** Wolpe, J. (1969). *The Practice of Behavior Therapy.* Pergamon Press.
- **Based on:** Classical conditioning and inhibitory learning theory

## Clinical Protocol
**Type:** drag_drop | **Sub-mode:** ranking_ladder | **Duration:** 8-12 min

### Description
Patient lists feared situations/stimuli and ranks them from least to most anxiety-provoking using Subjective Units of Distress (SUDS, 0-100 scale). The resulting hierarchy guides graduated exposure therapy.

### Standard Steps (Craske protocol)
1. Identify target fear/avoidance behavior
2. Generate 8-15 situations related to the fear (varying intensity)
3. Rate each situation on SUDS (0 = no anxiety, 100 = worst imaginable)
4. Rank from lowest to highest SUDS
5. Begin exposure at lowest-ranked item
6. Progress upward as habituation/inhibitory learning occurs

### SUDS Reference Points
- 0-10: No anxiety, completely calm
- 20-30: Mild anxiety, noticeable but manageable
- 40-50: Moderate anxiety, uncomfortable but tolerable
- 60-70: High anxiety, very uncomfortable, urge to escape
- 80-90: Severe anxiety, intense distress
- 100: Maximum anxiety, worst imaginable

## Evidence Base
1. **Wolpe, J. (1958).** *Psychotherapy by Reciprocal Inhibition.* Stanford University Press. — Original systematic desensitization protocol with fear hierarchies.
2. **Craske, M. G., Treanor, M., Conway, C. C., Zbozinek, T., & Vervliet, B. (2014).** Maximizing exposure therapy: An inhibitory learning approach. *Behaviour Research and Therapy*, 58, 10-23. doi:10.1016/j.brat.2014.04.006 — Modern framework for exposure hierarchy construction.
3. **Abramowitz, J. S., Deacon, B. J., & Whiteside, S. P. H. (2019).** *Exposure Therapy for Anxiety: Principles and Practice.* 2nd Ed. Guilford Press. — Comprehensive exposure hierarchy construction guide.
4. **Foa, E. B. & Kozak, M. J. (1986).** Emotional processing of fear: Exposure to corrective information. *Psychological Bulletin*, 99(1), 20-35. — Theoretical foundation for hierarchical exposure.
5. **Wolitzky-Taylor, K. B., Horowitz, J. D., Powers, M. B., & Telch, M. J. (2008).** Psychological approaches in the treatment of specific phobias: A meta-analysis. *Clinical Psychology Review*, 28(6), 1021-1037. — Meta-analysis confirming graduated exposure efficacy.

## Delivery Modes
- `in_session`: **Therapeutically recommended** — therapist helps generate and calibrate items. Critical for first hierarchy.
- `shared_link`: Patient can revise/update hierarchy between sessions as homework.
- `both`: Build in session, refine at home.

## Terapily Adaptation Notes
- **ranking_ladder sub-mode**: Vertical drag-and-drop list with "Most anxiety" at top and "Least anxiety" at bottom.
- **Pre-loaded cards**: Terapily provides common anxiety-provoking situations as starting suggestions (customizable by therapist via config). Patient can also write custom items.
- **SUDS not displayed numerically** — instead, visual intensity gradient (color + position) communicates severity level, reducing cognitive load.
- **Data collected**: Final rank order, relative spacing between items, duration spent reordering (hesitation indicator).
- **Clinical flags**: If patient places all items at extreme ends (clustering at 90-100 or 0-10), system flags potential floor/ceiling effect for therapist review.
