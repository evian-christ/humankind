import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { useGameStore } from './game/state/gameStore';
import { useBoardTooltipBlockStore } from './game/state/boardTooltipBlockStore';
import { useSettingsStore, type Language } from './game/state/settingsStore';
import { usePreGameStore } from './game/state/preGameStore';
import { useRelicStore } from './game/state/relicStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import RelicSelection from './components/RelicSelection';
import DestroySelection from './components/DestroySelection';
import LootRewardSelection from './components/LootRewardSelection';
import OblivionFurnaceBoardOverlay from './components/OblivionFurnaceBoardOverlay';
import DemoStartScreen from './components/DemoStartScreen';
import LeaderSelectScreen from './components/LeaderSelectScreen';
import LeaderProgressScreen from './components/LeaderProgressScreen';

import PauseMenu from './components/PauseMenu';
import { getActionForKeyCode } from './game/input/keyBindings';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import OwnedSymbolsModal from './components/OwnedSymbolsModal';
import EffectLogOverlay from './components/EffectLogOverlay';
import KnowledgeUpgradesOverlay from './components/KnowledgeUpgradesOverlay';
import BalanceSimulatorOverlay from './components/BalanceSimulatorOverlay';
import { LEADERS, MAX_LEADER_LEVEL, getLeaderXpRequiredForLevel, leaderHasPortraitSprite, type LeaderId, type LeaderProgressAwardResult } from './game/data/leaders';
import { calculateFoodCost, formatTimelineYear, getHudTurnStartPassiveTotals, getKnowledgeRequiredForLevel, getTimelineYearForTurn } from './game/state/gameCalculations';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, HISTORY_ICON_URL, INVENTORY_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL, RELIC_PANEL_TITLE_ICON_URL } from './uiAssetUrls';
import { audioManager } from './audio/audioManager';
import type { AudioPlaybackHandle } from './audio/audioManager';
import { DEFAULT_AUDIO_CUES } from './audio/audioCues';
import { boardCellLocalRect, computeBoardPixelLayout } from './game/layout/boardPixelLayout';
import { S } from './game/data/symbolDefinitions';
import { viewportPointToRootPoint } from './ui/cursorPosition';

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    const onHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isPointer = target.closest('button, [role="button"], .cursor-pointer, a') !== null;
      
      if (cursorRef.current) {
        cursorRef.current.style.display = 'block';
        if (isPointer) cursorRef.current.classList.add('is-pointer');
        else cursorRef.current.classList.remove('is-pointer');

        const { x: vx, y: vy } = viewportPointToRootPoint(root, e.clientX, e.clientY);
        cursorRef.current.style.transform = `translate(${vx}px, ${vy}px)`;
      }
    };

    const onLeave = () => {
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) onLeave();
    };

    window.addEventListener('mousemove', onHover);
    window.addEventListener('mouseout', onMouseOut);
    
    return () => {
      window.removeEventListener('mousemove', onHover);
      window.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  return <div ref={cursorRef} className="custom-mouse-cursor" />;
};


const ERA_NAME_KEYS: Record<number, string> = {
  0: 'era.primitive',
  1: 'era.ancient',
  2: 'era.medieval',
  3: 'era.modern',
  4: 'era.future',
};
const ANCIENT_ERA_BGM_CUE_IDS = [
  'ancient_01',
  'ancient_02',
  'ancient_03',
  'ancient_04',
  'ancient_05',
  'ancient_06',
  'ancient_07',
] as const;
const MEDIEVAL_ERA_BGM_CUE_IDS = [
  'medieval_01',
  'medieval_02',
  'medieval_03',
  'medieval_04',
  'medieval_05',
  'medieval_06',
] as const;
const MODERN_ERA_BGM_CUE_IDS = [
  'modern_01',
  'modern_02',
  'modern_03',
  'modern_04',
  'modern_05',
] as const;
const GAMEPLAY_BGM_PLAYLISTS = [
  {
    id: 'ancient_era',
    minLevel: 0,
    maxLevel: 9,
    cueIds: ANCIENT_ERA_BGM_CUE_IDS,
  },
  {
    id: 'medieval_era',
    minLevel: 10,
    maxLevel: 19,
    cueIds: MEDIEVAL_ERA_BGM_CUE_IDS,
  },
  {
    id: 'modern_era',
    minLevel: 20,
    maxLevel: 30,
    cueIds: MODERN_ERA_BGM_CUE_IDS,
  },
] as const;
const GAMEPLAY_BGM_FADE_OUT_MS = 2500;
const GAMEPLAY_BGM_FADE_IN_MS = 1800;
const GAMEPLAY_BGM_TRANSITION_DELAY_MS = GAMEPLAY_BGM_FADE_OUT_MS + 150;
const GAME_OVER_AUDIO_FADE_OUT_MS = 1000;
const GAME_OVER_MUSIC_FADE_IN_MS = 4200;
const XP_FILL_FADE_OUT_MS = 120;
const XP_LEVEL_UP_HOLD_MS = 220;
const XP_LEVEL_UP_RESET_MS = 90;

const uiText = (language: Language, ko: string, en: string, zh: string, ru?: string) => (
  language === 'ko' ? ko : language === 'zh' ? zh : language === 'ru' ? (ru ?? en) : en
);

function getGameplayBgmPlaylist(level: number) {
  return GAMEPLAY_BGM_PLAYLISTS.find((playlist) => level >= playlist.minLevel && level <= playlist.maxLevel) ?? null;
}

const LEADER_ASSET_BASE_URL = import.meta.env.BASE_URL;

function endgameLeaderPortraitSrc(id: LeaderId): string | null {
  if (id === 'ramesses') return `${LEADER_ASSET_BASE_URL}assets/leaders/001_mini.png`;
  if (id === 'shihuang') return `${LEADER_ASSET_BASE_URL}assets/leaders/002_mini.png`;
  return null;
}

function EndgameLeaderProgressReveal({
  award,
  language,
}: {
  award: LeaderProgressAwardResult;
  language: Language;
}) {
  const [animatedXp, setAnimatedXp] = useState(award.previous.xp);
  const [animatedLevel, setAnimatedLevel] = useState(award.previous.level);
  const [animatedBarRatio, setAnimatedBarRatio] = useState(() => {
    const required = getLeaderXpRequiredForLevel(award.previous.level);
    return required > 0 ? Math.min(1, award.previous.xp / required) : 0;
  });
  const [isLevelUpBursting, setIsLevelUpBursting] = useState(false);
  const leader = LEADERS[award.leaderId];
  const leaderName = leader ? t(leader.nameKey, language) : '';
  const portraitSrc = endgameLeaderPortraitSrc(award.leaderId);
  const showPortrait = leaderHasPortraitSprite(award.leaderId) && portraitSrc;
  const animatedXpRequired = getLeaderXpRequiredForLevel(animatedLevel);

  const xpSegments = useMemo(() => {
    const segments: { level: number; startXp: number; endXp: number; required: number }[] = [];
    let level = award.previous.level;
    let startXp = award.previous.xp;

    while (level < award.next.level && level < MAX_LEADER_LEVEL) {
      const required = getLeaderXpRequiredForLevel(level);
      segments.push({
        level,
        startXp,
        endXp: required,
        required,
      });
      level += 1;
      startXp = 0;
    }

    const finalRequired = getLeaderXpRequiredForLevel(award.next.level);
    segments.push({
      level: award.next.level,
      startXp: award.previous.level === award.next.level ? award.previous.xp : 0,
      endXp: award.next.xp,
      required: finalRequired,
    });

    return segments;
  }, [award.next.level, award.next.xp, award.previous.level, award.previous.xp]);

  useEffect(() => {
    let frame = 0;
    let timeout = 0;
    let cancelled = false;
    let xpFillHandle: AudioPlaybackHandle | null = null;

    const stopXpFill = () => {
      xpFillHandle?.stop({ fadeOutMs: XP_FILL_FADE_OUT_MS });
      xpFillHandle = null;
    };

    const startXpFill = async () => {
      const handle = await audioManager.play('xp_fill', {
        loop: true,
        playbackRate: 1,
      });

      if (cancelled) {
        handle?.stop({ fadeOutMs: XP_FILL_FADE_OUT_MS });
        return;
      }

      xpFillHandle = handle;
    };

    setAnimatedLevel(award.previous.level);
    setAnimatedXp(award.previous.xp);
    setAnimatedBarRatio(Math.min(1, award.previous.xp / getLeaderXpRequiredForLevel(award.previous.level)));
    setIsLevelUpBursting(false);

    const distance = xpSegments.reduce((total, segment) => total + Math.max(0, segment.endXp - segment.startXp), 0);
    if (distance <= 0) {
      setAnimatedLevel(award.next.level);
      setAnimatedXp(award.next.xp);
      setAnimatedBarRatio(Math.min(1, award.next.xp / getLeaderXpRequiredForLevel(award.next.level)));
      return () => {
        cancelled = true;
      };
    }

    const wait = (ms: number) => new Promise<void>((resolve) => {
      timeout = window.setTimeout(resolve, ms);
    });

    const animateSegment = (segment: { level: number; startXp: number; endXp: number; required: number }) => {
      const segmentDistance = Math.max(0, segment.endXp - segment.startXp);
      const durationMs = Math.max(520, Math.min(1800, 360 + segmentDistance * 9));
      const startMs = performance.now();

      setAnimatedLevel(segment.level);
      setAnimatedXp(segment.startXp);
      setAnimatedBarRatio(Math.min(1, segment.startXp / segment.required));

      return new Promise<void>((resolve) => {
        const tick = (now: number) => {
          if (cancelled) {
            resolve();
            return;
          }

          const raw = Math.min(1, (now - startMs) / durationMs);
          const currentXp = segment.startXp + segmentDistance * raw;

          setAnimatedLevel(segment.level);
          setAnimatedXp(Math.round(currentXp));
          setAnimatedBarRatio(Math.min(1, currentXp / segment.required));

          if (raw < 1) {
            frame = requestAnimationFrame(tick);
          } else {
            setAnimatedXp(segment.endXp);
            setAnimatedBarRatio(Math.min(1, segment.endXp / segment.required));
            resolve();
          }
        };

        frame = requestAnimationFrame(tick);
      });
    };

    void startXpFill();

    const runAnimation = async () => {
      for (let index = 0; index < xpSegments.length; index += 1) {
        const segment = xpSegments[index]!;
        await animateSegment(segment);
        if (cancelled) return;

        const leveledUp = segment.endXp >= segment.required && segment.level < award.next.level;
        if (!leveledUp) continue;

        void audioManager.play('level_up', { volume: 0.25 });
        setAnimatedXp(segment.required);
        setAnimatedBarRatio(1);
        setIsLevelUpBursting(true);
        await wait(XP_LEVEL_UP_HOLD_MS);
        if (cancelled) return;

        const nextLevel = Math.min(MAX_LEADER_LEVEL, segment.level + 1);
        setAnimatedLevel(nextLevel);
        setAnimatedXp(0);
        setAnimatedBarRatio(0);
        setIsLevelUpBursting(false);
        await wait(XP_LEVEL_UP_RESET_MS);
        if (cancelled) return;
      }

      setAnimatedLevel(award.next.level);
      setAnimatedXp(award.next.xp);
      setAnimatedBarRatio(Math.min(1, award.next.xp / getLeaderXpRequiredForLevel(award.next.level)));
      setIsLevelUpBursting(false);
      stopXpFill();
    };

    void runAnimation();

    return () => {
      cancelled = true;
      stopXpFill();
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [award.next.level, award.next.xp, award.previous.level, award.previous.xp, xpSegments]);

  return (
    <section className="leader-detail-hero endgame-progress-reveal">
      <div className="leader-detail-status">
        {showPortrait ? (
          <div className="leader-detail-portrait" aria-hidden="true">
            <span className="leader-progress-portrait">
              <img src={portraitSrc} alt="" draggable={false} />
            </span>
            <span className="leader-progress-card-shade" aria-hidden="true" />
          </div>
        ) : null}
        <div className="leader-detail-topline">
          <div className="leader-detail-heading">
            <h1 className="main-menu-title leader-detail-title">
              <span className="main-menu-title-main leader-detail-title-main">
                {leaderName}
              </span>
            </h1>
          </div>
          <div className="leader-detail-level">
            {t('leaderProgress.currentLevel', language).replace('{level}', String(animatedLevel))}
          </div>
        </div>
        <div className="leader-detail-xp endgame-progress-xp">
          <div className="endgame-xp-gain">
            +{award.xpAwarded}
          </div>
          <div className="leader-detail-xp-head">
            <span>{t('leaderProgress.xp', language)}</span>
            <span>{animatedXp} / {animatedXpRequired}</span>
          </div>
          <div className={`leader-detail-xpbar ${isLevelUpBursting ? 'leader-detail-xpbar--level-up' : ''}`} aria-hidden="true">
            <span style={{ width: `${animatedBarRatio * 100}%` }} />
          </div>
        </div>
        {award.levelsGained > 0 ? (
          <div className="endgame-level-gained">
            {uiText(language, `레벨 +${award.levelsGained}`, `Level +${award.levelsGained}`, `等级 +${award.levelsGained}`, `Уровень +${award.levelsGained}`)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

const TUTORIAL_DIALOG_STEPS_KO = [
  [
    '튜토리얼에 오신 것을 환영합니다.',
    '여기서는 게임 진행에 필요한 기본 규칙을 배웁니다.',
  ],
  [
    '목표는 문명을 생존시키고 발전시켜 승리에 도달하는 것입니다.',
  ],
  [
    '백성이 곧 식량을 요구하네요!',
  ],
  [
    '현재 식량이 0이라 서둘러 식량을 생산해봅시다.',
  ],
  [
    '우선 옥수수 심볼 두 개를 드리겠습니다.',
  ],
  [
    '각 옥수수는 보드에 배치 시 식량 2를 제공합니다.',
    '옥수수에 마우스를 올려 정보를 확인해보세요.',
  ],
  [
    '스핀 버튼을 눌러 턴을 진행합시다.',
  ],
  [
    '매 스핀 후 심볼들이 배치되며 각 효과가 발동됩니다.',
  ],
  [
    '옥수수 두개가 각각 식량 2씩 생산하여 식량 4가 모였습니다!',
    '열심히 식량을 모아야 생존할 수 있겠네요.',
  ],
  [
    '매 스핀 이후엔 무작위 심볼 세 가지 중 하나를 선택할 수 있습니다.',
  ],
  [
    '기념비를 선택하세요.',
  ],
  [
    '현재 보유 심볼을 확인해봅시다.',
  ],
  [
    '기념비는 지식을 생산합니다.',
  ],
  [
    '이전 화면으로 돌아가세요.',
  ],
  [
    '스핀 버튼을 눌러 턴을 진행하세요.',
  ],
  [
    '지식이 모여 레벨 2가 되었습니다!',
  ],
  [
    '지식 업그레이드 창을 열어보세요.',
  ],
  [
    '레벨 업을 할 때마다 이 곳에서 지식 업그레이드를 하나 연구할 수 있습니다.',
  ],
  [
    '클릭하여 고대시대를 연구하세요.',
  ],
  [
    '이전 화면으로 돌아가세요.',
  ],
  [
    '유물 상점을 열어보세요.',
  ],
  [
    '유물은 다양하고 강력한 효과를 가지고 있어 승리에 큰 도움이 됩니다.',
  ],
  [
    '유물은 골드를 통해서 구매하니 골드를 많이 모아보세요.',
  ],
  [
    '기본적인 튜토리얼은 이것으로 끝입니다.',
    '당신의 문명을 승리로 이끄세요!',
  ],
];

const TUTORIAL_DIALOG_STEPS_EN: string[][] = [
  [
    'Welcome to the tutorial.',
    'Here you will learn the basic rules you need to play.',
  ],
  [
    'Your goal is to help your civilization survive, develop, and reach prosperity.',
  ],
  [
    'Your people demand Food every few turns.',
  ],
  [
    'Your Food is currently 0, so first we need to produce some Food.',
  ],
  [
    'Here are two Corn symbols for you.',
  ],
  [
    'Each Corn gives 2 Food when it is placed on the board.',
    'Hover over Corn to check its details.',
  ],
  [
    'Press the SPIN button to advance the turn.',
  ],
  [
    'Each spin places your symbols on the board and triggers their effects.',
  ],
  [
    'Two Corn symbols produced 2 Food each, so you gained 4 Food.',
    'Collect Food like this to survive.',
  ],
  [
    'After each spin, you can choose one of three random symbols.',
  ],
  [
    'Choose the Monument.',
  ],
  [
    'Let us check your owned symbols.',
  ],
  [
    'Monument produces Knowledge.',
  ],
  [
    'Return to the previous screen.',
  ],
  [
    'Press the SPIN button to advance the turn.',
  ],
  [
    'You have gathered enough Knowledge to reach level 2.',
  ],
  [
    'Open the Knowledge Upgrade window.',
  ],
  [
    'Each time you gain a level, you can research one Knowledge Upgrade here.',
  ],
  [
    'Click to research Ancient Era.',
  ],
  [
    'Return to the previous screen.',
  ],
  [
    'Open the Relic Shop.',
  ],
  [
    'Relics have many powerful effects that help you reach prosperity.',
  ],
  [
    'Relics are purchased with Gold, so try to collect plenty of Gold.',
  ],
  [
    'That is the end of the basic tutorial.',
    'Now lead your civilization to prosperity!',
  ],
];

const TUTORIAL_DIALOG_STEPS_RU: string[][] = [
  [
    'Добро пожаловать в обучение.',
    'Здесь вы изучите базовые правила игры.',
  ],
  [
    'Ваша цель - помочь цивилизации выжить, развиться и достичь процветания.',
  ],
  [
    'Народ требует еду каждые несколько ходов.',
  ],
  [
    'Сейчас у вас 0 еды, поэтому сначала нужно произвести немного еды.',
  ],
  [
    'Вот два символа кукурузы.',
  ],
  [
    'Каждая кукуруза дает 2 еды, когда попадает на поле.',
    'Наведите курсор на кукурузу, чтобы посмотреть подробности.',
  ],
  [
    'Нажмите кнопку SPIN, чтобы перейти к следующему ходу.',
  ],
  [
    'Каждое вращение размещает ваши символы на поле и запускает их эффекты.',
  ],
  [
    'Две кукурузы произвели по 2 еды, всего вы получили 4 еды.',
    'Собирайте еду, чтобы выжить.',
  ],
  [
    'После каждого вращения можно выбрать один из трех случайных символов.',
  ],
  [
    'Выберите монумент.',
  ],
  [
    'Проверим ваши символы.',
  ],
  [
    'Монумент производит знания.',
  ],
  [
    'Вернитесь на предыдущий экран.',
  ],
  [
    'Нажмите кнопку SPIN, чтобы перейти к следующему ходу.',
  ],
  [
    'Вы накопили достаточно знаний, чтобы достичь уровня 2.',
  ],
  [
    'Откройте окно улучшений знаний.',
  ],
  [
    'Каждый новый уровень позволяет изучить здесь одно улучшение знаний.',
  ],
  [
    'Нажмите, чтобы изучить древнюю эпоху.',
  ],
  [
    'Вернитесь на предыдущий экран.',
  ],
  [
    'Откройте лавку реликвий.',
  ],
  [
    'Реликвии дают мощные эффекты и помогают достичь процветания.',
  ],
  [
    'Реликвии покупаются за золото, поэтому старайтесь накопить побольше золота.',
  ],
  [
    'Базовое обучение завершено.',
    'Теперь ведите свою цивилизацию к процветанию!',
  ],
];

const TUTORIAL_DIALOG_STEPS_ZH: string[][] = [
  ['欢迎来到教程。', '这里会介绍开始游戏所需的基本规则。'],
  ['你的目标是帮助文明生存、发展，并走向繁荣。'],
  ['人民每隔几回合就会需要食物。'],
  ['现在你的食物为 0，所以先生产一些食物吧。'],
  ['这里给你两个玉米符号。'],
  ['每个玉米放到棋盘上时会提供 2 食物。', '将鼠标悬停在玉米上可以查看详情。'],
  ['按下“旋转”按钮推进回合。'],
  ['每次旋转都会把你的符号放到棋盘上，并触发它们的效果。'],
  ['两个玉米各生产 2 食物，所以你获得了 4 食物。', '像这样收集食物才能生存。'],
  ['每次旋转后，你可以从三个随机符号中选择一个。'],
  ['请选择纪念碑。'],
  ['现在查看你拥有的符号。'],
  ['纪念碑会生产知识。'],
  ['返回上一个画面。'],
  ['按下“旋转”按钮推进回合。'],
  ['你已经积累了足够知识，达到等级 2。'],
  ['打开知识升级窗口。'],
  ['每次升级后，你都可以在这里研究一个知识升级。'],
  ['点击研究“古代”。'],
  ['返回上一个画面。'],
  ['打开遗物商店。'],
  ['遗物拥有多种强力效果，可以帮助你走向繁荣。'],
  ['遗物需要用金币购买，所以尽量多收集金币。'],
  ['基础教程到此结束。', '现在带领你的文明走向繁荣吧！'],
];

const getTutorialDialogSteps = (language: Language) => (
  language === 'ko'
    ? TUTORIAL_DIALOG_STEPS_KO
    : language === 'zh'
      ? TUTORIAL_DIALOG_STEPS_ZH
      : language === 'ru'
        ? TUTORIAL_DIALOG_STEPS_RU
        : TUTORIAL_DIALOG_STEPS_EN
);

const TUTORIAL_CORN_CELLS = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
];

const TUTORIAL_LEFT_CORN_CELL = [{ x: 1, y: 1 }];

type TutorialBoardHighlightsProps = {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  cells: Array<{ x: number; y: number }>;
  accentCells?: Array<{ x: number; y: number }>;
  highlightBoard?: boolean;
};

type TutorialElementHighlightProps = {
  selectors: string[];
  className: string;
  pad?: number;
  padX?: number;
  padY?: number;
};

function TutorialElementHighlight({ selectors, className, pad = 0, padX = pad, padY = pad }: TutorialElementHighlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const elements = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)));
    if (elements.length === 0) {
      setRect(null);
      return;
    }

    const rects = elements.map((el) => el.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const root = document.getElementById('root');
    const rootRect = root?.getBoundingClientRect();
    if (!root || !rootRect || root.clientWidth <= 0 || root.clientHeight <= 0) {
      setRect(new DOMRect(left - padX, top - padY, right - left + padX * 2, bottom - top + padY * 2));
      return;
    }

    const scaleX = rootRect.width / root.clientWidth;
    const scaleY = rootRect.height / root.clientHeight;
    const safeScaleX = Math.max(scaleX, 0.001);
    const safeScaleY = Math.max(scaleY, 0.001);
    const localLeft = (left - rootRect.left) / safeScaleX;
    const localTop = (top - rootRect.top) / safeScaleY;
    const localWidth = (right - left) / safeScaleX;
    const localHeight = (bottom - top) / safeScaleY;
    setRect(new DOMRect(
      localLeft - padX,
      localTop - padY,
      localWidth + padX * 2,
      localHeight + padY * 2,
    ));
  }, [padX, padY, selectors]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    selectors.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => ro.observe(el));
    });
    const root = document.getElementById('root');
    if (root) ro.observe(root);
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, selectors]);

  if (!rect) return null;

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}

function TutorialBoardHighlights({ anchorRef, cells, accentCells = [], highlightBoard = false }: TutorialBoardHighlightsProps) {
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    setViewSize({ w: el.clientWidth, h: el.clientHeight });
  }, [anchorRef]);

  useLayoutEffect(() => {
    measure();
    const el = anchorRef.current;
    const ro = new ResizeObserver(() => measure());
    if (el) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [anchorRef, measure]);

  if (viewSize.w <= 0 || viewSize.h <= 0) return null;

  const layout = computeBoardPixelLayout(viewSize.w, viewSize.h);
  if (highlightBoard) {
    return (
      <div className="tutorial-board-highlights" aria-hidden="true">
        <div
          className="tutorial-board-highlight-cell tutorial-board-highlight-cell--board"
          style={{
            left: layout.startX,
            top: layout.startY,
            width: layout.boardW,
            height: layout.boardH,
          }}
        />
      </div>
    );
  }

  const rects = cells.map((cell) => boardCellLocalRect(layout, cell.x, cell.y));
  const highlightLeft = Math.min(...rects.map((rect) => rect.left));
  const highlightTop = Math.min(...rects.map((rect) => rect.top));
  const highlightRight = Math.max(...rects.map((rect) => rect.left + rect.width));
  const highlightBottom = Math.max(...rects.map((rect) => rect.top + rect.height));
  const highlightPad = 12 * layout.scale;

  return (
    <div className="tutorial-board-highlights" aria-hidden="true">
      <div
        className="tutorial-board-highlight-cell"
        style={{
          left: highlightLeft - highlightPad,
          top: highlightTop - highlightPad,
          width: highlightRight - highlightLeft + highlightPad * 2,
          height: highlightBottom - highlightTop + highlightPad * 2,
        }}
      />
      {accentCells.map((cell) => {
        const rect = boardCellLocalRect(layout, cell.x, cell.y);
        return (
          <div
            key={`accent-${cell.x}-${cell.y}`}
            className="tutorial-board-highlight-accent-cell"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        );
      })}
    </div>
  );
}

/** 하단 유물/지식 버튼 HUD 툴팁: 뷰포트 왼쪽 밖으로 나가지 않도록 translateX 보정 */
const BOTTOM_HUD_TIP_VIEWPORT_PAD = 20;

function useViewportClampedBottomHudTooltip() {
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [shiftPx, setShiftPx] = useState(0);

  const reclamp = useCallback(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const root = document.getElementById('root');
      const rootRect = root?.getBoundingClientRect();
      const rootScale = root && rootRect && root.clientWidth > 0 ? rootRect.width / root.clientWidth : 1;
      const visualPxToLocalPx = (px: number) => px / Math.max(rootScale, 0.001);
      const leftNeed = Math.ceil(BOTTOM_HUD_TIP_VIEWPORT_PAD - rect.left);
      const rightNeed = Math.ceil(rect.right - (window.innerWidth - BOTTOM_HUD_TIP_VIEWPORT_PAD));
      if (leftNeed > 0) {
        setShiftPx(visualPxToLocalPx(leftNeed));
      } else if (rightNeed > 0) {
        setShiftPx(-visualPxToLocalPx(rightNeed));
      } else {
        setShiftPx(0);
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(measure));
  }, []);

  const resetShift = useCallback(() => setShiftPx(0), []);

  const bindButtonHoverHandlers = useMemo(
    () => ({
      onMouseEnter: reclamp,
      onMouseLeave: resetShift,
      onFocus: reclamp,
      onBlur: resetShift,
    }),
    [reclamp, resetShift],
  );

  return { tooltipRef, shiftPx, bindButtonHoverHandlers };
}

function App() {
  const preGameScreen = usePreGameStore((s) => s.screen);
  const returnToLeaderSelect = usePreGameStore((s) => s.returnToLeaderSelect);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);
  const completeTutorial = usePreGameStore((s) => s.completeTutorial);
  const {
    phase,
    turn,
    isTutorialMode,
    tutorialSpinStep,
    setupTutorialCornStep,
    spinTutorialCornStep,
    setupTutorialSelectionStep,
    spinTutorialMonumentStep,
    spinBoard,
    payFoodCost,
    toggleRelicShop,
    isRelicShopOpen,
    hasNewRelicShopStock,
    clearRelicShopStockBadge,
    levelUpResearchPoints,
    initializeGame,
    lastLeaderProgressAward,
    level,
    pendingFoodPayment,
  } = useGameStore();
  const resetRelics = useRelicStore((s) => s.resetRelics);
  const fullscreenModalBlocksBoardTooltips = useBoardTooltipBlockStore((s) => s.ids.length > 0);
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const tutorialDialogSteps = useMemo(() => getTutorialDialogSteps(language), [language]);
  const tutorialDialogLabel = uiText(language, '튜토리얼 안내', 'Tutorial guide', '教程指南', 'Подсказка обучения');
  const tutorialMonumentGainedText = uiText(language, '기념비를 획득했습니다!', 'You gained a Monument!', '你获得了纪念碑！', 'Вы получили монумент!');
  const tutorialMonumentProducesPrefix = uiText(language, '기념비는', 'Monument produces', '纪念碑会生产', 'Монумент производит');
  const tutorialMonumentProducesSuffix = uiText(language, '지식을 생산합니다.', 'Knowledge.', '知识。', 'знания.');
  const tutorialFinishLabel = uiText(language, '종료', 'Finish', '完成', 'Готово');
  const tutorialExitLabel = uiText(language, '튜토리얼 종료', 'Exit Tutorial', '退出教程', 'Выйти из обучения');
  const tutorialNextLabel = uiText(language, '다음 >>', 'Next >>', '下一步 >>', 'Далее >>');
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownedSymbolsOpen, setOwnedSymbolsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [knowledgeHudAttentionKey, setKnowledgeHudAttentionKey] = useState(0);
  const [spinBlockedHint, setSpinBlockedHint] = useState<{ key: number; text: string } | null>(null);
  const [tutorialDialogStep, setTutorialDialogStep] = useState(0);
  const [showGameOverProgress, setShowGameOverProgress] = useState(false);
  const [showVictoryProgress, setShowVictoryProgress] = useState(false);
  const isInGame = preGameScreen === null;
  const [gameCanvasReady, setGameCanvasReady] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<'knowledge' | 'food' | 'gold' | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const activeGameplayBgmPlaylistIdRef = useRef<string | null>(null);
  const gameplayBgmTransitionTimerRef = useRef<number | null>(null);
  const gameOverMusicTimerRef = useRef<number | null>(null);
  const wasInGameOverPhaseRef = useRef(false);
  const relicHudTooltip = useViewportClampedBottomHudTooltip();
  const knowledgeHudTooltip = useViewportClampedBottomHudTooltip();
  const historyHudTooltip = useViewportClampedBottomHudTooltip();
  const ownedSymbolsHudTooltip = useViewportClampedBottomHudTooltip();

  useEffect(() => {
    audioManager.registerCue('button_hover', DEFAULT_AUDIO_CUES.button_hover);
    audioManager.registerCue('button_click', DEFAULT_AUDIO_CUES.button_click);
    audioManager.registerCue('denied', DEFAULT_AUDIO_CUES.denied);
    audioManager.registerCue('relic_buy', DEFAULT_AUDIO_CUES.relic_buy);
    audioManager.registerCue('open_reward', DEFAULT_AUDIO_CUES.open_reward);
    audioManager.registerCue('cow_butcher', DEFAULT_AUDIO_CUES.cow_butcher);
    audioManager.registerCue('symbol_interact', DEFAULT_AUDIO_CUES.symbol_interact);
    audioManager.registerCue('attack_melee', DEFAULT_AUDIO_CUES.attack_melee);
    audioManager.registerCue('attack_ranged', DEFAULT_AUDIO_CUES.attack_ranged);
    audioManager.registerCue('enemy_invade', DEFAULT_AUDIO_CUES.enemy_invade);
    audioManager.registerCue('symbol_choice_chose', DEFAULT_AUDIO_CUES.symbol_choice_chose);
    audioManager.registerCue('symbol_choice_reroll', DEFAULT_AUDIO_CUES.symbol_choice_reroll);
    audioManager.registerCue('resource_food', DEFAULT_AUDIO_CUES.resource_food);
    audioManager.registerCue('resource_gold', DEFAULT_AUDIO_CUES.resource_gold);
    audioManager.registerCue('resource_knowledge', DEFAULT_AUDIO_CUES.resource_knowledge);
    audioManager.registerCue('knowledge_upgraded_1', DEFAULT_AUDIO_CUES.knowledge_upgraded_1);
    audioManager.registerCue('knowledge_upgraded_2', DEFAULT_AUDIO_CUES.knowledge_upgraded_2);
    audioManager.registerCue('level_up', DEFAULT_AUDIO_CUES.level_up);
    audioManager.registerCue('xp_fill', DEFAULT_AUDIO_CUES.xp_fill);
    audioManager.registerCue('selection_open', DEFAULT_AUDIO_CUES.selection_open);
    audioManager.registerCue('victory', DEFAULT_AUDIO_CUES.victory);
    audioManager.registerCue('main_theme', DEFAULT_AUDIO_CUES.main_theme);
    audioManager.registerCue('board_ambient', DEFAULT_AUDIO_CUES.board_ambient);
    audioManager.registerCue('gameover_music', DEFAULT_AUDIO_CUES.gameover_music);
    audioManager.registerCue('victory_music', DEFAULT_AUDIO_CUES.victory_music);
    for (const cueId of [
      ...ANCIENT_ERA_BGM_CUE_IDS,
      ...MEDIEVAL_ERA_BGM_CUE_IDS,
      ...MODERN_ERA_BGM_CUE_IDS,
    ]) {
      audioManager.registerCue(cueId, DEFAULT_AUDIO_CUES[cueId]);
    }
  }, []);

  useEffect(() => {
    if (preGameScreen !== null) {
      if (gameplayBgmTransitionTimerRef.current !== null) {
        window.clearTimeout(gameplayBgmTransitionTimerRef.current);
        gameplayBgmTransitionTimerRef.current = null;
      }
      activeGameplayBgmPlaylistIdRef.current = null;
      audioManager.stopEffectLoop('board_ambient', { fadeOutMs: 180 });
      audioManager.stopMusicPlaylist({ fadeOutMs: 180 });
      void audioManager.playMusic('main_theme', { fadeInMs: 3000 });
      return;
    }

    audioManager.stopMusic({ fadeOutMs: 180 });
    void audioManager.playEffectLoop('board_ambient', { fadeInMs: 250 });
  }, [preGameScreen]);

  useEffect(() => {
    const isTerminalPhase = phase === 'game_over' || phase === 'victory';
    const nextPlaylist = isInGame && !isTerminalPhase ? getGameplayBgmPlaylist(level) : null;

    if (!nextPlaylist) {
      if (gameplayBgmTransitionTimerRef.current !== null) {
        window.clearTimeout(gameplayBgmTransitionTimerRef.current);
        gameplayBgmTransitionTimerRef.current = null;
      }
      activeGameplayBgmPlaylistIdRef.current = null;
      if (isTerminalPhase) return;
      audioManager.stopMusicPlaylist({ fadeOutMs: GAMEPLAY_BGM_FADE_OUT_MS });
      return;
    }

    if (activeGameplayBgmPlaylistIdRef.current === nextPlaylist.id) return;

    if (gameplayBgmTransitionTimerRef.current !== null) {
      window.clearTimeout(gameplayBgmTransitionTimerRef.current);
      gameplayBgmTransitionTimerRef.current = null;
    }

    const hasActiveGameplayPlaylist = activeGameplayBgmPlaylistIdRef.current !== null;
    activeGameplayBgmPlaylistIdRef.current = nextPlaylist.id;

    const playNextPlaylist = () => {
      void audioManager.playMusicPlaylist(nextPlaylist.id, [...nextPlaylist.cueIds], {
        fadeInMs: GAMEPLAY_BGM_FADE_IN_MS,
        minGapMs: 2000,
        maxGapMs: 3000,
      });
    };

    if (!hasActiveGameplayPlaylist) {
      playNextPlaylist();
      return;
    }

    audioManager.stopMusicPlaylist({ fadeOutMs: GAMEPLAY_BGM_FADE_OUT_MS });
    gameplayBgmTransitionTimerRef.current = window.setTimeout(() => {
      gameplayBgmTransitionTimerRef.current = null;
      playNextPlaylist();
    }, GAMEPLAY_BGM_TRANSITION_DELAY_MS);
  }, [isInGame, level, phase]);

  useEffect(() => {
    if (!isInGame || phase !== 'game_over') return;
    wasInGameOverPhaseRef.current = true;

    if (gameplayBgmTransitionTimerRef.current !== null) {
      window.clearTimeout(gameplayBgmTransitionTimerRef.current);
      gameplayBgmTransitionTimerRef.current = null;
    }

    activeGameplayBgmPlaylistIdRef.current = null;
    audioManager.stopMusicPlaylist({ fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
    audioManager.stopEffectLoop('board_ambient', { fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
    if (gameOverMusicTimerRef.current !== null) {
      window.clearTimeout(gameOverMusicTimerRef.current);
      gameOverMusicTimerRef.current = null;
    }
    void audioManager.unlock().then(() => {
      void audioManager.playMusic('gameover_music', { fadeInMs: GAME_OVER_MUSIC_FADE_IN_MS });
    });
  }, [isInGame, phase]);

  useEffect(() => {
    if (!isInGame || phase !== 'victory') return;

    if (gameplayBgmTransitionTimerRef.current !== null) {
      window.clearTimeout(gameplayBgmTransitionTimerRef.current);
      gameplayBgmTransitionTimerRef.current = null;
    }

    activeGameplayBgmPlaylistIdRef.current = null;
    audioManager.stopMusicPlaylist({ fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
    audioManager.stopEffectLoop('board_ambient', { fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
    if (gameOverMusicTimerRef.current !== null) {
      window.clearTimeout(gameOverMusicTimerRef.current);
      gameOverMusicTimerRef.current = null;
    }
    void audioManager.unlock().then(() => {
      void audioManager.playMusic('victory_music', { fadeInMs: GAME_OVER_MUSIC_FADE_IN_MS });
    });
  }, [isInGame, phase]);

  useEffect(() => {
    return () => {
      if (gameplayBgmTransitionTimerRef.current !== null) {
        window.clearTimeout(gameplayBgmTransitionTimerRef.current);
        gameplayBgmTransitionTimerRef.current = null;
      }
      if (gameOverMusicTimerRef.current !== null) {
        window.clearTimeout(gameOverMusicTimerRef.current);
        gameOverMusicTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let hoveredControl: Element | null = null;
    const selector = 'button:not(:disabled), [role="button"], .cursor-pointer, a[href]';

    const handlePointerOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest(selector) ?? null;
      if (!control || !root.contains(control) || control === hoveredControl) return;

      hoveredControl = control;
      void audioManager.play('button_hover');
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!hoveredControl) return;
      const nextTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (nextTarget && hoveredControl.contains(nextTarget)) return;
      hoveredControl = null;
    };

    const playButtonClick = () => {
      void audioManager.unlock().then(() => audioManager.play('button_click'));
    };

    const shouldSkipGenericClickSound = (control: Element) =>
      control instanceof HTMLElement && control.dataset.audioClick !== undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      void audioManager.unlock();
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest(selector) ?? null;
      if (!control || !root.contains(control)) return;
      if (shouldSkipGenericClickSound(control)) return;

      playButtonClick();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      void audioManager.unlock();
      if (event.code !== 'Enter' && event.code !== 'Space') return;
      const target = event.target instanceof Element ? event.target : null;
      const control = target?.closest(selector) ?? null;
      if (!control || !root.contains(control)) return;
      if (shouldSkipGenericClickSound(control)) return;

      playButtonClick();
    };

    root.addEventListener('pointerover', handlePointerOver);
    root.addEventListener('pointerout', handlePointerOut);
    root.addEventListener('pointerdown', handlePointerDown, { capture: true });
    root.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      root.removeEventListener('pointerover', handlePointerOver);
      root.removeEventListener('pointerout', handlePointerOut);
      root.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      root.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  const handleCanvasReady = useCallback(() => {
    setGameCanvasReady(true);
  }, []);

  // 본게임 벗어나면 캔버스 준비 플래그 리셋 (다음 진입 시 검은 화면 → 로드 후 페이드)
  useEffect(() => {
    if (preGameScreen !== null) {
      setGameCanvasReady(false);
    } else {
      setKnowledgeHudAttentionKey(0);
      setSpinBlockedHint(null);
    }
  }, [preGameScreen]);

  useEffect(() => {
    if (preGameScreen === null && isTutorialMode) {
      setTutorialDialogStep(0);
    }
  }, [isTutorialMode, preGameScreen]);

  useEffect(() => {
    if (isTutorialMode && tutorialDialogStep === 4) setupTutorialCornStep();
  }, [isTutorialMode, setupTutorialCornStep, tutorialDialogStep]);

  useEffect(() => {
    if (isTutorialMode && tutorialDialogStep === 9 && tutorialSpinStep === 'corn_done') {
      setupTutorialSelectionStep();
    }
  }, [isTutorialMode, setupTutorialSelectionStep, tutorialDialogStep, tutorialSpinStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 10 || phase === 'selection') return;
    const hasMonument = useGameStore
      .getState()
      .playerSymbols.some((symbol) => symbol.definition.id === S.monument);
    if (!hasMonument) return;
    setTutorialDialogStep(11);
  }, [isTutorialMode, phase, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 11 || !ownedSymbolsOpen) return;
    setTutorialDialogStep(12);
  }, [isTutorialMode, ownedSymbolsOpen, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 13 || ownedSymbolsOpen) return;
    setTutorialDialogStep(14);
  }, [isTutorialMode, ownedSymbolsOpen, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 14 || tutorialSpinStep !== 'monument_processing') return;
    setTutorialDialogStep(15);
  }, [isTutorialMode, tutorialDialogStep, tutorialSpinStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 16 || !isKnowledgeOpen) return;
    setTutorialDialogStep(17);
  }, [isKnowledgeOpen, isTutorialMode, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 19 || isKnowledgeOpen) return;
    setTutorialDialogStep(20);
  }, [isKnowledgeOpen, isTutorialMode, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 20 || !isRelicShopOpen) return;
    setTutorialDialogStep(21);
  }, [isRelicShopOpen, isTutorialMode, tutorialDialogStep]);

  // 앱 최초 로드 시 저장된 해상도를 DOM에 적용
  useEffect(() => {
    setResolution(resolutionWidth, resolutionHeight);
  }, [resolutionHeight, resolutionWidth, setResolution]);

  useEffect(() => {
    if (isRelicShopOpen && hasNewRelicShopStock) {
      clearRelicShopStockBadge();
    }
  }, [isRelicShopOpen, hasNewRelicShopStock, clearRelicShopStockBadge]);

  const showDeniedSpinHint = useCallback((text: string) => {
    void audioManager.unlock().then(() => audioManager.play('denied'));
    setSpinBlockedHint((current) => ({
      key: (current?.key ?? 0) + 1,
      text,
    }));
  }, []);

  const isUserMenuOpen =
    menuOpen ||
    ownedSymbolsOpen ||
    isLogOpen ||
    isKnowledgeOpen ||
    isRelicShopOpen;

  const handleSpinBoard = useCallback(() => {
    const st = useGameStore.getState();
    if (menuOpen || ownedSymbolsOpen || isLogOpen || isKnowledgeOpen || st.isRelicShopOpen) {
      showDeniedSpinHint(t('game.closeMenuToSpin', language));
      return;
    }

    if (st.phase === 'food_payment') {
      void audioManager.unlock();
      payFoodCost();
      return;
    }

    if (isTutorialMode && tutorialDialogStep === 6) {
      setTutorialDialogStep(7);
      spinTutorialCornStep();
      return;
    }

    if (isTutorialMode && tutorialDialogStep === 14) {
      spinTutorialMonumentStep();
      return;
    }

    if (st.phase !== 'idle') return;
    if ((st.levelUpResearchPoints ?? 0) > 0) {
      showDeniedSpinHint(t('game.researchToContinue', language));
      setKnowledgeHudAttentionKey((key) => key + 1);
      return;
    }

    void audioManager.unlock();
    spinBoard();
  }, [
    isKnowledgeOpen,
    isLogOpen,
    isTutorialMode,
    language,
    menuOpen,
    ownedSymbolsOpen,
    payFoodCost,
    showDeniedSpinHint,
    spinBoard,
    spinTutorialCornStep,
    spinTutorialMonumentStep,
    tutorialDialogStep,
  ]);

  const openMenuUnlessSpinning = useCallback((openMenu: () => void) => {
    const currentPhase = useGameStore.getState().phase;
    if (currentPhase === 'spinning' || currentPhase === 'showing_new_threats' || currentPhase === 'processing') {
      showDeniedSpinHint(t('game.finishSpinBeforeMenu', language));
      return;
    }
    openMenu();
  }, [language, showDeniedSpinHint]);

  const handleRelicShopToggle = useCallback(() => {
    if (useGameStore.getState().isRelicShopOpen) {
      toggleRelicShop();
      return;
    }
    openMenuUnlessSpinning(toggleRelicShop);
  }, [openMenuUnlessSpinning, toggleRelicShop]);

  const isTutorialInteractionAllowed = useCallback((target: EventTarget | null) => {
    if (!isTutorialMode) return true;
    if (!(target instanceof Element)) return false;
    if (target.closest('.pause-btn-top')) return true;
    if (target.closest('.pause-overlay')) return true;
    if (target.closest('.owned-symbols-modal')) return true;
    if (target.closest('.tutorial-exit-button')) return true;
    if (target.closest('.tutorial-dialog-next')) return true;
    if ((tutorialDialogStep === 6 || tutorialDialogStep === 14) && target.closest('.spin-btn')) return true;
    if (tutorialDialogStep === 10 && target.closest('.selection-card-frame:first-child .selection-card')) return true;
    if (tutorialDialogStep === 11 && target.closest('.relic-shop-btn--owned-symbols')) return true;
    if (tutorialDialogStep === 16 && target.closest('.relic-shop-btn--knowledge')) return true;
    if (tutorialDialogStep === 18 && target.closest('.knowledge-upgrade-chip--ancient-era')) return true;
    if (tutorialDialogStep === 18 && target.closest('.knowledge-research-confirm-overlay')) return true;
    if (tutorialDialogStep === 19 && target.closest('.knowledge-upgrades-back-btn')) return true;
    if (tutorialDialogStep === 20 && target.closest('.relic-shop-btn--relic')) return true;
    return false;
  }, [isTutorialMode, tutorialDialogStep]);

  const blockUnhandledTutorialInteraction = useCallback((event: React.SyntheticEvent) => {
    if (isTutorialInteractionAllowed(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  }, [isTutorialInteractionAllowed]);

  const handleTutorialNext = useCallback(() => {
    if (tutorialDialogStep === 22) {
      if (isRelicShopOpen) toggleRelicShop();
      setTutorialDialogStep(23);
      return;
    }
    setTutorialDialogStep((step) => {
      if ((step === 7 || step === 8) && useGameStore.getState().tutorialSpinStep !== 'corn_done') {
        return step;
      }
      if (step === 9 && useGameStore.getState().phase !== 'selection') {
        return step;
      }
      return Math.min(step + 1, tutorialDialogSteps.length - 1);
    });
  }, [isRelicShopOpen, toggleRelicShop, tutorialDialogStep, tutorialDialogSteps.length]);

  const handleTutorialFinish = useCallback(() => {
    if (isRelicShopOpen) toggleRelicShop();
    setTutorialDialogStep(0);
    completeTutorial();
    returnToIntro();
  }, [completeTutorial, isRelicShopOpen, returnToIntro, toggleRelicShop]);

  const handleOwnedSymbolsClose = useCallback(() => {
    if (isTutorialMode && tutorialDialogStep === 12) return;
    setOwnedSymbolsOpen(false);
  }, [isTutorialMode, tutorialDialogStep]);

  const handleGameOverMainMenu = useCallback(() => {
    initializeGame();
    resetRelics();
    returnToIntro();
  }, [initializeGame, resetRelics, returnToIntro]);

  const fadeOutGameOverMusic = useCallback(() => {
    if (gameOverMusicTimerRef.current !== null) {
      window.clearTimeout(gameOverMusicTimerRef.current);
      gameOverMusicTimerRef.current = null;
    }
    audioManager.stopMusic({ fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
  }, []);

  const handleGameOverContinue = useCallback(() => {
    fadeOutGameOverMusic();

    if (!lastLeaderProgressAward) {
      window.setTimeout(handleGameOverMainMenu, GAME_OVER_AUDIO_FADE_OUT_MS);
      return;
    }

    setShowGameOverProgress(true);
  }, [fadeOutGameOverMusic, handleGameOverMainMenu, lastLeaderProgressAward]);

  const handleVictoryContinue = useCallback(() => {
    fadeOutGameOverMusic();

    if (!lastLeaderProgressAward) {
      window.setTimeout(handleGameOverMainMenu, GAME_OVER_AUDIO_FADE_OUT_MS);
      return;
    }

    setShowVictoryProgress(true);
  }, [fadeOutGameOverMusic, handleGameOverMainMenu, lastLeaderProgressAward]);

  useEffect(() => {
    if (phase === 'game_over') return;

    setShowGameOverProgress(false);
    if (!wasInGameOverPhaseRef.current) return;

    wasInGameOverPhaseRef.current = false;
    fadeOutGameOverMusic();
  }, [fadeOutGameOverMusic, phase]);

  useEffect(() => {
    if (phase === 'victory') return;
    setShowVictoryProgress(false);
  }, [phase]);

  // 스페이스바로 스핀 (idle + 연구 포인트 없음, 입력 필드 포커스 시 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.repeat) return;

      const action = getActionForKeyCode(useSettingsStore.getState().keyBindings, e.code);
      if (action === null) return;

      if (isTutorialMode) {
        const isTutorialSpin = action === 'spin' && (tutorialDialogStep === 6 || tutorialDialogStep === 14);
        if (!isTutorialSpin && action !== 'pause') return;
      }

      e.preventDefault();

      if (action === 'spin') {
        const st = useGameStore.getState();
        if (st.phase === 'idle' || st.phase === 'food_payment') handleSpinBoard();
        return;
      }

      if (action === 'pause') {
        if (isRelicShopOpen) {
          handleRelicShopToggle();
        } else if (menuOpen) {
          setMenuOpen(false);
        } else if (!isUserMenuOpen) {
          openMenuUnlessSpinning(() => setMenuOpen(true));
        }
        return;
      }

      if (action === 'relicShop') {
        if (!isUserMenuOpen || isRelicShopOpen) handleRelicShopToggle();
        return;
      }

      if (action === 'knowledge') {
        if (isKnowledgeOpen) setIsKnowledgeOpen(false);
        else if (!isUserMenuOpen) openMenuUnlessSpinning(() => setIsKnowledgeOpen(true));
        return;
      }

      if (action === 'history') {
        if (isLogOpen) setIsLogOpen(false);
        else if (!isUserMenuOpen) openMenuUnlessSpinning(() => setIsLogOpen(true));
        return;
      }

      if (action === 'ownedSymbols') {
        if (ownedSymbolsOpen) setOwnedSymbolsOpen(false);
        else if (!isUserMenuOpen) openMenuUnlessSpinning(() => setOwnedSymbolsOpen(true));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    handleSpinBoard,
    handleRelicShopToggle,
    isKnowledgeOpen,
    isLogOpen,
    isRelicShopOpen,
    isTutorialMode,
    isUserMenuOpen,
    menuOpen,
    openMenuUnlessSpinning,
    ownedSymbolsOpen,
    tutorialDialogStep,
  ]);

  const boardIsForegroundForTooltips =
    phase !== 'destroy_selection' &&
    phase !== 'oblivion_furnace_board' &&
    phase !== 'game_over' &&
    phase !== 'victory' &&
    !isRelicShopOpen;

  const suppressBoardTooltips = !boardIsForegroundForTooltips || fullscreenModalBlocksBoardTooltips;

  const knowledge = useGameStore((s) => s.knowledge);
  const food = useGameStore((s) => s.food);
  const gold = useGameStore((s) => s.gold);
  const era = useGameStore((s) => s.era);
  const runningTotals = useGameStore((s) => s.runningTotals);
  const isFoodPaymentPending = phase === 'food_payment';
  const canPressSpin = phase === 'idle' || isFoodPaymentPending;
  const isTurnAnimationRunning =
    phase === 'spinning' ||
    phase === 'showing_new_threats' ||
    phase === 'processing';
  const tutorialNextDisabled =
    isTutorialMode &&
    (((tutorialDialogStep === 7 || tutorialDialogStep === 8) && tutorialSpinStep !== 'corn_done') ||
      (tutorialDialogStep === 9 && phase !== 'selection'));

  // 스테이지 선택 화면
  if (preGameScreen === 'intro') {
    return (
      <>
        <CustomCursor />
        <DemoStartScreen />
      </>
    );
  }

  // 리더 선택 화면
  if (preGameScreen === 'leader') {
    return (
      <>
        <CustomCursor />
        <LeaderSelectScreen />
      </>
    );
  }

  if (preGameScreen === 'leaderProgress') {
    return (
      <>
        <CustomCursor />
        <LeaderProgressScreen />
      </>
    );
  }

  // ===== 본게임 =====
  const eraName = t(ERA_NAME_KEYS[era] ?? 'era.ancient', language);
  const historyLabel = uiText(language, '히스토리', 'History', '历史', 'История');

  const knowledgeRequired = getKnowledgeRequiredForLevel(Math.min(level, 29));
  const knowledgeRatio = Math.min(1, knowledge / knowledgeRequired);
  const turnsUntilPayment = pendingFoodPayment ? 0 : turn % 10 === 0 ? 10 : 10 - (turn % 10);
  const nextCost = calculateFoodCost(pendingFoodPayment ? turn : turn + turnsUntilPayment);
  const foodDemandWarningClass =
    turnsUntilPayment <= 3 ? `warning-${turnsUntilPayment}` : turnsUntilPayment <= 4 ? 'warning-mid' : '';
  const timelineYearLabel = formatTimelineYear(getTimelineYearForTurn(turn), language);
  const turnYearLabel = `${t('game.turn', language)} ${turn}, ${timelineYearLabel}`;

  const activeState = useGameStore.getState();
  const hudPassiveTotals = hoveredStat ? getHudTurnStartPassiveTotals(activeState) : null;

  const renderTooltip = (kind: 'knowledge' | 'food' | 'gold') => {
    if (hoveredStat !== kind || !hudPassiveTotals) return null;
    const n = hudPassiveTotals[kind];
    const line = t('game.hudBaseProductionShort', language).replace('{n}', String(n));
    const icon = kind === 'food' ? FOOD_RESOURCE_ICON_URL : kind === 'gold' ? GOLD_RESOURCE_ICON_URL : KNOWLEDGE_RESOURCE_ICON_URL;
    return (
      <div className="hud-stat-tooltip" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '12px' }}>
        <div className="hud-stat-tooltip-inner">
          <img src={icon} alt="" width={40} height={40} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
          <span style={{ color: '#e5e5e5', marginLeft: '4px' }}>{line}</span>
        </div>
      </div>
    );
  };

  const renderRunningTotal = (kind: 'knowledge' | 'food' | 'gold') => {
    if (phase !== 'processing' || !runningTotals) return null;
    const value = runningTotals[kind];
    if (value === 0) return null;
    
    let color = '#fff';
    if (kind === 'knowledge') color = value > 0 ? '#60a5fa' : '#ef4444';
    if (kind === 'food') color = value > 0 ? '#4ade80' : '#ef4444';
    if (kind === 'gold') color = value > 0 ? '#fbbf24' : '#ef4444';

    return (
      <div className="running-total-pop" style={{ color }}>
        {value > 0 ? '+' : ''}{value}
      </div>
    );
  };

  return (
    <div
      className={[
        'game-screen',
        isTutorialMode && tutorialDialogStep === 2 ? 'tutorial-highlight-food-demand' : '',
        isTutorialMode && tutorialDialogStep === 3 ? 'tutorial-highlight-food-resource' : '',
        isTutorialMode && tutorialDialogStep === 4 ? 'tutorial-highlight-corn-symbols' : '',
        isTutorialMode && tutorialDialogStep === 5 ? 'tutorial-highlight-left-corn' : '',
        isTutorialMode && tutorialDialogStep === 6 ? 'tutorial-highlight-spin-button' : '',
        isTutorialMode && tutorialDialogStep === 7 ? 'tutorial-highlight-board' : '',
        isTutorialMode && tutorialDialogStep === 8 ? 'tutorial-highlight-food-resource' : '',
        isTutorialMode && tutorialDialogStep === 9 ? 'tutorial-highlight-selection-cards' : '',
        isTutorialMode && tutorialDialogStep === 10 ? 'tutorial-highlight-monument-card' : '',
        isTutorialMode && tutorialDialogStep === 11 ? 'tutorial-highlight-owned-symbols-button' : '',
        isTutorialMode && tutorialDialogStep === 12 ? 'tutorial-highlight-owned-monument' : '',
        isTutorialMode && tutorialDialogStep === 13 ? 'tutorial-highlight-owned-close' : '',
        isTutorialMode && tutorialDialogStep === 14 ? 'tutorial-highlight-spin-button' : '',
        isTutorialMode && tutorialDialogStep === 15 ? 'tutorial-highlight-knowledge-status' : '',
        isTutorialMode && tutorialDialogStep === 16 ? 'tutorial-highlight-knowledge-button' : '',
        isTutorialMode && tutorialDialogStep === 17 ? 'tutorial-highlight-knowledge-intro' : '',
        isTutorialMode && tutorialDialogStep === 18 ? 'tutorial-highlight-ancient-research' : '',
        isTutorialMode && tutorialDialogStep === 19 ? 'tutorial-highlight-knowledge-back' : '',
        isTutorialMode && tutorialDialogStep === 20 ? 'tutorial-highlight-relic-shop-button' : '',
        isTutorialMode && tutorialDialogStep === 21 ? 'tutorial-highlight-relics' : '',
        isTutorialMode && tutorialDialogStep === 22 ? 'tutorial-highlight-relic-buy' : '',
        isTutorialMode && tutorialDialogStep === 23 ? 'tutorial-highlight-finish' : '',
      ].filter(Boolean).join(' ')}
      onPointerDownCapture={blockUnhandledTutorialInteraction}
      onClickCapture={blockUnhandledTutorialInteraction}
    >
      <CustomCursor />
      <div className="hud-top">
        <div className="hud-top-left">
          <div className="level-info-mini" style={{ cursor: 'help' }} onMouseEnter={() => setHoveredStat('knowledge')} onMouseLeave={() => setHoveredStat(null)}>
            <span className="lv-text">Lv.{level}</span>
            <span className="era-text">{eraName}</span>
            <div className="exp-bar-mini-wrap">
              <div className="exp-bar-mini">
                <div className="exp-bar-mini-fill" style={{ width: `${knowledgeRatio * 100}%` }} />
                <div className="exp-bar-mini-text">
                  <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="XP" style={{ width: 22, height: 22, imageRendering: 'pixelated' }} />
                  <span>{knowledge}/{knowledgeRequired}</span>
                </div>
              </div>
              {renderRunningTotal('knowledge')}
            </div>
            {renderTooltip('knowledge')}
          </div>
          <div className="resource-group resource-group--food" onMouseEnter={() => setHoveredStat('food')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={FOOD_RESOURCE_ICON_URL} alt="Food" className="resource-icon" />
            <span className="resource-value">
              {food}
              {renderRunningTotal('food')}
            </span>
            {renderTooltip('food')}
          </div>
          <div className="resource-group" onMouseEnter={() => setHoveredStat('gold')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={GOLD_RESOURCE_ICON_URL} alt="Gold" className="resource-icon" />
            <span className="resource-value">
              {gold}
              {renderRunningTotal('gold')}
            </span>
            {renderTooltip('gold')}
          </div>
        </div>

        <div className="hud-top-center">
          <div className={`food-demand-mini ${foodDemandWarningClass}`}>
             {t('game.foodDemandFlavor', language).replace('{turns}', String(turnsUntilPayment)).replace('{amount}', nextCost.toLocaleString())}
          </div>
        </div>

        <div className="hud-top-right">
          <div className="turn-year-mini" aria-label={turnYearLabel}>
            <span className="turn-year-mini-turn">{t('game.turn', language)} {turn}</span>
            <span className="turn-year-mini-year">{timelineYearLabel}</span>
          </div>
          <button
            className="pause-btn-top"
            onClick={() => openMenuUnlessSpinning(() => setMenuOpen(true))}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
            aria-label="일시정지"
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto' }}
          >
            <span className="pause-btn-top-icon" aria-hidden="true" />
          </button>
        </div>
      </div>



      {/* 로드 완료 전 검은 오버레이 — onReady 후 페이드 아웃 */}
      <div
        className={`game-screen-black${gameCanvasReady ? ' game-screen-black--fade-out' : ''}`}
        aria-hidden="true"
      />
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area" ref={gameAreaRef}>
        <GameCanvas onReady={handleCanvasReady} suppressBoardTooltips={suppressBoardTooltips} />
        {phase === 'oblivion_furnace_board' && <OblivionFurnaceBoardOverlay anchorRef={gameAreaRef} />}
      </div>

      {/* ===== 보드 하단: 왼쪽(유물) · 중앙 고정(스핀) · 오른쪽(⋯, 메뉴) ===== */}
      <div className="bottom-action-bar">
        <div className="bottom-action-bar-left">
          <button
            className="relic-shop-btn relic-shop-btn--relic"
            {...relicHudTooltip.bindButtonHoverHandlers}
            onClick={handleRelicShopToggle}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
            aria-label={
              hasNewRelicShopStock
                ? t('game.relicShopNewStockAria', language)
                : t('game.relicShopTitleShort', language)
            }
          >
            <span className="relic-shop-btn-icon-layer" aria-hidden="true">
              <img src={RELIC_PANEL_TITLE_ICON_URL} alt="" style={{ imageRendering: 'pixelated' }} />
            </span>
            <span
              ref={relicHudTooltip.tooltipRef}
              className="bottom-action-hud-tooltip"
              aria-hidden="true"
              style={
                {
                  '--bottom-hud-tooltip-shift': `${relicHudTooltip.shiftPx}px`,
                } as React.CSSProperties
              }
            >
              <span className="hud-stat-tooltip">
                <span className="hud-stat-tooltip-inner">
                  <span style={{ color: '#e5e5e5' }}>{t('game.relicShopTitleShort', language)}</span>
                </span>
              </span>
            </span>
            {hasNewRelicShopStock && (
              <span className="hud-new-stock-tab" aria-hidden="true">
                {t('game.knowledgeHudPendingTab', language)}
              </span>
            )}
          </button>
          <button
            key={knowledgeHudAttentionKey}
            type="button"
            className={[
              'relic-shop-btn',
              'relic-shop-btn--knowledge',
              knowledgeHudAttentionKey > 0 ? 'relic-shop-btn--knowledge-attention' : '',
            ].filter(Boolean).join(' ')}
            aria-label={
              levelUpResearchPoints > 0
                ? t('game.knowledgeHudButtonHintPending', language).replace(
                    '{title}',
                    t('game.knowledgeUpgradeTreeTitle', language),
                  )
                : t('game.knowledgeUpgradeTreeTitle', language)
            }
            {...knowledgeHudTooltip.bindButtonHoverHandlers}
            onClick={() => openMenuUnlessSpinning(() => setIsKnowledgeOpen(true))}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
          >
            {levelUpResearchPoints > 0 && (
              <span className="hud-new-stock-tab" aria-hidden="true">
                {t('game.knowledgeHudPendingTab', language)}
              </span>
            )}
            <span className="relic-shop-btn-icon-layer" aria-hidden="true">
              <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
            </span>
            <span
              ref={knowledgeHudTooltip.tooltipRef}
              className="bottom-action-hud-tooltip"
              aria-hidden="true"
              style={
                {
                  '--bottom-hud-tooltip-shift': `${knowledgeHudTooltip.shiftPx}px`,
                } as React.CSSProperties
              }
            >
              <span className="hud-stat-tooltip">
                <span className="hud-stat-tooltip-inner">
                  <span style={{ color: '#e5e5e5' }}>{t('game.knowledgeUpgradeTreeTitle', language)}</span>
                </span>
              </span>
            </span>
          </button>
        </div>
        <div className="spin-area">
          <button
            type="button"
            className="spin-btn"
            onClick={handleSpinBoard}
            disabled={!canPressSpin}
            data-audio-click={
              isUserMenuOpen || (!isFoodPaymentPending && levelUpResearchPoints > 0)
                ? 'skip'
                : undefined
            }
            aria-label={isFoodPaymentPending ? t('game.payFood', language).replace('{amount}', nextCost.toLocaleString()) : t('game.spin', language)}
          >
            <span
              style={isFoodPaymentPending ? {
                transform: 'none',
                padding: '0 12px',
                fontSize: 'clamp(28px, 2.4vw, 46px)',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
              } : undefined}
            >
              {isFoodPaymentPending ? t('game.payFood', language).replace('{amount}', nextCost.toLocaleString()) : 'SPIN'}
            </span>
          </button>
          {spinBlockedHint && (
            <span key={spinBlockedHint.key} className="spin-research-hint-float" aria-hidden="true">
              {spinBlockedHint.text}
            </span>
          )}
        </div>
        <div className="bottom-action-bar-right">
          <button
            className="relic-shop-btn relic-shop-btn--history"
            type="button"
            aria-label={historyLabel}
            {...historyHudTooltip.bindButtonHoverHandlers}
            onClick={() => openMenuUnlessSpinning(() => setIsLogOpen(true))}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
          >
            <span className="relic-shop-btn-icon-layer" aria-hidden="true">
              <img src={HISTORY_ICON_URL} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
            </span>
            <span
              ref={historyHudTooltip.tooltipRef}
              className="bottom-action-hud-tooltip"
              aria-hidden="true"
              style={
                {
                  '--bottom-hud-tooltip-shift': `${historyHudTooltip.shiftPx}px`,
                } as React.CSSProperties
              }
            >
              <span className="hud-stat-tooltip">
                <span className="hud-stat-tooltip-inner">
                  <span style={{ color: '#e5e5e5' }}>{historyLabel}</span>
                </span>
              </span>
            </span>
          </button>
          <button
            className="relic-shop-btn relic-shop-btn--owned-symbols"
            type="button"
            aria-label={t('ownedSymbols.title', language)}
            {...ownedSymbolsHudTooltip.bindButtonHoverHandlers}
            onClick={() => openMenuUnlessSpinning(() => setOwnedSymbolsOpen(true))}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
          >
            <span className="relic-shop-btn-icon-layer" aria-hidden="true">
              <img src={INVENTORY_ICON_URL} alt="" draggable={false} style={{ imageRendering: 'pixelated' }} />
            </span>
            <span
              ref={ownedSymbolsHudTooltip.tooltipRef}
              className="bottom-action-hud-tooltip"
              aria-hidden="true"
              style={
                {
                  '--bottom-hud-tooltip-shift': `${ownedSymbolsHudTooltip.shiftPx}px`,
                } as React.CSSProperties
              }
            >
              <span className="hud-stat-tooltip">
                <span className="hud-stat-tooltip-inner">
                  <span style={{ color: '#e5e5e5' }}>{t('ownedSymbols.title', language)}</span>
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* ===== PAUSE MENU OVERLAY ===== */}
      <PauseMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== LOOT REWARD SELECTION OVERLAY ===== */}
      <LootRewardSelection />

      {/* ===== RELIC SELECTION OVERLAY ===== */}
      <RelicSelection />

      {/* ===== DESTROY SYMBOLS OVERLAY ===== */}
      <DestroySelection />

      {/* ===== GAME OVER OVERLAY ===== */}
      {isInGame && phase === 'game_over' && (
        <div className="endgame-overlay endgame-overlay--defeat">
          <div className={`endgame-panel ${showGameOverProgress && lastLeaderProgressAward ? '' : 'endgame-panel--defeat-intro'}`}>
            {showGameOverProgress && lastLeaderProgressAward ? (
              <>
                <EndgameLeaderProgressReveal award={lastLeaderProgressAward} language={language} />
                <button
                  className="endgame-btn"
                  onClick={() => {
                    fadeOutGameOverMusic();
                    handleGameOverMainMenu();
                  }}
                >
                  {t('pause.mainMenu', language)}
                </button>
              </>
            ) : (
              <>
                <div className="endgame-title endgame-defeat">{t('game.gameOver', language)}</div>
                <div className="endgame-subtitle">{t('game.turn', language)} {turn} - {t('game.notEnoughFood', language)}</div>
              <button
                className="endgame-btn"
                onClick={handleGameOverContinue}
              >
                {uiText(language, '계속', 'Continue', '继续', 'Продолжить')}
              </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== VICTORY OVERLAY ===== */}
      {isInGame && phase === 'victory' && false && (
        <div className="endgame-overlay">
          <div className="endgame-panel">
            <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
            {lastLeaderProgressAward ? (
              <div className="endgame-leader-xp">
                <span>{uiText(language, '지도자 경험치', 'Leader XP', '领袖经验值', 'Опыт лидера')}</span>
                <strong>+{lastLeaderProgressAward?.xpAwarded}</strong>
                <small>
                  {t('leaderProgress.currentLevel', language).replace('{level}', String(lastLeaderProgressAward?.next.level ?? 1))}
                  {(lastLeaderProgressAward?.levelsGained ?? 0) > 0
                    ? ` (+${lastLeaderProgressAward?.levelsGained})`
                    : ''}
                </small>
              </div>
            ) : null}
            <button className="endgame-btn" onClick={returnToLeaderSelect}>{t('game.restart', language)}</button>
          </div>
        </div>
      )}

      {isInGame && phase === 'victory' && (
        <div className="endgame-overlay endgame-overlay--victory">
          <div className={`endgame-panel ${showVictoryProgress && lastLeaderProgressAward ? '' : 'endgame-panel--victory-intro'}`}>
            {showVictoryProgress && lastLeaderProgressAward ? (
              <>
                <EndgameLeaderProgressReveal award={lastLeaderProgressAward} language={language} />
                <button
                  className="endgame-btn"
                  onClick={handleGameOverMainMenu}
                >
                  {t('pause.mainMenu', language)}
                </button>
              </>
            ) : (
              <>
                <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
                <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
                <button
                  className="endgame-btn endgame-btn--victory"
                  onClick={handleVictoryContinue}
                >
                  {uiText(language, '계속', 'Continue', '继续', 'Продолжить')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== DEV OVERLAY (F1) ===== */}
      <DevOverlay />

      {/* ===== DATA BROWSER (F2) ===== */}
      <DataBrowser />

      {/* ===== SYMBOL POOL PROBABILITY (F3) ===== */}
      <SymbolPoolModal />

      {/* ===== OWNED SYMBOLS LIST (button ⋯) ===== */}
      <OwnedSymbolsModal open={ownedSymbolsOpen} onClose={handleOwnedSymbolsClose} />

      {/* ===== EFFECT / EVENT LOG (F12) ===== */}
      <EffectLogOverlay isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* ===== KNOWLEDGE UPGRADES OVERLAY ===== */}
      <KnowledgeUpgradesOverlay
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
        tutorialStep={isTutorialMode ? tutorialDialogStep : undefined}
        onTutorialStepChange={setTutorialDialogStep}
      />

      {/* ===== BALANCE SIMULATOR (F4) ===== */}
      <BalanceSimulatorOverlay />

      {isTutorialMode && tutorialDialogStep === 4 && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={TUTORIAL_CORN_CELLS} />
      )}
      {isTutorialMode && tutorialDialogStep === 5 && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_CORN_CELLS}
          accentCells={TUTORIAL_LEFT_CORN_CELL}
        />
      )}
      {isTutorialMode && tutorialDialogStep === 7 && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={[]} highlightBoard />
      )}
      {isTutorialMode && tutorialDialogStep === 21 && (
        <TutorialElementHighlight
          selectors={['.relic-sprite-in-case']}
          className="tutorial-relic-display-highlight"
          padX={64}
          padY={28}
        />
      )}

      {isTutorialMode && (
        <button
          type="button"
          className="tutorial-exit-button"
          onClick={handleTutorialFinish}
        >
          {tutorialExitLabel}
        </button>
      )}

      {isTutorialMode && !(tutorialDialogStep === 15 && tutorialSpinStep !== 'monument_done') && (
        <div
          className={[
            'tutorial-dialog-overlay',
            tutorialDialogStep === 2 ? 'tutorial-dialog-overlay--food-demand' : '',
            tutorialDialogStep === 3 ? 'tutorial-dialog-overlay--food-resource' : '',
            tutorialDialogStep === 4 ? 'tutorial-dialog-overlay--corn-symbols' : '',
            tutorialDialogStep === 5 ? 'tutorial-dialog-overlay--left-corn' : '',
            tutorialDialogStep === 6 ? 'tutorial-dialog-overlay--spin-button' : '',
            tutorialDialogStep === 7 ? 'tutorial-dialog-overlay--board' : '',
            tutorialDialogStep === 8 ? 'tutorial-dialog-overlay--food-resource' : '',
            tutorialDialogStep === 9 ? 'tutorial-dialog-overlay--selection-cards' : '',
            tutorialDialogStep === 10 ? 'tutorial-dialog-overlay--monument-card' : '',
            tutorialDialogStep === 11 ? 'tutorial-dialog-overlay--owned-symbols-button' : '',
            tutorialDialogStep === 12 ? 'tutorial-dialog-overlay--owned-monument' : '',
            tutorialDialogStep === 13 ? 'tutorial-dialog-overlay--owned-close' : '',
            tutorialDialogStep === 14 ? 'tutorial-dialog-overlay--spin-button' : '',
            tutorialDialogStep === 15 ? 'tutorial-dialog-overlay--knowledge-status' : '',
            tutorialDialogStep === 16 ? 'tutorial-dialog-overlay--knowledge-button' : '',
            tutorialDialogStep === 17 ? 'tutorial-dialog-overlay--knowledge-intro' : '',
            tutorialDialogStep === 18 ? 'tutorial-dialog-overlay--ancient-research' : '',
            tutorialDialogStep === 19 ? 'tutorial-dialog-overlay--knowledge-back' : '',
            tutorialDialogStep === 20 ? 'tutorial-dialog-overlay--relic-shop-button' : '',
            tutorialDialogStep === 21 ? 'tutorial-dialog-overlay--relics' : '',
            tutorialDialogStep === 22 ? 'tutorial-dialog-overlay--relic-buy' : '',
            tutorialDialogStep === 23 ? 'tutorial-dialog-overlay--finish' : '',
          ].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label={tutorialDialogLabel}
        >
          <div className="tutorial-dialog-text">
            {tutorialDialogStep === 12 ? (
              <>
                <p>{tutorialMonumentGainedText}</p>
                <p className="tutorial-dialog-inline-resource">
                  {tutorialMonumentProducesPrefix}
                  <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" />
                  {tutorialMonumentProducesSuffix}
                </p>
              </>
            ) : (
              tutorialDialogSteps[tutorialDialogStep].map((line) => (
                <p key={line}>{line}</p>
              ))
            )}
            {tutorialDialogStep === 23 ? (
              <button
                type="button"
                className="tutorial-dialog-next tutorial-dialog-finish"
                onClick={handleTutorialFinish}
              >
                {tutorialFinishLabel}
              </button>
            ) : ![6, 10, 11, 13, 14, 16, 18, 19, 20].includes(tutorialDialogStep) && (
              <button
                type="button"
                className="tutorial-dialog-next"
                onClick={handleTutorialNext}
                disabled={tutorialNextDisabled}
                aria-disabled={tutorialNextDisabled}
              >
                {tutorialNextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
