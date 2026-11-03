# Copy decisions (Melriver, 2026-10-21)

Answers to the open questions at the end of docs/COPY.md. Section agents apply these.

1. The flagship brand copy uses "9-figure revenue", consistent with the home page’s "9 figures", as confirmed for publication.
2. Role text from the API is rendered as received, except em and en dashes, which the site replaces with a comma and a space at render time (one helper, `cleanDashes()`). No other rewriting of API text.
3. Role groups: heading and count only. No invented intros.
4. "<3 min to apply" is kept, as the deck proposes. Rahul confirms at preview.
5. 404: keep "This page never *bloomed*."

## Round 2 (from docs/HANDOFF.md)

6. E5 Hello Nancy reply: "Hello yourself." approved. No fallback needed.
7. Portrait alt text: "Portrait of Rahul Ramchand" and "Portrait of Momoko Kashiwabara".
8. Footer on /careers and /careers/apply: hide the "Join the *spaceship*." statement (the page h1 already says it); keep "Start a conversation.".
9. Role links: `/careers/apply?role=<slug>` without the trailing slash everywhere (matches `trailingSlash: false`).
10. Closing bloom in the footer as a back-to-top control: label "Back to top" (visible on hover/focus, and as the accessible name).

11. Navigation: four links, "Brands", "People", "How we work", "Careers", one per petal of the mark. Approved.
