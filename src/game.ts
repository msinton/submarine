/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { rotate } from 'fp-ts/lib/Array'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { getOrElse } from 'fp-ts/lib/Option'
import * as O from 'fp-ts/lib/Option'
import { Model, Player, Position, startIndex } from './model'
import updates from './update'
import { logger } from './util/logger'

type Replace = {
  collectedIndex: number
}

// TODO consider tidy up of action handlers - to include types
type StartAction = 'roll' | 'return'
type EndAction = 'pickup' | Replace | 'no-action'
type Action = StartAction | EndAction

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

  const players = returned ? rotateToNextPlayer(game) : game.players

  return {
    ...game,
    players,
    round: {
      ...round,
      phase: returned ? 'start' : 'end',
      positions: {
        ...game.round.positions,
        [player]: update.position,
      },
      roll: update.roll,
    },
  }
}

const handleEndAction = (action: EndAction, game: Model): Model => {
  const { round } = game
  const player = NEA.head(game.players).name
  const position = game.round.positions[player]!
  const players = rotateToNextPlayer(game)

  const gameWithNextTurnUpdate: Model = {
    ...game,
    players,
    round: {
      ...round,
      phase: 'start',
      roll: undefined,
    },
  }

  if (position === 'returned') {
    return gameWithNextTurnUpdate
  }

  switch (action) {
    case 'no-action':
      return gameWithNextTurnUpdate

    case 'pickup': {
      return pipe(
        updates.pickup(position, game),
        O.map(
          ({ players, spaces }): Model => ({
            ...gameWithNextTurnUpdate,
            players: rotateToNextPlayer({ players, round }),
            spaces,
          })
        ),
        getOrElse(() => gameWithNextTurnUpdate)
      )
    }

    default:
      // const { collectedIndex } = action as Replace
      // check current space is an empty
      // remove from collected
      // replace current space
      return game
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

export const gameLoop = (action: Action, game: Model): Model => {
  const { round } = game
  const position = game.round.positions[currentPlayer(game).name]!
  const { phase } = round

  if (position === 'returned') {
    // TODO...
    logger.error('should not have action for player returned') // TODO though allow at game end
    return game
  }

  switch (phase) {
    case 'start':
      return isStartAction(action) ? handleStartAction(action, game) : game

    case 'end':
      return isEndAction(action) ? handleEndAction(action, game) : game
  }
}
