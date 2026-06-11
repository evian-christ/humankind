let currentGeneration = 0;

type TimerHandle = ReturnType<typeof setTimeout>;

const timers = new Set<TimerHandle>();

export const beginGameLifecycle = (): number => {
    currentGeneration += 1;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    return currentGeneration;
};

export const captureGameLifecycle = (): number => currentGeneration;

export const isGameLifecycleCurrent = (generation: number): boolean =>
    generation === currentGeneration;

export const scheduleGameLifecycleTimeout = (callback: () => void, delayMs: number): TimerHandle => {
    const generation = captureGameLifecycle();
    const timer = setTimeout(() => {
        timers.delete(timer);
        if (!isGameLifecycleCurrent(generation)) return;
        callback();
    }, delayMs);
    timers.add(timer);
    return timer;
};
