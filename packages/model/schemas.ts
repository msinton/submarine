import * as t from 'io-ts'
import { readonlyNonEmptyArray } from 'io-ts-types'

export const Submarine = t.type({ oxygen: t.number })
export const SingleTreasure = t.type({ value: t.number, level: t.number })
export const TreasureStack = readonlyNonEmptyArray(SingleTreasure)
export const Treasure = t.union([SingleTreasure, TreasureStack])
export const HiddenSingleTreasure = t.type({ level: t.number })
export const HiddenTreasureStack = readonlyNonEmptyArray(HiddenSingleTreasure)
export const HiddenTreasure = t.union([
  HiddenSingleTreasure,
  HiddenTreasureStack,
])
export const UISpace = t.union([HiddenTreasure, t.literal('emptySpace')])
export const UIPlayer = t.type({
  id: t.string,
  name: t.string,
  holdingTreasures: t.array(HiddenTreasure),
  discoveredTreasures: t.array(SingleTreasure),
  score: t.number,
})

export const ActivePosition = t.type({
  space: t.number,
  returning: t.boolean,
})

export const Returned = t.type({
  returnIndex: t.number,
})

export const Position = t.union([ActivePosition, Returned])

export const Roll = t.type({
  die1: t.number,
  die2: t.number,
  penalty: t.number,
  total: t.number,
})

export const TurnPhase = t.union([t.literal('start'), t.literal('end')])

export const Round = t.type({
  phase: TurnPhase,
  number: t.number,
  positions: t.record(t.string, Position),
  roll: t.union([t.undefined, Roll]),
})

export const RoundEndSummary = t.type({
  players: t.record(
    t.string,
    t.type({
      discovered: t.array(Treasure),
      position: Position,
    })
  ),
  number: t.number,
})

export const Model = t.type({
  players: readonlyNonEmptyArray(UIPlayer),
  submarine: Submarine,
  spaces: t.array(UISpace),
  round: Round,
  roundEndSummary: t.union([t.undefined, RoundEndSummary]),
  ended: t.boolean,
})
