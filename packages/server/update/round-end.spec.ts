import * as O from 'fp-ts/lib/Option'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { Treasure, TreasureStack } from '../../model'
import { stackTreasuresIncludingLast } from './round-end'

describe('stackTreasures', () => {
  test('when there are none to stack, returns empty', () => {
    const result = stackTreasuresIncludingLast(O.none)([])
    expect(result).toEqual([])
  })

  test('when there are none to stack but have a lastSpace stack, returns it', () => {
    const lastSpace: TreasureStack = NEA.of({ level: 1, value: 0 })
    const result = stackTreasuresIncludingLast(O.some(lastSpace))([])
    expect(result).toEqual([lastSpace])
  })

  test('when there is one to stack and have a lastSpace stack, adds to stack', () => {
    const xs: Array<Treasure> = [{ level: 2, value: 4 }]
    const lastSpace: TreasureStack = NEA.of({ level: 1, value: 0 })
    const result = stackTreasuresIncludingLast(O.some(lastSpace))(xs)
    expect(result).toEqual([NEA.cons(lastSpace[0], NEA.of(xs[0]))])
  })

  test('when there are two to stack and have a lastSpace stack, adds to stack', () => {
    const xs: Array<Treasure> = [
      { level: 2, value: 4 },
      { level: 3, value: 8 },
    ]
    const lastSpace: TreasureStack = NEA.of({ level: 1, value: 0 })
    const result = stackTreasuresIncludingLast(O.some(lastSpace))(xs)
    expect(result).toEqual([
      NEA.cons(lastSpace[0], NEA.cons(xs[0], NEA.of(xs[1]))),
    ])
  })

  test('when there are three to stack and have a lastSpace stack, adds to stack and starts another', () => {
    const xs: Array<Treasure> = [
      { level: 2, value: 4 },
      { level: 3, value: 8 },
      { level: 4, value: 11 },
    ]
    const lastSpace: TreasureStack = NEA.of({ level: 1, value: 0 })
    const expectedStack1 = NEA.cons(
      lastSpace[0],
      NEA.cons(xs[0], NEA.of(xs[1]))
    )
    const expectedStack2 = NEA.of(xs[2])
    const result = stackTreasuresIncludingLast(O.some(lastSpace))(xs)
    expect(result).toEqual([expectedStack1, expectedStack2])
  })

  test('when there are 3 to stack, creates 1 stack', () => {
    const xs: Array<Treasure> = [
      { level: 2, value: 4 },
      { level: 3, value: 8 },
      { level: 4, value: 11 },
    ]
    const expectedStack = NEA.cons(xs[0], NEA.cons(xs[1], NEA.of(xs[2])))
    const result = stackTreasuresIncludingLast(O.none)(xs)
    expect(result).toEqual([expectedStack])
  })

  test('when there are 4 to stack, creates 2 stacks', () => {
    const xs: Array<Treasure> = [
      { level: 2, value: 4 },
      { level: 3, value: 8 },
      { level: 4, value: 11 },
      { level: 5, value: 16 },
    ]
    const expectedStack1 = NEA.cons(xs[0], NEA.cons(xs[1], NEA.of(xs[2])))
    const expectedStack2 = NEA.of(xs[3])
    const result = stackTreasuresIncludingLast(O.none)(xs)
    expect(result).toEqual([expectedStack1, expectedStack2])
  })
})
