# EMBERFALL current checkpoint — Relic Run upgrade

Existing Site: appgprj_6ae029881d2c81919ea4c1af0699b980
URL: https://emberfall-squads.daintypear3.chatgpt.site/
Checkout: /workspace/sites/emberfall
Audience: public; owner verified. Never create another Site or touch Vault Rush.

2026-10-29: user requested more adventure/action, then a separate GitHub repository when done. Implemented default solo Relic Run with instant armed spawn, four objective stages, aggressive role-based raiders, a900HP Warden, warning zones, dash/grenades, combos, extraction, solo pause and browser-local records. Classic Squads retained. Fixed replay engine/network lifecycle and fast click sampling. No money spent.

Verified:34 unit/SQL tests and TypeScript;1,00020Hz input-driven expedition runs, zero failures.800 ideal-aim pilots extracted;200 idle players lost. These are functional tests, not human win-rate data. Browser preview observed firing24→23, grenade3→2, dash cooldown/position change, replay and pause. Public v13 validated replay, firing24→23 and grenade3→2; relic-run-gameplay.jpg is a real public capture. Final deployment is recorded by native Sites results and QA.md. GitHub repository https://github.com/Prajwal-Pratap-Yadav/emberfall-relic-run is created through the authenticated account; finish/verify its source upload before handoff, with source export excluding generated handover duplicates and runtime secrets.

Classic shared combat remains unverified; the earlier cloud browser gathered zero ICE candidates despite completed signaling. Peer authority/STUN/noTURN and real-phone/60FPS/4G gates remain as documented in QA.md. Do not claim launch-ready multiplayer or a human boss win from the automated pilot.

Continue with the SAME Site checkout/ID, fresh native write credential and source helper. Preserve the public audience. Check exact native saved/deployment IDs before retrying any uncertain publication. GitHub source export is distinct from Sites backing Git; never overwrite its remote. The GitHub repository URL and final native publication are in the conversation's final handoff and release evidence.

## Earlier handover history

# EMBERFALL handover checkpoint

Public URL: https://emberfall-squads.daintypear3.chatgpt.site
Site ID: appgprj_6ae029881d2c81919ea4c1af0699b980
Checkout: /workspace/sites/emberfall
Audience: public. Vault Rush and unrelated repositories remain untouched. No money spent.

The full implementation and handover are prepared for final publication on the SAME Site. Last gameplay-tested publication: v11, commit ac92ab6eee34cac97ea29ef4533a14bcd6e7aa7c. The final source adds handover downloads, exact cover provenance and stale-visual expiry. Native Sites version/deployment results identify the final publication; do not create another Site.

Verified: 25 unit/real-SQL service tests, clean TypeScript/build,1,000 × 64 full 20 Hz matches (0 failures, winner every time,123.009 s run), synthetic150ms/jitter/5%loss movement replay and8-room simulation benchmark. Public gameplay/training/loss/spectating/terminal champion card and host-only refresh to the same checkpointed flight were observed. Covers1/2/3 are complete genuine1800×1200 captures; cover3 is an explicitly labelled spectator view of actual bot champions, not a claimed player win.

Release gate remains OPEN: shared combat cannot be verified in this cloud browser (both PCs gather 0 candidates despite complete SDP). Peer reconnect, live migration, actual impaired WebRTC, eight-networked-room load, physical phones/iOS, real touch/audio/haptics/fullscreen,4G/4× CPU/60 FPS remain unverified. Bot-only median 235.95s is below requested 8–12m. Peer authority and external STUN are disclosed fallback limitations. QA.md is authoritative about these limits; do not relabel this as launch-ready.

If continuing: reuse this checkout/ID and the native source-credential helper. Read QA.md and the latest native version before editing. Resume any pending native deployment rather than saving/deploying duplicates. For real peer verification, use browsers that produce RTC candidates; never bypass browser-network protections. The six handover documents and covers/source/evidence are packaged under public/handover. No user login/payment is needed to play bot practice.

# Historical implementation log
Phase 0 completed; Phase 1 in progress — peer-authoritative slice.
Project: appgprj_6ae029881d2c81919ea4c1af0699b980
Live probe URL: https://emberfall-squads.daintypear3.chatgpt.site
Checkout: /workspace/sites/emberfall
Audience: public. Vault Rush untouched.
Measured: WS works, ~19 ms browser RTT; clients split isolates. D1 2.7 Hz / 573 ms mean 48 KB cycle. DO binding was not provisioned. Details in DECISIONS.md; raw probes in evidence/.
Architecture: 64 total combatants, up to 8 humans; peer-hosted pure TypeScript simulation over WebRTC; D1 signaling/checkpoints only. STUN dependency and host trust are explicit deviations, not server authority.
Files: game/data.ts, simulation.ts, audio.ts; generated lobby asset public/assets/keyart.webp.
Next: room/session signaling endpoints, peer transport, canvas renderer and lobby. Then publish a playable slice, complete QA and handover.
Latest deployed version: 4, durable capability probe. Never call create_site again for this checkout.

Phase 1 implementation checkpoint: lobby, canvas match, audio, six weapon handling, zone, bots, supplies, squads, revives, touch, training, progression and results are implemented. Preview opened in a real browser and training rendered/ran. Fixed a cross-font headline wrap and minimap mounting issue. 15 core tests pass; TypeScript check passed before publication. Next: deploy playable slice, test two distinct guest peers on public URL, then hostile QA / soak. No claim of completed multiplayer verification yet.

Public playable slice saved/deployed as version 5 (commit 5174181cf1cfe0c41ae39e043ea2cdc99be2c1ea). Production two-tab QA discovered failed peer negotiation, unbounded visual history in checkpoints, premature lease expiry and old-host simulation not fenced after election. These are being fixed; do NOT report real multiplayer as verified yet. cover-1.png is an exact 1800x1200 lobby screenshot from v5. Initial 1,000-match soak passed, but pacing was too fast. Current balance uses a 4200-unit island, 1950 radius, larger zone radii, deliberately bursty imperfect bots and magazine-preserving dropped loot. Current source has stable party maps, bounded events, checkpoint stripping of visuals, signaling error diagnostics, early ICE buffering, lease heartbeat, server-clock election and host fencing. Re-test public after next deploy.

2026-10-28 continuation: v6 is public; current source adds nonblocking/timed RTC negotiation, heartbeat diagnostics, FPS wall-time correction, 2-second host catch-up, continuous revive interruption, bounded events and same-party persistence. A fresh cloud-browser host renders/plays, but peer setup is still waiting; do not claim multiplayer success. Native browser extension became unavailable after the originating browser context changed. Cloud QA uses distinct guests via the New Guest action. A 1,000-match 250ms soak finished: 0 failures, winner every time, max sampled state 109455 bytes; mean 249.59s, median 237.75s, p95 398.25s. This is exploratory and explicitly not the production-rate result. Production-rate 20 Hz 1,000-match soak is now running in 8 worker threads via tests/soak.mjs (outputs/soak-production.log/json). Read its completion result before finalizing QA. Network model: 150ms RTT ±35ms each direction / 5% loss, final error0, max29.04 units; simulation load:8 rooms×64, p99 1.24ms on executor before collision indexing. These do not prove production networking or phone performance.

Production-rate soak completed on 2026-10-28: 1,000 × 64-combatant matches, full 20 Hz/50ms production simulation and unshortened zones, seeds70000–70999, 0 failures, one winning team every time. 8 threads, 114.174s wall time. Median235.95s, mean236.16s, p95 351.65s, max531.9s; typical 8–12 minutes is not achieved in bot-only data. Peak sampled live state119376bytes; per-thread retained heap growth under1MB including rows. Raw evidence copied to evidence/soak-production.json. README/ASSETS/QA/SUBMISSION are written; description lengths420 and411 characters. Real RTC peer connectivity remains unverified. Next: deploy current source (new timeout diagnostics), inspect peer error, finish public-browser reconnect/touch and capture cover2/3. Native cover1 already exists. Practice can use an explicit repeatable seed; it does not alter winner logic or grant online rewards.

Version7 (commit5f79386f15c3ef8b6d29aa1959c23c00b8283475) is public. Current working source adds canonical concurrent party-room assignment and per-code squad capacity, with24 passing tests and TypeScript. Prepare next source commit/deploy before final real-peer test. Use practice seed29 (also88/99) only as a repeatable normal-rule practice match for capture; no winner override exists. Source8 must still receive fresh-browser QA; do not call multiplayer verified based on metadata.

Version8 (354657f6dbb5f4e88ceb91344591356ecf3f64e8) is public. Fresh two-guest browser test: host runs, guest remains in handshake; host RTC state reached have-local-offer. Current source exposes connecting-screen diagnostics and concrete handshake errors, with signaling counters; publish/test that before attributing the failure to NAT. Added optional Watch Bot Practice (normal squad autopilot from the first frame), true live capture layout and conservative rendering back-off/legible bot labels. No simulation rules or winner override changed. A prior live seed29 practice activated autopilot late, lost normally, and is not a victory capture. Retake after enabling Watch Bot Practice before launch. For seed29 at XP0 the production simulation wins for team0 under normal autopilot; use the public UI, never fake the result. Required cover2/3 still outstanding.


Current continuation: fresh cloud tabs completed SDP negotiation, guest sent/received one signal each, PCs new/new/stable, 0 match bytes. Preparing v10 with visible ICE gathering/candidate counters and errors, 30-second retries and D1-only private checkpoints. Practice seed29, fresh guest7DFB, Watch Bot Practice enabled from the first frame, running at public ?capture=1 for real cover2/3. Cloud context from earlier turns had no surviving tabs; current handles qaGame/qaPeer/captureGame.

2026-10-28 v10 public (e319cd70fec37732539f6a8ad8d7624d8f22795e) conclusively rendered ICE gathering complete with 0 local/0 remote candidates on BOTH cloud peers. SDP exchange completes but no state bytes arrive. Do not bypass browser/network protections; native extension retry returned originating-context unavailable. Multiplayer/reconnect/migration remain unverified. Final source fixes spectator vitals and end recap, adds honest actual-winner spectator card, prevents replayed reloads (25 tests pass), and repeats the 1,000 × 64 full 20 Hz soak:0 failures, 123.009 s wall, same duration data. Preparing v11 for screenshot and final browser QA, then final handover package. No broader bot balance changes were adopted.

Final handover preparation: all requested documents and covers exist, descriptions are exactly 430 and 448 characters. Public v11 natural seed88 match ended at 5:22 with Finch4 [BOT] as surviving champion. Actual combat screenshot captured with 63 remaining, player 92 HP and live tracers. Current code never overrides winner logic. Final publication/verification is performed by the retained native deployment flow; see the conversation's final URL/version result.
