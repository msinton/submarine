import { pipe } from 'fp-ts/lib/pipeable'
import {
  chain,
  map,
  filter,
  chunksOf,
  compact,
  foldMap,
  splitAt,
  head,
  sort,
} from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as R from 'fp-ts/lib/Record'
import {
  Model,
  Player,
  Treasure,
  isTreasureStack,
  SingleTreasure,
  Space,
  TreasureStack,
  isReturned,
  startPosition,
  ordPositionByFurthestThenLastReturned,
  ordByOrderingAndIgnoreKey,
} from '../../model'
import { when, mergeAll, concat } from 'ramda'
import { initialSubmarine } from '../init-game'
import { flow } from 'fp-ts/lib/function'
import { monoidSum } from 'fp-ts/lib/Monoid'
import { Option } from 'fp-ts/lib/Option'
import * as O from 'fp-ts/lib/Option'

const totalRounds = 3

const moveHoldingTreasuresToDiscovered = (player: Player): Player => ({
  ...player,
  holdingTreasures: [],
  discoveredTreasures: pipe(
    chain((x: Treasure) => (isTreasureStack(x) ? [...x] : [x]))(
      player.holdingTreasures
    ),
    concat(player.discoveredTreasures)
  ),
})

const removeHoldingTreasures = (player: Player): Player => ({
  ...player,
  holdingTreasures: [],
})

const isRoundEnd = ({
  submarine,
  round,
}: Pick<Model, 'submarine' | 'round'>): boolean =>
  submarine.oxygen <= 0 || Object.values(round.positions).every(isReturned)

const updateScore = (player: Player): Player =>
  pipe(
    player.discoveredTreasures,
    foldMap(monoidSum)((x: SingleTreasure) => x.value),
    (score) => ({
      ...player,
      score,
    })
  )

const updatePlayers = ({
  players,
  round,
}: Pick<Model, 'players' | 'round'>): Pick<Model, 'players'> => ({
  players: NEA.map((player: Player) =>
    isReturned(round.positions[player.id])
      ? flow(moveHoldingTreasuresToDiscovered, updateScore)(player)
      : removeHoldingTreasures(player)
  )(players),
})

export const sortPlayersByFurthest = (positions: Model['round']['positions']) =>
  pipe(
    positions,
    R.toArray,
    sort(ordByOrderingAndIgnoreKey(ordPositionByFurthestThenLastReturned))
  )

const updateRound = ({
  round,
}: Pick<Model, 'round'>): Pick<Model, 'round'> => ({
  round: {
    ...round,
    phase: 'start',
    number: Math.min(round.number + 1, totalRounds),
    positions:
      round.number === totalRounds
        ? round.positions // don't update when game ended
        : pipe(
            sortPlayersByFurthest(round.positions),
            map(([id]) => ({ [id]: startPosition })),
            mergeAll
          ),
  },
})

const updateRoundEndSummary = ({
  round,
  players,
}: Pick<Model, 'round' | 'players'>): Pick<Model, 'roundEndSummary'> => ({
  roundEndSummary: pipe(
    round.positions,
    R.mapWithIndex((id, x) => ({
      position: x,
      discovered: isReturned(x)
        ? players.find((x) => x.id === id)?.holdingTreasures || []
        : [],
    })),
    (players) => ({ players, number: round.number })
  ),
})

const stackTreasures = (xs: Array<Treasure>): Array<TreasureStack> =>
  pipe(
    xs,
    chain((x) => (isTreasureStack(x) ? [...x] : [x])),
    chunksOf(3),
    map((treasureChunks) => NEA.fromArray(treasureChunks)),
    compact
  )

export const stackTreasuresIncludingLast = (lastSpace: Option<Space>) => (
  xs: Array<Treasure>
): Array<Space> =>
  pipe(
    lastSpace,
    O.filter(isTreasureStack),
    O.fold(
      () => ({ prepend: lastSpace, stacked: stackTreasures(xs) }),
      (x) => ({ prepend: O.none, stacked: stackTreasures([...x, ...xs]) })
    ),
    ({ prepend, stacked }) =>
      O.fold<Space, Array<Space>>(
        () => stacked,
        (x) => [x, ...stacked]
      )(prepend)
  )

// TODO consider fp Record - map or positions as array?
const updateSpaces = ({
  spaces,
  round,
  players,
}: Pick<Model, 'spaces' | 'players' | 'round'>): Pick<Model, 'spaces'> =>
  pipe(
    spaces,
    filter((x) => x !== 'emptySpace'),
    (xs) => splitAt(xs.length - 1)(xs),
    ([xs, lastSpace]) => [
      ...xs,
      ...pipe(
        sortPlayersByFurthest(round.positions),
        filter(([id]) => !isReturned(round.positions[id])),
        chain(
          ([id]) => players.find((x) => x.id === id)?.holdingTreasures || []
        ),
        stackTreasuresIncludingLast(head(lastSpace))
      ),
    ],
    (spaces) => ({ spaces })
  )

const updateGameEnded = (game: Pick<Model, 'round'>): Pick<Model, 'ended'> =>
  game.round.number === 3 ? { ended: true } : { ended: false }

export const update = (game: Model): Model =>
  when(
    isRoundEnd,
    () => ({
      ...game,
      ...initialSubmarine,
      ...updatePlayers(game),
      ...updateRound(game),
      ...updateRoundEndSummary(game),
      ...updateSpaces(game),
      ...updateGameEnded(game),
    }),
    game
  )
