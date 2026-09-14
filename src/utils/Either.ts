export type Either<a, b> = { kind: 'left', v: a } | { kind: 'right', v: b }

export const Left = <a, b>(_a: a): Either<a, b> => ({ kind: 'left', v: _a })

export const Right = <a, b>(_b: b): Either<a, b> => ({ kind: 'right', v: _b })
