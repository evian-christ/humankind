import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
    runBalanceSimulation,
    type BalancePickStrategy,
    type BalanceSimulationSummary,
    type BalanceUpgradeStrategy,
} from '../game/simulation/balanceSimulator';

const panelStyle: CSSProperties = {
    position: 'fixed',
    inset: '7vh 7vw',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(9, 11, 18, 0.96)',
    border: '1px solid rgba(148, 163, 184, 0.45)',
    color: '#e5e7eb',
    fontFamily: 'var(--game-font-family), monospace',
    boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
};

const fieldStyle: CSSProperties = {
    background: '#111827',
    color: '#f3f4f6',
    border: '1px solid #374151',
    padding: '8px 10px',
    fontSize: '14px',
};

const labelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#9ca3af',
    fontSize: '12px',
};

const statBoxStyle: CSSProperties = {
    border: '1px solid #263244',
    padding: '12px',
    background: 'rgba(17, 24, 39, 0.72)',
};

const createRunSeed = (runNumber: number): number => {
    const now = Date.now() >>> 0;
    return (now + runNumber * 2654435761) >>> 0 || 1;
};

const pct = (value: number | undefined): string => `${Math.round((value ?? 0) * 100)}%`;

const BalanceSimulatorOverlay = () => {
    const [open, setOpen] = useState(false);
    const [runs, setRuns] = useState(100);
    const [maxTurns, setMaxTurns] = useState(60);
    const [pickStrategy, setPickStrategy] = useState<BalancePickStrategy>('grassland_axis');
    const [upgradeStrategy, setUpgradeStrategy] = useState<BalanceUpgradeStrategy>('axis_plan');
    const [summary, setSummary] = useState<BalanceSimulationSummary | null>(null);
    const [running, setRunning] = useState(false);
    const [runNumber, setRunNumber] = useState(0);
    const [lastSeed, setLastSeed] = useState<number | null>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'F4') {
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
                e.preventDefault();
                setOpen((value) => !value);
                return;
            }
            if (e.code === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const topPicked = useMemo(() => summary?.topPickedSymbols.slice(0, 12) ?? [], [summary]);

    const run = () => {
        const nextRunNumber = runNumber + 1;
        const seed = createRunSeed(nextRunNumber);
        setRunNumber(nextRunNumber);
        setLastSeed(seed);
        setRunning(true);

        window.setTimeout(() => {
            const result = runBalanceSimulation({
                runs: Math.max(1, Math.min(5000, Math.round(runs))),
                maxTurns: Math.max(1, Math.min(500, Math.round(maxTurns))),
                seed,
                pickStrategy,
                upgradeStrategy,
            });
            setSummary(result);
            setRunning(false);
        }, 0);
    };

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)' }}>
            <div style={panelStyle}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 18px',
                    borderBottom: '1px solid #263244',
                }}>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 700 }}>밸런스 시뮬레이터</div>
                        <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                            F4로 열고 닫기 · RUN을 누를 때마다 새 seed로 다시 실행
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{
                            background: '#111827',
                            color: '#d1d5db',
                            border: '1px solid #4b5563',
                            padding: '8px 14px',
                            fontSize: '14px',
                        }}
                    >
                        닫기
                    </button>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 360px) 1fr',
                    minHeight: 0,
                    flex: 1,
                }}>
                    <div style={{
                        padding: '18px',
                        borderRight: '1px solid #263244',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                    }}>
                        <label style={labelStyle}>
                            실행 횟수
                            <input
                                type="number"
                                min={1}
                                max={5000}
                                value={runs}
                                onChange={(e) => setRuns(Number(e.target.value))}
                                style={fieldStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            최대 턴
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={maxTurns}
                                onChange={(e) => setMaxTurns(Number(e.target.value))}
                                style={fieldStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            목표 축
                            <select
                                value={pickStrategy}
                                onChange={(e) => setPickStrategy(e.target.value as BalancePickStrategy)}
                                style={fieldStyle}
                            >
                                <option value="grassland_axis">초원축</option>
                                <option value="plains_axis">평원축</option>
                                <option value="sea_axis">바다축</option>
                                <option value="forest_axis">숲축</option>
                                <option value="rainforest_axis">열대우림축</option>
                                <option value="desert_axis">사막축</option>
                                <option value="mountain_axis">산 특수축</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            업그레이드 선택 방식
                            <select
                                value={upgradeStrategy}
                                onChange={(e) => setUpgradeStrategy(e.target.value as BalanceUpgradeStrategy)}
                                style={fieldStyle}
                            >
                                <option value="axis_plan">목표 축 우선</option>
                                <option value="random">랜덤 업그레이드</option>
                                <option value="first_legal">가능한 첫 업그레이드</option>
                                <option value="none">업그레이드 없음</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={run}
                            disabled={running}
                            style={{
                                marginTop: '6px',
                                background: running ? '#374151' : '#2563eb',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 16px',
                                fontSize: '15px',
                                fontWeight: 700,
                            }}
                        >
                            {running ? '실행 중...' : 'RUN'}
                        </button>
                        <div style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.6 }}>
                            마지막 실행: {runNumber > 0 ? `#${runNumber}` : '-'}
                            <br />
                            seed: {lastSeed ?? '-'}
                        </div>
                    </div>

                    <div style={{ padding: '18px', overflow: 'auto' }}>
                        {!summary && (
                            <div style={{ color: '#9ca3af', fontSize: '15px' }}>
                                RUN을 누르면 현재 게임 로직 기준으로 자동 플레이 결과를 집계합니다.
                            </div>
                        )}

                        {summary && (
                            <>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))',
                                    gap: '12px',
                                    marginBottom: '16px',
                                }}>
                                    <div style={statBoxStyle}>
                                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>평균 도달 턴</div>
                                        <div style={{ fontSize: '24px', marginTop: '6px' }}>
                                            {summary.averageSurvivedTurns.toFixed(1)}
                                        </div>
                                    </div>
                                    <div style={statBoxStyle}>
                                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>평균 최종 레벨</div>
                                        <div style={{ fontSize: '24px', marginTop: '6px' }}>
                                            {summary.averageFinalLevel.toFixed(1)}
                                        </div>
                                    </div>
                                    <div style={statBoxStyle}>
                                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>게임오버</div>
                                        <div style={{ fontSize: '24px', marginTop: '6px', color: '#fca5a5' }}>
                                            {summary.outcomeCounts.game_over}
                                        </div>
                                    </div>
                                    <div style={statBoxStyle}>
                                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>최대 턴 도달</div>
                                        <div style={{ fontSize: '24px', marginTop: '6px', color: '#86efac' }}>
                                            {summary.outcomeCounts.max_turns}
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '14px',
                                }}>
                                    <section style={statBoxStyle}>
                                        <div style={{ fontSize: '15px', marginBottom: '10px' }}>턴 도달률</div>
                                        {[10, 20, 30, 40, 50, summary.config.maxTurns].map((turn) => (
                                            <div
                                                key={turn}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '64px 1fr 52px',
                                                    gap: '10px',
                                                    alignItems: 'center',
                                                    marginBottom: '8px',
                                                    color: '#d1d5db',
                                                }}
                                            >
                                                <span>{turn}턴</span>
                                                <div style={{ height: 8, background: '#1f2937' }}>
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: pct(summary.survivalRateByTurn[turn]),
                                                            background: '#38bdf8',
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ textAlign: 'right' }}>{pct(summary.survivalRateByTurn[turn])}</span>
                                            </div>
                                        ))}
                                    </section>

                                    <section style={statBoxStyle}>
                                        <div style={{ fontSize: '15px', marginBottom: '10px' }}>많이 선택된 심볼</div>
                                        {topPicked.length === 0 ? (
                                            <div style={{ color: '#9ca3af' }}>선택 기록 없음</div>
                                        ) : (
                                            topPicked.map((symbol) => (
                                                <div
                                                    key={symbol.id}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        borderBottom: '1px solid #263244',
                                                        padding: '5px 0',
                                                    }}
                                                >
                                                    <span>{symbol.key}</span>
                                                    <span style={{ color: '#bfdbfe' }}>{symbol.count}</span>
                                                </div>
                                            ))
                                        )}
                                    </section>
                                </div>

                                <section style={{ ...statBoxStyle, marginTop: '14px' }}>
                                    <div style={{ fontSize: '15px', marginBottom: '10px' }}>실행 조건</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.7 }}>
                                {summary.config.runs}회 · 최대 {summary.config.maxTurns}턴 · 목표 {summary.config.pickStrategy} · 업그레이드 {summary.config.upgradeStrategy}
                            </div>
                        </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceSimulatorOverlay;
