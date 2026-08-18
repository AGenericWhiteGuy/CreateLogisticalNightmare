# Create Logistical Nightmare — Project Plan

## Vision

A Create/train-centric modpack where geography drives logistics. Natural Temperature's
climate bands stand in for biome tiers: the band you're standing in determines which
metal Molten Vents will give you. Only five ores spawn as plain overworld ore (diamond,
iron, coal, Create zinc, copper) — everything else has to be pulled from a vent, and
the vent you need is somewhere else on the map. Getting it home means building rail.

## Confirmed design decisions

| Decision | Answer |
|---|---|
| Temperature bands | 5, ring order spawn-outward: Mild, Hot, Scorching, Cold, Frozen |
| Scope | Overworld only — Nether/End untouched |
| Universally-spawnable ores | Diamond, iron, coal, Create zinc (`create:zinc_ore`), copper — everywhere, no band restriction |
| Everything else | Removed from natural worldgen; obtained only via Molten Vents (or Salt, see below) |
| Salt | Left on vanilla Mekanism surface worldgen, unchanged — it's an evaporite, not a vent metal |
| Progression gating | FTB Quests — chapters gate access forward through the bands |
| Elevation biomes | Excluded from all band tags — see rule below |

### Vent → metal → band mapping

**Design change (2026-08-18):** bands are a true radial bullseye centered on spawn
(Natural Temperature `generation_mode = 3`, CUSTOM CIRCULAR — see Phase 1 below), not
north/south stripes. A circular ring has one temperature, so Cold and Hot can no longer
sit at the same distance as parallel opposite-direction choices — they're now sequential
rings on a single outward path. This trades away the "choose a direction" branching
for a simpler, direction-agnostic progression: every direction from spawn plays out the
same way.

**Ring order (2026-08-18 revision):** Mild → Hot → Scorching → Cold → Frozen. Each
band keeps the vent/metal it already had — only which ring it physically sits in changed.
This requires `generation_mode = 7` ("CUSTOM CIRCULAR6" — see Phase 1's decompile notes
below for why mode 3 can't produce 5 distinct bands at all).

| Band | Ring (spawn outward) | Vent(s) | Metal | Mekanism block IDs |
|---|---|---|---|---|
| Mild | 1 (center, 0–25% of radius) | `asurine`, `crimsite` | Osmium | `mekanism:osmium_ore` / `deepslate_osmium_ore` |
| Hot | 2 (25–50%) | `scorchia` | Lead | `mekanism:lead_ore` / `deepslate_lead_ore` |
| Scorching | 3 (50–75%) | `ochrum` (moved from Hot) | Uranium | `mekanism:uranium_ore` / `deepslate_uranium_ore` |
| Cold | 4 (75–90%) | `scoria` | Tin | `mekanism:tin_ore` / `deepslate_tin_ore` |
| Frozen | 5–6 (90–100% of radius, outermost) | `veridium` | Fluorite | `mekanism:fluorite_ore` / `deepslate_fluorite_ore` |

**2026-08-18 fourth revision — rebalanced coverage:** the original 25/20/20/15/15/5 split
put 35% of the ring area in Cold+Frozen, and with `equatorial_distance` at only 5000
blocks, the unconditional "beyond the radius it's always Frozen" rule (not
percentage-tunable — see Phase 1) visually dominated any preview or exploration wider
than that. Doubled `equatorial_distance` to `10000` and rebalanced coverage to
25/25/25/15/7/3 (Mild/Hot/Scorching/Cold/Frozen/Frozen) — Cold+Frozen now 25% of the
ring area instead of 35%, and the hard "always Frozen" boundary sits twice as far out.

Rationale: Osmium is needed for nearly every basic Mekanism machine, so it has to sit in
the easiest-to-reach band — the whole center disc, which is more forgiving of imprecise
spawns. Lead and Uranium now come before Tin, which changes the old "Tin/Lead is the
early tech tier" framing — Uranium is reachable relatively early (ring 3), but it's only
useful once Fluorite is also in hand, and Fluorite still sits at the true outer edge
(Frozen, ring 5–6). So the nuclear-fuel capstone still naturally lands last: you'll likely
have Uranium banked for a while before the Frozen-ring trip that unlocks Fluorite and
lets you actually use it.

### Design rule: elevation ≥ Y120 always reads as Mild

**Added 2026-08-18.** Regardless of which ring a player is physically standing in,
anywhere at or above Y=120 overrides to Mild-band effects. This resolves the same
Tectonic `snow_start_offset = 128` problem noted above (mountains present as falsely
cold) by making the override intentional instead of an unhandled side effect: high
elevation is always neutral, never punishes or rewards. Implemented in
`biomeEffects.js` (only checks the hot/cold band tags when Y < 120 — at or above that,
neither effect applies). **Not yet applied to vent worldgen** —
vents are still placed purely by `#climate:band_*` biome tags with no Y-range
restriction, so a Mild vent could still generate above Y120 in a non-Mild-tagged biome
and vice versa. Revisit when wiring vent placement in Phase 3 if that mismatch matters
for gameplay.

### Design rule: elevation biomes never drive band membership

Minecraft biome tags key off biome *identity*, not *position*. Vanilla's mountain/peak
overlay (Jagged Peaks, Frozen Peaks, Stony Peaks, Snowy Slopes, Grove, Windswept Hills /
Gravelly Hills / Forest / Savanna) is placed largely by erosion, not by the latitude-driven
temperature noise Natural Temperature controls — so these can spawn at high elevation
regardless of how far a player is from spawn. On top of that, Tectonic's
`snow_start_offset` (`main/config/tectonic.json`, currently `128`) forces snow-like
conditions above Y128 independent of biome or latitude band. Together this means a
mountain near spawn can present as "cold" even though it isn't in the Cold/Frozen
latitude band at all.

**Rule:** none of the `climate:band_*` tags may contain a mountain/peak/slope/windswept
biome. Vent placement and player-facing effects must be driven purely by latitude band,
not by local elevation. This was already violated in the first draft of
`band_cold.json` (had `frozen_peaks`, `jagged_peaks`, `stony_peaks`, `snowy_slopes`,
`grove`, `windswept_hills`, `windswept_gravelly_hills`, `windswept_forest`) and
`band_hot.json` (had `windswept_savanna`) — both fixed. Apply the same exclusion when
classifying the 54 Biomes We've Gone biomes in Phase 1: skip anything tagged `mountain`,
`peak`, or `slope` in `docs/otbwg-biome-tags.md`.

## Spike findings (engineering notes)

**Repo vs. live instance are out of sync.** Diffing `main/kubejs` against the actual
CurseForge instance folder shows only the vent placed-features and biome-modifier JSONs
made it into the running game. The biome tag files, `biomeEffects.js`, `test.js`,
`questtest.js`, and the startup scripts exist only in the repo and were never copied to
the instance — matches the "scripts weren't transferred the first time" commit.

**Bugs in current tag files:**
- `main/kubejs/data/forge/tags/worldgen/biome/cold.json.txt` — wrong extension (won't
  load as a tag at all) plus malformed JSON (unterminated string, stray tab).
- `hot.json.txt` — same wrong-extension problem, plus a trailing comma and a typo
  (`savannna_plateau`).
- `veridium` vent is orphaned — removed from defaults, never re-added to any band.

**`create_resource_vents-1.3.jar.disabled` is disabled.** This is the mod that lets a
vent output a configurable block. Right now `create_resource_vents.json` maps every
vent to Create's own decorative stone (`create:asurine`, etc.) — not an ore, so Molten
Vents currently produces zero metal.

**No `.gitignore`** — `.idea/` and `.vscode/` folders are committed into the repo,
confirming edits happen live in the instance's kubejs folder via an IDE and get
manually copied over (source of the sync gap above).

**54 unclassified biomes.** Oh The Biomes We've Gone adds 54 biomes, none currently
sorted into any temperature band tag.

## Phased implementation plan

### Phase 0 — Repo & pipeline hygiene
Do this first; it's what caused the sync bugs and will keep causing them otherwise.
- Fix `cold.json.txt` → `cold.json`, fix its malformed JSON.
- Fix `hot.json.txt` → `hot.json`, drop the trailing comma, fix `savannna_plateau` typo.
- Add a `.gitignore` for `.idea/`, `.vscode/`; remove the already-committed copies.
- Replace the manual copy workflow with a symlink/junction from the CurseForge
  instance's `kubejs/` and `config/` folders to `main/kubejs` and `main/config` in this
  repo, so there's one copy of truth and nothing can silently fail to transfer again.
- Decide on a tag namespace: currently `cold`/`hot` piggyback on the shared
  `forge:is_cold` / `forge:is_hot` tags (which other mods may already populate
  unpredictably), while `mild` is a bespoke tag dropped in the same folder. Recommend
  migrating all five bands to a dedicated namespace, e.g. `climate:band_frozen`,
  `climate:band_cold`, `climate:band_mild`, `climate:band_hot`, `climate:band_scorching`,
  so band membership is fully explicit and can't be affected by another mod's tag data.
  Update `biomeEffects.js` and the vent `biome_modifier` files to match once renamed.

### Phase 1 — Five-tier temperature bands — DONE, pending in-game verification

- **2026-08-18 correction:** the original attempt used `generation_mode = 5` (CUSTOM
  BANDED), which produces latitude *stripes* (varies only along one axis, like Earth's
  climate zones). That's incompatible with the actual goal of a bullseye centered on
  spawn, so we switched to a circular mode.
- **2026-08-18 second correction, root-caused by decompiling the mod jar
  (`naturaltemperature-1.1.8-FORGE-MC-1.20.1.jar`) since the public docs don't cover
  this:** `generation_mode = 3` ("CUSTOM CIRCULAR" per the config comment) still spawned
  the player in Cold instead of Mild. The jar's actual `WorldPainter` mixin maps mode
  3/4 to a `calculateCircular` routine that only reads `temperature_zone_1`–`_4` — it
  hardcodes everything past the 4th ring to `temperature_zone_4` forever, so
  **Scorching (`zone_5`) could never generate at all** under mode 3, regardless of
  config. The config's inline comment (`0: DEFAULT ... 6: BANDED`) is stale relative to
  this jar version — real supported modes go up to 10: mode 7 = "CUSTOM CIRCULAR6" (the
  actual 6-zone customizable radial mode, reads all of `temperature_zone_1`–`_6`), mode
  8 = its hardcoded-default counterpart, 9/10 = the same but square-ringed instead of
  circular. **Fixed by switching to `generation_mode = 7`.**
- Separately, decompiling `WorldPainter.customTemperatureCalculation` showed
  `r = Math.sqrt(x*x + z*z)` — circular modes measure distance from **raw world
  coordinate (0, 0)**, never from the actual Minecraft-computed spawn point, and there
  is no config option to recenter it. If vanilla's spawn search (especially before the
  `ocean_offset` fix above, when oceans dominated) placed the real spawn more than
  ~25% of `equatorial_distance` away from literal (0,0), the player lands outside the
  Mild ring — which is exactly what was observed. Added
  `main/kubejs/server_scripts/forceSpawnAtOrigin.js`, which pins world spawn near the
  same point the bullseye is centered on. This only affects *future* spawns/respawns for
  a world — an already-existing character needs a one-time `/tp 0 100 0` (or similar) to
  land back in the Mild disc; it won't retroactively move someone standing in Cold.
- **2026-08-18 — spawn regression fix:** literal `(0, 100, 0)` isn't guaranteed to avoid
  the mountain/peak/slope biomes excluded from the band system (they're erosion-placed,
  not latitude-placed, so one can sit right on the bullseye's center) — World Preview
  showed exactly that, a snowy peak at spawn. `forceSpawnAtOrigin.js` now searches a
  small grid (±160 blocks, 32-block steps, closest-first) around origin for the nearest
  point that's both under Y120 and not one of the elevation-excluded biomes, before
  falling back to the literal origin if nothing qualifies. Also added a persisted-data
  flag so the (chunk-generation-heavy) scan only runs once ever instead of on every
  server boot — matters for a dedicated multiplayer server, where repeat scanning on
  every restart would add real startup latency for no benefit since vanilla already
  persists `/setworldspawn` in `level.dat` after the first run.
- **2026-08-18 third revision — ring order:** `naturaltemperature-common.toml` zones
  run center-outward as one ring sequence: `zone_1` = Mild (0.0), `zone_2` = Hot (0.5),
  `zone_3` = Scorching (1.0), `zone_4` = Cold (-0.5), `zone_5` = Frozen (-1.0), `zone_6`
  mirrors Frozen (-1.0) as the final ring before the mod's built-in "outside the radius
  is frozen" rule takes over past `equatorial_distance` — which now reinforces Frozen
  instead of contradicting Scorching like the old order did.
- **2026-08-18 fourth revision — coverage rebalance:** `equatorial_distance` doubled
  `5000 → 10000` and `percentage_coverage_zone_1..6` changed `25/20/20/15/15/5 →
  25/25/25/15/7/3`, after in-game testing showed most of the map reading as Frozen/Cold.
  Cold+Frozen's share of the ring area dropped from 35% to 25%, and — more importantly —
  the unconditional "beyond the radius it's always Frozen forever" rule (not itself
  percentage-tunable) now only kicks in twice as far from spawn, so it dominates less of
  any given preview or exploration range.
- **2026-08-18 fifth revision — still too much Cold:** further in-game testing still
  showed too much Cold, so `equatorial_distance` pushed `10000 → 18000` and
  `percentage_coverage_zone_4` (Cold) cut roughly in half, `15 → 8`, redistributed to
  Mild/Hot/Scorching (now `28/27/27/8/7/3`). Vanilla's world border defaults to
  60,000,000 blocks (±30,000,000 from origin), so 18,000 is nowhere near a practical
  ceiling — there's plenty of room to push further if it's still off.
- **2026-08-18 sixth revision — distance reverted:** `equatorial_distance` reverted
  `18000 → 5000`. The coverage split stays at `28/27/27/8/7/3`, so Cold+Frozen are still
  only 18% of the ring area (down from the original 35%) — just within a smaller overall
  radius again. `forceSpawnAtOrigin.js`'s ±160-block search grid is still comfortably
  inside the Mild ring at this distance (28% of 5000 ≈ 1400 blocks), so it didn't need
  adjusting for this revert.
- Verify with the **World Preview** mod (already installed — shows a live biome map
  before world entry) before generating a real world on this config, and confirm
  `forceSpawnAtOrigin.js` actually pins spawn to (0,0) via F3 after a fresh world load.
- Created `band_frozen.json` and `band_scorching.json`, alongside the renamed
  Mild/Cold/Hot tags from Phase 0.
- Classified every vanilla biome + all 55 Biomes We've Gone biomes into the five band
  tags (Oh The Trees You'll Grow adds no new biomes, confirmed from its jar — only tree
  species into existing biomes, nothing to classify). 6 BWG biomes excluded under the
  elevation rule: `canadian_shield`, `crag_gardens`, `howling_peaks`, `red_rock_peaks`,
  `shattered_glacier`, `windswept_desert`. Full counts: Mild 34, Cold 19, Hot 20,
  Frozen 5, Scorching 5.
- **Judgment calls worth double-checking:** `crimson_tundra` is tagged
  `climate/temperate` in BWG's own data despite the name, so it landed in Mild, not
  Cold — trusted the mod's tag over the biome name. Vanilla ocean variants were split
  by temperature (`frozen_ocean`/`deep_frozen_ocean` → Frozen, `cold_ocean`/
  `deep_cold_ocean` → Cold, `warm_ocean` → Hot, `lukewarm_ocean`/`deep_lukewarm_ocean`
  → Mild) and temperature-neutral vanilla biomes (`ocean`, `river`, `beach`, `swamp`,
  `mangrove_swamp`, `mushroom_fields`) defaulted to Mild rather than being left
  unclassified.
- In-game validation still open: confirm via World Preview or F3 that the ring ordering
  matches Mild (center) → Hot → Scorching → Cold → Frozen (outermost), and that biome
  distribution within each band looks reasonable.
- **2026-08-18:** installed the World Preview Temperature Addon so the preview map
  shows an actual temperature overlay instead of raw biome colors (plain World Preview
  has no heat visualization of its own — that was likely why bands weren't visible
  earlier). A "Frozen near spawn" report turned out to be Tectonic's
  `snow_start_offset = 128` painting an elevated peak white, not a real band-order bug —
  consistent with the elevation design rule above and with mode 3 (briefly reinstated by
  mistake, then reverted) being unable to place true Frozen anywhere near center at all.
- **Bug found + fixed 2026-08-18:** `tectonic.json`'s `continents.ocean_offset` was
  `-0.8`. Per Tectonic's own config docs, lower values mean more ocean, and anything
  above -0.2 stops oceans from spawning at all — -0.8 is deep into "mostly ocean," which
  matches the reported symptom (most of the world underwater). The value appears to have
  been lifted from an unrelated community config (a "bigger rivers and mountains" example
  online uses the same -0.8) rather than tuned for this pack. Reset to `0.0` (neutral).
  Needs an in-game land/ocean ratio check once a new world is generated — 0.0 is a
  reasonable starting guess, not a verified tuning.

**Not yet live:** `config/` isn't symlinked to the instance (see Phase 0 sync note), so
`naturaltemperature-common.toml`'s and `tectonic.json`'s changes need to be copied to
the instance manually to test.

### Phase 2 — Ore restriction — DONE, pending in-game verification

- **2026-08-18:** added `climate/forge/biome_modifier/remove_default_ores.json`
  (`forge:remove_features`, same pattern as `remove_molten_vents.json`), targeting
  `#minecraft:is_overworld`, removing `minecraft:ore_gold`, `minecraft:ore_gold_extra`,
  `minecraft:ore_redstone`, `minecraft:ore_lapis`, `minecraft:ore_lapis_buried`,
  `minecraft:ore_emerald` at the `underground_ores` step. Iron, coal, diamond, copper
  left untouched.
- **Create:** `disableWorldGen` left `false` — zinc/copper keep spawning normally,
  nothing to do.
- **Mekanism:** in `Mekanism/world.toml`, set `shouldGenerate = false` for every vein
  size under `[world_generation.tin]`, `[world_generation.osmium]`,
  `[world_generation.uranium]`, `[world_generation.fluorite]`, `[world_generation.lead]`
  (15 flags total, including the top-level per-metal toggle and each named vein size).
  `[world_generation.salt]` left `true`, unchanged.
- Now consistent with Phase 3's vent wiring: these five metals should only be
  obtainable from Molten Vents, plus whatever spawned in already-generated chunks
  before this change.
- In-game validation still open: creative-mode spot check per removed ore type; confirm
  JEI still shows the item (for recipes) but it no longer appears in newly generated
  chunks. Needs a **new world or unexplored chunks** to test — already-generated chunks
  keep whatever ore they already placed.

### Phase 3 — Molten Vents metal wiring — DONE, pending in-game verification

- **2026-08-18:** re-enabled the mod (`create_resource_vents-1.3.jar.disabled` →
  `create_resource_vents-1.3.jar` in the instance's `mods/` folder).
- Rewrote `create_resource_vents.json`: every vent's `generatedBlocks` now lists the
  band's Mekanism ore + its deepslate variant (both block IDs from the mapping table)
  instead of Create's decorative stone. `reactantFluids` left as `minecraft:lava` for
  all six — no flavor variation added.
- Moved `ochrum` out of `hot_vents_add.json` into new `scorching_vents_add.json`
  (`#climate:band_scorching`).
- Added `frozen_vents_add.json` wiring `climate:veridium_vent_common` to
  `#climate:band_frozen` — that placed-feature existed since Phase 0/1 but had no
  biome modifier pointing at it until now.
- `asurine`/`crimsite` (Mild), `scoria` (Cold), `scorchia` (Hot) kept their existing
  band biome-modifier files, only `generatedBlocks` changed.
- **Not done yet — Phase 2 (ore restriction) hasn't run.** Checked
  `main/config/Mekanism/world.toml`: `shouldGenerate` is still `true` for tin, osmium,
  uranium, and fluorite veins. Until Phase 2 sets those to `false`, these five metals
  will *also* spawn as normal Mekanism ore veins everywhere, alongside the vents —
  vent output is correctly wired, but not yet the sole source.
- In-game validation still open: visit each band, trigger a vent (per
  `molten_vents-common.toml`, `useLiquid = true` means a constant liquid supply is
  required), confirm the correct ore block generates and processes into the intended
  ingot.

### Phase 4 — Player feedback polish
- Extend `biomeEffects.js` from binary hot/cold to graduated severity across all 5
  bands: Mild = none, Cold = light freezing (current behavior), Hot = light Wither
  (current behavior), Frozen = heavier freezing, Scorching = wire in the already
  registered-but-unused `sun_burn` custom effect from `effectregistry.js` (block-break
  slowdown + max-health debuff) as the distinct "extreme heat" penalty.
- Check whether Natural Temperature already has its own warmth/comfort mechanic that
  would double up with this custom effect layer — confirm no conflict before shipping.

### Phase 5 — Quest-gated progression
- Design an FTB Quests chapter chain matching the ring order: Mild/Osmium (start) →
  Hot/Lead → Scorching/Uranium → Cold/Tin → Frozen/Fluorite (sequential, outward) →
  Nuclear fuel produced (capstone, once both Uranium and Fluorite are in hand).
- Author the chapters in the in-game FTB Quests editor (not scriptable from here).
- Optional: extend the `questtest.js` pattern (`FTBQuestsEvents.completed`) to hard-gate
  specific KubeJS recipes (e.g. vent processing recipes) behind quest completion, rather
  than relying on quest-log guidance alone.

### Phase 6 — Trains/logistics tie-in (stretch goal)
- Confirm `equatorial_distance` in `naturaltemperature-common.toml` (currently `5000`
  again, after being pushed to `18000` and reverted during Phase 1 tuning) puts the
  extreme bands far enough out that rail is a real requirement, not a 15-minute walk —
  re-check once Phase 1's band layout is in-game verified.
- Consider whether specific train fuels/parts should themselves be band-locked, to
  reinforce the "you need working rail to progress" loop — revisit after the core
  resource loop (Phases 1–3) is working and playtested.

## Open items to resolve during implementation

- Full vanilla + Biomes We've Gone + Oh The Trees You'll Grow biome → band
  classification list (Phase 1).
- Final call on `generation_mode` (circular vs. banded) for clean 5-way band splits.
- Whether to vary vent `reactantFluids` per metal for flavor.
- Whether Natural Temperature's built-in warmth system overlaps with the custom
  `biomeEffects.js` layer.
