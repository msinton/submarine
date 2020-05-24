/* eslint-disable indent */
import { pipe } from 'fp-ts/lib/pipeable'
import { chain, map, reverse, filter, chunksOf, compact } from 'fp-ts/lib/Array'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { Model, Player, Treasure, isTreasureStack, Space } from '../model'
import { when, sortBy, mergeAll } from 'ramda'
import { initialSubmarine } from '../init-game'

const moveCollectedTreasuresToDiscovered = (player: Player): Player => ({
  ...player,
  collectedTreasures: [],
  discoveredTreasures: pipe(
    chain((x: Treasure) => (isTreasureStack(x) ? [...x] : [x]))(
      player.collectedTreasures
    ),
    (x) => x.concat(player.discoveredTreasures)
  ),
})

const removeCollectedTreasures = (player: Player): Player => ({
  ...player,
  collectedTreasures: [],
})

const isRoundEnd = ({
  submarine,
  round,
}: Pick<Model, 'submarine' | 'round'>): boolean =>
  submarine.oxygen <= 0 ||
  Object.keys(round.positions).every((x) => x === 'returned')

const updatePlayers = ({
  players,
  round,
}: Pick<Model, 'players' | 'round'>): Pick<Model, 'players'> => ({
  players: NEA.map((player: Player) =>
    round.positions[player.name] === 'returned'
      ? moveCollectedTreasuresToDiscovered(player)
      : removeCollectedTreasures(player)
  )(players),
})

const sortPlayersByFurthest = ({ round }: Pick<Model, 'round'>) =>
  pipe(
    Object.entries(round.positions),
    sortBy(([, position]) => (position === 'returned' ? -1 : position.space)),
    reverse
  )

const updateRound = ({
  round,
}: Pick<Model, 'round'>): Pick<Model, 'round'> => ({
  round: {
    ...round,
    phase: 'start',
    number: round.number + 1,
    positions: pipe(
      sortPlayersByFurthest({ round }),
      map(([name]) => ({ [name]: { space: -1, returning: false } })),
      mergeAll
    ),
  },
})

const stackTreasures = (xs: Array<Treasure>): Array<Treasure> =>
  pipe(
    xs,
    chain((x) => (isTreasureStack(x) ? [...x] : [x])),
    chunksOf(3),
    map((treasureChunks) => NEA.fromArray(treasureChunks)),
    compact
  )

// TODO consider fp Record - map values?
// TODO the last already present stack should be added to
const updateSpaces: (
  game: Pick<Model, 'spaces' | 'players' | 'round'>
) => Pick<Model, 'spaces'> = ({ spaces, round, players }) =>
  pipe(
    spaces,
    filter((x: Space) => x !== 'emptySpace'),
    (xs) => [
      ...xs,
      ...pipe(
        sortPlayersByFurthest({ round }),
        filter(([name]) => round.positions[name] !== 'returned'),
        chain(
          ([name]) => players.find((x) => x.name === name)!.collectedTreasures
        ),
        stackTreasures
      ),
    ],
    (spaces) => ({ spaces })
  )

export const update = (game: Model): Model =>
  when(
    isRoundEnd,
    () => ({
      ...game,
      ...initialSubmarine,
      ...updatePlayers(game),
      ...updateRound(game),
      ...updateSpaces(game),
    }),
    game
  )
