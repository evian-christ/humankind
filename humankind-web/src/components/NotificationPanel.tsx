import { useEffect, useRef } from 'react';
import { useNotificationStore, type GameNotification } from '../game/state/notificationStore';
import { useGameStore, calculateFoodCost } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';

const NotifCard = ({ notif }: { notif: GameNotification }) => {
    return (
        <div style={{
            padding: '12px 14px',
            background: 'rgba(10, 10, 10, 0.82)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            fontFamily: 'Mulmaru, monospace',
            color: '#d1d5db',
            lineHeight: '1.4',
            letterSpacing: '0.01em',
            wordBreak: 'keep-all',
        }}>
            {notif.message}
        </div>
    );
};

const NotificationPanel = () => {
    const { notifications, upsert } = useNotificationStore();
    const { turn } = useGameStore();
    const language = useSettingsStore(s => s.language);
    const prevTurnRef = useRef(-1);

    // 매 턴마다 식량 납부 알림 upsert
    useEffect(() => {
        if (turn === 0) return;
        if (turn === prevTurnRef.current) return;
        prevTurnRef.current = turn;

        const turnsUntilPayment = 10 - (turn % 10);
        const nextPaymentTurn = turn + turnsUntilPayment;
        const nextCost = calculateFoodCost(nextPaymentTurn);

        upsert({
            type: 'food_demand',
            level: turnsUntilPayment <= 2 ? 'danger' : turnsUntilPayment <= 4 ? 'warning' : 'info',
            message: language === 'ko'
                ? `${turnsUntilPayment}턴 후 식량 ${nextCost.toLocaleString()} 요구`
                : `${nextCost.toLocaleString()} food demanded in ${turnsUntilPayment} turns`,
        });
    }, [turn, language, upsert]);

    if (notifications.length === 0) return null;

    return (
        <div
            className="notification-panel"
            style={{
                position: 'absolute',
                // 보드 우측 엣지(~74%)부터 화면 우측까지
                left: '74%',
                right: '1%',
                paddingLeft: '8px',
                // 보드 상단(~19%) ~ 보드 하단(~81%): boardH=664px, 1080px 기준
                top: '19%',
                bottom: '19%',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                pointerEvents: 'none',
                overflowY: 'auto',
            }}
        >
            {notifications.map(n => (
                <div key={n.id} className="notif-card-wrapper">
                    <NotifCard notif={n} />
                </div>
            ))}
        </div>
    );
};

export default NotificationPanel;
