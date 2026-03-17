import { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '../game/state/notificationStore';
import { useGameStore, calculateFoodCost } from '../game/state/gameStore';
import { useSettingsStore } from '../game/state/settingsStore';

/** level별 색상 */
const LEVEL_COLOR: Record<string, string> = {
    info:    '#a3b8cc',
    warning: '#f5c842',
    danger:  '#f87171',
};

const CYCLE_INTERVAL_MS = 3000;

const NotificationPanel = () => {
    const { notifications, upsert } = useNotificationStore();
    const { turn } = useGameStore();
    const language = useSettingsStore(s => s.language);
    const prevTurnRef = useRef(-1);

    const [activeIdx, setActiveIdx]   = useState(0);
    const [hovered,   setHovered]     = useState(false);
    const [visible,   setVisible]     = useState(true); // fade 제어
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fadeRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ── 식량 납부 알림 upsert ────────────────────────────── */
    useEffect(() => {
        if (turn === prevTurnRef.current) return;
        prevTurnRef.current = turn;

        // turn % 10 === 0 (게임 시작 포함)이면 다음 납부까지 10턴
        const turnsUntilPayment = turn % 10 === 0 ? 10 : 10 - (turn % 10);
        const nextPaymentTurn   = turn + turnsUntilPayment;
        const nextCost          = calculateFoodCost(nextPaymentTurn);

        upsert({
            type: 'food_demand',
            level: turnsUntilPayment <= 2 ? 'danger' : turnsUntilPayment <= 4 ? 'warning' : 'info',
            message: language === 'ko'
                ? `${turnsUntilPayment}턴 후 식량 ${nextCost.toLocaleString()} 요구`
                : `${nextCost.toLocaleString()} food demanded in ${turnsUntilPayment} turns`,
        });
    }, [turn, language, upsert]);

    /* ── 활성 인덱스 순환 (호버 중에는 멈춤) ────────────────── */
    useEffect(() => {
        if (hovered || notifications.length <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            // fade-out → 인덱스 변경 → fade-in
            setVisible(false);
            fadeRef.current = setTimeout(() => {
                setActiveIdx(prev => (prev + 1) % notifications.length);
                setVisible(true);
            }, 300);
        }, CYCLE_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (fadeRef.current)  clearTimeout(fadeRef.current);
        };
    }, [hovered, notifications.length]);

    /* ── 알림 수가 바뀌면 인덱스 안전 처리 ─────────────────── */
    useEffect(() => {
        if (notifications.length === 0) return;
        setActiveIdx(prev => Math.min(prev, notifications.length - 1));
    }, [notifications.length]);

    if (notifications.length === 0) return null;

    const active = notifications[Math.min(activeIdx, notifications.length - 1)];
    const activeColor = LEVEL_COLOR[active.level] ?? LEVEL_COLOR.info;

    return (
        <div
            className="notif-ticker-root"
            style={{
                position: 'absolute',
                /* 보드 상단 바로 위 — 보드 top이 ~19%이므로 조금 위 */
                top:  '14.5%',
                left: '13%',
                right: '13%',
                zIndex: 110,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
            }}
        >
            {/* ── 항상 보이는 한 줄 텍스트 ── */}
            {/* 이 div에만 호버 이벤트를 걸어 텍스트 위에 있을 때만 카드가 열림 */}
            <div
                onMouseEnter={() => { setHovered(true); setVisible(true); }}
                onMouseLeave={() => setHovered(false)}
                style={{
                    fontSize: '20px',
                    fontFamily: 'Mulmaru, monospace',
                    color: activeColor,
                    letterSpacing: '0.05em',
                    textShadow: `0 0 14px ${activeColor}99`,
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.28s ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    cursor: 'default',
                    userSelect: 'none',
                    padding: '0 4px',
                    pointerEvents: 'auto',
                }}
            >
                {active.message}
                {notifications.length > 1 && (
                    <span style={{ marginLeft: '10px', fontSize: '14px', opacity: 0.45, color: '#aaa' }}>
                        {activeIdx + 1}/{notifications.length}
                    </span>
                )}
            </div>

            {/* ── 호버시 펼쳐지는 카드 (마우스 이벤트 무시) ── */}
            <div
                style={{
                    display: hovered ? 'block' : 'none',
                    marginTop: '8px',
                    width: '100%',
                    maxWidth: '520px',
                    background: 'rgba(8, 8, 12, 0.92)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                {notifications.map((n, i) => {
                    const color = LEVEL_COLOR[n.level] ?? LEVEL_COLOR.info;
                    return (
                        <div
                            key={n.id}
                            style={{
                                padding: '10px 18px',
                                fontSize: '13px',
                                fontFamily: 'Mulmaru, monospace',
                                color: '#dde4ed',
                                lineHeight: '1.55',
                                letterSpacing: '0.01em',
                                wordBreak: 'keep-all',
                                borderBottom: i < notifications.length - 1
                                    ? '1px solid rgba(255,255,255,0.06)'
                                    : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            {/* level 인디케이터 도트 */}
                            <span style={{
                                width: '6px', height: '6px',
                                borderRadius: '50%',
                                background: color,
                                boxShadow: `0 0 6px ${color}`,
                                flexShrink: 0,
                            }} />
                            <span>{n.message}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NotificationPanel;
