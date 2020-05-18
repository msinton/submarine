/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { findLast } from 'fp-ts/lib/Array'
import { logger } from '../util/logger'
import { getOrElse } from 'fp-ts/lib/Option'
import { Model, ActivePosition, Roll, Position, startIndex } from '../model'
import { randomInt } from '../util/utils'
import { containsPlayer, currentPlayer } from '../game'

const roll = () => ({ die1: randomInt(3), die2: randomInt(3) })

const maxAvailableSpace = (currentSpace: number, { spaces, round }: Model) =>
  pipe(
    [...spaces.keys()],
    findLast(
      (space: number) => !containsPlayer(space, Object.values(round.positions))
    ),
    getOrElse(() => currentSpace)
  )

// prettier-ignore
const nextForwardSpace = ({
  maxSpace,
  target,
  positions
}: {maxSpace: number, target:number, positions: Array<Position>}): number =>
  target > maxSpace
    ? maxSpace
    : containsPlayer(target, positions)
      ? pipe(
          logger.info('nextForwardSpace - does contain player', { target }),
          () => nextForwardSpace({ maxSpace, target: target + 1, positions })
        )
      : target

// prettier-ignore
const nextBackwardSpace = (
  target: number,
  positions: Array<Position>
): number =>
  target <= startIndex
    ? startIndex
    : containsPlayer(target, positions)
      ? nextBackwardSpace(target - 1, positions)
      : target

// prettier-ignore
const nextSpace = (
  currentSpace: number,
  target: number,
  returning: boolean,
  model: Model
) => {
  if (currentSpace === target) {
    return currentSpace
  }
  return returning
    ? nextBackwardSpace(target, Object.values(model.round.positions))
    : pipe(
        maxAvailableSpace(currentSpace, model),
        m => { logger.info('max', { m }); return m },
        (maxSpace) => nextForwardSpace({ maxSpace, target, positions: Object.values(model.round.positions) })
      )
    }

export const update = (
  { space, returning }: ActivePosition,
  game: Model
): { position: Position; roll: Roll } => {
  const rolled = roll()
  const penalty = currentPlayer(game).collectedTreasures.length || 0
  const rollTotal = Math.max(0, rolled.die1 + rolled.die2 - penalty)
  const directionMutliplier = returning ? -1 : 1

  const target = Math.max(startIndex, space + rollTotal * directionMutliplier)
  const returned = returning && target === startIndex

  // TODO remove
  logger.info('roll stuff', {
    space,
    penalty,
    rollTotal,
    directionMutliplier,
    target,
    returned,
  })

  const position = returned
    ? 'returned'
    : {
        returning,
        space: nextSpace(space, target, returning, game),
      }

  return {
    position,
    roll: rolled,
  }
}
