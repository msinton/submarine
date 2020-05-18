import { pipe } from 'fp-ts/lib/pipeable'
import { lookup, updateAt, cons } from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { getOrElse, Option } from 'fp-ts/lib/Option'
import * as O from 'fp-ts/lib/Option'
import {
  Model,
  Space,
  Player,
  ActivePosition,
  isSingleTreasure,
} from '../model'
import { currentPlayer } from '../game'

export const update = (
  { space }: ActivePosition,
  { spaces, players }: Pick<Model, 'spaces' | 'players'>
): Option<Pick<Model, 'spaces' | 'players'>> =>
  pipe(
    lookup(space, spaces),
    O.filter(isSingleTreasure),
    O.map((collected) => ({
      players: pipe(
        currentPlayer({ players }),
        (player): Player => ({
          ...player,
          collectedTreasures: cons(collected, player.collectedTreasures),
        }),
        (player) => NEA.cons(player, [...NEA.tail(players)])
      ),
      spaces: pipe(
        updateAt<Space>(space, 'emptySpace')(spaces),
        getOrElse(() => spaces)
      ),
    }))
  )
