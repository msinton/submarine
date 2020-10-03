/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { findLast } from 'fp-ts/lib/Array'
import { getOrElse } from 'fp-ts/lib/Option'
import { Model, ActivePosition, Roll, Position, startIndex } from '../../model'
import { randomInt } from '../util/utils'
import { containsPlayer, currentPlayer } from '../game'

const roll = () => ({ die1: randomInt(2) + 1, die2: randomInt(2) + 1 })

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
      ? nextForwardSpace({ maxSpace, target: target + 1, positions })
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
        (maxSpace) => nextForwardSpace({ maxSpace, target, positions: Object.values(model.round.positions) })
      )
    }

export const update = (
  { space: currentSpace, returning }: ActivePosition,
  game: Model
): { position: Position; roll: Roll } => {
  const dieRolls = roll()
  const penalty = currentPlayer(game).holdingTreasures.length || 0
  const total = Math.max(0, dieRolls.die1 + dieRolls.die2 - penalty)
  const directionMutliplier = returning ? -1 : 1

  const target = Math.max(
    startIndex,
    currentSpace + total * directionMutliplier
  )
  const space = nextSpace(currentSpace, target, returning, game)
  const returned = returning && space <= startIndex

  return {
    position: returned ? 'returned' : { returning, space },
    roll: { ...dieRolls, penalty, total },
  }
}
