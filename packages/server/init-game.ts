/* eslint-disable no-unused-vars */
import { pipe } from 'fp-ts/lib/pipeable'
import { map, chain } from 'fp-ts/lib/Array'
import shuffle from './util/shuffle'
import {
  SingleTreasure,
  Model,
  Player,
  Position,
  startPosition,
} from '../model'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { mergeAll } from 'ramda'

const treasureValues = {
  1: [0, 0, 1, 1, 2, 2, 3, 3],
  2: [4, 4, 5, 5, 6, 6, 7, 7],
  3: [8, 8, 9, 9, 10, 10, 11, 11],
  4: [12, 12, 13, 13, 14, 14, 15, 15],
}

const shuffleTreasures: () => Array<SingleTreasure> = () =>
  pipe(
    Object.entries(treasureValues),
    map(([level, values]): [string, number[]] => [level, shuffle(values)]),
    chain(([level, values]) =>
      map((value: number) => ({
        level: parseInt(level),
        value,
      }))(values)
    )
  )

export const initialSubmarine = {
  submarine: {
    oxygen: 25,
  },
}

export const initModel: () => Omit<Model, 'players' | 'round'> = () => ({
  ...initialSubmarine,
  spaces: shuffleTreasures(),
  ended: false,
})

export const initPlayer = ({ id, name }: PlayerData): Player => ({
  id,
  name,
  holdingTreasures: [],
  discoveredTreasures: [],
  score: 0,
})

export const initPositions = (
  players: ReadonlyNonEmptyArray<PlayerData>
): { [key: string]: Position } =>
  pipe(
    players,
    NEA.map(({ id }) => ({
      [id]: startPosition,
    })),
    mergeAll
  )

export type PlayerData = {
  id: string
  name: string
}
export const newGame = (players: ReadonlyNonEmptyArray<PlayerData>): Model => ({
  ...initModel(),
  players: NEA.map(initPlayer)(players),
  round: {
    number: 1,
    phase: 'start',
    positions: initPositions(players),
  },
})
