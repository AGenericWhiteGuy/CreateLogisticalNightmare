let effectDelay = 20
let biomeTicker = 0

let stage = true
const Stage1 = Boolean(stage)


ServerEvents.tick(event => {
    event.server.players.forEach(player => {
        // prevents running every tick
        biomeTicker++

        if (biomeTicker < effectDelay)
            return

        biomeTicker = 0

        let biome = player.level.getBiome(player.blockPosition()) //gets biome from player

        let tags = biome.tags().toList() //gets tag

        let hot = false
        let cold = false

        // elevation overrides latitude band: Y>=120 always reads as Mild
        // (mountains falsely read as cold from Tectonic's snow_start_offset=128)
        if (player.blockPosition().getY() < 120) {
            //assigns tag heat value
            tags.forEach(tag => {
                let id = tag.location().toString()

                if (id == 'climate:band_hot')
                    hot = true

                if (id == 'climate:band_cold')
                    cold = true
            })
        }



        // prevents progress through death *needs condition for progress*
        if (hot) {
            player.potionEffects.add('minecraft:wither', 1200, 1)
            console.log('hot')

        } else if (cold) {
            player.setTicksFrozen(player.getTicksFrozen() + 50)
            console.log('cold')

        } else {
            player.setTicksFrozen(0)
        }})})
