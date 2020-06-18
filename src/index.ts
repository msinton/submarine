import fastify from 'fastify'
import { Type } from '@sinclair/typebox'
import { v4 as uuidv4 } from 'uuid'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { logger } from './util/logger'
import { PlayerData, newGame } from './init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { eqString } from 'fp-ts/lib/Eq'
import { lookup } from 'fp-ts/lib/Map'
import * as Map from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { Option } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model } from './model'
import { tap } from 'ramda'
import { toUI } from './ui'
import { gameLoop } from './game'

const app: fastify.FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse
> = fastify()

const waitingRoom: Array<PlayerData> = []

app.post(
  '/new-player',
  {
    schema: {
      body: Type.Object({ name: Type.String() }),
    },
  },
  async (request) => {
    const id = uuidv4()
    if (waitingRoom.length < 6) {
      waitingRoom.push({ id, name: request.body.name })
    } else {
      logger.error('Not handled, too many players...')
    }
    return { id }
  }
)

const games: Map<string, Model> = Map.empty

// TODO waitingRooms plural
app.post(
  '/start',
  {
    schema: {
      body: Type.Object({ id: Type.String() }),
    },
  },
  async (request) =>
    pipe(
      waitingRoom,
      O.fromPredicate((room) => room.some(({ id }) => id === request.body.id)),
      O.chain(() => NEA.fromArray(waitingRoom)),
      O.map(newGame),
      O.map((game) => ({ gameId: uuidv4(), game })),
      O.map(tap(({ gameId, game }) => games.set(gameId, game))),
      O.map((x) => ({ ...x, game: toUI(x.game) })),
      O.map((x) => Promise.resolve(x)),
      O.getOrElse(() => Promise.reject(new Error('Not ready')))
    )
)

const actionSchema = Type.Union([
  Type.Literal('roll'),
  Type.Literal('return'),
  Type.Literal('pickup'),
  Type.Object({ holdingIndex: Type.Number() }),
  Type.Literal('no-action'),
])

const validateIsPlayersTurn = (playerId: string) => (
  game: Model
): Option<Model> =>
  pipe(
    game,
    O.fromPredicate(({ players }) => NEA.head(players).id === playerId)
  )

app.post(
  '/play',
  {
    schema: {
      body: Type.Object({
        id: Type.String(),
        gameId: Type.String(),
        action: actionSchema,
      }),
    },
  },
  async ({ body: { gameId, action, id } }) =>
    pipe(
      lookup(eqString)(gameId, games),
      O.chain(validateIsPlayersTurn(id)),
      O.map((game) => gameLoop(action, game)),
      O.map(tap((game) => games.set(gameId, game))),
      O.map((x) => Promise.resolve(toUI(x))),
      O.getOrElse(() => Promise.reject(new Error('Bad gameId or player id')))
    )
)

app.post(
  '/game',
  {
    schema: {
      body: Type.Object({
        gameId: Type.String(),
      }),
    },
  },
  async ({ body: { gameId } }) =>
    pipe(
      lookup(eqString)(gameId, games),
      O.map((x) => Promise.resolve(toUI(x))),
      O.getOrElse(() => Promise.reject(new Error('Bad gameId')))
    )
)

const port = 3000
const start = () =>
  Promise.resolve()
    .then(() => app.listen(port))
    .then(tap(() => logger.info(`server listening on ${port}`)))
    .catch((err) => {
      logger.error(err)
      process.exit(1)
    })
start()
