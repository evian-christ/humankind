export interface GameRng {
    /** Returns a floating point number in the range [0, 1). */
    next: () => number;
    /** Returns an integer in the inclusive range [min, max]. */
    int: (min: number, max: number) => number;
    pick: <T>(items: readonly T[]) => T;
    shuffle: <T>(items: readonly T[]) => T[];
}

export function createMathRng(): GameRng {
    const rng: GameRng = {
        next: () => Math.random(),
        int: (min, max) => {
            const lo = Math.ceil(min);
            const hi = Math.floor(max);
            return lo + Math.floor(rng.next() * (hi - lo + 1));
        },
        pick: (items) => {
            if (items.length === 0) {
                throw new Error('Cannot pick from an empty collection.');
            }
            return items[rng.int(0, items.length - 1)]!;
        },
        shuffle: (items) => {
            const shuffled = [...items];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = rng.int(0, i);
                [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
            }
            return shuffled;
        },
    };

    return rng;
}
