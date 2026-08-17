ServerEvents.tick(event => {
    if (event.server.tickCount % 20 != 0)
        return

    event.server.players.forEach(player => {
        const biome = player.level.getBiome(player.blockPosition())
        const biomeID = biome.unwrapKey().get().location().toString()

        console.log(
            'Biome: ' + biomeID +
            ' | Cold: ' + biome.is("forge:is_cold") +
            ' | Hot: ' + biome.is("forge:is_hot")
        )
    })
})