# Asset provenance

## Cinematic key art

- Original lobby pathfinder and Cinder Coast key art generated with the built-in OpenAI image generation tool on 2026-10-27 for this project.
- Preserved source: `art-source/emberfall-keyart.png` (1672×941).
- Runtime encoding: `public/assets/keyart.webp`, quality 84. Format conversion only; the image is not a gameplay screenshot.
- Generator brief: an original lone island pathfinder on a basalt cliff above an abandoned coastal relay station; right-side full-body hero in dark teal technical armor, bone ceramic helmet with amber visor, burnt-orange scarf, fictional compact energy launcher; distant original gullwing drop craft; foggy jade ocean, copper light, charcoal shadows. Panoramic high-end painted 3D game key art, left third uncluttered for live HTML, no lettering, logos, UI, watermarks or existing game characters/maps. Non-gory 13+.

## In-game visuals

All island geometry, roads, buildings, door gaps, rocks, vegetation, loot, pathfinders, armor, weapons, parachutes, carrier, minimap, particles, tracers, lights, shields and ping symbols are drawn by authored TypeScript/Canvas/SVG. Weapon and place names are original. No game sprites, branded firearms, maps or logos were imported. The favicon and interface glyphs use simple authored vector geometry. Fonts are system fonts, with fallbacks; no font is fetched at runtime.

## Audio

All gun/impact/footstep/siren/heartbeat/pickup/winner/music audio is synthesized by `game/audio.ts` using oscillators, filtered noise, gain envelopes and stereo panning. No samples, sound libraries or remote audio files are used. Browser audio requires a user gesture.

## Screenshots

| File | Live scene | Provenance |
|---|---|---|
| `cover-1.png` | Lobby | Public v5, native Chrome, 2026-10-27, 1800×1200 |
| `cover-2.png` | Mid-fight | Public v11, cloud Chrome, 2026-10-28, seed88 local bot practice with ordinary squad autopilot; 1 human guest / 63 disclosed bots |
| `cover-3.png` | Actual winning squad | Same public v11 match, natural end at 5:22; Finch4 [BOT] was the sole surviving champion. Explicit spectator view; the viewer was defeated, so this is **not a claimed human victory** |

All are genuine browser captures from the deployed game. The live `?capture=1` layout is 1800×1200 and changes presentation only. Full-page screenshots already had the required dimensions. Browser JPEG bytes were encoded as PNG without resizing, compositing, pixel edits, or score/outcome changes. Exact SHA256 hashes and capture details are in `evidence/screenshots.json`. The screenshots are not generated key art or mockups.

## Runtime dependencies

Application assets and HTTP endpoints are same-origin. The WebRTC fallback uses `stun:stun.cloudflare.com:3478` for ICE discovery. There are no third-party trackers, analytics, ad SDKs, runtime remote asset requests or audio services. STUN is a disclosed networking exception to the original brief, not an asset source.

React, Vinext, Vite, Cloudflare tooling and Drizzle are development/runtime framework dependencies under their upstream licenses, retained through the package/lock files. No endorsement by those projects or another game is implied.

## Relic Run revision — 2026-10-29

New relic pylons/rings, routes, grenade warnings/arcs, dash trails, shockwaves, raider role accents and the Ash Warden are original canvas code in game/renderer.ts. Blast/dash sounds are synthesized locally in game/audio.ts. Existing generated key art is retained. No third-party game imagery or audio was added. Historical covers keep their original provenance.

`relic-run-gameplay.jpg` is an unedited 1363×936 screenshot from the public v13 game on2026-10-29. It shows an actual Relic Run grenade in flight, raiders,23 carbine rounds and two remaining grenades, after replay. This is not a mockup or a claimed victory. SHA256: 37891fb2d8b5346460240b7cdceaff0582bed7d63c975b5f211551f33b4b7537.
