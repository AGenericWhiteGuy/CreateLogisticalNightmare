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
| Temperature bands | 5: Frozen, Cold, Mild, Hot, Scorching |
| Scope | Overworld only — Nether/End untouched |
| Universally-spawnable ores | Diamond, iron, coal, Create zinc (`create:zinc_ore`), copper — everywhere, no band restriction |
| Everything else | Removed from natural worldgen; obtained only via Molten Vents (or Salt, see below) |
| Salt | Left on vanilla Mekanism surface worldgen, unchanged — it's an evaporite, not a vent metal |
| Progression gating | FTB Quests — chapters gate access forward through the bands |
| Elevation biomes | Excluded from all band tags — see rule below |

### Vent → metal → band mapping

| Band | Distance from spawn | Vent(s) | Metal | Mekanism block IDs |
|---|---|---|---|---|
| Mild | home biome | `asurine`, `crimsite` | Osmium | `mekanism:osmium_ore` / `deepslate_osmium_ore` |
| Cold | 1st ring | `scoria` | Tin | `mekanism:tin_ore` / `deepslate_tin_ore` |
| Hot | 1st ring | `scorchia` | Lead | `mekanism:lead_ore` / `deepslate_lead_ore` |
| Frozen | 2nd ring (new) | `veridium` | Fluorite | `mekanism:fluorite_ore` / `deepslate_fluorite_ore` |
| Scorching | 2nd ring (new) | `ochrum` (moved from Hot) | Uranium | `mekanism:uranium_ore` / `deepslate_uranium_ore` |

Rationale: Osmium is needed for nearly every basic Mekanism machine, so it has to sit in
the easiest-to-reach band. Tin/Lead are the next tech tier and split across the two
opposite first-ring bands so players choose a direction. Fluorite and Uranium — the two
inputs to Mekanism's nuclear fuel chain — land at opposite extreme ends of the world, so
finishing the nuclear chain requires a rail line reaching both poles, not just one.

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

### Phase 1 — Five-tier temperature bands
- Re-evaluate `naturaltemperature-common.toml`: currently `generation_mode = 3`
  (CUSTOM CIRCULAR) with only zones 1–3 meaningfully set. The `percentage_coverage_zone_1..6`
  values are already populated (20/20/10/15/22/14) but only apply in modes 5/6
  (CUSTOM BANDED / BANDED) — decide whether to switch modes to get explicit, tunable
  band widths for 5 clean bands rather than relying on the circular falloff.
- Create the two new band tag files (Frozen, Scorching) alongside the renamed
  Mild/Cold/Hot ones from Phase 0.
- Classify every vanilla biome + all 54 Biomes We've Gone biomes + Oh The Trees You'll
  Grow variants into one of the five band tags. This is real content work — happy to
  draft a first-pass classification (by biome name/theme) as a follow-up once this plan
  is approved.
- In-game validation: fly out from spawn in both directions, confirm F3 shows the
  expected band ordering (Mild → Cold/Hot → Frozen/Scorching) at increasing distance.

### Phase 2 — Ore restriction
- **Vanilla ores:** new `remove_default_ores.json` biome modifier (same
  `forge:remove_features` pattern already proven in `remove_molten_vents.json`),
  targeting `#minecraft:is_overworld`, removing `minecraft:ore_gold`,
  `minecraft:ore_gold_extra`, `minecraft:ore_redstone`, `minecraft:ore_lapis`,
  `minecraft:ore_lapis_buried`, `minecraft:ore_emerald`. Leave iron, coal, diamond,
  copper untouched (all their variants).
- **Create:** `disableWorldGen` stays `false` — zinc/copper keep spawning normally,
  nothing to do.
- **Mekanism:** in `Mekanism/world.toml`, set `shouldGenerate = false` for every vein
  size under `[world_generation.tin]`, `[world_generation.osmium]`,
  `[world_generation.uranium]`, `[world_generation.fluorite]`, `[world_generation.lead]`.
  Leave `[world_generation.salt]` untouched.
- In-game validation: creative-mode spot check per removed ore type; confirm JEI still
  shows the item (for recipes) but it no longer appears in generated chunks.

### Phase 3 — Molten Vents metal wiring
- Re-enable the mod: rename `create_resource_vents-1.3.jar.disabled` →
  `create_resource_vents-1.3.jar`.
- Rewrite `create_resource_vents.json` so each vent's `generatedBlocks` points at the
  correct Mekanism ore block per the mapping table above, instead of Create's
  decorative stone. Decide whether to vary `reactantFluids` per vent for flavor (all
  currently just `minecraft:lava`) — optional, not required for function.
- Move `ochrum` out of `hot_vents_add.json` into a new `scorching_vents_add.json`
  (band: Scorching).
- Add `frozen_vents_add.json` adding `climate:veridium_vent_common` to the Frozen band
  (placed-feature file already exists, just never had a biome modifier pointing at it).
- `asurine`/`crimsite` stay on Mild; `scoria` stays on Cold; `scorchia` stays on Hot —
  update these three files' `generatedBlocks` for their new metal outputs but no band
  reassignment needed.
- In-game validation: visit each band, trigger a vent (per `molten_vents-common.toml`,
  `useLiquid = true` means a constant liquid supply is required), confirm the correct
  ore block generates and processes into the intended ingot.

### Phase 4 — Player feedback polish
- Extend `biomeEffects.js` from binary hot/cold to graduated severity across all 5
  bands: Mild = none, Cold = light freezing (current behavior), Hot = light Wither
  (current behavior), Frozen = heavier freezing, Scorching = wire in the already
  registered-but-unused `sun_burn` custom effect from `effectregistry.js` (block-break
  slowdown + max-health debuff) as the distinct "extreme heat" penalty.
- Check whether Natural Temperature already has its own warmth/comfort mechanic that
  would double up with this custom effect layer — confirm no conflict before shipping.

### Phase 5 — Quest-gated progression
- Design an FTB Quests chapter chain matching the band order: Mild/Osmium (start) →
  Cold/Tin & Hot/Lead (parallel, either order) → Frozen/Fluorite & Scorching/Uranium
  (parallel, both required) → Nuclear fuel produced (capstone).
- Author the chapters in the in-game FTB Quests editor (not scriptable from here).
- Optional: extend the `questtest.js` pattern (`FTBQuestsEvents.completed`) to hard-gate
  specific KubeJS recipes (e.g. vent processing recipes) behind quest completion, rather
  than relying on quest-log guidance alone.

### Phase 6 — Trains/logistics tie-in (stretch goal)
- Confirm `equatorial_distance` in `naturaltemperature-common.toml` (currently `5000`)
  puts the extreme bands far enough out that rail is a real requirement, not a
  15-minute walk. Tune once Phase 1's band layout is finalized.
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
