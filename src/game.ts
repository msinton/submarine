import { pipe } from 'fp-ts/lib/pipeable'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import {
  Model,
  Player,
  Position,
  startIndex,
  TurnPhase,
  ActivePosition,
} from './model'
import updates from './update'
import { logger } from './util/logger'
import { mergeRight, when, tap, equals } from 'ramda'

export type Replace = {
  holdingIndex: number
}

type StartAction = 'roll' | 'return'
type EndAction = 'pickup' | Replace | 'no-action'
export type Action = StartAction | EndAction

const isStartAction = (arg: Action): arg is StartAction =>
  arg === 'roll' || arg === 'return'

const isEndAction = (arg: Action): arg is EndAction =>
  arg === 'no-action' ||
  arg === 'pickup' ||
  equals(Object.keys(arg), ['holdingIndex'])

export const containsPlayer = (
  targetSpace: number,
  positions: Array<Position>
): boolean =>
  positions.some((x) => (x === 'returned' ? false : x.space === targetSpace))

const depleteOxygen = (
  game: Pick<Model, 'submarine' | 'players'>
): Pick<Model, 'submarine'> => ({
  submarine: {
    oxygen: game.submarine.oxygen - currentPlayer(game).holdingTreasures.length,
  },
})

const handleStartAction = (action: StartAction, game: Model): Model => {
  const { round } = game
  const player = currentPlayer(game).id
  const initialPosition = game.round.positions[player]!

  if (initialPosition === 'returned') {
    logger.error('Unexpected start action for returned player', {
      player,
      action,
    })
    return game
  }

  const { roll, position } =
    action === 'roll' || initialPosition.space === startIndex
      ? updates.roll(initialPosition, game)
      : updates.roll({ ...initialPosition, returning: true }, game)

  const returned = position === 'returned'

  return pipe(
    {
      ...game,
      ...depleteOxygen(game),
      round: {
        ...round,
        phase: 'end' as TurnPhase,
        positions: {
          ...game.round.positions,
          [player]: position,
        },
        roll,
      },
    },
    when(() => returned, updates.nextTurn)
  )
}

export const updateCurrentPlayer = (f: (a: Player) => Player) => (
  game: Pick<Model, 'players'>
): Pick<Model, 'players'> => ({
  players: NEA.cons(f(currentPlayer(game)), [...NEA.tail(game.players)]),
})

const handleEndAction = (action: EndAction, game: Model): Model => {
  const player = NEA.head(game.players)
  const position = game.round.positions[player.id]!

  const pickupUpdate = (position: ActivePosition): ((m: Model) => Model) =>
    when(
      () => action === 'pickup',
      (game) =>
        pipe(
          updates.pickup(position, game),
          O.fold(() => game, mergeRight(game))
        )
    )

  const replaceUpdate = (position: ActivePosition): ((m: Model) => Model) =>
    when(
      () => (action as Replace).holdingIndex !== undefined,
      (game) =>
        pipe(
          updates.replace(action as Replace, player, position, game),
          O.fold(() => game, mergeRight(game))
        )
    )

  return pipe(
    position === 'returned'
      ? game
      : pipe(game, pickupUpdate(position), replaceUpdate(position)),
    updates.nextTurn
  )
}

export const currentPlayer = ({ players }: Pick<Model, 'players'>): Player =>
  NEA.head(players)

const handleAction = (action: Action) => (game: Model): Model => {
  switch (game.round.phase) {
    case 'start':
      return isStartAction(action) ? handleStartAction(action, game) : game

    case 'end':
      return isEndAction(action) ? handleEndAction(action, game) : game
  }
}

const warnInvalidState = (game: Model): void => {
  const position = game.round.positions[currentPlayer(game).id]!
  if (position === 'returned') {
    logger.error('should not have action for player returned')
  }
}

export const gameLoop = (action: Action, game: Model): Model => {
  return pipe(
    game,
    O.fromPredicate((game: Model) => !game.ended),
    O.map(tap(warnInvalidState)),
    O.map(handleAction(action)),
    O.map(updates.roundEnd),
    O.getOrElse(() => game)
  )
}
