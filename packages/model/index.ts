/* eslint-disable no-unused-vars */
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'

export type Submarine = {
  oxygen: number
}

export type SingleTreasure = {
  value: number
  level: number
}

export type TreasureStack = ReadonlyNonEmptyArray<SingleTreasure>

export type Treasure = SingleTreasure | TreasureStack

// `value?: never` stops us from returning the value to UI (when we use this type)
export interface HiddenSingleTreasure {
  level: number
  value?: never
}
export type HiddenTreasureStack = ReadonlyNonEmptyArray<HiddenSingleTreasure>
export type HiddenTreasure = HiddenSingleTreasure | HiddenTreasureStack

export type Space = Treasure | 'emptySpace'
export type UISpace = HiddenTreasure | 'emptySpace'

export type Player = {
  id: string
  name: string
  holdingTreasures: Array<Treasure>
  discoveredTreasures: Array<SingleTreasure>
  score: number
}

export type UIPlayer = {
  id: string
  name: string
  holdingTreasures: Array<HiddenTreasure>
  discoveredTreasures: Array<SingleTreasure>
  score: number
}

export type ActivePosition = {
  space: number
  returning: boolean
}

export type Position = ActivePosition | 'returned'

export type Roll = {
  die1: number
  die2: number
  penalty: number
  total: number
}

export type TurnPhase = 'start' | 'end'

export type Round = {
  phase: TurnPhase
  number: number
  positions: { [playerId: string]: Position } // TODO players: {position, treasures}
  roll?: Roll
}

export type RoundEndSummary = {
  players: {
    [playerId: string]: {
      discovered: Array<Treasure>
      position: Position
    }
  }
  number: number
}

export type Model = {
  players: ReadonlyNonEmptyArray<Player>
  submarine: Submarine
  spaces: Array<Space>
  round: Round
  roundEndSummary?: RoundEndSummary
  ended: boolean
}

export type UIModel = Omit<Model, 'spaces' | 'players'> & {
  spaces: Array<UISpace>
  players: ReadonlyNonEmptyArray<UIPlayer>
}

export const isSingleTreasure = (arg: Space): arg is SingleTreasure =>
  Object.keys(arg).includes('value')

export const isTreasureStack = (arg: Space): arg is TreasureStack =>
  Array.isArray(arg)

export const isTreasure = (arg: Space): arg is Treasure =>
  isSingleTreasure(arg) || isTreasureStack(arg)

export const startIndex = -1
