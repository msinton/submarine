import fastify from 'fastify'
import { newGame } from '../init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { eqString } from 'fp-ts/lib/Eq'
import * as Map from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model } from '../model'
import { tap } from 'ramda'
import { toUI } from '../ui'
import { WaitingRoom } from '../index'
import { resolve, reject } from '../util/utils'

import { Static, Type } from '@sinclair/typebox'
import { ordString } from 'fp-ts/lib/Ord'
import { logger } from '../util/logger'

const startReqBodySchema = Type.Object({
  roomId: Type.String(),
  id: Type.String(),
})

const startSchema = { body: startReqBodySchema }

type StartRequest = { body: Static<typeof startReqBodySchema> }

const validateRoom = (waitingRooms: Map<string, WaitingRoom>) => ({
  roomId,
  id,
}: StartRequest['body']) =>
  pipe(
    Map.lookup(eqString)(roomId, waitingRooms),
    O.chain(O.fromPredicate((x) => x.some((player) => player.id === id))), // enforce player in room
    O.chain((waitingRoom) => NEA.fromArray(waitingRoom))
  )

export const attach = (
  app: fastify.FastifyInstance,
  waitingRooms: Map<string, WaitingRoom>,
  games: Map<string, Model>
) =>
  app.post(
    '/start',
    {
      schema: startSchema,
    },
    async ({ body: { roomId, id } }: StartRequest) =>
      pipe(
        validateRoom(waitingRooms)({ roomId, id }),
        O.map(newGame),
        O.map((game) => ({ gameId: roomId, game })),
        O.map(tap(({ gameId, game }) => games.set(gameId, game))),
        O.map(tap(() => console.log('games', games))),
        O.map(tap(() => waitingRooms.delete(roomId))),
        O.map(tap(() => console.log('games', games))),
        O.map((x) => ({ ...x, game: toUI(x.game) })),
        O.map(resolve),
        O.getOrElse(() => reject(new Error('Bad room or id')))
      )
  )
