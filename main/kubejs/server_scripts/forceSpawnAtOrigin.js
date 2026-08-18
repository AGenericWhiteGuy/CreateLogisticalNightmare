// Natural Temperature's circular modes center the bullseye on raw world coordinates
// (0, 0), not on wherever vanilla's spawn search actually lands. Pin world spawn near
// the origin every boot so the Mild band always lines up with spawn — but search a
// small area around origin first instead of hardcoding the literal point, since (0,0)
// isn't guaranteed to avoid the mountain/peak/slope biomes excluded from the
// temperature-band system (see PROJECT_PLAN.md's elevation design rule): they're placed
// by erosion, not by Natural Temperature's latitude override, so one can sit right on
// the bullseye's center. Search radius stays small so we're always still deep inside
// the Mild ring (0-28% of `equatorial_distance`) regardless of which direction we drift.
//
// 2026-08-18: originally tried to skip this scan after the first boot using
// `level.persistentData`, which doesn't exist on this KubeJS/Forge version and crashed
// `ServerEvents.loaded` on every single boot (TypeError: Cannot call method "getBoolean"
// of undefined) — meaning this script silently never ran at all, and spawn was whatever
// vanilla + Tectonic's own search produced. Dropped the persistence entirely: this now
// just re-runs every boot. Cheap after the first run anyway, since the relevant chunks
// are already generated, and `/setworldspawn` doesn't move a player who's already online.

// Keep in sync with PROJECT_PLAN.md's elevation-exclusion rule and the biomes left out
// of every main/kubejs/data/climate/tags/worldgen/biome/band_*.json file — this list
// previously only had the 9 vanilla entries and silently missed all 6 Biomes We've Gone
// exclusions, which is how spawn landed in a peaks biome despite this script running.
const ELEVATION_BIOMES = [
    'minecraft:frozen_peaks',
    'minecraft:jagged_peaks',
    'minecraft:stony_peaks',
    'minecraft:snowy_slopes',
    'minecraft:grove',
    'minecraft:windswept_hills',
    'minecraft:windswept_gravelly_hills',
    'minecraft:windswept_forest',
    'minecraft:windswept_savanna',
    'biomeswevegone:canadian_shield',
    'biomeswevegone:crag_gardens',
    'biomeswevegone:howling_peaks',
    'biomeswevegone:red_rock_peaks',
    'biomeswevegone:shattered_glacier',
    'biomeswevegone:windswept_desert'
]

// 160 turned out too small on Tectonic terrain — a mountain range near origin can easily
// span more than that in every direction. Mild's ring radius is ~28% of equatorial_distance
// (5000), i.e. ~1400 blocks, so 800 stays comfortably inside it with room to spare.
const MAX_SEARCH_RADIUS = 800
const SEARCH_STEP = 32
const MAX_SPAWN_Y = 120 // matches biomeEffects.js's elevation-override threshold

ServerEvents.loaded(event => {
    const level = event.server.overworld

    const HeightmapTypes = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
    const BlockPos = Java.loadClass('net.minecraft.core.BlockPos')

    const candidates = []
    for (let x = -MAX_SEARCH_RADIUS; x <= MAX_SEARCH_RADIUS; x += SEARCH_STEP) {
        for (let z = -MAX_SEARCH_RADIUS; z <= MAX_SEARCH_RADIUS; z += SEARCH_STEP) {
            candidates.push({ x: x, z: z, dist: x * x + z * z })
        }
    }
    candidates.sort((a, b) => a.dist - b.dist)

    let spawnX = 0
    let spawnY = 100
    let spawnZ = 0
    let found = false

    for (let i = 0; i < candidates.length && !found; i++) {
        // var, not const/let: Rhino's block scoping re-declares these each iteration and
        // throws "redeclaration of var cx" if declared with const/let inside a loop body.
        var cx = candidates[i].x
        var cz = candidates[i].z
        var surfaceY = level.getHeight(HeightmapTypes.WORLD_SURFACE, cx, cz)

        if (surfaceY > MAX_SPAWN_Y)
            continue

        var biome = level.getBiome(new BlockPos(cx, surfaceY, cz))
        var biomeId = biome.unwrapKey().get().location().toString()

        if (ELEVATION_BIOMES.indexOf(biomeId) === -1) {
            spawnX = cx
            spawnY = surfaceY
            spawnZ = cz
            found = true
        }
    }

    event.server.runCommandSilent('execute in minecraft:overworld run setworldspawn ' + spawnX + ' ' + spawnY + ' ' + spawnZ)

    if (found) {
        console.log('forceSpawnAtOrigin: pinned spawn to (' + spawnX + ', ' + spawnY + ', ' + spawnZ + ')')
    } else {
        console.log('forceSpawnAtOrigin: no non-mountain spawn found within ' + MAX_SEARCH_RADIUS + ' blocks of origin, falling back to (0, 100, 0)')
    }
})
