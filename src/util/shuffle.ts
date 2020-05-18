export = <T>(array: T[]): T[] => {
  if (!Array.isArray(array)) {
    throw new TypeError(`Expected an Array, got ${typeof array} instead.`)
  }

  const oldArray = [...array]
  let newArray: T[] = []

  while (oldArray.length) {
    const i = Math.floor(Math.random() * oldArray.length)
    newArray = newArray.concat(oldArray.splice(i, 1))
  }

  return newArray
}
