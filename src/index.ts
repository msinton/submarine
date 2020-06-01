import fastify from 'fastify'
import { Type } from '@sinclair/typebox'
import { v4 as uuidv4 } from 'uuid'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { logger } from './util/logger'
import { PlayerData, newGame } from './init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model } from './model'
import { tap } from 'ramda'
import { toUI } from './ui'

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

let currentGame: Model | undefined = undefined

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
      O.map(tap((x) => (currentGame = x))),
      O.map(toUI),
      O.map((x) => Promise.resolve(x)),
      O.getOrElse(() => Promise.reject(new Error('Not ready')))
    )
)

const port = 3000
const start = async () => {
  try {
    await app.listen(port)
    logger.info(`server listening on ${port}`)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}
start()
