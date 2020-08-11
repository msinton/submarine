import fastify from 'fastify'
import { Type } from '@sinclair/typebox'
import { v4 as uuid } from 'uuid'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { logger } from './util/logger'
import { PlayerData } from './init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { eqString } from 'fp-ts/lib/Eq'
import { lookup } from 'fp-ts/lib/Map'
import * as MAP from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { Option } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model } from './model'
import { tap } from 'ramda'
import { toUI } from './ui'
import { gameLoop } from './game'
import { ordString } from 'fp-ts/lib/Ord'
import { head } from 'fp-ts/lib/Array'
import { resolve, reject } from './util/utils'
import { attach as attachStartRoute } from './route/start'

const app: fastify.FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse
> = fastify()

const waitingRooms: Map<string, WaitingRoom> = new Map()
const games: Map<string, Model> = new Map()

app.setErrorHandler((err) => {
  logger.error('Error', { err })
  return reject(err)
})

export type WaitingRoom = {
  players: Array<PlayerData>
  gameId?: string
}

const newWaitingRoom: () => [string, WaitingRoom] = () => {
  const key = uuid()
  const newRoom: WaitingRoom = { players: [] }
  waitingRooms.set(key, newRoom)
  return [key, newRoom]
}

const getUnfilledWaitingRoom: () => [string, WaitingRoom] = () =>
  pipe(
    waitingRooms,
    MAP.filter<WaitingRoom>((x) => x.players.length < 6),
    MAP.toArray(ordString),
    head,
    O.getOrElse(newWaitingRoom)
  )

const roomPlayers = (room: WaitingRoom) =>
  room.players.map(({ name }) => ({ name }))

const joinRoom = (player: PlayerData) => (room: WaitingRoom) =>
  room.players.push(player)

app.post(
  '/new-player',
  {
    schema: {
      body: Type.Object({ name: Type.String() }),
    },
  },
  async ({ body: { name } }) =>
    pipe(
      getUnfilledWaitingRoom(),
      ([roomId, room]) => ({ id: uuid(), roomId, room }),
      tap(({ id, room }) => joinRoom({ id, name })(room)),
      (result) => ({ ...result, room: roomPlayers(result.room) })
    )
)

app.post(
  '/join',
  {
    schema: {
      body: Type.Object({ roomId: Type.String(), name: Type.String() }),
    },
  },
  async ({ body: { roomId, name } }) => {
    const id = uuid()
    return pipe(
      MAP.lookup(eqString)(roomId, waitingRooms),
      O.map(tap(joinRoom({ id, name }))),
      O.map((room) => ({ id, roomId, room: roomPlayers(room) })),
      O.map(resolve),
      O.getOrElse(() => reject(new Error('Not joinable')))
    )
  }
)

app.get(
  '/room',
  {
    schema: {
      querystring: { id: Type.String() },
    },
  },
  async ({ query: { id } }) =>
    pipe(
      MAP.lookup(eqString)(id, waitingRooms),
      O.map((room) => ({ room: roomPlayers(room), gameId: room.gameId })),
      O.map(resolve),
      O.getOrElse(() => reject(new Error('Not found')))
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
      O.map(toUI),
      O.map(resolve),
      O.getOrElse(() => reject(new Error('Bad gameId or player id')))
    )
)

app.get(
  '/game',
  {
    schema: {
      querystring: {
        id: Type.String(),
      },
    },
  },
  async ({ query: { id } }) =>
    pipe(
      lookup(eqString)(id, games),
      O.map(toUI),
      O.map(resolve),
      O.getOrElse(() => reject(new Error('Bad gameId')))
    )
)

// TODO remove, using in development
app.post('/reset', {}, async () =>
  pipe(
    games.clear(),
    () => waitingRooms.clear(),
    () => 'ok'
  )
)
setInterval(
  () =>
    logger.info('rooms and games', {
      rooms: MAP.toArray(ordString)(waitingRooms),
      games: MAP.toArray(ordString)(games).map(([id, { players }]) => ({
        id,
        players,
      })),
    }),
  10 * 1000
)

attachStartRoute(app, waitingRooms, games)

const port = 3001
const start = () =>
  Promise.resolve()
    .then(() => app.listen(port))
    .then(tap(() => logger.info(`server listening on ${port}`)))
    .catch((err) => {
      logger.error(err)
      process.exit(1)
    })
start()
