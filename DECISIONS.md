# EMBERFALL — Director's decisions

2026-10-27. New Site: appgprj_6ae029881d2c81919ea4c1af0699b980. Vault Rush is out of scope and will not be opened or modified.

## Locked direction
- Original 2D squad survival on a basalt island. Bone ceramic armor, jade water, copper light. Title: EMBERFALL. Hero: a pathfinder.
- Canvas 2D match; semantic HTML lobby/HUD; TypeScript. Code-drawn world, characters and effects. Generated cinematic art. Synthesized Web Audio; no external runtime assets or APIs.
- Pure fixed-step simulation shared by authority, client prediction and tests. Inputs carry intent, never position/damage/ammo.
- No purchases, ads, analytics, accounts, free-text chat or outside identity. Random guest capability and filtered nickname.
- Probe production hosting before choosing room ownership. Durable Objects are not a documented Sites binding. Isolate-global rooms must not be described as durable or globally routed.

## Phase plan / release gates
0. Real WebSocket upgrade, shared counter, 20 Hz cadence, RTT and idle observation; lock architecture from evidence.
1. Working published slice: movement, gun, bots, zone, win/loss and second real client.
2. Full loop: flight/glide, six weapons, loot, armor/heals, six stages, airdrop, squads, revive, pings, reconnect, training.
3. Lobby, progression, audio, touch, feedback, settings, art, performance.
4. 1,000-match soak, unit/network/load tests, public browser and mobile-layout QA. Fix failures; document limits.
5. Saved version, production deployment, fresh session, handover, real 1800×1200 screenshots.

## Budgets
Target ≤3 MB initial transfer, 20 Hz authority / 10 Hz interest-filtered snapshots, 60 Hz render/prediction. Pick combatant cap from measured full-room work. Bots labelled. No claims of physical-phone testing from emulation.

## Phase 0 — measured architecture (not a promise)
- Production WebSocket upgrade succeeded. Browser: 580 callbacks / two sockets over 15 s; 50 ms observed timer gaps; mean echo RTT 19.25 ms. Two different isolate IDs and separate counters. Therefore isolate-global matchmaking is incorrect.
- A 48,000-byte shared D1 probe: 68 snapshots over 20 s, mean two-operation DB cycle 573 ms, p95 976 ms, maximum 2,429 ms; shared progression about 2.7 Hz. D1 is rejected for combat.
- Actual deployed Wrangler Durable Object binding + SQLite migration + exported class did not yield a runtime ROOMS binding. `/api/durable-probe` returned 501 with only DB and ASSETS. This is an observed Sites limit, not a claim about Cloudflare as a whole.
- Choose the brief's explicitly permitted host-authoritative WebRTC fallback. One peer owns the same pure simulation, clients send intent only, star topology, unreliable ordered-free state channel, separate reliable control channel. D1 is only matchmaking/signaling/checkpoint/progression, never the combat transport. Cap 8 human peers with 64 total combatants, disclosed bots. 20 Hz simulation, 10 Hz interest-filtered state, 60 Hz local prediction and interpolation.
- This changes the threat model: a malicious host can cheat. It is not server-authoritative ranked competitive infrastructure. No UI claim of server authority or secure competitive rank is allowed.
- Connectivity exception: WebRTC ICE uses the free Cloudflare STUN service to discover routable candidates. This is a networking dependency, despite the original no-external-runtime-calls rule. There are no remote assets, external HTTP APIs, analytics or trackers. No zero-cost TURN credential exists here; some restrictive NATs may fail. These limits must be visible in QA and final handover. Local training/bot play remains usable without network connectivity.
- Host migration: checkpoint to D1, stale-lease election, reconnect with existing guest identity. Authority is still a peer after migration; do not imply durability of an uncheckpointed last few seconds.

## Balance and hostile testing pass

- Enlarged the island to 4200 world units with a 1950-unit land radius; expanded the early circles. The six-stage schedule is now exactly 532 seconds including the carrier phase. Eliminations can end a round earlier; do not advertise a guaranteed duration.
- Bots use limited turn speed, inaccurate aim, reaction time and bursts scaled from guest XP. They obey cover line of sight and finite inventory. Dropped magazines preserve their remaining ammo to close a pickup/refill exploit.
- A 1,000-match 250 ms exploratory soak passed, but that step rate reduces high-rate weapon cadence. A separate 1,000-match production-rate 50 ms soak is required before using the final soak number.
- A real two-guest public test exposed checkpoint inflation, lease expiry, stale-host simulation, party-map loss and peer setup stalls. Added bounded transient events, small checkpoints, separate lease heartbeat, server-clock election, fencing, durable party-team assignments, early-ICE buffering and bounded negotiation waits. These fixes require a fresh public test; human counts alone are not proof of peer combat.
- The HUD frame-rate estimate now uses uncapped wall-clock frame intervals. Capped animation deltas must never be reported as measured FPS. Background host catch-up handles up to two seconds of elapsed time; physical mobile suspension is still a platform limit.
- Capture mode is a genuine 1800×1200 live DOM/canvas layout for the requested browser covers. It does not choose a winner, grant damage, teleport a player or synthesize a result.

- A concurrent first-join race now uses compare-and-swap party-room assignment. Human capacity is 8 per flight, and a code admits at most the selected squad size. Inviting from Solo selects Squad mode. These cases are covered by real-SQL service tests.

- Public v9 two-tab test completed SDP offer/answer exchange, but both PCs remained new/new/stable with no received match bytes. Added visible gathering/candidate counters, candidate error reporting and a 30-second retry window. Removed full canonical checkpoint broadcasts to peers: migration reads the D1 checkpoint after election, preserving normal-client interest filtering. A host still knows the full world by definition.

- Final gameplay QA fixed spectator HUDs to follow the living pathfinder and always restore the recap at match completion. A completed losing match can show its actual island champions in an explicitly labelled spectator victory card. It reads the authoritative terminal winner and living survivors, never changes the winner, grants XP or claims the viewer won. This makes the winner moment visible after spectating, including in local bot practice.
- A 48-seed exploratory nearby-roaming/wider-glide balance trial had median232.8s and did not meet the 8–12m pacing goal. It was rejected; production bot rules are unchanged. The measured pacing shortfall remains in QA.
- Reload now requires a new action ID. Repeated input packets carrying an old reload flag cannot trigger a fresh reload after firing; a regression test covers completion, firing, replay and a new deliberate reload.

- Final covers use real public captures at the requested dimensions. The champion cover shows the actual winning bot in a clearly labelled spectator view; no human win was achieved or invented. The live layout is 1800×1200, with no outcome/rule overrides. Provenance is explicit in ASSETS and screenshot hashes.
- Browser host refresh restored the identical D1-backed flight within the 60-second target in the single-host/bot case. Real peer reconnect and migration remain blocked by zero ICE candidates. A native extension retry was unavailable; no permission or browser-network protection was bypassed.
- After background throttling, stale feedback should expire against elapsed wall time. Final render code drops old shot/hit effects and ages particles/tracers by raw elapsed time; camera interpolation remains bounded. This does not claim a phone-performance pass.

## 2026-10-29 — Action and adventure revision

The user reported weak gameplay and requested more adventure/action. The new default is **Relic Run**, a short local solo expedition; Classic Squads remains a separate mode with its original rules and invitation links. This provides immediate combat without waiting on an unverified peer connection. It deliberately does not claim to solve the original shared-combat blocker.

The expedition starts armed; three raiders enter after1.8s. Two capture sites require6/7 seconds inside uncontested rings, then a900HP Warden unlocks extraction. Its1.2s marked strikes become faster/double below half health. Extraction needs8 seconds; the expedition window closes at6 minutes. This is a hard limit, not an expected match duration. Ideal test pilots complete it much faster; human pacing still needs play sessions.

Dash follows movement or aim in14 collision-tested substeps, briefly shields the player and has a3.2s cooldown. Grenades land235 units toward aim after0.8s, with a115-unit blast and friendly-fire exclusion. Ability sequence IDs reject repeat delivery. Raiders use real collision/line-of-sight and constrained turn/burst cadence. Kill combos, limited grenade restoration, supplies at relic captures and browser-local records support retries without awarding fabricated online XP.

Testing found extraction originally inside solid geometry; it was moved to an open clearing. The first enemy cadence killed an idle player too quickly, so role-specific weapon cadence was limited. The classic cadence is unchanged. Replay controls were attached to a previous closed network; a round generation fixes that lifecycle. Fast click taps are latched for one input tick. Local adventure pause stops the clock; classic shared matches continue during menus.

The user also requested a separate GitHub repository. Export authored source, original assets/covers, docs and evidence there after validation. Generated handover duplicates/ZIP, dependency folders, secrets and runtime state do not belong in the source export. Never touch unrelated or excluded repositories.
