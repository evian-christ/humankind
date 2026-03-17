import { create } from 'zustand';

export type NotificationLevel = 'info' | 'warning' | 'danger';

export interface GameNotification {
    id: string;
    message: string;
    level: NotificationLevel;
    /** 알림 유형 — type이 같으면 upsert로 덮어씀 */
    type: 'food_demand' | 'barbarian_unit' | 'barbarian_camp' | 'natural_disaster' | 'generic';
    createdAt: number; // Date.now()
    /**
     * true이면 "1회성 알림": dismissAfterTurns 내 자동 삭제
     * gameStore의 spinBoard 시작 직전에 oneShot 알림을 지운다.
     */
    oneShot?: boolean;
}

interface NotificationState {
    notifications: GameNotification[];
    push: (n: Omit<GameNotification, 'id' | 'createdAt'>) => void;
    dismiss: (id: string) => void;
    /** 같은 type 의 알림을 교체 (식량 납부·야만인 카운트다운처럼 매 턴 갱신될 때 사용) */
    upsert: (n: Omit<GameNotification, 'id' | 'createdAt'>) => void;
    /** oneShot 알림 전부 삭제 — spinBoard 시작 직전에 호출 */
    clearOneShots: () => void;
    clearAll: () => void;
}

let _counter = 0;
const genId = () => `notif_${Date.now()}_${_counter++}`;

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    push: (n) => set((s) => {
        const notif: GameNotification = { ...n, id: genId(), createdAt: Date.now() };
        return { notifications: [notif, ...s.notifications] };
    }),

    dismiss: (id) => set((s) => ({
        notifications: s.notifications.filter(n => n.id !== id),
    })),

    upsert: (n) => set((s) => {
        const existing = s.notifications.find(x => x.type === n.type);
        if (existing) {
            return {
                notifications: s.notifications.map(x =>
                    x.type === n.type
                        ? { ...x, message: n.message, level: n.level, oneShot: n.oneShot }
                        : x
                ),
            };
        }
        const notif: GameNotification = { ...n, id: genId(), createdAt: Date.now() };
        return { notifications: [notif, ...s.notifications] };
    }),

    clearOneShots: () => set((s) => ({
        notifications: s.notifications.filter(n => !n.oneShot),
    })),

    clearAll: () => set({ notifications: [] }),
}));
