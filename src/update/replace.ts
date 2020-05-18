/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { deleteAt, lookup, updateAt } from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { Option, getOrElse } from 'fp-ts/lib/Option'
import { Model, Player, Space, ActivePosition } from '../model'
import { Replace, updateCurrentPlayer } from '../game'

const removeTreasure = (collectedIndex: number, player: Player): Player => ({
  ...player,
  collectedTreasures: pipe(
    player.collectedTreasures,
    deleteAt(collectedIndex),
    getOrElse(() => player.collectedTreasures)
  ),
})

export const update = (
  { collectedIndex }: Replace,
  player: Player,
  position: ActivePosition,
  game: Pick<Model, 'spaces' | 'players'>
): Option<Pick<Model, 'spaces' | 'players'>> =>
  pipe(
    lookup(collectedIndex, player.collectedTreasures),
    O.filter(() => game.spaces[position.space] === 'emptySpace'),
    O.chain((treasure) =>
      updateAt<Space>(position.space, treasure)(game.spaces)
    ),
    O.map((spaces) => ({
      spaces,
      ...updateCurrentPlayer((p) => removeTreasure(collectedIndex, p))(game),
    }))
  )
