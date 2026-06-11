import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginGameLifecycle,
    captureGameLifecycle,
    isGameLifecycleCurrent,
    scheduleGameLifecycleTimeout,
} from './gameLifecycleRun';

describe('gameLifecycleRun', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        beginGameLifecycle();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs scheduled callbacks while the same game lifecycle is active', () => {
        const callback = vi.fn();

        scheduleGameLifecycleTimeout(callback, 100);
        vi.advanceTimersByTime(100);

        expect(callback).toHaveBeenCalledOnce();
    });

    it('cancels callbacks left behind by the previous game lifecycle', () => {
        const callback = vi.fn();

        scheduleGameLifecycleTimeout(callback, 100);
        beginGameLifecycle();
        vi.advanceTimersByTime(100);

        expect(callback).not.toHaveBeenCalled();
    });

    it('invalidates captured lifecycle generations when a new game begins', () => {
        const generation = captureGameLifecycle();

        beginGameLifecycle();

        expect(isGameLifecycleCurrent(generation)).toBe(false);
    });
});
