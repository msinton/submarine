import { rotateToNextPlayer } from './game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { Model, Player, Round } from './model'

const bob: Player = {
  name: 'bob',
  discoveredTreasures: [],
  holdingTreasures: [],
}
const alice = {
  ...bob,
  name: 'alice',
}
const frank = {
  ...bob,
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
) => expect(players.map((x) => x.name)).toEqual(order)

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
          bob: 'returned',
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
          alice: 'returned',
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
          alice: 'returned',
          frank: 'returned',
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
          alice: 'returned',
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
          frank: 'returned',
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
          bob: 'returned',
          alice: 'returned',
          frank: 'returned',
        },
      },
    }
    expectOrder(['bob', 'alice', 'frank'], rotateToNextPlayer(game))
  })
})
