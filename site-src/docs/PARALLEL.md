# Working in parallel (read before building or testing)

Several agents work in this repo at the same time. To avoid collisions:

- **Build into your own folder**: `pnpm exec tsc --noEmit && pnpm exec vite build --outDir .builds/<you> --emptyOutDir`
- **Preview on your own port**: `pnpm exec vite preview --outDir .builds/<you> --port <yourPort> --strictPort` (run it in the background, kill it when done)
- **Smoke against your port**: `BASE=http://localhost:<yourPort> PAGES=<page> node scripts/smoke.mjs`
- Ports: foundation 4185, hero 4181, brands 4182, people 4183, careers 4184, challenger 4186.
- **Commit only your own paths**: `git add <your paths> && git commit -m "..." -- <your paths>`. Never `git add -A`, never commit files you do not own. If git is locked, wait 3 s and retry.
- TypeScript errors in files you do not own: do not fix them, note them in `docs/HANDOFF.md` and carry on.
- Need something from a file you do not own? Write it in `docs/HANDOFF.md` under your name, with the exact change, and work around it locally in your own files meanwhile.
