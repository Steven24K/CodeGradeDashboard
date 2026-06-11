export type Func<a, b> = (_: a) => b

export type Predicate<a> = Func<a, boolean | (RegExpMatchArray | null)>

export const All = <T>(...predicates: Predicate<T>[]): Predicate<T> =>
    (item: T) => predicates.every(p => p(item));

export const Any = <T>(...predicates: Predicate<T>[]): Predicate<T> =>
    (item: T) => predicates.some(p => p(item));