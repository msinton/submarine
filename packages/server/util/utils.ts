export const randomInt = (max: number) => Math.floor(Math.random() * (max + 1))

export const resolve = <T>(x: T) => Promise.resolve(x)

export const reject = <T>(reason: any) => Promise.reject<T>(reason)
