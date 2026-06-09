
export type Option<a> = { kind: 'some', v: a } | { kind: 'none' }

export const Some = <a>(_v: a): Option<a> => ({ kind: 'some', v: _v })

export const None = <a>(): Option<a> => ({ kind: 'none' })

export const visitOption = <a, b>(_onSome: (_: a) => b) => (_onNone: () => b) => (_o: Option<a>): b =>
    _o.kind == 'some' ? _onSome(_o.v) : _onNone()
