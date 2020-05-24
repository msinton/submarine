/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { rotate, chain } from 'fp-ts/lib/Array'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { getOrElse } from 'fp-ts/lib/Option'
import * as O from 'fp-ts/lib/Option'
import {
  Model,
  Player,
  Position,
  startIndex,
  TurnPhase,
  Treasure,
  isTreasureStack,
} from './model'
import updates from './update'
import { logger } from './util/logger'
import { mergeRight, mapObjIndexed } from 'ramda'

export type Replace = {
  collectedIndex: number
}

// TODO consider tidy up of action handlers - to include types
type StartAction = 'roll' | 'return'
type EndAction = 'pickup' | Replace | 'no-action'
export type Action = StartAction | EndAction

const rotateToNextPlayer = ({
  players,
  round,
}: Pick<Model, 'players' | 'round'>): ReadonlyNonEmptyArray<Player> => {
  const loop = (players: Array<Player>, attempts: number): Array<Player> =>
    attempts === 0
      ? players
      : pipe(players, rotate(1), (xs) =>
          round.positions[xs[0].name] === 'returned'
            ? loop(players, attempts - 1)
            : xs
        )

  return pipe(
    loop([...players.values()], players.length - 1),
    NEA.fromArray,
    getOrElse(() => players)
  )
}

export const containsPlayer = (
  targetSpace: number,
  positions: Array<Position>
): boolean =>
  positions.some((x) => (x === 'returned' ? false : x.space === targetSpace))

const depleteOxygen = (
  game: Pick<Model, 'submarine' | 'players'>
): Pick<Model, 'submarine'> => ({
  submarine: {
    oxygen:
      game.submarine.oxygen - currentPlayer(game).collectedTreasures.length,
  },
})

const handleStartAction = (action: StartAction, game: Model): Model => {
  const { round } = game
  const player = currentPlayer(game).name
  const position = game.round.positions[player]!

  if (position === 'returned') {
    return game
  }
  const { space } = position

  const update =
    action === 'roll' || space === startIndex
      ? updates.roll(position, game)
      : updates.roll({ ...position, returning: true }, game)

  const returned = update.position === 'returned'

  return pipe(
    {
      ...depleteOxygen(game),
      round: {
        ...round,
        phase: 'end' as TurnPhase,
        positions: {
          ...game.round.positions,
          [player]: update.position,
        },
        roll: update.roll,
      },
    },
    mergeRight(returned ? nextTurn(game) : game)
  )
}

export const nextTurn = (game: Model): Model => ({
  ...game,
  players: rotateToNextPlayer(game),
  round: {
    ...game.round,
    phase: 'start',
    roll: undefined,
  },
})

export const updateCurrentPlayer = (f: (a: Player) => Player) => (
  game: Pick<Model, 'players'>
): Pick<Model, 'players'> => ({
  players: NEA.cons(f(currentPlayer(game)), [...NEA.tail(game.players)]),
})

const handleEndAction = (action: EndAction, game: Model): Model => {
  const player = NEA.head(game.players)
  const position = game.round.positions[player.name]!

  if (position === 'returned') {
    return nextTurn(game)
  }

  switch (action) {
    case 'no-action':
      return nextTurn(game)

    case 'pickup':
      return pipe(
        updates.pickup(position, game),
        O.fold(() => game, mergeRight(game)),
        nextTurn
      )

    default:
      // remaining case is Replace action
      return pipe(
        updates.replace(action, player, position, game),
        O.fold(() => game, mergeRight(game)),
        nextTurn
      )
  }
}

const isStartAction = (arg: Action): arg is StartAction =>
  arg === 'roll' || arg === 'return'

const isEndAction = (arg: Action): arg is EndAction =>
  arg === 'no-action' ||
  arg === 'pickup' ||
  Object.keys(arg) === ['collectedIndex']

export const currentPlayer = ({ players }: Pick<Model, 'players'>): Player =>
  NEA.head(players)

const handleAction = (action: Action, game: Model): Model => {
  switch (game.round.phase) {
    case 'start':
      return isStartAction(action) ? handleStartAction(action, game) : game

    case 'end':
      return isEndAction(action) ? handleEndAction(action, game) : game
  }
}

export const gameLoop = (action: Action, game: Model): Model => {
  const position = game.round.positions[currentPlayer(game).name]!

  if (position === 'returned') {
    // TODO...
    logger.error('should not have action for player returned') // TODO though allow at game end
    return game
  }

  return pipe(handleAction(action, game), updates.roundEnd)
}
