import { pipe } from 'fp-ts/lib/pipeable'
import { lookup, updateAt, cons } from 'fp-ts/lib/Array'
import { getOrElse, Option } from 'fp-ts/lib/Option'
import * as O from 'fp-ts/lib/Option'
import {
  Model,
  Space,
  Player,
  ActivePosition,
  isSingleTreasure,
} from '../../model'
import { updateCurrentPlayer } from '../game'
import { mergeRight } from 'ramda'

export const update = (
  { space }: ActivePosition,
  { spaces, players }: Pick<Model, 'spaces' | 'players'>
): Option<Pick<Model, 'spaces' | 'players'>> =>
  pipe(
    lookup(space, spaces),
    O.filter(isSingleTreasure),
    O.map((holding) =>
      updateCurrentPlayer((player: Player) => ({
        ...player,
        holdingTreasures: cons(holding, player.holdingTreasures),
      }))({ players })
    ),
    O.map(
      mergeRight({
        players,
        spaces: pipe(
          updateAt<Space>(space, 'emptySpace')(spaces),
          getOrElse(() => spaces)
        ),
      })
    )
  )
