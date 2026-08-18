StartupEvents.registry('mob_effect', event => {
    event.create('sun_burn') // Create the effect under "kubejs:custom_effect"
        .color(0x000000) // Sets the color of the Effect's Particles.
        .harmful() // Categorizes the Effect as harmful
        // modifyAttribute is useful to scale an entity's attributes only lasting while under the effect
        .modifyAttribute('minecraft:generic.block_break_speed', // The attribute to scale
            'fbf83341-f3b9-4414-9ce7-8172fed54c14',//Some random UUID which serves as the effect's unique instance
        -.9,'multiply_base' // The amount to increase/decrease by
        )
        .modifyAttribute('minecraft:generic.max_health','3046b246-2de7-4b08-a81b-53ce4da2b7ec',-19,'addition')


})
