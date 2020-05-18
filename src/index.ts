import { gameLoop } from './game'
import { logger } from './util/logger'
import { newGame } from './init-game'
import { Model } from './model'
import { toUI } from './ui'

const logRound = (msg: string, { round, players }: Model) =>
  logger.info(msg, { round, players })

// example game

const game = newGame(['bob', 'sally'])
logger.info('server-side-game entity', game)
logger.info('ui-model', toUI(game))

const next1 = gameLoop('roll', game)
logger.info('next1', next1)
// logger.info('next1-return', gameLoop('return', game)) // goes forward (can't return on first move)

const next2 = gameLoop('no-action', next1)
logRound('next2', next2)

const next3 = gameLoop('roll', next2)
logRound('next3', next3)

const next4 = gameLoop('pickup', next3)
logRound('next4', next4)

const next5 = gameLoop('no-action', next4) // false move, should be ignored
logRound('next5', next5)

const next6 = gameLoop('return', next5)
logRound('next6', next6)

const next7 = gameLoop('pickup', next6)
logRound('next7', next7)

const next8 = gameLoop('return', next7)
logRound('next8', next8)

const next9 = gameLoop({ collectedIndex: 0 }, next8)
logRound('next9', next9)

const next10 = gameLoop('roll', next9)
logRound('next10', next10)

// TODO
// round end
//  - safe = discover treasures
//  - oxy (do drowning)
// game end

// check turn rotation when some players back
// check treasure penalty

// logger.info('scores', totalScores(toUI(game)))
