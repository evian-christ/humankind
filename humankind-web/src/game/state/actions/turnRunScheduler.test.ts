import { describe, expect, it, vi } from 'vitest';
import { createTurnRunScheduler } from './turnRunScheduler';
import { beginGameLifecycle } from '../gameLifecycleRun';

describe('turnRunScheduler', () => {
    it('guards scheduled callbacks with a run id and cancel token', () => {
        vi.useFakeTimers();
        try {
            const scheduler = createTurnRunScheduler();
            const first = scheduler.startRun();
            const firstCallback = vi.fn();
            const secondCallback = vi.fn();

            first.schedule(100, firstCallback);
            const second = scheduler.startRun();
            second.schedule(100, secondCallback);

            vi.advanceTimersByTime(100);

            expect(first.token.cancelled).toBe(true);
            expect(firstCallback).not.toHaveBeenCalled();
            expect(secondCallback).toHaveBeenCalledWith({ runId: second.runId, token: second.token });
        } finally {
            vi.useRealTimers();
        }
    });

    it('ignores pending callbacks after a new game lifecycle begins', () => {
        vi.useFakeTimers();
        try {
            const scheduler = createTurnRunScheduler();
            const callback = vi.fn();
            const run = scheduler.startRun();

            run.schedule(100, callback);
            beginGameLifecycle();
            vi.advanceTimersByTime(100);

            expect(callback).not.toHaveBeenCalled();
            expect(run.isActive()).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });
});
