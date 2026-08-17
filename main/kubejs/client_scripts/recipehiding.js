JEIEvents.removeCategories(event => {
  console.log(event.categoryIds)
  event.remove('create:fan_blasting')
})