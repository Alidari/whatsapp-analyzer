# Design System Specification: Editorial Data Storytelling

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

This design system rejects the "SaaS dashboard" aesthetic in favor of a high-end editorial experience. Instead of a sterile grid of charts, we treat WhatsApp chat data as a living history—a digital anatomy. The system breaks the "template" look through **intentional asymmetry**, where large-scale typography overlaps glass containers, and data visualizations breathe within expansive negative space. 

By utilizing a "Z-axis" depth strategy, we move away from flat 2D layouts. Elements are not just placed; they are curated. The goal is to make the user feel like they are flipping through a premium, personalized magazine of their own life.

---

## 2. Colors & Surface Philosophy
The palette centers on a sophisticated "Deep Emerald" foundation, punctuated by electric high-contrast accents that signify energy and "Wrapped" style excitement.

### Palette Strategy
- **Primary (`#59dcb5`):** The "Modern Emerald." Use for core actions and primary data points.
- **Secondary (`#bbc3ff`):** "Electric Blue." Use for secondary data trends and link-state interactions.
- **Tertiary (`#f8acff`):** "Neon Purple." Use for highlight metrics (e.g., "Most Active Hour") to provide a playful pop.
- **Background (`#0b141b`):** A deep, ink-like void that allows the Glassmorphism effects to shimmer.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through:
1. **Background Tonal Shifts:** A `surface-container-low` section sitting on a `surface` background.
2. **Soft Depth:** Using `surface-container-high` to denote a clickable card area against a `surface-dim` background.

### Signature Textures
To add "soul," use subtle gradients instead of flat fills for Hero CTAs. Transition from `primary` (#59dcb5) to `primary-container` (#006c54) at a 135-degree angle. This mimics the depth of a physical lens.

---

## 3. Typography: Editorial Authority
We pair the structural reliability of **Inter** with the high-fashion character of **Plus Jakarta Sans**.

- **Display (Plus Jakarta Sans):** Used for "Wrapped" style impact moments. `display-lg` (3.5rem) should be used for massive numeric milestones (e.g., "Total Messages: 42,042").
- **Headlines (Plus Jakarta Sans):** Bold and authoritative. Use `headline-lg` for section headers. Apply a slight negative letter-spacing (-0.02em) to create a tight, premium feel.
- **Body & Labels (Inter):** The workhorse. Inter provides the "Trustworthy" pillar of our tone. Use `body-md` for general analysis text and `label-sm` for data timestamps.

*Hierarchy Note:* Always lead with a Display or Headline element to anchor the eye before transitioning into Body text. Never let Body text float without a Bold Headline anchor.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "pop"; we use light and transparency.

### The Layering Principle
Depth is achieved by "stacking" the surface-container tiers. 
- **Base:** `surface` (#0b141b)
- **Mid-Ground:** `surface-container-low` (#141d24) for large section blocks.
- **Fore-Ground:** `surface-container-highest` (#2d363e) for interactive cards.

### Glassmorphism & Ghost Borders
For floating dashboard widgets:
- **Fill:** Use `surface-variant` at 40% opacity.
- **Effect:** `backdrop-filter: blur(20px)`.
- **Ghost Border:** If a container edge is lost, use the `outline-variant` (#3e4946) at **15% opacity**. Never 100%. This creates a "frosted edge" that catches light without being a "line."

### Ambient Shadows
If an element must float (e.g., a modal or a floating action button), use a diffused shadow:
- **Color:** A tinted version of `on-surface` (#dae3ee) at 6% opacity.
- **Blur:** Minimum 40px to mimic soft, natural ambient light.

---

## 5. Components & Interaction Patterns

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), roundedness `full` (9999px). No border.
- **Secondary:** Glassmorphism style. `surface-variant` at 20% opacity with a `ghost border`.
- **States:** On hover, increase the `backdrop-blur` and scale the button by 1.02x. Avoid harsh color flashes.

### Data Cards
- **Construction:** Use `surface-container-low`. Forbid the use of divider lines. 
- **Separation:** Use vertical white space (Spacing `8` or `10`) or subtle background shifts to separate "The Top Chatter" from "The Word Cloud."
- **Edge Treatment:** All cards must use `md` (1.5rem) or `lg` (2rem) corner radius. Sharp corners are forbidden as they conflict with the "Playful" tone.

### Input Fields
- **Style:** Understated. Use `surface-container-lowest` as the field fill. 
- **Focus State:** Transition the background to `surface-container-high` and apply a `primary` ghost border (20% opacity).

### Specialized Components: "The Insight Capsule"
A unique component for this system: a pill-shaped container (`rounded-full`) using `surface-container-highest` with a small `primary` glow behind it, used to highlight a single "Fun Fact" metric.

---

## 6. Do’s and Don’ts

### Do:
- **Use "Breathing Room":** Use spacing tokens `12` (4rem) and `16` (5.5rem) between major data sections. 
- **Asymmetric Layouts:** Place a headline on the far left and the corresponding chart slightly offset to the right to create an editorial flow.
- **Color Coding:** Use `tertiary` (Purple) exclusively for "Fun/Social" metrics and `primary` (Green) for "Volume/Utility" metrics.

### Don't:
- **No 100% Black:** Never use `#000000`. Use `surface` (#0b141b) to maintain the "Deep Emerald" tint.
- **No Hard Dividers:** Never use a solid line to separate two pieces of content. If you need separation, use a `1.5` (0.5rem) gap and a background color change.
- **No Default Shadows:** Avoid standard CSS `box-shadow: 0 2px 4px rgba(0,0,0,0.5)`. It feels cheap and kills the glass effect.
- **No Over-cluttering:** If a screen feels busy, increase the spacing scale rather than shrinking the typography.

---

## 7. Spacing & Rhythm
Rhythm is dictated by the **0.35rem (5.6px) base unit**. 
- Use **Spacing 3 (1rem)** for internal component padding (buttons, inputs).
- Use **Spacing 6 (2rem)** for card internal padding.
- Use **Spacing 20 (7rem)** for top-level page margins to create a "gallery" feel.