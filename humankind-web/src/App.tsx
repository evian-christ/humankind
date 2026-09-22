import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, useId } from 'react';
import { useGameStore } from './game/state/gameStore';
import { scheduleGameLifecycleTimeout } from './game/state/gameLifecycleRun';
import { useBoardTooltipBlockStore } from './game/state/boardTooltipBlockStore';
import { useSettingsStore, type Language } from './game/state/settingsStore';
import { usePreGameStore } from './game/state/preGameStore';
import { t } from './i18n';
import GameCanvas from './components/GameCanvas';
import SymbolSelection from './components/SymbolSelection';
import LootRewardSelection from './components/LootRewardSelection';
import BoardDestroySelectionOverlay from './components/BoardDestroySelectionOverlay';
import BoardExpansionOverlay from './components/BoardExpansionOverlay';
import DemoStartScreen from './components/DemoStartScreen';
import DifficultySelectScreen from './components/DifficultySelectScreen';

import PauseMenu from './components/PauseMenu';
import { getActionForKeyCode } from './game/input/keyBindings';
import DevOverlay from './components/DevOverlay';
import DataBrowser from './components/DataBrowser';
import SymbolPoolModal from './components/SymbolPoolModal';
import OwnedSymbolsModal from './components/OwnedSymbolsModal';
import EffectLogOverlay from './components/EffectLogOverlay';
import BalanceSimulatorOverlay from './components/BalanceSimulatorOverlay';
import { calculateFoodCost, formatTimelineYear, getHudTurnStartPassiveTotals, getKnowledgeRequiredForLevel, getTimelineYearForTurn } from './game/state/gameCalculations';
import { FOOD_RESOURCE_ICON_URL, GOLD_RESOURCE_ICON_URL, INVENTORY_ICON_URL, KNOWLEDGE_RESOURCE_ICON_URL } from './uiAssetUrls';
import { audioManager } from './audio/audioManager';
import { DEFAULT_AUDIO_CUES } from './audio/audioCues';
import { boardCellLocalRect, computeBoardPixelLayout } from './game/layout/boardPixelLayout';
import { useBoardViewStore } from './game/state/boardViewStore';
import { mapCrtSourceToOutput } from './components/canvas/crtProjection';
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
    maxLevel: Number.POSITIVE_INFINITY,
    cueIds: MODERN_ERA_BGM_CUE_IDS,
  },
] as const;
const GAMEPLAY_BGM_FADE_OUT_MS = 2500;
const GAMEPLAY_BGM_FADE_IN_MS = 1800;
const GAMEPLAY_BGM_TRANSITION_DELAY_MS = GAMEPLAY_BGM_FADE_OUT_MS + 150;
const GAME_OVER_AUDIO_FADE_OUT_MS = 1000;
const GAME_OVER_MUSIC_FADE_IN_MS = 4200;
const uiText = (language: Language, ko: string, en: string, zh: string, ru?: string) => (
  language === 'ko' ? ko : language === 'zh' ? zh : language === 'ru' ? (ru ?? en) : en
);

function getGameplayBgmPlaylist(level: number) {
  return GAMEPLAY_BGM_PLAYLISTS.find((playlist) => level >= playlist.minLevel && level <= playlist.maxLevel) ?? null;
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
    '백성은 10턴마다 식량을 요구합니다.',
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
    '기념비는 지식을 제공합니다. 기념비를 선택하세요.',
  ],
  [
    '스핀 버튼을 눌러 턴을 진행하세요.',
  ],
  [
    '지식이 모여 레벨 2가 되었습니다!',
  ],
  [
    '지식은 문명의 진행 상황을 나타내며, 심볼 연구에는 쓰이지 않습니다.',
  ],
  [
    '모든 일반 심볼은 게임 시작부터 선택 풀에 들어 있습니다.',
  ],
  [
    '매 턴 원하는 심볼을 골라 보유 목록을 키우세요.',
  ],
  [
    '지식 레벨은 계속 오르지만 연구 화면은 없습니다.',
  ],
  [
    '바다와 진주 심볼을 하나씩 더 드리겠습니다.',
  ],
  [
    '바다는 인접한 심볼 4개마다 골드 1을 생산합니다.',
  ],
  [
    '스핀 버튼을 눌러 바다 효과를 발동해보세요.',
  ],
  [
    '바다 주변에 심볼 4개가 배치되어 바다가 골드 1을 생산했습니다!',
  ],
  [
    '인접은 한 심볼을 둘러싼 주변 8칸을 뜻합니다.',
  ],
  [
    '상하좌우뿐 아니라 대각선 칸도 인접으로 취급됩니다.',
  ],
  [
    '보드는 3×2, 총 6칸으로 시작합니다.',
  ],
  [
    '확장을 통해 최대 8×6, 총 48칸까지 넓힐 수 있습니다.',
  ],
  [
    '원하는 심볼이 잘 나오도록 심볼 수를 조절하세요.',
  ],
  [
    '보유 심볼을 조합해 문명을 성장시키고 승리를 노리세요.',
  ],
  [
    '모든 심볼을 시작부터 선택할 수 있으니 전략을 자유롭게 세우세요.',
  ],
  [
    '매 10턴마다 식량을 내고, 부족한 심볼을 계속 보충하세요.',
  ],
  [
    '보드 확장과 인접 효과를 활용해 생산량을 높이세요.',
  ],
  [
    '이제 기본적인 게임 흐름을 모두 익혔습니다.',
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
    'Your people demand Food every 10 turns.',
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
    'Monument gives Knowledge. Choose Monument.',
  ],
  [
    'Press the SPIN button to advance the turn.',
  ],
  [
    'You have gathered enough Knowledge to reach level 2.',
  ],
  [
    'Knowledge tracks your civilization’s progress; it is not spent on research.',
  ],
  [
    'All regular symbols are available in the choice pool from the start.',
  ],
  [
    'Choose symbols after each turn to grow your collection.',
  ],
  [
    'Your Knowledge level can rise, but there is no research screen.',
  ],
  [
    'Here are a Sea and a Pearl symbol for you.',
  ],
  [
    'Sea produces 1 Gold for every 4 adjacent symbols.',
  ],
  [
    'Press the SPIN button to trigger the Sea effect.',
  ],
  [
    'Four symbols landed around the Sea, so it produced 1 Gold!',
  ],
  [
    'Adjacent means the 8 spaces surrounding a symbol.',
  ],
  [
    'Diagonal spaces count as adjacent, along with the spaces above, below, left, and right.',
  ],
  [
    'The board starts as a 3×2 grid, for 6 spaces total.',
  ],
  [
    'Board expansions can grow it up to 8×6, for 48 spaces total.',
  ],
  [
    'Keep your symbol count under control so the symbols you need are more likely to appear.',
  ],
  [
    'Build combinations with your symbols and aim for victory.',
  ],
  [
    'Every symbol is available from the start, so shape your strategy freely.',
  ],
  [
    'Pay Food every 10 turns and keep adding useful symbols.',
  ],
  [
    'Use board expansions and adjacency effects to improve production.',
  ],
  [
    'You have learned the basic game loop.',
  ],
  [
    'That is the end of the basic tutorial.',
    'Now lead your civilization to prosperity!',
  ],
];

const TUTORIAL_REQUIRED_INTERACTION_STEPS = new Set([6, 10, 11, 19]);

type TutorialResourceKind = 'food' | 'gold' | 'knowledge';

const TUTORIAL_RESOURCE_ICON_URLS: Record<TutorialResourceKind, string> = {
  food: FOOD_RESOURCE_ICON_URL,
  gold: GOLD_RESOURCE_ICON_URL,
  knowledge: KNOWLEDGE_RESOURCE_ICON_URL,
};

const getTutorialResourceKind = (word: string): TutorialResourceKind => {
  const normalizedWord = word.toLocaleLowerCase();
  if (['food', '식량', '食物', 'еда', 'еды', 'еду'].includes(normalizedWord)) return 'food';
  if (['gold', '골드', '金币', 'золото', 'золота'].includes(normalizedWord)) return 'gold';
  return 'knowledge';
};

const renderTutorialText = (text: string): React.ReactNode[] => {
  const resourcePattern = /(Food|Gold|Knowledge|식량|골드|지식|食物|金币|知识|еда|еды|еду|золото|золота|знание|знания|знаний)/giu;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = resourcePattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const resourceWord = match[0];
    const resourceKind = getTutorialResourceKind(resourceWord);
    parts.push(
      <span className="tutorial-dialog-resource-token" key={`${match.index}-${resourceWord}`}>
        <img src={TUTORIAL_RESOURCE_ICON_URLS[resourceKind]} alt="" />
        {resourceWord}
      </span>,
    );
    lastIndex = match.index + resourceWord.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
};

const TUTORIAL_DIALOG_STEPS_RU: string[][] = [
  [
    'Добро пожаловать в обучение.',
    'Здесь вы изучите базовые правила игры.',
  ],
  [
    'Ваша цель - помочь цивилизации выжить, развиться и достичь процветания.',
  ],
  [
    'Народ требует еду каждые 10 ходов.',
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
    'Монумент дает знания. Выберите монумент.',
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
    'Вот по одному символу моря и жемчужины.',
  ],
  [
    'Море производит 1 золото за каждые 4 соседних символа.',
  ],
  [
    'Нажмите кнопку SPIN, чтобы активировать эффект моря.',
  ],
  [
    'Вокруг моря разместились 4 символа, поэтому оно произвело 1 золото!',
  ],
  [
    'Соседними считаются 8 клеток вокруг символа.',
  ],
  [
    'Диагональные клетки тоже считаются соседними, как и клетки сверху, снизу, слева и справа.',
  ],
  [
    'Поле начинается как сетка 3×2: всего 6 клеток.',
  ],
  [
    'Расширения могут увеличить поле до 8×6: всего 48 клеток.',
  ],
  [
    'Следите за количеством символов, чтобы нужные появлялись чаще.',
  ],
  [
    'Наконец, посмотрим, как победить в игре.',
    'Откройте окно улучшений знаний.',
  ],
  [
    'Выберите улучшение эпохи и посмотрите его структуру из трех этапов.',
  ],
  [
    'Улучшение эпохи состоит из трех этапов: древность, средневековье и современность.',
  ],
  [
    'Шкала этапов заполняется только для уже изученных этапов.',
  ],
  [
    'Теперь вернитесь на предыдущий экран.',
  ],
  [
    'Базовое обучение завершено.',
    'Теперь ведите свою цивилизацию к процветанию!',
  ],
];

const TUTORIAL_DIALOG_STEPS_ZH: string[][] = [
  ['欢迎来到教程。', '这里会介绍开始游戏所需的基本规则。'],
  ['你的目标是帮助文明生存、发展，并走向繁荣。'],
  ['人民每 10 回合就会需要食物。'],
  ['现在你的食物为 0，所以先生产一些食物吧。'],
  ['这里给你两个玉米符号。'],
  ['每个玉米放到棋盘上时会提供 2 食物。', '将鼠标悬停在玉米上可以查看详情。'],
  ['按下“旋转”按钮推进回合。'],
  ['每次旋转都会把你的符号放到棋盘上，并触发它们的效果。'],
  ['两个玉米各生产 2 食物，所以你获得了 4 食物。', '像这样收集食物才能生存。'],
  ['每次旋转后，你可以从三个随机符号中选择一个。'],
  ['纪念碑会提供知识。请选择纪念碑。'],
  ['按下“旋转”按钮推进回合。'],
  ['你已经积累了足够知识，达到等级 2。'],
  ['打开知识升级窗口。'],
  ['每次升级后，你都可以在这里研究一个知识升级。'],
  ['点击研究“古代”。'],
  ['返回上一个画面。'],
  ['再给你一个海洋符号和一个珍珠符号。'],
  ['海洋每有 4 个相邻符号就会生产 1 金币。'],
  ['点击旋转按钮，触发海洋的效果。'],
  ['海洋周围放置了 4 个符号，因此生产了 1 金币！'],
  ['“相邻”是指一个符号周围的 8 个格子。'],
  ['除了上下左右，对角线上的格子也算相邻。'],
  ['棋盘从 3×2 开始，共 6 个格子。'],
  ['通过扩展，棋盘最多可以达到 8×6，共 48 个格子。'],
  ['控制好符号数量，让需要的符号更容易出现。'],
  ['最后来看看如何赢得游戏。', '打开知识升级窗口。'],
  ['选择时代升级，查看它的三个阶段结构。'],
  ['时代升级分为三个阶段：古代、中世纪和现代。'],
  ['阶段条只会填充已经研究过的阶段。'],
  ['现在返回上一个画面。'],
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

const TUTORIAL_ADJACENCY_PREVIEW_CELLS = [
  { x: 2, y: 1 },
  { x: 3, y: 1 },
];

const TUTORIAL_SEA_CELL = [{ x: 2, y: 1 }];

const TUTORIAL_SEA_OCCUPIED_ADJACENT_CELLS = [
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 1, y: 1 },
  { x: 3, y: 2 },
];

const TUTORIAL_SEA_ADJACENT_CELLS = [
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
];

type TutorialBoardHighlightsProps = {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  cells: Array<{ x: number; y: number }>;
  highlightBoard?: boolean;
  individualCells?: boolean;
  showGroupBackdrop?: boolean;
  highlightSymbolBounds?: boolean;
};

type TutorialHighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const padTutorialHighlightRect = (rect: TutorialHighlightRect, pad: number): TutorialHighlightRect => ({
  left: rect.left - pad,
  top: rect.top - pad,
  width: rect.width + pad * 2,
  height: rect.height + pad * 2,
});

const getTutorialHighlightBounds = (rects: TutorialHighlightRect[]): TutorialHighlightRect => {
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));
  return { left, top, width: right - left, height: bottom - top };
};

const getCrtProjectedRectPath = (
  rect: TutorialHighlightRect,
  viewWidth: number,
  viewHeight: number,
) => {
  const points: Array<{ x: number; y: number }> = [];
  const edgeSteps = 12;
  const addEdge = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    includeStart: boolean,
  ) => {
    for (let step = includeStart ? 0 : 1; step <= edgeSteps; step += 1) {
      const progress = step / edgeSteps;
      points.push(mapCrtSourceToOutput(
        startX + (endX - startX) * progress,
        startY + (endY - startY) * progress,
        viewWidth,
        viewHeight,
      ));
    }
  };
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  addEdge(rect.left, rect.top, right, rect.top, true);
  addEdge(right, rect.top, right, bottom, false);
  addEdge(right, bottom, rect.left, bottom, false);
  addEdge(rect.left, bottom, rect.left, rect.top, false);
  return `${points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  )).join(' ')} Z`;
};

function TutorialBoardHighlights({
  anchorRef,
  cells,
  highlightBoard = false,
  individualCells = false,
  showGroupBackdrop = true,
  highlightSymbolBounds = false,
}: TutorialBoardHighlightsProps) {
  const crtEffect = useSettingsStore((state) => state.crtEffect);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const boardZoom = useBoardViewStore((state) => state.zoom);
  const individualMaskId = `tutorial-individual-mask-${useId().replace(/:/g, '')}`;

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

  const layout = computeBoardPixelLayout(viewSize.w, viewSize.h, undefined, undefined, boardZoom);
  const cellRects = cells.map((cell) => boardCellLocalRect(layout, cell.x, cell.y));
  const rects = highlightSymbolBounds
    ? cellRects.map((cellRect) => {
        const rawSize = Math.min(cellRect.width - 6 * layout.scale, cellRect.height) * 0.85;
        const spriteSize = 32 * Math.max(1, Math.floor(rawSize / 32));
        const highlightPad = 5 * layout.scale;
        const size = spriteSize + highlightPad * 2;
        return {
          left: cellRect.left + (cellRect.width - size) / 2,
          top: cellRect.top + (cellRect.height - size) / 2,
          width: size,
          height: size,
        };
      })
    : cellRects;

  if (crtEffect) {
    const cellPad = highlightSymbolBounds ? 0 : 5 * layout.scale;
    const groupPad = 12 * layout.scale;
    let maskRects: TutorialHighlightRect[];
    let outlineRects: TutorialHighlightRect[];

    if (highlightBoard) {
      const boardRect = padTutorialHighlightRect({
        left: layout.startX,
        top: layout.startY,
        width: layout.boardW,
        height: layout.boardH,
      }, groupPad);
      maskRects = [boardRect];
      outlineRects = [boardRect];
    } else if (individualCells) {
      const paddedRects = rects.map((rect) => padTutorialHighlightRect(rect, cellPad));
      if (showGroupBackdrop) {
        const groupRect = padTutorialHighlightRect(getTutorialHighlightBounds(rects), groupPad);
        maskRects = [groupRect];
        outlineRects = [groupRect, ...paddedRects];
      } else {
        maskRects = paddedRects;
        outlineRects = paddedRects;
      }
    } else {
      const groupRect = padTutorialHighlightRect(getTutorialHighlightBounds(rects), groupPad);
      maskRects = [groupRect];
      outlineRects = [groupRect];
    }
    const backdropPath = [
      `M 0 0 H ${viewSize.w} V ${viewSize.h} H 0 Z`,
      ...maskRects.map((rect) => getCrtProjectedRectPath(rect, viewSize.w, viewSize.h)),
    ].join(' ');

    return (
      <svg
        className={[
          'tutorial-board-highlights',
          'tutorial-board-highlights--crt',
          !showGroupBackdrop && individualCells ? 'tutorial-board-highlights--lighter-mask' : '',
        ].filter(Boolean).join(' ')}
        aria-hidden="true"
        viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
        preserveAspectRatio="none"
      >
        <path
          className="tutorial-board-highlight-crt-backdrop"
          d={backdropPath}
          fillRule="evenodd"
          clipRule="evenodd"
        />
        {outlineRects.map((rect, index) => (
          <path
            className="tutorial-board-highlight-crt-outline"
            d={getCrtProjectedRectPath(rect, viewSize.w, viewSize.h)}
            key={`outline-${index}`}
          />
        ))}
      </svg>
    );
  }

  if (highlightBoard) {
    const highlightPad = 12 * layout.scale;
    return (
      <div className="tutorial-board-highlights" aria-hidden="true">
        <div
          className="tutorial-board-highlight-cell tutorial-board-highlight-cell--board"
          style={{
            left: layout.startX - highlightPad,
            top: layout.startY - highlightPad,
            width: layout.boardW + highlightPad * 2,
            height: layout.boardH + highlightPad * 2,
          }}
        />
      </div>
    );
  }

  if (individualCells) {
    const cellPad = highlightSymbolBounds ? 0 : 5 * layout.scale;
    const groupPad = 12 * layout.scale;
    const groupLeft = Math.min(...rects.map((rect) => rect.left));
    const groupTop = Math.min(...rects.map((rect) => rect.top));
    const groupRight = Math.max(...rects.map((rect) => rect.left + rect.width));
    const groupBottom = Math.max(...rects.map((rect) => rect.top + rect.height));
    return (
      <div className="tutorial-board-highlights" aria-hidden="true">
        {showGroupBackdrop && (
          <div
            className="tutorial-board-highlight-cell tutorial-board-highlight-cell--group-backdrop"
            style={{
              left: groupLeft - groupPad,
              top: groupTop - groupPad,
              width: groupRight - groupLeft + groupPad * 2,
              height: groupBottom - groupTop + groupPad * 2,
            }}
          />
        )}
        {!showGroupBackdrop && (
          <svg
            className="tutorial-board-highlight-mask"
            viewBox={`0 0 ${viewSize.w} ${viewSize.h}`}
            preserveAspectRatio="none"
          >
            <defs>
              <mask id={individualMaskId} maskUnits="userSpaceOnUse">
                <rect width={viewSize.w} height={viewSize.h} fill="white" />
                {rects.map((rect, index) => (
                  <rect
                    key={`${cells[index].x}-${cells[index].y}`}
                    x={rect.left - cellPad}
                    y={rect.top - cellPad}
                    width={rect.width + cellPad * 2}
                    height={rect.height + cellPad * 2}
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            <rect
              className="tutorial-board-highlight-mask-backdrop"
              width={viewSize.w}
              height={viewSize.h}
              mask={`url(#${individualMaskId})`}
            />
          </svg>
        )}
        {rects.map((rect, index) => (
          <div
            className={[
              'tutorial-board-highlight-cell',
              'tutorial-board-highlight-cell--outline-only',
              highlightSymbolBounds ? 'tutorial-board-highlight-cell--static' : '',
            ].filter(Boolean).join(' ')}
            key={`${cells[index].x}-${cells[index].y}`}
            style={{
              left: rect.left - cellPad,
              top: rect.top - cellPad,
              width: rect.width + cellPad * 2,
              height: rect.height + cellPad * 2,
            }}
          />
        ))}
      </div>
    );
  }

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
    </div>
  );
}

function App() {
  const preGameScreen = usePreGameStore((s) => s.screen);
  const returnToIntro = usePreGameStore((s) => s.returnToIntro);
  const completeTutorial = usePreGameStore((s) => s.completeTutorial);
  const phase = useGameStore((s) => s.phase);
  const turn = useGameStore((s) => s.turn);
  const isTutorialMode = useGameStore((s) => s.isTutorialMode);
  const tutorialSpinStep = useGameStore((s) => s.tutorialSpinStep);
  const setupTutorialCornStep = useGameStore((s) => s.setupTutorialCornStep);
  const spinTutorialCornStep = useGameStore((s) => s.spinTutorialCornStep);
  const setupTutorialSelectionStep = useGameStore((s) => s.setupTutorialSelectionStep);
  const spinTutorialMonumentStep = useGameStore((s) => s.spinTutorialMonumentStep);
  const setupTutorialAdjacencyStep = useGameStore((s) => s.setupTutorialAdjacencyStep);
  const spinTutorialAdjacencyStep = useGameStore((s) => s.spinTutorialAdjacencyStep);
  const spinBoard = useGameStore((s) => s.spinBoard);
  const payFoodCost = useGameStore((s) => s.payFoodCost);
  const claimBoardExpansion = useGameStore((s) => s.claimBoardExpansion);
  const initializeGame = useGameStore((s) => s.initializeGame);
  const level = useGameStore((s) => s.level);
  const pendingFoodPayment = useGameStore((s) => s.pendingFoodPayment);
  const fullscreenModalBlocksBoardTooltips = useBoardTooltipBlockStore((s) => s.ids.length > 0);
  const language = useSettingsStore((s) => s.language);
  const { resolutionWidth, resolutionHeight, setResolution } = useSettingsStore();
  const tutorialDialogSteps = useMemo(() => getTutorialDialogSteps(language), [language]);
  const tutorialDialogLabel = uiText(language, '튜토리얼 안내', 'Tutorial guide', '教程指南', 'Подсказка обучения');
  const tutorialFinishLabel = uiText(language, '종료', 'Finish', '完成', 'Готово');
  const tutorialExitLabel = uiText(language, '튜토리얼 종료', 'Exit Tutorial', '退出教程', 'Выйти из обучения');
  const tutorialAnywhereLabel = 'Press anywhere to continue';
  const inventoryLabel = uiText(language, '인벤토리', 'Inventory', '物品栏', 'Инвентарь');
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownedSymbolsOpen, setOwnedSymbolsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [spinBlockedHint, setSpinBlockedHint] = useState<{ key: number; text: string } | null>(null);
  const [tutorialDialogStep, setTutorialDialogStep] = useState(0);
  const isInGame = preGameScreen === null;
  const [gameCanvasReady, setGameCanvasReady] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<'knowledge' | 'food' | 'gold' | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const activeGameplayBgmPlaylistIdRef = useRef<string | null>(null);
  const gameplayBgmTransitionTimerRef = useRef<number | null>(null);
  const gameOverMusicTimerRef = useRef<number | null>(null);
  const wasInGameOverPhaseRef = useRef(false);

  useEffect(() => {
    audioManager.registerCue('button_hover', DEFAULT_AUDIO_CUES.button_hover);
    audioManager.registerCue('button_click', DEFAULT_AUDIO_CUES.button_click);
    audioManager.registerCue('denied', DEFAULT_AUDIO_CUES.denied);
    audioManager.registerCue('open_reward', DEFAULT_AUDIO_CUES.open_reward);
    audioManager.registerCue('symbol_interact', DEFAULT_AUDIO_CUES.symbol_interact);
    audioManager.registerCue('symbol_choice_chose', DEFAULT_AUDIO_CUES.symbol_choice_chose);
    audioManager.registerCue('symbol_choice_reroll', DEFAULT_AUDIO_CUES.symbol_choice_reroll);
    audioManager.registerCue('resource_food', DEFAULT_AUDIO_CUES.resource_food);
    audioManager.registerCue('resource_gold', DEFAULT_AUDIO_CUES.resource_gold);
    audioManager.registerCue('resource_knowledge', DEFAULT_AUDIO_CUES.resource_knowledge);
    audioManager.registerCue('knowledge_upgraded_1', DEFAULT_AUDIO_CUES.knowledge_upgraded_1);
    audioManager.registerCue('knowledge_upgraded_2', DEFAULT_AUDIO_CUES.knowledge_upgraded_2);
    audioManager.registerCue('selection_open', DEFAULT_AUDIO_CUES.selection_open);
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
    if (!isTutorialMode || tutorialDialogStep !== 11 || tutorialSpinStep !== 'monument_processing') return;
    setTutorialDialogStep(12);
  }, [isTutorialMode, tutorialDialogStep, tutorialSpinStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 17) return;
    setupTutorialAdjacencyStep();
  }, [isTutorialMode, setupTutorialAdjacencyStep, tutorialDialogStep]);

  useEffect(() => {
    if (!isTutorialMode || tutorialDialogStep !== 19 || tutorialSpinStep !== 'adjacency_processing') return;
    setTutorialDialogStep(20);
  }, [isTutorialMode, tutorialDialogStep, tutorialSpinStep]);

  // 앱 최초 로드 시 저장된 해상도를 DOM에 적용
  useEffect(() => {
    setResolution(resolutionWidth, resolutionHeight);
  }, [resolutionHeight, resolutionWidth, setResolution]);

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
    isLogOpen;
  const pendingBoardExpansions = useGameStore((s) => s.pendingBoardExpansions);

  const handleSpinBoard = useCallback(() => {
    const st = useGameStore.getState();
    if (menuOpen || ownedSymbolsOpen || isLogOpen) {
      showDeniedSpinHint(t('game.closeMenuToSpin', language));
      return;
    }

    if (st.phase === 'food_payment') {
      void audioManager.unlock();
      payFoodCost();
      return;
    }

    if (st.phase === 'board_expansion_ready') {
      claimBoardExpansion();
      return;
    }

    if (isTutorialMode && tutorialDialogStep === 6) {
      setTutorialDialogStep(7);
      spinTutorialCornStep();
      return;
    }

    if (isTutorialMode && tutorialDialogStep === 11) {
      spinTutorialMonumentStep();
      return;
    }

    if (isTutorialMode && tutorialDialogStep === 19) {
      spinTutorialAdjacencyStep();
      return;
    }

    if (st.phase !== 'idle') return;

    void audioManager.unlock();
    spinBoard();
  }, [
    claimBoardExpansion,
    isLogOpen,
    isTutorialMode,
    language,
    menuOpen,
    ownedSymbolsOpen,
    payFoodCost,
    showDeniedSpinHint,
    spinBoard,
    spinTutorialAdjacencyStep,
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

  const handleTutorialNext = useCallback(() => {
    setTutorialDialogStep((step) => {
      if ((step === 7 || step === 8) && useGameStore.getState().tutorialSpinStep !== 'corn_done') {
        return step;
      }
      if (step === 9 && useGameStore.getState().phase !== 'selection') {
        return step;
      }
      return Math.min(step + 1, tutorialDialogSteps.length - 1);
    });
  }, [tutorialDialogSteps.length]);

  const isTutorialInteractionAllowed = useCallback((target: EventTarget | null) => {
    if (!isTutorialMode) return true;
    if (!(target instanceof Element)) return false;
    if (target.closest('.pause-btn-top')) return true;
    if (target.closest('.pause-overlay')) return true;
    if (target.closest('.owned-symbols-modal')) return true;
    if (target.closest('.tutorial-exit-button')) return true;
    if (target.closest('.tutorial-dialog-next')) return true;
    if ((tutorialDialogStep === 6 || tutorialDialogStep === 11 || tutorialDialogStep === 19) && target.closest('.spin-btn')) return true;
    if (tutorialDialogStep === 10 && target.closest('.selection-card-frame:first-child .selection-card')) return true;
    return false;
  }, [isTutorialMode, tutorialDialogStep]);

  const blockUnhandledTutorialInteraction = useCallback((event: React.SyntheticEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const isGlobalTutorialControl =
      target?.closest('.pause-btn-top') ||
      target?.closest('.pause-overlay') ||
      target?.closest('.tutorial-exit-button');
    const advancesOnAnywherePress =
      isTutorialMode &&
      tutorialDialogStep !== tutorialDialogSteps.length - 1 &&
      !TUTORIAL_REQUIRED_INTERACTION_STEPS.has(tutorialDialogStep);

    if (advancesOnAnywherePress && !isGlobalTutorialControl) {
      if (event.type === 'click') {
        handleTutorialNext();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isTutorialInteractionAllowed(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  }, [
    handleTutorialNext,
    isTutorialInteractionAllowed,
    isTutorialMode,
    tutorialDialogStep,
    tutorialDialogSteps.length,
  ]);

  const handleTutorialFinish = useCallback(() => {
    setTutorialDialogStep(0);
    completeTutorial();
    returnToIntro();
  }, [completeTutorial, returnToIntro]);

  const handleOwnedSymbolsClose = useCallback(() => {
    setOwnedSymbolsOpen(false);
  }, []);

  const handleGameOverMainMenu = useCallback(() => {
    initializeGame();
    returnToIntro();
  }, [initializeGame, returnToIntro]);

  const fadeOutGameOverMusic = useCallback(() => {
    if (gameOverMusicTimerRef.current !== null) {
      window.clearTimeout(gameOverMusicTimerRef.current);
      gameOverMusicTimerRef.current = null;
    }
    audioManager.stopMusic({ fadeOutMs: GAME_OVER_AUDIO_FADE_OUT_MS });
  }, []);

  const handleGameOverContinue = useCallback(() => {
    fadeOutGameOverMusic();

    scheduleGameLifecycleTimeout(handleGameOverMainMenu, GAME_OVER_AUDIO_FADE_OUT_MS);
  }, [fadeOutGameOverMusic, handleGameOverMainMenu]);

  const handleVictoryContinue = useCallback(() => {
    fadeOutGameOverMusic();

    scheduleGameLifecycleTimeout(handleGameOverMainMenu, GAME_OVER_AUDIO_FADE_OUT_MS);
  }, [fadeOutGameOverMusic, handleGameOverMainMenu]);

  useEffect(() => {
    if (phase === 'game_over') return;

    if (!wasInGameOverPhaseRef.current) return;

    wasInGameOverPhaseRef.current = false;
    fadeOutGameOverMusic();
  }, [fadeOutGameOverMusic, phase]);

  // 스페이스바로 스핀 (idle, 입력 필드 포커스 시 무시)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.repeat) return;

      const action = getActionForKeyCode(useSettingsStore.getState().keyBindings, e.code);
      if (action === null) return;

      if (isTutorialMode) {
        const isTutorialSpin =
          action === 'spin' &&
          (tutorialDialogStep === 6 || tutorialDialogStep === 11 || tutorialDialogStep === 19);
        if (!isTutorialSpin && action !== 'pause') return;
      }

      e.preventDefault();

      if (action === 'spin') {
        const st = useGameStore.getState();
        if (st.phase === 'idle' || st.phase === 'food_payment' || st.phase === 'board_expansion_ready') {
          handleSpinBoard();
        }
        return;
      }

      if (action === 'pause') {
        if (menuOpen) {
          setMenuOpen(false);
        } else if (!isUserMenuOpen) {
          openMenuUnlessSpinning(() => setMenuOpen(true));
        }
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
    isLogOpen,
    isTutorialMode,
    isUserMenuOpen,
    menuOpen,
    openMenuUnlessSpinning,
    ownedSymbolsOpen,
    tutorialDialogStep,
  ]);

  const boardIsForegroundForTooltips =
    phase !== 'board_destroy_selection' &&
    phase !== 'game_over' &&
    phase !== 'victory' &&
    pendingBoardExpansions <= 0;

  const suppressBoardTooltips = !boardIsForegroundForTooltips || fullscreenModalBlocksBoardTooltips;

  const knowledge = useGameStore((s) => s.knowledge);
  const food = useGameStore((s) => s.food);
  const gold = useGameStore((s) => s.gold);
  const era = useGameStore((s) => s.era);
  const runningTotals = useGameStore((s) => s.runningTotals);
  const isFoodPaymentPending = phase === 'food_payment';
  const isBoardExpansionReady = phase === 'board_expansion_ready';
  const canPressSpin = phase === 'idle' || isFoodPaymentPending || isBoardExpansionReady;
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

  // 난이도 선택 화면
  if (preGameScreen === 'difficulty') {
    return (
      <>
        <CustomCursor />
        <DifficultySelectScreen />
      </>
    );
  }

  // ===== 본게임 =====
  const eraName = t(ERA_NAME_KEYS[era] ?? 'era.ancient', language);

  const knowledgeRequired = getKnowledgeRequiredForLevel(level);
  const knowledgeRatio = Math.min(1, knowledge / knowledgeRequired);
  const turnsUntilPayment = pendingFoodPayment ? 0 : turn % 10 === 0 ? 10 : 10 - (turn % 10);
  const nextCost = calculateFoodCost(pendingFoodPayment ? turn : turn + turnsUntilPayment);
  const foodDemandTooltipLines = [
    uiText(
      language,
      `${turnsUntilPayment}턴 뒤, 식량을 지불하지 못하면 패배합니다.`,
      `In ${turnsUntilPayment} turns, you lose if you cannot pay Food.`,
      `${turnsUntilPayment}回合后，如果无法支付食物就会失败。`,
      `Через ${turnsUntilPayment} ход(ов) вы проиграете, если не сможете заплатить еду.`,
    ),
    uiText(
      language,
      '식량 지불 후 보드를 1칸 확장합니다.',
      'After paying Food, expand the board by 1 slot.',
      '支付食物后，棋盘扩展1格。',
      'После оплаты еды поле расширяется на 1 клетку.',
    ),
  ];
  const payFoodButtonActionLabel = uiText(language, '지불', 'PAY', '支付', 'ЗАПЛАТИТЬ');
  const boardExpansionButtonLabel = uiText(language, '확장 +1', 'EXPAND +1', '扩展 +1', 'РАСШИРИТЬ +1');
  const foodDemandWarningClass =
    turnsUntilPayment <= 3 ? `warning-${turnsUntilPayment}` : turnsUntilPayment <= 4 ? 'warning-mid' : '';
  const timelineYearLabel = formatTimelineYear(getTimelineYearForTurn(turn), language);
  const turnYearLabel = `${t('game.turn', language)} ${turn}, ${timelineYearLabel}`;

  const activeState = useGameStore.getState();
  const hudPassiveTotals = hoveredStat ? getHudTurnStartPassiveTotals(activeState) : null;

  const renderTooltip = (kind: 'knowledge' | 'food' | 'gold') => {
    if (hoveredStat !== kind || !hudPassiveTotals) return null;
    const n = hudPassiveTotals[kind] ?? 0;
    const line = t('game.hudBaseProductionShort', language).replace('{n}', String(n));
    const icon =
      kind === 'food' ? FOOD_RESOURCE_ICON_URL :
      kind === 'gold' ? GOLD_RESOURCE_ICON_URL :
      KNOWLEDGE_RESOURCE_ICON_URL;
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
    const value = runningTotals[kind] ?? 0;
    if (value === 0) return null;
    
    let color = '#fff';
    if (kind === 'knowledge') color = value > 0 ? '#60a5fa' : '#ef4444';
    if (kind === 'food') color = value > 0 ? '#4ade80' : '#ef4444';
    if (kind === 'gold') color = value > 0 ? '#fbbf24' : '#ef4444';

    return (
      <span className="running-total-pop" style={{ color }}>
        {value > 0 ? '+' : ''}{value}
      </span>
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
        isTutorialMode && tutorialDialogStep === 11 ? 'tutorial-highlight-spin-button' : '',
        isTutorialMode && tutorialDialogStep === 12 ? 'tutorial-highlight-knowledge-status' : '',
        isTutorialMode && tutorialDialogStep === 19 ? 'tutorial-highlight-spin-button' : '',
        isTutorialMode && tutorialDialogStep === 31 ? 'tutorial-highlight-finish' : '',
      ].filter(Boolean).join(' ')}
      onPointerDownCapture={blockUnhandledTutorialInteraction}
      onClickCapture={blockUnhandledTutorialInteraction}
    >
      <CustomCursor />
      <aside className="game-left-section">
        <div className="game-rail-caption">{uiText(language, '자원', 'RESOURCES', '资源', 'РЕСУРСЫ')}</div>
        <div className="hud-top-left">
          <div className="resource-group resource-group--food" onMouseEnter={() => setHoveredStat('food')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={FOOD_RESOURCE_ICON_URL} alt="" className="resource-icon" />
            <span className="resource-label">{t('game.food', language)}</span>
            <span className="resource-value">
              {food}
              {renderRunningTotal('food')}
            </span>
            {renderTooltip('food')}
          </div>
          <div className="resource-group" onMouseEnter={() => setHoveredStat('gold')} onMouseLeave={() => setHoveredStat(null)}>
            <img src={GOLD_RESOURCE_ICON_URL} alt="" className="resource-icon" />
            <span className="resource-label">{t('game.gold', language)}</span>
            <span className="resource-value">
              {gold}
              {renderRunningTotal('gold')}
            </span>
            {renderTooltip('gold')}
          </div>
        </div>
        <button
          className="game-action-btn game-action-btn--owned-symbols game-left-owned-symbols-btn"
          type="button"
          aria-label={inventoryLabel}
          onClick={() => openMenuUnlessSpinning(() => setOwnedSymbolsOpen(true))}
          data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
        >
          <span className="game-action-btn-icon-layer" aria-hidden="true">
            <img src={INVENTORY_ICON_URL} alt="" draggable={false} />
          </span>
          <span className="game-left-owned-symbols-label">{inventoryLabel}</span>
        </button>
      </aside>
      <aside className="game-right-section">
        <div className="game-rail-caption">{uiText(language, '진행', 'PROGRESS', '进度', 'ПРОГРЕСС')}</div>
        <div className="progress-hud-panels">
          <button
            type="button"
            className={[
              'game-action-btn',
              'game-action-btn--knowledge',
              'knowledge-progress-display',
              hoveredStat === 'knowledge' ? 'game-right-action--hovered' : '',
            ].filter(Boolean).join(' ')}
            onMouseEnter={() => setHoveredStat('knowledge')}
            onMouseLeave={() => setHoveredStat(null)}
            aria-label={t('game.knowledge', language)}
            disabled
          >
            <span className="game-right-action-icon" aria-hidden="true">
              <img src={KNOWLEDGE_RESOURCE_ICON_URL} alt="" draggable={false} />
            </span>
            <span className="game-right-action-copy">
              <span className="game-right-action-label">{t('game.knowledge', language)}</span>
              <span className="game-right-action-meta">
                <span>Lv.{level}</span>
                <span>{eraName}</span>
              </span>
              <span className="game-right-action-bar" aria-hidden="true">
                <span className="game-right-action-bar-fill game-right-action-bar-fill--knowledge" style={{ width: `${knowledgeRatio * 100}%` }} />
                <span className="game-right-action-bar-value">
                  {knowledge}/{knowledgeRequired}
                </span>
              </span>
            </span>
            {renderRunningTotal('knowledge')}
          </button>
          {renderTooltip('knowledge')}
        </div>
        <div className="hud-top-center">
          <div
            className={`food-demand-mini ${foodDemandWarningClass}`}
            tabIndex={0}
            aria-describedby="food-demand-tooltip"
          >
            {uiText(
              language,
              `다음 식량 ${nextCost.toLocaleString()} · ${turnsUntilPayment}턴`,
              `NEXT FOOD ${nextCost.toLocaleString()} · ${turnsUntilPayment} TURNS`,
              `下次食物 ${nextCost.toLocaleString()} · ${turnsUntilPayment} 回合`,
              `ЕДА ${nextCost.toLocaleString()} · ${turnsUntilPayment} ХОДОВ`,
            )}
            <div id="food-demand-tooltip" className="food-demand-tooltip" role="tooltip">
              {foodDemandTooltipLines.map((line) => (
                <span key={line} className="food-demand-tooltip-line">
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hud-top-right game-right-status-panel">
          <div className="turn-year-mini" aria-label={turnYearLabel}>
            <span className="turn-year-mini-turn">{t('game.turn', language)} {turn}</span>
            <span className="turn-year-mini-year">{timelineYearLabel}</span>
          </div>
          <button
            className="pause-btn-top"
            onClick={() => openMenuUnlessSpinning(() => setMenuOpen(true))}
            data-audio-click={isTurnAnimationRunning ? 'skip' : undefined}
            aria-label={uiText(language, '일시정지', 'Pause', '暂停', 'Пауза')}
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto' }}
          >
            <span className="pause-btn-top-icon" aria-hidden="true" />
          </button>
        </div>
        <div className="spin-area">
          <button
            type="button"
            className={`spin-btn${isFoodPaymentPending ? ' spin-btn--food-payment' : ''}${isBoardExpansionReady ? ' spin-btn--board-expansion' : ''}`}
            onClick={handleSpinBoard}
            disabled={!canPressSpin}
            data-audio-click={
              isUserMenuOpen ? 'skip' : undefined
            }
            aria-label={
              isFoodPaymentPending
                ? t('game.payFood', language).replace('{amount}', nextCost.toLocaleString())
                : isBoardExpansionReady
                  ? boardExpansionButtonLabel
                  : t('game.spin', language)
            }
          >
            {isFoodPaymentPending ? (
              <span className="spin-btn__state-label spin-btn__food-payment-label" aria-hidden="true">
                <span className="spin-btn__food-payment-action">{payFoodButtonActionLabel}</span>
                <span className="spin-btn__food-payment-cost">
                  <img src={FOOD_RESOURCE_ICON_URL} alt="" draggable={false} />
                  <span>{nextCost.toLocaleString()}</span>
                </span>
              </span>
            ) : isBoardExpansionReady ? (
              <span className="spin-btn__state-label spin-btn__board-expansion-label">{boardExpansionButtonLabel}</span>
            ) : (
              <span className="spin-btn__state-label">{t('game.spin', language)}</span>
            )}
          </button>
          {spinBlockedHint && (
            <span key={spinBlockedHint.key} className="spin-research-hint-float" aria-hidden="true">
              {spinBlockedHint.text}
            </span>
          )}
        </div>
      </aside>



      {/* 로드 완료 전 검은 오버레이 — onReady 후 페이드 아웃 */}
      <div
        className={`game-screen-black${gameCanvasReady ? ' game-screen-black--fade-out' : ''}`}
        aria-hidden="true"
      />
      {/* ===== GAME BOARD (with integrated UI bars) ===== */}
      <div className="game-area" ref={gameAreaRef}>
        <GameCanvas onReady={handleCanvasReady} suppressBoardTooltips={suppressBoardTooltips} />
        {phase === 'board_destroy_selection' && <BoardDestroySelectionOverlay anchorRef={gameAreaRef} />}
        {pendingBoardExpansions > 0 && <BoardExpansionOverlay anchorRef={gameAreaRef} />}
      </div>

      {/* ===== PAUSE MENU OVERLAY ===== */}
      <PauseMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} onOpenLog={() => setIsLogOpen(true)} />

      {/* ===== SYMBOL SELECTION OVERLAY ===== */}
      <SymbolSelection />

      {/* ===== LOOT REWARD SELECTION OVERLAY ===== */}
      <LootRewardSelection />

      {/* ===== GAME OVER OVERLAY ===== */}
      {isInGame && phase === 'game_over' && (
        <div className="endgame-overlay endgame-overlay--defeat">
          <div className="endgame-panel endgame-panel--defeat-intro">
            <div className="endgame-title endgame-defeat">{t('game.gameOver', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn} - {t('game.notEnoughFood', language)}</div>
              <button
                className="endgame-btn"
                onClick={handleGameOverContinue}
              >
                {uiText(language, '계속', 'Continue', '继续', 'Продолжить')}
              </button>
          </div>
        </div>
      )}

      {isInGame && phase === 'victory' && (
        <div className="endgame-overlay endgame-overlay--victory">
          <div className="endgame-panel endgame-panel--victory-intro">
            <div className="endgame-title endgame-victory">{t('game.victory', language)}</div>
            <div className="endgame-subtitle">{t('game.turn', language)} {turn}</div>
            <button
              className="endgame-btn endgame-btn--victory"
              onClick={handleVictoryContinue}
            >
              {uiText(language, '계속', 'Continue', '继续', 'Продолжить')}
            </button>
          </div>
        </div>
      )}

      {/* ===== DEV OVERLAY (F1) ===== */}
      {import.meta.env.DEV && <DevOverlay />}

      {/* ===== DATA BROWSER (F2) ===== */}
      {import.meta.env.DEV && <DataBrowser />}

      {/* ===== SYMBOL POOL PROBABILITY (F3) ===== */}
      {import.meta.env.DEV && <SymbolPoolModal />}

      {/* ===== OWNED SYMBOLS LIST (button ⋯) ===== */}
      <OwnedSymbolsModal open={ownedSymbolsOpen} onClose={handleOwnedSymbolsClose} />

      {/* ===== EFFECT / EVENT LOG (F12) ===== */}
      <EffectLogOverlay isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* ===== BALANCE SIMULATOR (F4) ===== */}
      {import.meta.env.DEV && <BalanceSimulatorOverlay />}

      {isTutorialMode && tutorialDialogStep === 4 && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={TUTORIAL_CORN_CELLS} />
      )}
      {isTutorialMode && tutorialDialogStep === 5 && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_CORN_CELLS}
        />
      )}
      {isTutorialMode && tutorialDialogStep === 7 && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={[]} highlightBoard />
      )}
      {isTutorialMode && tutorialDialogStep === 17 && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_ADJACENCY_PREVIEW_CELLS}
        />
      )}
      {isTutorialMode && tutorialDialogStep === 18 && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={TUTORIAL_SEA_CELL} />
      )}
      {isTutorialMode && tutorialDialogStep === 20 && tutorialSpinStep === 'adjacency_done' && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_SEA_OCCUPIED_ADJACENT_CELLS}
          individualCells
          showGroupBackdrop={false}
          highlightSymbolBounds
        />
      )}
      {isTutorialMode && tutorialDialogStep === 21 && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_SEA_ADJACENT_CELLS}
        />
      )}
      {isTutorialMode && tutorialDialogStep === 22 && (
        <TutorialBoardHighlights
          anchorRef={gameAreaRef}
          cells={TUTORIAL_SEA_ADJACENT_CELLS}
          individualCells
          showGroupBackdrop={false}
          highlightSymbolBounds
        />
      )}
      {isTutorialMode && (
        tutorialDialogStep === 23 ||
        tutorialDialogStep === 24 ||
        tutorialDialogStep === 25
      ) && (
        <TutorialBoardHighlights anchorRef={gameAreaRef} cells={[]} highlightBoard />
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

      {isTutorialMode &&
        !(tutorialDialogStep === 12 && tutorialSpinStep !== 'monument_done') &&
        !(tutorialDialogStep === 20 && tutorialSpinStep !== 'adjacency_done') && (
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
            tutorialDialogStep === 11 ? 'tutorial-dialog-overlay--spin-button' : '',
            tutorialDialogStep === 12 ? 'tutorial-dialog-overlay--knowledge-status' : '',
            tutorialDialogStep === 17 || tutorialDialogStep === 18 ||
              tutorialDialogStep === 20 || tutorialDialogStep === 21 ||
              tutorialDialogStep === 22 || tutorialDialogStep === 23 ||
              tutorialDialogStep === 24 || tutorialDialogStep === 25
              ? 'tutorial-dialog-overlay--board'
              : '',
            tutorialDialogStep === 19 ? 'tutorial-dialog-overlay--spin-button' : '',
            tutorialDialogStep === 31 ? 'tutorial-dialog-overlay--finish' : '',
          ].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label={tutorialDialogLabel}
        >
          <div className="tutorial-dialog-text">
            {tutorialDialogSteps[tutorialDialogStep].map((line) => (
              <p key={line}>{renderTutorialText(line)}</p>
            ))}
            {tutorialDialogStep === 31 ? (
              <button
                type="button"
                className="tutorial-dialog-next tutorial-dialog-finish"
                onClick={handleTutorialFinish}
              >
                {tutorialFinishLabel}
              </button>
            ) : !TUTORIAL_REQUIRED_INTERACTION_STEPS.has(tutorialDialogStep) && (
              <span
                className="tutorial-dialog-continue-hint"
                aria-disabled={tutorialNextDisabled}
              >
                {tutorialAnywhereLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
