# EMBERFALL — QA evidence

Updated 2026-10-29. **Verdict: playable candidate with verified bot gameplay; not accepted as a launch-ready multiplayer release.** This file separates executed automated tests, browser observations and unverified requirements. The cloud browser gathered zero RTC connection candidates, so real shared combat is blocked here. Bot-only median duration is 3:56, below the requested 8–12m, and phone and performance gates remain open.

## Relic Run upgrade — 2026-10-29

- **34 unit/real-SQL service tests passed**, with a clean TypeScript check. Nine new expedition tests cover armed/clear spawning, open objective centers, early waves, isolation from classic last-team termination, collision/cooldown/replayed dash actions, finite grenade consumption and hostile damage, contested capture, both relics/boss/extraction state transitions, attack warning lead time, timeout, serialization/determinism and classic-mode isolation.
- **1,000 input-driven expedition runs at 20 Hz:** zero invalid states, negative inventories, stuck endings or actor-bound violations. 800 runs used an ideal-target/ideal-aim navigation pilot, 200 were idle. 800 pilots extracted and all 200 idle players lost. Winning pilot median38.8s; wall8.699s. No invulnerability, movement/health changes or winner overrides in this harness. This is functional coverage, **not a human difficulty or expected-duration estimate**. Raw dated rows and combined simulation hash: `evidence/adventure-soak.json`.
- Preview and public v13 browser observed the instant armed opening, raiders, defeat/recap, replay, shot consumption24→23, grenade count3→2, dash cooldown and changed objective distance, and a solo pause that held the same expedition clock. Public v13 replay also confirmed firing24→23 and grenades3→2; a real gameplay screenshot was saved. Full extraction is covered by input-only automated runs; no browser-controlled human boss victory is claimed.
- Fixed a material replay bug: the React match effect only tracked screen transitions, leaving subsequent rounds' engine attached to a closed previous network. A round generation now recreates controls. A short fire tap now survives until the next50ms input tick.
- Responsive844×390 and390×844 layouts are inspected through the same-origin iframe viewer. This does not emulate touch hardware or phone performance. The landscape lobby start control was corrected to one line and the footer fits inside390px; mission/minimap/ammo spacing was revised.
- Original classic multiplayer and phone gates below remain open. The historical classic1,000-match data belongs to the earlier build; classic combat is re-covered by the current unit suite, not relabelled as a new network validation.

## Automated tests actually run

- **25 unit/service tests passed in the historical classic run** with Node 24 native TypeScript stripping and real in-memory SQLite, plus a clean TypeScript check. Coverage: input validation/name filtering, damage/armor/shields/friendly fire, finite magazines/cadence, all six weapon identities, thin-wall ray checks, collision, zone stages, knock/revive, squad admission, loot duplication, interest filtering, seed determinism, terminal winner, historical hit checks, preserved dropped magazines, serialized party teams, guest identities, same-party matchmaking, eight-human capacity, cross-origin rejection, host fencing and idempotent XP, concurrent party-room assignment, per-code squad capacity, collision-index equivalence, replayed action IDs, a later squad-win bonus and replayed reload prevention.
- **1,000 full bot-only matches at production 20 Hz**, with 64 combatants each, across Solo (334), Duo (333) and Squad (333), seeds 70000–70999 and rank-scaled bot difficulty. No shortened zone schedule or large time-step shortcut. **0 failures, a winning team in every match**, no sampled non-finite positions/health/armor, negative inventory, overfilled magazine or non-terminal room. Ran in eight independent threads in 123.01 seconds. Raw rows: `evidence/soak-production.json`.
- Measured bot-only round duration: minimum 55.50s, median 235.95s, mean 236.16s, p95 351.65s, maximum 531.90s. Full storm schedule: **532s (8:52)**. Elimination often finishes earlier; the requested typical 8–12 minute duration is **not demonstrated by these bot-only results**.
- Maximum sampled serialized live state: 119,376 bytes. Production checkpoints omit visual events and rewind history, reducing checkpoint size. Per-thread post-GC growth was below 1 MB across its run, including retained result rows and runtime warmup. No unbounded room-state growth was observed; this is not a universal leak-proof guarantee.
- **Synthetic impaired-transport model:** 150 ms RTT (75 ms each direction), independent ±35 ms jitter and 5% loss on both directions for 42s; 840 inputs, 404 accepted snapshots, 58 dropped packets and 31 out-of-order discards. Movement prediction settled to 0.00 units of error after neutral input; p95 transient error 21.62, maximum 29.04. This exercises the movement/replay model, **not actual WebRTC under a network emulator**.
- **Simulation concurrency benchmark:** 8 independent rooms × 64 combatants, 120 simulated seconds each at 20 Hz. Per-room tick mean 0.474 ms, p99 1.285 ms on the executor; p99 computational headroom 97.43% against a 50 ms tick budget. This excludes rendering, RTC serialization and physical-phone CPU. It is not an eight-room production networking load test.

## Hosting probes actually run

1. A real published WebSocket endpoint upgraded and echoed. Browser probe: two sockets, 580 callbacks over 15s, observed 50 ms timer gaps, mean echo RTT 19.25 ms. The clients reached **different isolates with independent counters**, invalidating module-global room routing.
2. A 48,000-byte shared D1 probe returned 68 snapshots in 20s: mean DB cycle 573 ms, p95 976 ms, maximum 2,429 ms and about 2.7 shared updates/s. D1 was rejected for combat.
3. A deployed Wrangler Durable Object binding, migration and exported class did **not** produce a runtime ROOMS binding. The live endpoint reported only DB and ASSETS. This is a measured Sites deployment result, not a general Cloudflare limitation.

Raw files: `evidence/probe.json`, `evidence/shared-probe.json`, preserved probe source and `DECISIONS.md`.

## Real-browser observations so far

- Public URL opens without signup. Lobby, generated original key art, nickname entry, mode selection, settings and invite generation rendered in Chrome.
- Training rendered a playable code-drawn island, targets, loot, HUD, weapon/ammo, health/armor, timed hints and completion. An early minimap mount issue and headline wrapping issue were fixed.
- A host enters the carrier/ground loop, bots fight, the zone timer advances, damage/elimination and the death recap appear. Spectating and lobby return were exercised. A guest's XP/daily progress was observed after returning to the lobby.
- Two distinct guest tabs reached the same public v10 flight. SDP offer/answer exchange completed (one signal sent and one received on the guest), but both browsers reported `new/new/stable`, `iceGatheringState=complete`, **0 local / 0 remote candidates**, and **0 match-state bytes received**. The rendered diagnostics identified that this cloud browser supplied no connection candidates. This is a concrete blocked test, **not a multiplayer pass** or proof that every visitor network will fail. Initial defects in checkpoint inflation, lease expiry and old-host fencing were fixed and covered by service tests. Human counts alone are not accepted as evidence of shared combat.
- The native extension's originating browser context later became unavailable; testing continued in the cloud browser. Extension-internal metadata errors are excluded from game-error claims.
- A managed-preview responsive viewer rendered the actual game in an 844×390 iframe, showing the landscape HUD, twin sticks, fire control and minimap; training reached its 60s result. The ping wheel opened and returned after selection. A 390×844 portrait layout was also inspected. Pointer movement/fire were attempted but their gameplay effect was not established by this run. The viewer does not emulate touch hardware, 4G or CPU throttling.
- Public v11 host refresh recovered the same flight (`e1475c43`) and preserved ground state / 59 HP. A resumed HUD was observed 30.274s after reload; the matching flight identity was reconfirmed at 38.716s, including automation round trips. Counts progressed 61→57 and circle 1 hold38→31s. This is a **host/checkpoint recovery pass with bots**, not a peer-reconnect or host-migration pass.
- Public v11 spectator HUD showed the living target's health, armor and weapon, with player actions disabled. The natural match end automatically restored the recap, closing the hidden-recap defect.
- All three real public covers are complete at 1800×1200. Lobby is v5; combat and actual champion card are v11 local practice seed88. The winning squad's sole survivor was Finch4 [BOT] at 5:22. The viewer lost; `cover-3.png` explicitly shows the **actual bot champions in spectator view**, not a fabricated player win. See `ASSETS.md` and `evidence/screenshots.json`.

## Hostile-player complaint register

| Complaint | Implemented response / evidence | Current status |
|---|---|---|
| Empty lobby / fake humans | 64 total combatants, explicit human/bot counts, bot labels; no fabricated online counts | Code + browser observed |
| Slow startup | No login; host loop starts independently of signaling; training/practice local | Exact fresh-load/4G budget unverified |
| Confusing controls | Field manual, 60s playable training, contextual hints, visible keycaps | Desktop observed; phone flow unverified |
| Unfair landing death | Landing shield, guaranteed nearby initial weapon/armor, delayed bot reaction | Code + damage tests; balance needs play sessions |
| Bots see through walls / perfect aim | Same solid ray checks, turn-rate limits, reaction time, rank-scaled bursts and aim error | Code + unit tests; subjective tuning ongoing |
| Weak feedback / no sound | Tracers, recoil/spread, hit markers/numbers, sparks, shake, damage direction; gesture-unlocked procedural stereo audio | Render observed; physical playback unverified |
| Cheating | Intent whitelist, finite ammo/health authority, rate limits, origin/membership checks | Guest validation tested; malicious host remains trusted |
| Offensive names / chat abuse | Normalization/filter, length cap, fixed ping wheel, no free-text chat | Unit tested; no filter can promise universal coverage |
| Lost progress / repeated rewards | Persistent guest profile, transactional result application, idempotency and win-bonus upgrade | Real SQL tested; peer host attests results |
| Cannot invite / reconnect | Codes/links, tab capability, saved active room, checkpoint/lease election, bot takeover | APIs tested; final shared-combat/reconnect browser gate pending |
| Notch hides controls | Safe-area padding, responsive layout, landscape/fullscreen request, touch controls | CSS/handlers implemented; physical devices unverified |
| Match too short / too long | Six-stage 8:52 schedule, deterministic terminal tie-break | 1,000 real-rate results show earlier elimination; typical 8–12m not met |
| Runtime dependency / trust | No remote game assets; one disclosed Cloudflare STUN dependency, no TURN, peer authority | Explicit brief deviations |

## Not verified / release limits

- Real shared combat, peer refresh/rejoin within 60s and live host migration remain blocked in this cloud browser by zero gathered connection candidates. They require a browser/network that supplies WebRTC candidates before multiplayer can be called release-ready.
- Strict-NAT connectivity, real-world packet loss, iOS Safari, physical Android/iPhone touch/haptics/audio/fullscreen and real mid-range phone thermals.
- 60 FPS under 4× CPU throttle, a measured cold 4G playable-in-5s run and eight concurrent real WebRTC matches.
- Secure server authority/competitive anti-cheat is not provided. The explicitly permitted fallback trusts a peer host. Cosmetic rank is for fun; no authoritative leaderboard is claimed.
- A zero-cost authenticated TURN service was unavailable. Some networks may not connect directly; local practice is available.
- The external STUN request is a disclosed exception to the no-external-runtime-calls rule.

## Reproduce

```bash
npm test
npm run check
node tests/network-benchmark.mjs
node --expose-gc tests/soak.mjs
```

Do not convert pending items into passes without executing and recording their test. The handover includes the recorded public-browser observations and exact cover provenance. Final deployment success and its version are returned by Sites; the last gameplay browser run was v11.

## Build asset measurement

Measured public v11 emitted runtime JavaScript/CSS plus key art total 857,793 bytes uncompressed; gzip JS/CSS plus the already compressed WebP total 411,173 bytes. This is an emitted-runtime upper bound excluding HTML/API traffic and handover downloads, not a measured 4G transfer or startup-time test.

## Remaining acceptance work

1. On real visitor browsers that gather RTC candidates, establish shared combat between at least two distinct guests, then refresh the peer within 60s and close the host to test live migration. The cloud result cannot substitute for those passes.
2. Physical Android and iOS Safari landscape touch, fullscreen, safe areas, audio gesture unlock, haptics, thermal behavior, real 4G cold load and4× CPU profile. Cloud FPS varied around20–32 with multiple software-rendered canvases and dropped near1FPS in background tabs; it does not establish60 FPS on a phone.
3. Actual 150 ms/jitter/5%loss WebRTC and eight concurrent production networking matches. Current impairment and load results are explicitly synthetic/executor simulation measurements.
4. Longer pacing and subjective balance: current bot-only median 235.95s does not meet8–12m. Secure server authority and TURN coverage would require infrastructure beyond the measured Sites fallback. STUN remains the one disclosed external-runtime exception.

A final rendering fix ages tracers/particles by elapsed wall time and suppresses stale shot/hit events after background throttling. It changes visual feedback only; the 1,000-match simulation result remains applicable. Its final TypeScript/build checks are separate from physical-frame-rate evidence.
