import fastify from 'fastify'
import { newGame } from '../init-game'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import { sequenceS } from 'fp-ts/lib/Apply'
import { filter } from 'fp-ts/lib/Array'
import { eqString } from 'fp-ts/lib/Eq'
import * as MAP from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/pipeable'
import { Model } from '../model'
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
const updateRooms = (
  roomId: string,
  waitingRooms: Map<string, WaitingRoom>
) => (room: WaitingRoom) =>
  room.players.length === 0
    ? waitingRooms.delete(roomId)
    : waitingRooms.set(roomId, room)

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

const removePlayerFromRoom = (exitingPlayerId: string) => (
  room: WaitingRoom
): WaitingRoom =>
  pipe(room, (room) => ({
    ...room,
    players: pipe(
      room.players,
      filter((x) => x.id !== exitingPlayerId)
    ),
  }))

const updateRoomAsStarted = (
  roomId: string,
  gameId: string,
  playerId: string,
  waitingRooms: Map<string, WaitingRoom>
) =>
  pipe(
    MAP.lookup(eqString)(roomId, waitingRooms),
    O.map(removePlayerFromRoom(playerId)),
    O.map((room) => ({ ...room, gameId })),
    O.map(tap(updateRooms(roomId, waitingRooms)))
  )

const updateRoomWithLeaver = (
  waitingRooms: Map<string, WaitingRoom>,
  room: WaitingRoom,
  roomId: string,
  exitingPlayerId: string
) =>
  pipe(
    room,
    removePlayerFromRoom(exitingPlayerId),
    tap(updateRooms(roomId, waitingRooms))
  )

export const attach = (
  app: fastify.FastifyInstance,
  waitingRooms: Map<string, WaitingRoom>,
  games: Map<string, Model>
) => {
  app.post(
    '/join-new-game',
    {
      schema: {
        body: {
          gameId: Type.String(),
          id: Type.String(),
          roomId: Type.String(),
        },
      },
    },
    async ({ body: { gameId, id, roomId } }) =>
      pipe(
        sequenceS(O.option)({
          room: MAP.lookup(eqString)(roomId, waitingRooms),
          game: MAP.lookup(eqString)(gameId, games),
        }),
        O.map(
          tap(({ room }) =>
            updateRoomWithLeaver(waitingRooms, room, roomId, id)
          )
        ),
        O.map(({ game }) => toUI(game)),
        O.map(resolve),
        O.getOrElse(() => reject(new Error('Bad gameId or roomId')))
      )
  )

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
        O.map(
          tap(({ gameId }) =>
            updateRoomAsStarted(roomId, gameId, id, waitingRooms)
          )
        ),
        O.map((x) => ({ ...x, game: toUI(x.game) })),
        O.map(resolve),
        O.getOrElse(() => reject(new Error('Bad room or id')))
      )
  )
}
