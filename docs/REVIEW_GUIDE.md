# EMBERFALL action game: review guide

Inspect the boundary between deterministic rules, the expedition mission director, rendering, transport, and persistence.

## Follow the implementation

| Start here | File | What to inspect |
| --- | --- | --- |
| Simulation | [game/simulation.ts](../game/simulation.ts) | Combat rules, geometry, inventory, and seeded match state. |
| Expedition | [game/adventure.ts](../game/adventure.ts) | Abilities, waves, relics, boss phases, and terminal conditions. |
| Transport | [game/network.ts](../game/network.ts) | Local/network lifecycle and peer state synchronization. |
| Expedition tests | [tests/adventure.test.ts](../tests/adventure.test.ts) | Progression and combat regression cases. |
| Input-driven soak | [tests/adventure-soak.mjs](../tests/adventure-soak.mjs) | Large repeated runs driven through player input. |
| QA record | [QA.md](../QA.md) | Executed checks, dates, and unresolved network/device gates. |

## Run the checks

Run from the repository root after the setup described in the [README](../README.md). Review fixtures and recorded evidence before starting any full experiment.

```bash
pnpm install --frozen-lockfile
npm test
npm run check
node --experimental-strip-types tests/adventure-soak.mjs 1000
```

## Interpret the evidence

Use the pinned Node/pnpm setup in the root README. Ideal-aim simulated pilots establish functional coverage, not human difficulty or win rates. Shared combat and real-phone performance remain unverified; the solo expedition is locally playable. Updating these repository documents does not redeploy the hosted game.

The linked reports retain their original experiment dates and protocols. A new passing CI run verifies its named checks; it does not silently refresh historical measurements.

## Discuss the design

- How do one-shot input sequences avoid missing short taps?
- Which state can a trusted peer host falsify, and what would server authority change?
