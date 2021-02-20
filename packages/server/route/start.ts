import fastify from 'fastify'
import { newGame } from '../init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { eqString } from 'fp-ts/lib/Eq'
import * as MAP from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model, UIModel } from '../../model'
import { tap } from 'ramda'
import { toUI } from '../ui'
import { WaitingRoom } from '../index'
import { resolve, reject } from '../util/utils'
import { Static, Type } from '@sinclair/typebox'

const startReqBodySchema = Type.Object({
  roomId: Type.String(),
  id: Type.String(),
})

const startSchema = { body: startReqBodySchema }

type StartRequest = { body: Static<typeof startReqBodySchema> }

// TODO currently half functional (immutable) and half not - db should resolve this

const removeRoom = (roomId: string, waitingRooms: Map<string, WaitingRoom>) =>
  waitingRooms.delete(roomId)

const validateRoom = (waitingRooms: Map<string, WaitingRoom>) => ({
  roomId,
  id,
}: StartRequest['body']) =>
  pipe(
    MAP.lookup(eqString)(roomId, waitingRooms),
    // enforce player in room
    O.chain(
      O.fromPredicate(({ players }) =>
        players.some((player) => player.id === id)
      )
    ),
    O.chain((waitingRoom) => NEA.fromArray(waitingRoom.players))
  )

const startOrFindGame = (
  waitingRooms: Map<string, WaitingRoom>,
  games: Map<string, Model>
) => ({ id, roomId }: StartRequest['body']): O.Option<UIModel> =>
  pipe(
    validateRoom(waitingRooms)({ roomId, id }),
    O.map(newGame),
    O.map(tap((game) => games.set(roomId, game))),
    O.map(tap(() => removeRoom(roomId, waitingRooms))),
    O.alt(() => MAP.lookup(eqString)(roomId, games)),
    O.map(toUI)
  )

export const attach = (
  app: fastify.FastifyInstance,
  waitingRooms: Map<string, WaitingRoom>,
  games: Map<string, Model>
) => {
  app.post(
    '/start',
    {
      schema: startSchema,
    },
    async ({ body }: StartRequest) =>
      pipe(
        startOrFindGame(waitingRooms, games)(body),
        O.map((game) => ({ game })),
        O.map(resolve),
        O.getOrElse(() => reject(new Error('Bad room or id')))
      )
  )
}
