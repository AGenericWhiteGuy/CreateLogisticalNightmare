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
// Multiplayer note: the search forces chunk generation across ~100+ points, which is
// fine once but adds real startup latency to a dedicated server on every restart if run
// unconditionally. Vanilla already persists `/setworldspawn` in level.dat on its own, so
// this only needs to run once ever — a flag in the overworld's persistent data (which
// survives restarts, unlike a plain JS variable) skips the scan on every boot after the
// first.
//
// Needs in-game verification like everything else in Phase 1 — in particular
// `event.server.overworld`, `level.persistentData`, and the `Heightmap$Types` class
// lookup are the calls most likely to need adjusting if this errors on boot.

const ELEVATION_BIOMES = [
    'minecraft:frozen_peaks',
    'minecraft:jagged_peaks',
    'minecraft:stony_peaks',
    'minecraft:snowy_slopes',
    'minecraft:grove',
    'minecraft:windswept_hills',
    'minecraft:windswept_gravelly_hills',
    'minecraft:windswept_forest',
    'minecraft:windswept_savanna'
]

const MAX_SEARCH_RADIUS = 160
const SEARCH_STEP = 32
const MAX_SPAWN_Y = 120 // matches biomeEffects.js's elevation-override threshold

ServerEvents.loaded(event => {
    const level = event.server.overworld

    if (level.persistentData.getBoolean('clnSpawnPinned')) {
        console.log('forceSpawnAtOrigin: spawn already pinned on a previous boot, skipping scan')
        return
    }

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
        const cx = candidates[i].x
        const cz = candidates[i].z
        const surfaceY = level.getHeight(HeightmapTypes.WORLD_SURFACE, cx, cz)

        if (surfaceY > MAX_SPAWN_Y)
            continue

        const biome = level.getBiome(new BlockPos(cx, surfaceY, cz))
        const biomeId = biome.unwrapKey().get().location().toString()

        if (ELEVATION_BIOMES.indexOf(biomeId) === -1) {
            spawnX = cx
            spawnY = surfaceY
            spawnZ = cz
            found = true
        }
    }

    if (!found)
        console.log('forceSpawnAtOrigin: no non-mountain spawn found within ' + MAX_SEARCH_RADIUS + ' blocks of origin, falling back to (0, 100, 0)')

    event.server.runCommandSilent('execute in minecraft:overworld run setworldspawn ' + spawnX + ' ' + spawnY + ' ' + spawnZ)
    level.persistentData.putBoolean('clnSpawnPinned', true)
})
