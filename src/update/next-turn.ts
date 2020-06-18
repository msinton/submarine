import { pipe } from 'fp-ts/lib/pipeable'
import { rotate } from 'fp-ts/lib/Array'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { getOrElse } from 'fp-ts/lib/Option'
import { Model, Player } from '../model'

// prettier-ignore
export const rotateToNextPlayer = ({
  players,
  round,
}: Pick<Model, 'players' | 'round'>): ReadonlyNonEmptyArray<Player> => {
  const loop = (players: Array<Player>, attempts: number): Array<Player> =>
    attempts === 0
      ? players
      : pipe(
          players,
          rotate(-1),
          (xs) => round.positions[xs[0].id] === 'returned'
              ? loop(xs, attempts - 1)
              : xs
        )

  return pipe(
    loop([...players.values()], players.length),
    NEA.fromArray,
    getOrElse(() => players)
  )
}

export const update = (game: Model): Model => ({
  ...game,
  players: rotateToNextPlayer(game),
  round: {
    ...game.round,
    phase: 'start',
    roll: game.round.roll,
  },
})
