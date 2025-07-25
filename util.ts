export function isDefined<T, U>(
    value: T | undefined,
    func: (value: T) => U,
): U | undefined {
    if (value !== undefined) {
        return func(value);
    }
    return undefined;
}
