import { create } from 'zustand';

export type NotificationLevel = 'info' | 'warning' | 'danger';

export interface GameNotification {
    id: string;
    message: string;
    level: NotificationLevel;
    /** 식량 납부 알림은 매 턴 갱신되므로 type으로 구분 */
    type: 'food_demand' | 'barbarian_unit' | 'barbarian_camp' | 'natural_disaster' | 'generic';
    createdAt: number; // Date.now()
}

interface NotificationState {
    notifications: GameNotification[];
    push: (n: Omit<GameNotification, 'id' | 'createdAt'>) => void;
    dismiss: (id: string) => void;
    /** 같은 type 의 알림을 교체 (식량 납부처럼 매 턴 갱신될 때 사용) */
    upsert: (n: Omit<GameNotification, 'id' | 'createdAt'>) => void;
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
            // 메시지만 갱신, 위치(순서) 유지
            return {
                notifications: s.notifications.map(x =>
                    x.type === n.type ? { ...x, message: n.message, level: n.level } : x
                ),
            };
        }
        const notif: GameNotification = { ...n, id: genId(), createdAt: Date.now() };
        return { notifications: [notif, ...s.notifications] };
    }),

    clearAll: () => set({ notifications: [] }),
}));
