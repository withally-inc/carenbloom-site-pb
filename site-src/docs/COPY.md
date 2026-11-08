# Care & Bloom v4: copy deck

Final copy for every page, state and image. Section agents build from this file and do not write copy of their own. If a string is missing here, ask in `docs/HANDOFF.md`, do not improvise.

Conventions
- `*word*` = the wink word, set in Newsreader italic (`.wink`). One per headline at most. "Wink: none" means set the headline plain.
- `{curly}` = live value from `/api/role-state` or the form. Never hardcode a count.
- Source column: `verbatim` (current site, unchanged), `tightened from: "..."` (current site, edited), `new microcopy` (no current string existed), `brief` (owner-given in BRIEF.md), `API` (rendered from the role-state payload, not ours to edit).
- No em dashes or en dashes anywhere. Arrows (→ ↗ ←), the ellipsis (…) and "≈" are allowed.
- The ampersand in the wordmark "Care & Bloom" is set in Newsreader italic as part of Wordmark C. It is not a wink and does not count toward the one-per-headline rule.
- Headline length: anything over 40 characters is flagged ⚑ with a shorter alternative.

---

## Home (`/`)

### 1. Manifesto (hero)

| Element | Role | Text | Source |
|---|---|---|---|
| Display wordmark | h1 | Care & Bloom | verbatim |
| Brand line | lede (tagline, set large) | We move fast. We experiment. We build *enormous* brands. | verbatim. Wink: *enormous* (brief). ⚑ 54 chars: set on three lines, one sentence each. If one line is needed: "We build *enormous* brands." (25) |
| Counter figure | odometer value | 1,000,000+ | verbatim |
| Counter caption | caption | customers | verbatim |
| Counter rate | caption | +1 ≈ every 23 s | verbatim |
| Rising "+1" | decorative | +1 | verbatim. `aria-hidden="true"` |
| Counter group | aria-label | 1,000,000+ customers, about one more every 23 seconds | new microcopy (restates the two claims) |
| Cities | caption | Hong Kong · Shenzhen · London · San Francisco | verbatim |
| Scroll link | link (dot link, to `#record`) | See the record | tightened from: "See the record →" (arrow dropped, the dot link carries the motion) |
| Hero media | aria-label on the `role="img"` wrapper | A hand holds a blue halftone flower that opens from bud to full bloom. | new microcopy (replaces the v3 label, which described a different image) |
| Hero frames + video | alt | "" (empty; the wrapper carries the label) | new microcopy |

### 2. Record

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | Operating record | tightened from: "(01) Operating record" |
| Headline | h2 | In under 36 months, *profitably*. | verbatim. Wink: *profitably* |
| Odometer 1 label | label | Customers | verbatim |
| Odometer 1 value | odometer value | 1,000,000+ | verbatim |
| Odometer 2 label | label | Revenue | verbatim |
| Odometer 2 value | odometer value | 9 figures | verbatim |
| Odometer 3 label | label | Elapsed | verbatim |
| Odometer 3 value | odometer value | Under 36 months | verbatim ("Under" small, "36" rolls, "months" small) |
| Odometer row | aria-label | Operating record figures | verbatim |
| Odometer 1 | aria-label | Customers: 1,000,000+ | new microcopy |
| Odometer 2 | aria-label | Revenue: 9 figures | new microcopy |
| Odometer 3 | aria-label | Elapsed: under 36 months | verbatim |
| Proof line | caption (before logos) | Operators who previously scaled | tightened from apply page: "Built by operators who previously scaled IM8 (...), Casetify, and Peak21" |
| Logo IM8 | alt | IM8 | verbatim |
| Logo Peak21 | alt | Peak21 | verbatim |
| Logo Casetify | alt | CASETiFY | verbatim |

Logo order: IM8 · Peak21 · CASETiFY (brief).

### 3. Brands

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | Brands | tightened from: "(03) Brands" |
| Headline | h2 | Where *trust* is hardest to earn. | tightened from: "Our portfolio starts where trust is hardest to earn." Wink: *trust* |
| Intro | lede | Today, Care & Bloom operates in sexual wellness, with new brands planned across longevity, mental health, and education. | verbatim |

Card: Hello Nancy

| Element | Role | Text | Source |
|---|---|---|---|
| Name | h3 (set at display size) | Hello Nancy | verbatim |
| Category | label | Sexual wellness | verbatim |
| Status | chip (sun) | In market | verbatim |
| Description | body | A stigmatized category, made easy to enter and safe to trust. | tightened from: "Sexual wellness, direct to consumer. A stigmatized category made easy to enter and safe to trust." |
| Link | link (dot, ↗, new tab, to https://hellonancy.com) | Visit brand ↗ | verbatim |
| Link | aria-label | Visit Hello Nancy (opens in a new tab) | tightened from: "Visit Hello Nancy" |
| Gallery | aria-label | Hello Nancy product gallery | verbatim |
| Gallery pause button | aria-label | Pause gallery / Play gallery | new microcopy (auto-cycling media needs a pause control) |
| E5 reply (wave at the card) | decorative line beside the name, `aria-hidden="true"` | Hello yourself. | COPY-DECISIONS 6 |

Card: Biird

| Element | Role | Text | Source |
|---|---|---|---|
| Name | h3 (set at display size) | Biird | verbatim |
| Category | label | Intimate wellness | verbatim |
| Status | chip (sun) | In market | verbatim |
| Description | body | Design-led objects, made to be picked up, understood and bought without apology. | tightened from: "Design-led intimate wellness. Objects made to be picked up, understood and bought without apology." |
| Link | link (dot, ↗, new tab, to https://biird.co) | Visit brand ↗ | verbatim |
| Link | aria-label | Visit Biird (opens in a new tab) | tightened from: "Visit Biird" |
| Gallery | aria-label | Biird product gallery | verbatim |
| Gallery pause button | aria-label | Pause gallery / Play gallery | new microcopy |

The "01/02" card index is dropped: the order is not real (BRIEF section 7).

### 4. Spaces

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | The spaces | tightened from: "(02) The spaces" |
| Headline | h2 | More than content or commerce. | tightened from: "We focus on health categories where people need more than content or commerce." Wink: none |
| Intro | lede | We focus on health categories where people need products they can believe in, advice they can use, and brands that respect the stakes. | tightened from: "We focus on health categories where people need more than content or commerce. They need products they can believe in, advice they can use, and brands that respect the stakes." |

Accordion (one `button` per row, Sexual health open by default; the 01 to 04 numbers are dropped, the order is not real).

| Row | Role | Title | Status chip | Body | Source |
|---|---|---|---|---|---|
| 1 | h3 inside button | Sexual health | In market (sun) | Care for intimacy, hormones, fertility, pleasure, and agency still asks people to navigate stigma. We build brands that make the category easier to enter and safer to trust. | verbatim |
| 2 | h3 inside button | Longevity | Coming soon (outline) | Longevity is moving from abstract promises to practical healthspan: energy, recovery, prevention, metabolic health, and routines people can keep. | verbatim |
| 3 | h3 inside button | Mental health | Coming soon (outline) | People need support that feels accessible and human, with enough clinical seriousness to be trusted and enough cultural fluency to be used. | verbatim |
| 4 | h3 inside button | Education | Coming soon (outline) | Better health decisions start with language people understand. Education turns expert knowledge into routines, confidence, and behavior change. | verbatim |

Accordion button accessible name = title + status, e.g. "Sexual health, in market" (new microcopy). State is carried by `aria-expanded`, no extra text.

### 5. People (the one ink section)

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | People | tightened from: "(04) People" |
| Headline | h2 | Led by experienced operators. | verbatim (hero chip "Led by experienced operators"). Wink: none |
| Intro | lede | Our leaders have scaled consumer brands beyond $100M, alongside a Care & Bloom record of more than one million customers. | tightened from: "Built by leaders and operators with experience scaling consumer brands beyond $100M, alongside a Care & Bloom record of more than one million customers." |
| Group | aria-label | Operator track record | verbatim |

| Person | Role | Text | Source |
|---|---|---|---|
| Rahul: name | h3 | Rahul Ramchand | verbatim |
| Rahul: bio | body | Previously CMO at IM8, scaling it past $100M ARR in under 12 months. | verbatim |
| Rahul: link | link (dot, ↗, new tab) | LinkedIn ↗ | verbatim |
| Rahul: link | aria-label | Rahul Ramchand on LinkedIn (opens in a new tab) | tightened from: "Rahul Ramchand on LinkedIn" |
| Rahul: portrait | alt | Portrait of Rahul Ramchand | COPY-DECISIONS 7 (was "…, printed in cobalt duotone": at rest the section shows the ink print) |
| Momoko: name | h3 | Momoko Kashiwabara | verbatim |
| Momoko: bio | body | Co-founder of Hello Nancy. Performance marketing at Peak21 across D2C. | verbatim |
| Momoko: link | link (dot, ↗, new tab) | LinkedIn ↗ | verbatim |
| Momoko: link | aria-label | Momoko Kashiwabara on LinkedIn (opens in a new tab) | tightened from: "Momoko Kashiwabara on LinkedIn" |
| Momoko: portrait | alt | Portrait of Momoko Kashiwabara | COPY-DECISIONS 7 (was "…, printed in cobalt duotone": at rest the section shows the ink print) |

URLs: `https://www.linkedin.com/in/rahul-ramchand/`, `https://www.linkedin.com/in/momoko-kashiwabara-6a3a99134/`. No job titles: the current site gives none, do not add any.

### 6. How we work

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | How we work | tightened from: "(06) How we work together" |
| Headline | h2 | How we raise the *ceiling*. | tightened from: "(05) How we raise the ceiling". Wink: *ceiling* |
| Values block title | h3 | Our operating values | verbatim |
| Values list | aria-label | All seven operating values | verbatim |
| Card counter | caption | {nn} / 07 (e.g. "01 / 07") | verbatim |
| Previous control | aria-label | Previous value | verbatim |
| Next control | aria-label | Next value | verbatim |

Values (numbers are real order and stay). List shows number + name; the card shows name + sentence.

| No. | Name | Sentence | Source |
|---|---|---|---|
| 01 | Outsized ambition | Pick goals big enough to force better systems, sharper judgment, and measurable movement. | verbatim |
| 02 | Agency | We value actors: people who see the gap, name the move, and push the work forward because they care about the outcome. | verbatim |
| 03 | Reduce cycle time | Move in tight loops: act, read the number, reflect, and change the system quickly. | verbatim |
| 04 | Relentless upskilling | Getting better at the craft is an everyday expectation for the team and for every leader. | verbatim |
| 05 | Organic (re)org | Create structure around the problem, then rewrite it as soon as the structure stops serving the number. | verbatim |
| 06 | Human potential | Treat entrepreneurship as a path for people to discover a larger version of themselves. | verbatim |
| 07 | Creativity | Original thinking matters most when it becomes shipped product, sharper creative, or better customer insight. | verbatim |

Player-coach model

| Element | Role | Text | Source |
|---|---|---|---|
| Sub-headline | h3 | Focused teams. Player coaches. | verbatim. Wink: none (set on two lines) |
| Column 1 title | h4 | Pilot and co-pilot teams | verbatim |
| Column 1 body | body | Small pods own specific KPIs with a clear pilot, a strong co-pilot, a visible scorecard, and enough autonomy to move within the day. | verbatim |
| Column 2 title | h4 | Player coaches | verbatim |
| Column 2 body | body | Senior owners coach and play: they build the system, mentor the team, and personally take the hardest position when an area is new, broken, or below floor. | verbatim |
| Two-list title | h3 | What player-coach means | verbatim |
| List 1 label | label | Coach: what you own | verbatim |
| List 2 label | label | Player: what you do not delegate | verbatim |

| List | Item (strong) | Line (body) | Source |
|---|---|---|---|
| Coach | The KPI your team is hitting. | The daily report, the Tuesday call, and the number. | verbatim |
| Coach | The frameworks, scorecards, and rituals. | The operating system everyone runs on. | verbatim |
| Coach | Your people have what they need to ship. | Resourcing, unblocking, and escalation before momentum dies. | verbatim |
| Player | Below floor, fix it yourself today. | If the work is broken, jump in. | verbatim |
| Player | The new and evolving areas. | Own the work before the recipe is locked. | verbatim |
| Player | Rewriting structure as gaps appear. | Fight silos and work that does not ladder to the number. | verbatim |

Lemon: decorative, `aria-hidden="true"`, alt "". No copy.

### 6b. Build with us (new copy, Rahul to validate)

Between "How we work" and the footer, so the page ends with founders and candidates side by side. No backend: a valid submit opens the visitor's email app with a draft to hello@carenbloom.com, then the form swaps for the confirmation. A real inbox or form endpoint is a later upgrade.

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | Build with us | new copy, Rahul to validate |
| Headline | h2 | Have a brand that *belongs* here? | new copy, Rahul to validate. Wink: *belongs* |
| Intro | lede | We focus on health categories where people need more than content or commerce, and where trust is hardest to earn. Launch a brand with us, or bring yours into the group. | new copy built from the spaces intro ("We focus on health categories where people need more than content or commerce") and the brands headline ("where trust is hardest to earn"). Rahul to validate |
| Form | aria-label | Build with us | new copy |
| Category | legend (radio group) | Category | new copy |
| Options | radio tiles | Sexual health · Longevity · Mental health · Education · Something else | the four spaces (verbatim) + "Something else" (new copy) |
| Brand field | label | Brand or project | new copy |
| Link field | label / placeholder | Link (optional) / https://yourbrand.com | new copy |
| Name field | label | Your name | new copy |
| Email field | label | Email | verbatim (apply form) |
| Submit | button | Write to us | new copy |
| Submit helper | caption | Opens your email app with your answers, addressed to hello@carenbloom.com. | new copy |
| Email subject | mailto subject | Build with us: {brand} | brief |
| Email body | mailto body | Category: {category} / Brand or project: {brand} / Link: {link} (only when given) / Name: {name} / Email: {email}, one per line | new copy |

Validation (inline, on blur once a field was touched, every field on submit; the sun highlighter on the label, as on the apply form)

| Field | Message | Source |
|---|---|---|
| Category none | Choose a category. | new copy |
| Brand empty | Enter your brand or project name. | new copy |
| Link invalid | Enter a full link, starting with https://. | verbatim (apply form) |
| Name empty | Enter your name. | new copy |
| Email empty / invalid | Enter your email address. / Enter a valid email address, like name@example.com. | verbatim (apply form) |
| Status after a failed submit | Check the highlighted fields: {n} need attention. (1 → "1 needs attention") | verbatim (apply form) |

Confirmation (replaces the form, focus moves to the heading)

| Element | Role | Text | Source |
|---|---|---|---|
| Heading | h3 | Your email app should be open. | new copy |
| Body | body | Your message is drafted there. Send it when you are ready. | new copy |
| Fallback caption | caption | No email app opened? Write to us at | new copy |
| Address | link (`mailto:`, the prefilled draft) | hello@carenbloom.com | verbatim |
| Copy address | button / aria-label / announced | Copy → Copied / Copy email address / Email address copied. | verbatim (footer) |
| Copy message | button / aria-label / announced | Copy message → Copied / Copy your message / Message copied. (failure: Could not copy the message.) | new copy |
| Back to the form | text button | Edit your answers | new copy |

### Microcopy added after the first deck (motion review, pass 3)

Strings that shipped with the later sections (record field, live tip, places, player-coach pod, violet mode). All are new microcopy built from claims already on the site; none states a new fact. Rahul validates them at preview with the rest of the deck.

| Where | Element | Role | Text | Source |
|---|---|---|---|---|
| Hero | City clocks (link to `#places`) | link | Hong Kong {hh:mm} · Shenzhen {hh:mm} · London {hh:mm} · San Francisco {hh:mm} | new microcopy (verbatim cities, times are data) |
| Hero, record | Live dot | button, aria-label | Customer pace | new microcopy |
| Hero, record | Live tip, row 1 | tooltip | ≈ {n} new customers today | new microcopy (from "+1 ≈ every 23 s", counted from midnight in Hong Kong). Rahul to confirm |
| Hero, record | Live tip, row 2 | tooltip | ≈ {n} since you arrived | new microcopy (same pace, counted from the first page of the visit) |
| Hero, record | Live tip, note | tooltip | At the average pace of one every 23 seconds. | new microcopy (restates the published pace) |
| Record | Months strip | caption, under each year | Year 1 · Year 2 · Year 3 | new microcopy |
| Record | Dot field key | caption | Each dot is 1,000 customers. | new microcopy |
| Record | Dot field rate | caption | +1 ≈ every 23 s | verbatim |
| Record | Revenue line (beside "Customers") | caption | Revenue **9 figures** | verbatim ("Revenue", "9 figures"); the nine-slot visual was removed on 21 Oct 2026 at Mehdi's request |
| Record | Proof sentence | caption | Operators who previously scaled IM8, Peak21 and CASETiFY. | tightened from the proof line (logos set as glyphs in the sentence) |
| People | Places label | label | Where we work | new microcopy |
| People | Places city buttons | button (aria-pressed), screen-reader suffix | {city}, {hh:mm}, day / {city}, {hh:mm}, night | new microcopy |
| How we work | Pod diagram | figure caption (screen readers) | Diagram of a pod: a pilot and a co-pilot own one KPI. A player coach stands at the edge of the pod to coach and steps inside it to play. | new microcopy (restates the two columns) |
| How we work | Pod diagram labels | diagram text | Pod · KPI · Pilot · Co-pilot · Player coach | verbatim terms |
| How we work | Coach / Player switch | tablist, aria-label | What player-coach means | verbatim (the h3) |
| How we work | Coach / Player switch | tabs | Coach · Player | verbatim |
| Nav (desktop) | Theme switch on the mark | button, aria-label (aria-pressed) | Switch to violet mode / Switch to light mode | new microcopy |
| Nav (mobile menu) | Theme switch | button (aria-pressed) | Violet mode | new microcopy |
| How we work | E2 time in the counter | caption | {0.00} s | new microcopy (a number and a unit) |
| Brands | E5 reply | decorative | Hello yourself. | COPY-DECISIONS 6 |

### 7. Footer (shared by all pages)

| Element | Role | Text | Source |
|---|---|---|---|
| Statement 1 label | label | Careers | verbatim. Statement 1 (label, h2, count, link) is hidden on `/careers` and `/careers/apply`, whose h1 already says it (COPY-DECISIONS 8) |
| Statement 1 | h2 | Join the *spaceship*. | verbatim. Wink: *spaceship* (brief) |
| Live count, ready | caption | {n} open roles (1 → "1 open role") | tightened from: "Open roles (15)" / "15 open roles" (brief) |
| Live count, zero | caption | No current openings | verbatim |
| Live count, loading | caption | Checking current openings… | verbatim |
| Live count, error | caption | Openings unavailable | verbatim |
| Careers link | link (dot, to `/careers`) | See open roles | new microcopy |
| Statement 2 label | label | Contact | verbatim |
| Statement 2 | h2 | Start a conversation. | verbatim. Wink: none |
| Email | link (`mailto:`) | hello@carenbloom.com | verbatim (decoded) |
| Copy button, idle | button | Copy | new microcopy |
| Copy button, idle | aria-label | Copy email address | new microcopy |
| Copy button, done | button (2 s, then back to idle) | Copied | new microcopy |
| Copy, announced | `role="status"` text | Email address copied. | new microcopy |
| Copy, failed | `role="status"` text | Could not copy. Select the address above. | new microcopy |
| Footer nav | aria-label | Footer | verbatim |
| Footer nav links | link | Brands · People · How we work · Careers | verbatim (the four destinations of the nav, COPY-DECISIONS 11) |
| Wordmark | svg title | Care & Bloom | verbatim |
| Cities | caption | Hong Kong · Shenzhen · London · San Francisco | verbatim |
| Legal | caption | © 2026 Care & Bloom Limited | brief |
| Closing bloom | button (scrolls to the top, focus returns to the content) | Back to top | COPY-DECISIONS 10. The label is the accessible name and shows under the bloom on hover and focus; the bloom turns 45 degrees in cobalt |

---

## Navigation (all pages)

The compass (`docs/nav-sketches/DECISION.md`, COPY-DECISIONS 11): four destinations, one per petal of the mark, clockwise N, E, S, W. While reading, the petal of the current section stays full and the other three fade; at the top of a page the mark is whole. A petal bullet sits beside the current destination. Hovering or focusing the lockup turns the mark 45 degrees in cobalt; on home it scrolls to the top.

| Element | Role | Text | Source |
|---|---|---|---|
| Skip link | link (first focusable, to `#main`) | Skip to content | new microcopy |
| Brand link | link (icon + live wordmark, to `/`) | Care & Bloom | verbatim |
| Brand link | aria-label | Care & Bloom home | tightened from: "Care and Bloom home" (the accessible name now contains the visible wordmark, WCAG 2.5.3; screen readers say "and") |
| Primary nav | aria-label | Primary | verbatim |
| Link 1 (petal N) | link (to `/#brands`) | Brands | verbatim |
| Link 2 (petal E) | link (to `/#people`) | People | verbatim |
| Link 3 (petal S) | link (to `/#work`) | How we work | verbatim section label (COPY-DECISIONS 11) |
| Link 4 (petal W) | link (to `/careers`) | Careers | verbatim |
| Current destination | `aria-current` | `location` on home, `page` for Careers on `/careers` and the apply page | |
| Count, ready | link (cobalt with its live dot, to `/careers`) | Open roles ({n}) | verbatim |
| Count, loading | link | Open roles | new microcopy |
| Count, loading | aria-label | Open roles, count loading | tightened from: "Current open-role count loading" |
| Count, error | link | Open roles | new microcopy |
| Count, error | aria-label | Open roles, count unavailable | tightened from: "Open roles unavailable" |
| Preloader skip | aria-label on the preloader (click, key, wheel or touch skips) | Skip intro | new microcopy |

Mobile menu (below 960px): the mark is the menu button and the wordmark the home link. The menu unfolds the mark's petals into four quarters of the screen, clockwise from top left: Brands, People, How we work, Careers. No visible word on the button.

| Element | Role | Text | Source |
|---|---|---|---|
| Menu button (the mark), closed | aria-label | Open menu | new microcopy |
| Close button, open | aria-label | Close menu | new microcopy |
| Menu | aria-label (`role="dialog"`, `aria-modal`) | Menu | new microcopy |
| Quarters | link (set large) | Brands · People · How we work · Careers | verbatim |
| Home link | link (live wordmark), aria-label | Care & Bloom home | tightened from: "Care and Bloom home" (WCAG 2.5.3, as above) |
| Count | button-style link | Open roles ({n}) | verbatim |
| Contact line | link (`mailto:`) | hello@carenbloom.com | verbatim |
| Cities | caption | Hong Kong · Shenzhen · London · San Francisco | verbatim |

---

## Careers (`/careers`)

| Element | Role | Text | Source |
|---|---|---|---|
| Section label | label | Careers | verbatim |
| Headline | h1 | Join the *spaceship*. | verbatim. Wink: *spaceship* |
| Intro | lede | We launch and scale consumer health companies, each with $100M+ potential. We recruit builders: people who have scaled revenue, shipped product, built and broken things, and want to do it again alongside people who ship. | tightened from apply page: "We launch and scale consumer health companies with $100M+ potential each. (...) We're not hiring for roles, we're recruiting builders. People who've scaled revenue, shipped product, built things, broken things, and want to do it again, faster, with more resources, and alongside people who actually ship." (dashes removed) |
| Status chip, ready | chip (sun) | Actively recruiting | verbatim |
| Status chip, zero | chip (outline) | No current openings | verbatim |
| Status chip, error | chip (outline) | Openings unavailable | verbatim |
| Summary, ready | label | {n} roles open (1 → "1 role open") | tightened from: "(07) Careers · 15 roles open" |
| Summary, loading | label | Checking openings | tightened from: "(07) Careers · Checking openings" |

Groups (fixed order; render only groups with roles; the 01 to 04 group numbers are dropped)

| `careerGroup` | Heading (h2) | Count chip | Intro |
|---|---|---|---|
| platform | Platform | {groupCounts.platform} | none |
| launch | Launch | {groupCounts.launch} | none |
| scale | Scale | {groupCounts.scale} | none |
| source-build | Source & Build | {groupCounts["source-build"]} | none |

Group headings and labels are verbatim. The current site has no group intros and I have not written any: an intro would be a new claim about the team. Group heading accessible name: "Platform, 2 open roles" (new microcopy, live count).

Role row (whole row is one link to `/careers/apply?role={slug}`, sorted by `careerOrder`)

| Slot | Role | Text | Source |
|---|---|---|---|
| Title | row title (h3) | {title} | API |
| Location | caption | {locationType}, or "Remote" when missing | API / verbatim fallback |
| Close label | caption | {state.visibleCloseLabel} (e.g. "Closes November 2, 2026") | API |
| Arrow | decorative | → | verbatim, `aria-hidden="true"` |
| Row | aria-label | {state.applyLabel} (e.g. "Apply for Graphic Designer before applications close November 2, 2026 at 12:00 AM HKT") | API |

Layout note: the longest live title is "Creative Strategist, Performance Marketing" (42 chars). Rows must wrap it on mobile, never truncate.

States

| State | Role | Text | Source |
|---|---|---|---|
| Loading (skeleton rows) | visible label | Checking current openings… | verbatim |
| Loading | aria-label on the list (`aria-busy="true"`) | Loading open roles | new microcopy |
| Empty (`openRoleCount` 0) | body | No current openings. | verbatim |
| Empty, follow-up | body + link | Start a conversation: hello@carenbloom.com | tightened from footer: "Start a conversation." + email |
| Error | body (`role="status"`) | Current openings are temporarily unavailable. | verbatim |
| Error, retry | button | Try again | new microcopy |
| Error, retrying | button (disabled) | Checking… | new microcopy |
| Closed role (a row returned with `state.isOpen` false) | caption replacing the close label | Closed | new microcopy. Row is not a link; title muted. |

---

## Apply (`/careers/apply?role={slug}`)

### Page states before the form

| State | Element | Role | Text | Source |
|---|---|---|---|---|
| Checking | label | label | Care & Bloom careers | verbatim |
| Checking | headline | h1 | Checking role availability | verbatim |
| Checking | body | body | Confirming that this role is still open. | tightened from: "We are confirming this role with the hiring server." |
| No `?role=` | headline | h1 | Role not found | verbatim |
| No `?role=` | body | body | Choose a current opening from the Care & Bloom careers page. | verbatim |
| Unknown slug / 404 | headline | h1 | Role not found | verbatim |
| Unknown slug / 404 | body | body | This role is not one of our current openings. | verbatim |
| API failure | headline | h1 | Role unavailable | verbatim |
| API failure | body | body | We could not confirm this role right now. Please return to careers and try again. | verbatim |
| API failure | button | button | Try again | new microcopy |
| Closed | headline | h1 | This role is closed | verbatim |
| Closed | body | body | {title} is no longer accepting applications. | verbatim |
| Closed, after a submission | receipt (`role="status"`) | body | Your application was received before this role closed. Reference: {ref}. | verbatim |
| All states above | link | link (← dot link to `/careers`) | ← Back to careers | verbatim |

### Role hero

| Element | Role | Text | Source |
|---|---|---|---|
| Back link | link (to `/careers`) | ← Back to open roles | verbatim |
| Location | label | {locationType}, or "Remote" | API / verbatim fallback |
| Title | h1 | {title} | API. Wink: none. Longest live title is 42 chars: allow two lines. |
| Summary | lede | {role.summary} | API |
| Close label | caption | {state.visibleCloseLabel}; before load: "Weekly closing window" | API / verbatim |
| Countdown | `<time>` | {d}d {h}h {m}m {s}s; before load: "Loading deadline" | verbatim |
| Effort note | caption | <3 min to apply | tightened from: "<3 min" |
| Apply jump | button (to `#application-form`) | Apply | verbatim |
| Apply jump | aria-label | {state.applyLabel} | API |
| Details | aria-label on `dl` | Role details | verbatim |
| Detail terms | dt / dd | Location / {locationType or "Remote"} · Type / Full time · Level / {role.level}, or "Varies by role" | tightened from: "Full Time" (sentence case) |

### Role description

| Element | Role | Text | Source |
|---|---|---|---|
| Heading | h2 | About Care & Bloom | verbatim |
| Para 1 | body | We launch and scale consumer health companies with $100M+ potential each. Our operators previously scaled IM8 (NASDAQ, $100M+ in 12 months), Casetify and Peak21. Our flagship brand crossed 9-figure revenue and 1M+ customers in under 36 months. | tightened from: "We launch and scale (...) Built by operators who previously scaled IM8 (NASDAQ, $100M+ in 12 months), Casetify, and Peak21 / our flagship brand crossed 9-figure revenue and 1M+ customers in under 36 months. We're just getting started." See owner question 1. |
| Para 2 | body | We recruit builders: people who have scaled revenue, shipped product, built and broken things, and want to do it again alongside people who ship. | tightened from: "We're not hiring for roles / we're recruiting builders. (...)" |
| Para 3 | body + links | Our brands: hellonancy.com · biird.co | tightened from: "Check out our flagship brands: hellonancy.com · biird.co" |
| Heading | h2 | About the role | verbatim |
| Body | body | {role.mission} | API |
| Heading | h2 | Responsibilities | verbatim |
| List | ul | {role.responsibilities[]} | API |
| Heading | h2 | What we are looking for | verbatim |
| List | ul | {role.requirements[]} | API |
| Heading | h2 | How to apply | verbatim |
| Body | body | Use the form on this page. To stand out, answer the role questions with direct examples. | tightened from: "Use the application form on this page. To stand out, answer the role-specific prompts with direct examples." |

### Form

| Element | Role | Text | Source |
|---|---|---|---|
| Form | aria-label | Apply for this position | verbatim |
| Heading | h2 | Apply for this position | verbatim |
| Note | caption | Required fields are marked with an asterisk. | verbatim |
| Preview notice (any host other than carenbloom.com / www.carenbloom.com; shown above the fields and again next to the button) | notice (sun chip "Preview" + body) | Preview only: this form does not send applications. To apply, use carenbloom.com. | tightened from brief: "Preview: applications are not sent from this address." The words "carenbloom.com" link to `https://carenbloom.com/careers/apply/?role={slug}` (a link, never the form target). |

Fields (visible asterisk is `aria-hidden`; the input carries `required`. Field names and payload unchanged from `careers-apply.js`.)

| Field (`name`) | Label | Placeholder | Helper | Source |
|---|---|---|---|---|
| `first_name` | First name* | (none) | (none) | tightened from: "First Name*" |
| `last_name` | Last name* | (none) | (none) | tightened from: "Last Name*" |
| `email` | Email* | (none) | (none) | verbatim |
| `phone_country_code` | Country / area code* | Choose code | (none) | verbatim |
| `phone_number` | Phone number* | (none) | (none) | tightened from: "Number*" |
| `linkedin` | LinkedIn (optional) | https://www.linkedin.com/in/... | (none) | label verbatim; placeholder new microcopy |
| `resume` | Resume* | (file control, see upload states) | PDF, DOC, DOCX, ODT, TXT or RTF, under 4 MB. | label verbatim; helper new microcopy (types and limit from the script) |
| `intro_video_url` | Intro video (optional), or "Intro video*" when `role.introVideoRequired` | https://www.loom.com/share/... | Attach a short video (1-2 min) introducing yourself and why you are a great fit. Loom.com works well. Replaced by {role.loomPrompt} when present. | verbatim |
| Intro video tooltip trigger | aria-label "About intro videos", visible "?" | | | new microcopy |
| Intro video tooltip | tooltip | We encourage applicants to share a two-minute Loom video so we can get to know you sooner. Applicants' Loom videos will be prioritized in their review. | | verbatim |
| `monthly_income_usd` | Most recent all-in monthly income (USD/month)* | USD/month, numbers only | Enter the full monthly amount in USD before taxes, bonuses included. | verbatim |
| `open_time_zone` (fieldset) | What time zone are you open to work in?* | | Choose one or more. | legend verbatim; helper new microcopy |
| options | US · Europe · Asia | | | verbatim |
| `location` | Where are you based?* | Choose country | (none) | tightened from: "Location (where are you based)*" |
| Questions block | h2: A few questions for you | | | verbatim |
| `role_question_1..3` | {role.questions[i]} | Your answer | (none) | API / verbatim |
| `additional_attachment` (default) | Additional attachment (optional) | | Resume addendum, case study, or any supporting work. Under 4 MB. | tightened from: "Additional attachment (optional) / resume addendum, case study, or any supporting work" (dash removed, split into label + helper) |
| `additional_attachment` (when `role.portfolioRequired`) | {role.portfolioLabel}, or "Portfolio / work samples*" | | Under 4 MB. | API / tightened from: "Portfolio / Work Samples*" |

File-upload states (both file fields)

| State | Role | Text | Source |
|---|---|---|---|
| Empty | button | Choose file | new microcopy |
| Empty | caption | No file chosen | new microcopy |
| Selected | caption | {filename} · {size, e.g. "1.2 MB"} | new microcopy |
| Selected | button | Replace | new microcopy |
| Selected | button (text) | Remove | new microcopy |
| Selected, remove | aria-label | Remove {filename} | new microcopy |
| Too large (one file) | inline error | Each file must be under 4 MB. | verbatim |
| Too large (combined) | inline error | Your files together are too large. Keep their combined size under 4 MB. | verbatim |
| Wrong type (resume) | inline error | Use a PDF, DOC, DOCX, ODT, TXT or RTF file. | new microcopy |

Validation messages (inline under the field, `aria-describedby`, shown on submit and on blur after the first submit)

| Field | Message | Source |
|---|---|---|
| First name empty | Enter your first name. | new microcopy |
| Last name empty | Enter your last name. | new microcopy |
| Email empty | Enter your email address. | new microcopy |
| Email invalid | Enter a valid email address, like name@example.com. | new microcopy |
| Country code empty | Choose a country or area code. | new microcopy |
| Phone empty | Enter your phone number. | new microcopy |
| LinkedIn invalid | Enter a full link, starting with https://. | new microcopy |
| Resume empty | Attach your resume. | new microcopy |
| Intro video empty (required roles) | Add a link to your intro video. | new microcopy |
| Intro video invalid | Enter a full link, starting with https://. | new microcopy |
| Income empty | Enter your monthly income in USD. | new microcopy |
| Income not numeric (input strips non-digits; message only if pasted value is empty after strip) | Numbers only, in USD. | new microcopy |
| Time zone none | Choose at least one time zone. | new microcopy |
| Location empty | Choose your country. | new microcopy |
| Question empty | Answer this question. | new microcopy |
| Portfolio empty (required roles) | Attach your portfolio or work samples. | new microcopy |
| Error summary (top of form, focused on failed submit) | Check the highlighted fields: {n} need attention. (1 → "1 needs attention") | new microcopy |

Submit button and status line (`aria-live="polite"`)

| State | Button | Status line | Source |
|---|---|---|---|
| Idle | Submit application | (empty) | verbatim |
| Submitting (button disabled, form `aria-busy`) | Submitting… | Submitting application… | verbatim ("..." normalised to "…") |
| Preview host, after a valid submit | Submit application | Not sent: this is a preview. Your answers are still in the form. | new microcopy |
| Success | (form replaced by the success panel) | Application received. Reference: {ref}. | verbatim |
| Error | Submit application (re-enabled) | {server error}, or "Could not submit application right now." then "Your answers are still in the form." | verbatim + new microcopy |

Success panel (replaces the form, focus moves to the heading)

| Element | Role | Text | Source |
|---|---|---|---|
| Headline | h2 | Application received. | verbatim |
| Reference | body | Reference: {ref}. Keep it for your records. | verbatim + new microcopy |
| Link | link (to `/careers`) | See other open roles | new microcopy |
| Link | link (to `/`) | Back to home | new microcopy |

Apply-page footer uses the shared footer above.

---

## 404 (`/404.html`)

| Element | Role | Text | Source |
|---|---|---|---|
| Label | label | 404 | new microcopy |
| Headline | h1 | This page never *bloomed*. | new microcopy. Wink: *bloomed*. Plain fallback if the owner prefers: "Page not found." |
| Body | body | The address may be mistyped, or the page has moved. | new microcopy |
| Link 1 | link (to `/`) | Back to home | new microcopy |
| Link 2 | link (to `/careers`) | See open roles | new microcopy |

---

## SEO and social

| Page | `<title>` | Meta description | og:title | og:description | Source |
|---|---|---|---|---|---|
| Home | Care & Bloom \| Consumer health brands | Care & Bloom builds consumer health brands. Hello Nancy and Biird: 1,000,000+ customers in under 36 months, profitably. | Care & Bloom | We move fast. We experiment. We build enormous brands. | new microcopy from verbatim facts; og:description verbatim |
| Careers | Careers \| Care & Bloom | Open roles at Care & Bloom across Platform, Launch, Scale and Source & Build, in Hong Kong, Shenzhen or remote. | Join the spaceship. | Open roles at Care & Bloom across Platform, Launch, Scale and Source & Build. | new microcopy (no count in static meta, the count changes) |
| Apply (static, before load) | Apply \| Care & Bloom | Apply for an open role at Care & Bloom. | Apply \| Care & Bloom | Apply for an open role at Care & Bloom. | tightened from: "Care & Bloom careers / location varies by role." |
| Apply (role open, set by JS) | {title} \| Care & Bloom | {title}, {location}, at Care & Bloom. | {title} \| Care & Bloom | {title}, {location}, at Care & Bloom. | tightened from: "{title} / {location} at Care & Bloom." (dash removed) |
| Apply (role closed, set by JS) | {title}, closed \| Care & Bloom | (unchanged) | (unchanged) | (unchanged) | tightened from: "{title} / Closed \| Care & Bloom" |
| 404 | Page not found \| Care & Bloom | (none; `noindex`) | | | new microcopy |

| Element | Role | Text | Source |
|---|---|---|---|
| OG image (`public/og.png`) | og:image:alt | Care & Bloom wordmark with the four-petal bloom | new microcopy |
| `<html>` | lang | en | brief |

---

## Alt text for `assets-src/`

| File | Used in | alt | Source |
|---|---|---|---|
| `hero-grow-start.png` | Hero frame | "" (wrapper label: "A hand holds a blue halftone flower that opens from bud to full bloom.") | new microcopy |
| `hero-grow-end.png` | Hero frame | "" (same wrapper label) | new microcopy |
| `hero-grow.mp4` | Hero scrub | `aria-hidden="true"` (same wrapper label) | new microcopy |
| `nancy-lem.jpg` | Hello Nancy card | Hello Nancy's Lem product photographed on a bright yellow set with lemon slices | verbatim |
| `nancy-avocado.png` | Hello Nancy card | Hello Nancy avocado-form product arranged among avocados on a green ground | verbatim |
| `nancy-raspberry.png` | Hello Nancy card | Hello Nancy raspberry-form product held in a hand on a pink ground | verbatim |
| `biird-glass-sky.png` | Biird card | Biird glass wand held against a blue sky and white clouds | verbatim |
| `biird-lilac-first-timer.png` | Biird card | Biird lilac product in an on-body lifestyle photograph with first-timer guidance | verbatim |
| `biird-ohwii-branch.jpg` | Biird card | Biird's blue glass object resting on a bare branch against a blue backdrop | verbatim |
| `leader-rahul.png` | People | Portrait of Rahul Ramchand | COPY-DECISIONS 7 (was "…, printed in cobalt duotone": at rest the section shows the ink print) |
| `leader-momoko.png` | People | Portrait of Momoko Kashiwabara | COPY-DECISIONS 7 (was "…, printed in cobalt duotone": at rest the section shows the ink print) |
| `im8.svg` | Record proof line | IM8 | verbatim |
| `peak21.svg` | Record proof line | Peak21 | verbatim |
| `casetify-official.png` | Record proof line | CASETiFY | verbatim |
| `lemon-rotation-sprite.png` | How we work (cursor lemon) | "" and `aria-hidden="true"` (decorative) | new microcopy |
| `favicon.svg` | `<link rel="icon">` | n/a (not an `<img>`) | |

The bloom icon (preloader, nav, footer) is `aria-hidden="true"` wherever the wordmark text or a link label sits beside it. Standalone, its label is "Care & Bloom".

---

## Headline set

| Where | Headline | Chars | Wink |
|---|---|---|---|
| Hero | Care & Bloom | 12 | (wordmark ampersand) |
| Hero line | We move fast. We experiment. We build *enormous* brands. | 54 ⚑ | enormous |
| Record | In under 36 months, *profitably*. | 31 | profitably |
| Brands | Where *trust* is hardest to earn. | 31 | trust |
| Spaces | More than content or commerce. | 30 | none |
| People | Led by experienced operators. | 29 | none |
| How we work | How we raise the *ceiling*. | 25 | ceiling |
| How we work (sub) | Focused teams. Player coaches. | 30 | none |
| How we work (sub) | What player-coach means | 23 | none |
| Footer | Join the *spaceship*. | 19 | spaceship |
| Footer | Start a conversation. | 21 | none |
| Careers | Join the *spaceship*. | 19 | spaceship |
| Apply | {title} | up to 42 ⚑ (API) | none |
| Apply states | Checking role availability · Role not found · Role unavailable · This role is closed | ≤ 26 | none |
| Apply success | Application received. | 21 | none |
| 404 | This page never *bloomed*. | 24 | bloomed |

---

## Edits I made and why

- **Section labels**: dropped every "(01)" to "(08)" prefix and the card indexes "01/02" and spaces "01" to "04"; only the values keep numbers, their order is real.
- **Brand descriptions**: removed the category sentence ("Sexual wellness, direct to consumer." / "Design-led intimate wellness.") because the category label above already says it; kept the second sentence whole.
- **Brands headline**: "Our portfolio starts where trust is hardest to earn." was 51 characters; cut to "Where trust is hardest to earn." and kept the rest of the intro verbatim as the lede.
- **Spaces headline**: split the two-sentence intro so "more than content or commerce" becomes the headline and the lede carries the full sentence with "products they can believe in".
- **People intro**: "Built by leaders and operators with experience scaling" became "Our leaders have scaled"; the headline already says "operators", and the claim ($100M, one million customers) is unchanged.
- **People and How we work headlines**: reused existing strings ("Led by experienced operators", "How we raise the ceiling") instead of writing new ones.
- **Record proof line**: "Operators who previously scaled" comes from the apply page sentence that names IM8, Casetify and Peak21, so the logo row states a claim the site already makes.
- **Careers intro and About Care & Bloom**: removed the antithesis "We're not hiring for roles, we're recruiting builders", the em dashes, "actually", and the closing "We're just getting started." which adds no fact.
- **"Faster, with more resources"** dropped from the builders sentence: it repeated the pitch without a fact the reader can check.
- **Form labels**: sentence case throughout ("First name", "Full time"); "Number*" became "Phone number*" and "Location (where are you based)*" became "Where are you based?*" so each label reads alone.
- **Additional attachment label**: the script's dashed string split into a short label and a helper line.
- **Checking state**: "with the hiring server" replaced by "is still open"; candidates do not need the system detail.
- **Preview notice**: now says what to do next ("To apply, use carenbloom.com") and links to the live role page.
- **Titles and meta**: "{title} / Closed" and "{title} / {location}" had em dashes; replaced with commas.
- **Kept on purpose**: the brand line triplet, "stigmatized" next to "behavior" (mixed spellings exist on the live site), and every value and player-coach line, all verbatim.

---

## Owner questions

1. **Revenue confirmed.** The flagship brand copy uses "9-figure revenue", consistent with the home page’s "Revenue 9 figures".
2. **Role copy from the API** (`mission`, `requirements`, `questions`, `loomPrompt`) contains em dashes and antitheses, e.g. "This isn't brand design, every asset gets tested" written with a dash. It renders as-is. Fix at the source, or allow the front end to swap each spaced dash for a comma?
3. **Group intros** for Platform / Launch / Scale / Source & Build do not exist on the live site. The deck ships headings and counts only. Supply one line per group if you want them.
4. **"<3 min"** sits next to the countdown on the live apply page with no explanation. I read it as the time to apply and wrote "<3 min to apply". Confirm.
5. **404 headline**: "This page never *bloomed*." or plain "Page not found."


## Visit Hong Kong (`/visit/hong-kong/`)

Source: new visitor-guide copy from the brief and current sources in `VISIT-HONG-KONG-SOURCES.md`.
Walking times and price bands are estimates, not measured journeys or live prices.
Shared navigation, footer and theme controls reuse their existing copy above.
Wink words, one per headline: Kong., middle., local., detour., basics., bloom.

### Visible copy in reading order

Care & Bloom / Visitor guide

Hong Kong · November 2026

See you in Hong Kong.

Come for the conversation.
Stay for the neighbourhood.

An easy landing for candidates, partners, creators and podcast guests.
Where to stay, what to eat and how to find us in Central.

Find the office↗

Where to stay07

Eat & drink08

The practical bits↓

Your first stop

Right in the middle.

LKF 29

29 Wyndham Street Central, Hong Kong

中環雲咸街29號

Open office in Maps ↗

Your host will share arrival details before your visit.

From Central MTR

Use Exit D1 or D2 for the Queen’s Road Central side.
Head west along Queen’s Road Central, then uphill on D’Aguilar Street to Wyndham Street and number 29.
Allow about 7 to 10 minutes from the exit.

Central station map ↗

From the airport, by train

Take the Airport Express to Hong Kong Station, about 24 minutes on the train.
With bags, take a taxi from the station.
Travelling light? Follow the pedestrian connection towards Central Station and the D exits, then the route above.
Allow about 15 to 20 minutes on foot from Hong Kong Station.

Airport Express ↗

From the airport, by taxi

Follow signs to the official taxi rank and choose a red urban taxi for Hong Kong Island.
Show the driver “LKF 29, 29 Wyndham Street, Central”.
Allow roughly 40 to 60 minutes, with extra time in traffic.

Taxi areas ↗

Travel times are planning estimates, not live directions.
The last stretch is uphill; a taxi is easier with luggage.

Where to stay / 07 options

Make yourself local.

Central keeps you close.
Sheung Wan gives you a little breathing room.
Admiralty puts another neighbourhood within reach.

Book early for late November.
Prices can run high.
Compare your exact dates and cancellation terms before committing.

Price bands are relative to this shortlist: $ budget-conscious, $$ mid-range, $$$ premium, $$$$ luxury.
They are not live rates.
All walks are approximate, hotel to office.

Suggested stay

iclub Sheung Wan Hotel

Sheung Wan · $

For a practical base and a little more room in the budget.

One MTR stop from Sheung Wan to Central.

15 to 20 min walk

Official site ↗

Maps ↗

Ying’nFlo, Wesley Admiralty

Admiralty / Wan Chai edge · $$

For a simple, contemporary base with Wan Chai on the doorstep.

Walk to Admiralty, then one MTR stop to Central.
This hotel is in Admiralty, not Sai Ying Pun.

25 to 30 min walk

Closest to us

Butterfly on LKF

Central / Lan Kwai Fong · $$

For the shortest commute and evenings right in the action.

LKF is a nightlife district.
Light sleeper?
Ask about a quieter room.

2 to 3 min walk

Easy base

Butterfly on Wellington

Central / SoHo edge · $$

For an easy first visit, with lunch options in every direction.

Walk along Wellington Street towards Wyndham Street.

7 to 10 min walk

Design pick

Ovolo Central

Central / SoHo edge · $$$

For a design-minded stay that keeps the office very close.

Walk down to Wyndham Street.
Ask about street noise before booking.

2 to 4 min walk

Settle in

The Putman

Sheung Wan / Central edge · $$$

For a longer visit when an apartment-style base makes sense.

Check the room category and its facilities before choosing.

10 to 15 min walk

Make a stay of it

Mandarin Oriental, Hong Kong

Central · $$$$

For a full-service stay and a classic Hong Kong address.

An easy base for Central meetings and the Airport Express.

8 to 12 min walk

One more to come

The scenic stay

There is one more hotel recommendation on our list.
Its link has not reached this guide yet, so we are keeping this spot open rather than guessing.

Around the office / 08 picks

A very good detour.

A quick bowl before a meeting.
A slower dinner afterwards.
Start here and leave room for a discovery.

Lunch · 02

Dinner · 02

Coffee · 02

Drinks · 02

$ everyday, $$ a little more, $$$ a proper evening out.
Bands compare typical spend within each category.
Menus and booking policies can change; check the venue before you go.

Lunch near the office

Lunch

$

Yat Lok

34 to 38 Stanley Street, Central

A roast-goose lunch worth making time for.

Order: Roast goose with rice or noodles.

Plan: Plan on a walk-in and allow time for a queue.

Venue guide ↗

Tsim Chai Kee

98 Wellington Street, Central

A short menu that makes a quick lunch decision very easy.

Order: Wonton noodles.

Plan: Walk in; expect shared tables when it is busy.
Bring cash.

Stay for dinner

Dinner

$$$

Ho Lee Fook

Elgin Street, SoHo

Cantonese cooking for the dinner you leave the whole evening open for.

Order: Choose a few plates to share.

Plan: Book ahead, especially for a group.

Menu & booking ↗

$$

Chôm Chôm

58 to 60 Peel Street, SoHo

Vietnamese plates and cocktails when dinner should turn into an evening.

Order: Pho rolls.

Plan: Reservations available; walk-ins also welcome.

Coffee & a small reward

Coffee

FINEPRINT Peel Street

38 Peel Street, SoHo

Coffee, sourdough and a good excuse to pause on Peel Street.

Order: A flat white and toast.

Plan: Drop in; keep it casual rather than planning a large meeting.

Coffee & a pastry

Bakehouse SoHo

5 Staunton Street, Central

The pastry stop for your walk back to the office.

Order: See what is fresh at the counter.

Plan: Takeaway only.
Allow time for a queue.

After the conversation

After-work drinks

Bar Leone

11 to 15 Bridges Street, Central

An Italian-style neighbourhood bar for one very good round.

Order: Ask the bar for a classic cocktail.

Plan: No reservations.
Go early and expect a wait.

Quinary

56 to 58 Hollywood Road, Central

For the curious drinker who likes a little theatre in the glass.

Order: Earl Grey Caviar Martini.

Plan: Walk-ins only.
Arrive early if you need seats together.

A little local knowledge

Arrive with the basics.

Save the address.
Charge your phone.
The rest gets easier from here.

Octopus & contactless

Octopus is handy for public transport and small purchases.
On the MTR, use a marked contactless gate with a supported bank card, and tap in and out with the same card or device.

MTR payment guide ↗

The MTR is your friend

Central serves the Island and Tsuen Wan lines.
Sheung Wan and Admiralty are one stop away in opposite directions.
Sai Ying Pun is two stops west.
Follow the exit letters, not just the station name.

MTR network map ↗

Taxis & ride-hailing

Use a red urban taxi for Central, or choose the Taxi option in Uber.
Show the driver the building address.
Check the payment method before setting off and keep some Hong Kong dollars handy.

Taxi options ↗

Pack a layer

November is usually mild; December is cooler.
Average daily lows and highs are about 20 to 25°C in November and 16 to 20°C in December.
Bring a light jacket and check the forecast before you fly.

Seasonal weather ↗

Plugs & power

Bring a Type G adaptor, the three rectangular pins used in the UK.
Hong Kong runs on 220V, 50Hz.
Check that your devices support the voltage; an adaptor does not convert it.

Plug guide ↗

Stay connected

Set up a Hong Kong SIM or eSIM for maps on the move.
Check device compatibility and the provider’s activation steps.
Local prepaid SIMs require registration.
Airport and public Wi-Fi can help you get started.

Connectivity guide ↗

The bill, without the mystery

Many restaurants add a 10% service charge.
Check the bill before adding a tip.
Extra tipping is your choice; at casual local cafés it is not expected.

Tipping guide ↗

A short walk can be uphill

Central looks compact on a map.
Slopes, steps and crossings add time.
Wear shoes you can walk in, and take a taxi for the last stretch if luggage or mobility makes the hills inconvenient.

Accessible MTR travel ↗

The neighbourhood collection

More places to bloom.

One city at a time.
Start with Hong Kong.

You are here

Soon

Checked November 2026.
Walking times and price bands are estimates.
Confirm current details with each venue.

Back to top ↑

City names in the collection: Hong Kong, Shenzhen, London, San Francisco.
Index counts: 07 hotels, 08 food/drink picks; 02 per food/drink category.

### Accessible labels

- On this page
- Price band $
- Price band $$
- Price band $$$
- Price band $$$$
- Eat and drink categories
- Office city guides

### Metadata

- Title, og:title and twitter:title: Visit Hong Kong | Care & Bloom
- Description: Your guide to visiting Care & Bloom in Hong Kong: the office, nearby hotels, food, coffee and getting around.
- Social description: Your guide to the office, nearby stays and good detours in Hong Kong.
- Shared image alt: Care & Bloom wordmark with the four-petal bloom


## Hong Kong guide photography (November 2026)

Each named hotel and food or drink card includes one photo.
Venue photography carries its capture year; substitutes are visibly labelled and described as such in alt text.
The unidentified scenic stay remains a typographic placeholder.

| Card | Visible photo caption | Image alt text | Credit author | Licence |
| --- | --- | --- | --- | --- |
| iclub Sheung Wan Hotel | Hotel entrance · 2019 | The illuminated iclub Sheung Wan entrance on Bonham Strand, photographed in 2019. | Gal Mouw TU Aowur | CC BY-SA 4.0 |
| Ying’nFlo, Wesley Admiralty | Hotel entrance · 2026 | The red entrance to Ying’nFlo, Wesley Admiralty on Hennessy Road, photographed in 2026. | GAONG WEINHOAM 9122 | CC0 |
| Butterfly on LKF | Neighbourhood: Lan Kwai Fong | D’Aguilar Street in Lan Kwai Fong, a neighbourhood view rather than a photo of Butterfly on LKF. | Shauboasiwui CAILIUO | CC BY-SA 4.0 |
| Butterfly on Wellington | Hotel exterior · 2012 | The 122 Wellington Street entrance beside Graham Street’s market stalls, photographed in 2012. | Ghitangshenho | CC BY-SA 3.0 |
| Ovolo Central | Hotel exterior · 2022 | Ovolo Central rising above its entrance on Arbuthnot Road, photographed in 2022. | Shauboasiwui CAILIUO | CC BY-SA 4.0 |
| The Putman | Neighbourhood: Man Mo Temple | Man Mo Temple in Sheung Wan, a neighbourhood view rather than a photo of The Putman. | Ramdosmawm | CC BY-SA 4.0 |
| Mandarin Oriental, Hong Kong | Hotel entrance · 2006 | The covered entrance to Mandarin Oriental, Hong Kong, photographed in 2006. | KennethTom | CC BY-SA 3.0 |
| Yat Lok | Roast goose at Yat Lok · 2015 | Roast goose over rice at Yat Lok on Stanley Street, photographed in 2015. | Sakaori | CC BY 3.0 |
| Tsim Chai Kee | Restaurant exterior · 2021 | Tsim Chai Kee’s dark shopfront at 98 Wellington Street, photographed in 2021. | Weizshaum KIAMZOU 300 | CC BY-SA 4.0 |
| Ho Lee Fook | Restaurant entrance · 2024 | Ho Lee Fook’s illuminated sign above the entrance on Elgin Street, photographed in 2024. | SAISOU 853 MKIWMA | CC0 |
| Chôm Chôm | Vietnamese rolls · illustrative | A Vietnamese fresh spring roll with shrimp and lettuce, an illustrative food photo, not photographed at Chôm Chôm. | Phuongnhu | CC BY-SA 3.0 |
| FINEPRINT Peel Street | Flat white · illustrative | A flat white in a green cup, an illustrative coffee photo, not photographed at FINEPRINT. | Ashley Van Haeften | CC BY 2.0 |
| Bakehouse SoHo | Bakery counter · 2021 | Pastries and cookies at the Bakehouse SoHo counter, photographed in 2021. | Mockda Juankers | CC BY-SA 4.0 |
| Bar Leone | Negroni · illustrative | A Negroni over ice with orange peel, an illustrative cocktail photo, not photographed at Bar Leone. | Chris Palmer | CC BY-SA 2.0 |
| Quinary | Martini · illustrative | A martini garnished with lemon peel, an illustrative cocktail photo, not Quinary’s Earl Grey Caviar Martini. | Cocktailmarler | CC BY-SA 4.0 |

Credit-line pattern: `Photo: {author} · {licence} · cropped`.
The author links to the original Commons file page; the licence links to its terms.
