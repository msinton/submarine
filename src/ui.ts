/* eslint-disable indent */
import { map } from 'fp-ts/lib/Array'
import { ifElse } from 'ramda'
import * as NEA from 'fp-ts/lib/ReadonlyNonEmptyArray'
import {
  SingleTreasure,
  Model,
  Space,
  UISpace,
  Player,
  UIPlayer,
  UIModel,
  HiddenSingleTreasure,
  isSingleTreasure,
  isTreasureStack,
} from './model'

const hideSingleTreasure = ({
  level,
}: SingleTreasure): HiddenSingleTreasure => ({ level })

const hideTreasure = ifElse(
  isSingleTreasure,
  hideSingleTreasure,
  map(hideSingleTreasure)
)

const hideTreasureInSpace = (space: Space): UISpace =>
  isSingleTreasure(space) || isTreasureStack(space)
    ? hideTreasure(space)
    : space

const uiPlayer = (player: Player): UIPlayer => ({
  ...player,
  // id: `${player.name}-${player.id.substring(0, 10)}`,
  holdingTreasures: map(hideTreasure)(player.holdingTreasures),
})

// TODO obfuscate player ID - and in positions, one-way-hash?
// but maintain ID for the player we are returning this to
export const toUI = (model: Model): UIModel => ({
  ...model,
  spaces: map(hideTreasureInSpace)(model.spaces),
  players: NEA.map(uiPlayer)(model.players),
})
