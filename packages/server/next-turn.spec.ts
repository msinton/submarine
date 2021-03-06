import { rotateToNextPlayer } from './update/next-turn'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { Model, Player, Round } from '../model'

const bob: Player = {
  id: 'bob',
  name: 'bob',
  discoveredTreasures: [],
  holdingTreasures: [],
  score: 0,
}
const alice = {
  ...bob,
  id: 'alice',
  name: 'alice',
}
const frank = {
  ...bob,
  id: 'frank',
  name: 'frank',
}
const round: Round = {
  phase: 'start',
  positions: {
    bob: { space: 1, returning: false },
    alice: { space: 1, returning: false },
  },
  number: 1,
}
const threePlayerRound: Round = {
  phase: 'start',
  positions: {
    bob: { space: 1, returning: false },
    alice: { space: 1, returning: false },
    frank: { space: 1, returning: false },
  },
  number: 1,
}
const defaultGame: Model = {
  submarine: { oxygen: 25 },
  players: NEA.cons(bob, NEA.of(alice)),
  spaces: [],
  round,
  ended: false,
}
const threePlayerGame: Model = {
  submarine: { oxygen: 25 },
  players: NEA.cons(bob, NEA.cons(alice, NEA.of(frank))),
  spaces: [],
  round: threePlayerRound,
  ended: false,
}

const expectOrder = (
  order: string[],
  players: NEA.ReadonlyNonEmptyArray<Player>
) => expect(players.map((x) => x.id)).toEqual(order)

describe('rotateToNextPlayer', () => {
  test('when 2 players not returned, rotates to other player', () => {
    expectOrder(['alice', 'bob'], rotateToNextPlayer(defaultGame))
  })

  test('when 2 players current returned, rotates to next player', () => {
    const game: Model = {
      ...defaultGame,
      round: {
        ...round,
        positions: {
          bob: { returnIndex: 0 },
          alice: { space: 1, returning: false },
        },
      },
    }
    expectOrder(['alice', 'bob'], rotateToNextPlayer(game))
  })

  test('when 2 players other returned, stays on player', () => {
    const game: Model = {
      ...defaultGame,
      round: {
        ...round,
        positions: {
          bob: { space: 1, returning: false },
          alice: { returnIndex: 0 },
        },
      },
    }
    expectOrder(['bob', 'alice'], rotateToNextPlayer(game))
  })

  test('when 3 players none returned, rotates to 2nd player', () => {
    const game: Model = {
      ...threePlayerGame,
      round: {
        ...threePlayerRound,
        positions: {
          bob: { space: 1, returning: false },
          alice: { space: 1, returning: false },
          frank: { space: 1, returning: false },
        },
      },
    }
    expectOrder(['alice', 'frank', 'bob'], rotateToNextPlayer(game))
  })
  test('when 3 players others returned, stays on player', () => {
    const game: Model = {
      ...threePlayerGame,
      round: {
        ...threePlayerRound,
        positions: {
          bob: { space: 1, returning: false },
          alice: { returnIndex: 0 },
          frank: { returnIndex: 0 },
        },
      },
    }
    expectOrder(['bob', 'alice', 'frank'], rotateToNextPlayer(game))
  })

  test('when 3 players - 2nd returned, rotates to 3rd player', () => {
    const game: Model = {
      ...threePlayerGame,
      round: {
        ...threePlayerRound,
        positions: {
          bob: { space: 1, returning: false },
          alice: { returnIndex: 0 },
          frank: { space: 1, returning: false },
        },
      },
    }
    expectOrder(['frank', 'bob', 'alice'], rotateToNextPlayer(game))
  })

  test('when 3 players - 3rd returned, rotates to 2nd player', () => {
    const game: Model = {
      ...threePlayerGame,
      round: {
        ...threePlayerRound,
        positions: {
          bob: { space: 1, returning: false },
          alice: { space: 1, returning: false },
          frank: { returnIndex: 0 },
        },
      },
    }
    expectOrder(['alice', 'frank', 'bob'], rotateToNextPlayer(game))
  })

  test('when 3 players - all returned, no change', () => {
    const game: Model = {
      ...threePlayerGame,
      round: {
        ...threePlayerRound,
        positions: {
          bob: { returnIndex: 0 },
          alice: { returnIndex: 0 },
          frank: { returnIndex: 0 },
        },
      },
    }
    expectOrder(['bob', 'alice', 'frank'], rotateToNextPlayer(game))
  })
})
