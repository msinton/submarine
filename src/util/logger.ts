import { createLogger, format, transports } from 'winston'

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    // format.timestamp({
    //   format: 'YYYY-MM-DD HH:mm:ss.SSS',
    // }),
    format.errors({ stack: true }),
    format.prettyPrint()
  ),
  // defaultMeta: { service: 'submarine' },
  transports: [new transports.Console()],
})
