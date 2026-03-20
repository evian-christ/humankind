import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useSettingsStore } from './game/state/settingsStore';
import { usePreGameStore } from './game/state/preGameStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import RelicSelection from './components/RelicSelection';
import UpgradeSelection from './components/UpgradeSelection';
import DestroySelection from './components/DestroySelection';
import StageSelectScreen from './components/StageSelectScreen';
import LeaderSelectScreen from './components/LeaderSelectScreen';

import PauseMenu from './components/PauseMenu';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import OwnedSymbolsModal from './components/OwnedSymbolsModal';
import EffectLogOverlay from './components/EffectLogOverlay';

function App() {
  const preGameScreen = usePreGameStore((s) => s.screen);
  const { phase, turn, spinBoard, initializeGame, toggleRelicShop } = useGameStore();
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownedSymbolsOpen, setOwnedSymbolsOpen] = useState(false);
  const isInGame = preGameScreen === null;
  const [gameCanvasReady, setGameCanvasReady] = useState(false);
  const didAutoPreGameEnterRef = useRef(false);
  const didAutoDraftPickRef = useRef(false);

  const handleCanvasReady = useCallback(() => {
    setGameCanvasReady(true);
  }, []);

  // 본게임 벗어나면 캔버스 준비 플래그 리셋 (다음 진입 시 검은 화면 → 로드 후 페이드)
  useEffect(() => {
    if (preGameScreen !== null) setGameCanvasReady(false);
  }, [preGameScreen]);

  // 앱 최초 로드 시 저장된 해상도를 DOM에 적용
  useEffect(() => {
    setResolution(resolutionWidth, resolutionHeight);
  }, []);

  // 개발 중 프리게임(스테이지/리더/드래프트)을 자동 스킵해서 바로 게임 화면으로 진입
  // - 목표: 람세스2세 선택 후 드래프트를 자동 완료하고 startGameWithDraft까지 즉시 진행
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (didAutoPreGameEnterRef.current) return;
    if (preGameScreen !== 'stage') return;

    let enabled = true;
    try {
      enabled = (localStorage.getItem('dev.autoStart') ?? '1') !== '0';
    } catch {
      // localStorage 접근 불가 환경이면 기본값(켜짐) 유지
    }
    if (!enabled) return;

    didAutoPreGameEnterRef.current = true;
    const pg = usePreGameStore.getState();
    pg.selectStage(1);
    // Zustand set은 동기적이지만, 화면 전환 타이밍을 안전하게 한 턴 늦춤
    setTimeout(() => pg.selectLeader('ramesses'), 0);
  }, [preGameScreen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (didAutoDraftPickRef.current) return;
    if (preGameScreen !== 'draft') return;
    if (phase !== 'draft_selection') return;

    didAutoDraftPickRef.current = true;

    const pg = usePreGameStore.getState();
    const gs = useGameStore.getState();

    // draftTotal까지 1개 심볼씩 자동 선택(현재 symbolChoices의 첫 항목)
    // 6회 드래프트를 가정하지만, 방어적으로 최대 20회만 반복
    for (let i = 0; i < 20; i++) {
      const { draftRoundsCompleted, draftTotal } = usePreGameStore.getState();
      if (draftRoundsCompleted >= draftTotal) break;

      const choice = useGameStore.getState().symbolChoices?.[0];
      if (!choice) break;

      usePreGameStore.getState().pickDraftSymbol(choice.id);

      // startGameWithDraft로 인해 preGameScreen이 null이 될 수 있으므로 early exit
      if (usePreGameStore.getState().screen === null) break;
    }
  }, [preGameScreen, phase]);

  // 스페이스바로 스핀 (idle일 때만, 입력 필드 포커스 시 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (phase !== 'idle') return;
      e.preventDefault();
      spinBoard();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, spinBoard]);

  // 스테이지 선택 화면
  if (preGameScreen === 'stage') {
    return <StageSelectScreen />;
  }

  // 리더 선택 화면
  if (preGameScreen === 'leader') {
    return <LeaderSelectScreen />;
  }

  // 심볼 드래프트 (6회 선택) — 진입 시 페이드 인
  if (preGameScreen === 'draft') {
    return (
      <div className="pregame-overlay pregame-overlay--draft-fade-in">
        <SymbolSelection />
      </div>
    );
  }

  // ===== 본게임 =====
  // 검은 화면으로 가린 뒤, 캔버스(에셋) 로드 완료 시 검은 레이어만 페이드 아웃
  return (
    <div className="game-screen">
      {/* 로드 완료 전 검은 오버레이 — onReady 후 페이드 아웃 */}
      <div
        className={`game-screen-black${gameCanvasReady ? ' game-screen-black--fade-out' : ''}`}
        aria-hidden="true"
      />
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area">
        <GameCanvas onReady={handleCanvasReady} />
      </div>

      {/* ===== 보드 하단: 왼쪽(유물) · 중앙 고정(스핀) · 오른쪽(⋯, 메뉴) ===== */}
      <div className="bottom-action-bar">
        <div className="bottom-action-bar-left">
          <button
            className="relic-shop-btn"
            onClick={toggleRelicShop}
            title="유물 상점 (Relic Shop)"
          >
            🏺
          </button>
        </div>
        <div className="spin-area">
          <button
            className="spin-btn"
            onClick={spinBoard}
            disabled={phase !== 'idle'}
            title="SPIN"
          >
            SPIN
          </button>
        </div>
        <div className="bottom-action-bar-right">
          <button
            className="bottom-right-btn"
            onClick={() => setOwnedSymbolsOpen(true)}
            title="보유 심볼 목록"
          >
            ▦
          </button>
          <button
            className="menu-btn"
            onClick={() => setMenuOpen(true)}
            title="메뉴"
          >
            ☰
          </button>
        </div>
      </div>

      {/* ===== PAUSE MENU OVERLAY ===== */}
      <PauseMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ===== UPGRADE SELECTION OVERLAY ===== */}
      <UpgradeSelection />

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== RELIC SELECTION OVERLAY ===== */}
      <RelicSelection />

      {/* ===== DESTROY SYMBOLS OVERLAY ===== */}
      <DestroySelection />

      {/* ===== GAME OVER OVERLAY ===== */}
      {isInGame && phase === 'game_over' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-defeat">{t('game.gameOver', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn} - {t('game.notEnoughFood', language)}</div>
            <button className="endgame-btn" onClick={initializeGame}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== VICTORY OVERLAY ===== */}
      {isInGame && phase === 'victory' && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
            <button className="endgame-btn" onClick={initializeGame}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {/* ===== DEV OVERLAY ===== */}
      <DevOverlay />

      {/* ===== DATA BROWSER (F3) ===== */}
      <DataBrowser />

      {/* ===== SYMBOL POOL PROBABILITY (F4) ===== */}
      <SymbolPoolModal />

      {/* ===== OWNED SYMBOLS LIST (button ⋯) ===== */}
      <OwnedSymbolsModal open={ownedSymbolsOpen} onClose={() => setOwnedSymbolsOpen(false)} />

      {/* ===== EFFECT / EVENT LOG (F11) ===== */}
      <EffectLogOverlay />
    </div>
  );
}

export default App;
