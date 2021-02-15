import {
  Position,
  isReturned,
  startPosition,
  Returned,
  ActivePosition,
} from './index'
import { pipe } from 'fp-ts/lib/function'
import { fold } from 'fp-ts/lib/Monoid'
import { contramap, Ord, ordNumber } from 'fp-ts/lib/Ord'
import * as ORD from 'fp-ts/lib/Ord'

const ordReturned: Ord<Returned> = pipe(
  ordNumber,
  contramap((x) => x.returnIndex)
)

const ordActivePosition: Ord<ActivePosition> = pipe(
  ordNumber,
  contramap((x) => x.space)
)

export const ordPositionByFurthestThenLastReturned: Ord<Position> = fold(
  ORD.getMonoid<Position>()
)([
  pipe(
    // not returned, furthest from sub
    ordActivePosition,
    contramap<ActivePosition, Position>((p) =>
      isReturned(p) ? startPosition : p
    ),
    ORD.getDualOrd
  ),
  pipe(
    // returned last
    ordReturned,
    contramap<Returned, Position>((x) =>
      isReturned(x) ? x : { returnIndex: 0 }
    ),
    ORD.getDualOrd
  ),
])

export const ordByOrderingAndIgnoreKey = <T>(ordP: Ord<T>): Ord<[string, T]> =>
  pipe(
    ordP,
    contramap(([, x]) => x)
  )
