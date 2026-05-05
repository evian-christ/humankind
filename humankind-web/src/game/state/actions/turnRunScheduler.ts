export interface TurnRunCancelToken {
    readonly runId: number;
    cancelled: boolean;
}

export interface TurnRunContext {
    readonly runId: number;
    readonly token: TurnRunCancelToken;
}

export interface TurnRunHandle extends TurnRunContext {
    schedule: (delayMs: number, callback: (context: TurnRunContext) => void) => void;
    cancel: () => void;
    isActive: () => boolean;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export function createTurnRunScheduler() {
    let nextRunId = 0;
    let current: TurnRunHandle | null = null;

    const isCurrent = (runId: number, token: TurnRunCancelToken) => {
        return current?.runId === runId && current.token === token && !token.cancelled;
    };

    const cancelCurrent = () => {
        current?.cancel();
        current = null;
    };

    const startRun = (): TurnRunHandle => {
        cancelCurrent();

        const runId = ++nextRunId;
        const token: TurnRunCancelToken = { runId, cancelled: false };
        const timers = new Set<TimerHandle>();

        const handle: TurnRunHandle = {
            runId,
            token,
            schedule: (delayMs, callback) => {
                const timer = setTimeout(() => {
                    timers.delete(timer);
                    if (!isCurrent(runId, token)) return;
                    callback({ runId, token });
                }, delayMs);
                timers.add(timer);
            },
            cancel: () => {
                token.cancelled = true;
                for (const timer of timers) clearTimeout(timer);
                timers.clear();
            },
            isActive: () => isCurrent(runId, token),
        };

        current = handle;
        return handle;
    };

    return {
        startRun,
        cancelCurrent,
        isCurrent,
    };
}
