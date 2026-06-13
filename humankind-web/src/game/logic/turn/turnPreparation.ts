import { S, SYMBOLS, SymbolType } from '../../data/symbolDefinitions';
import { getEnemyDefinitionForLevel, getEnemyPoolForLevel } from '../../data/enemyPools';
import {
    BARBARIAN_INVASION_GRACE_TURNS,
    BARBARIAN_INVASION_THREAT_STEP,
    getActiveStatusIdsForTurn,
} from '../../data/statusDefinitions';
import type { BoardGrid, BoardCoord, ThreatLabelKey, TurnPreparationInput, TurnPreparationOutput } from './turnTypes';

const createEmptyBoard = (width: number, height: number): BoardGrid => {
    return Array(width).fill(null).map(() => Array(height).fill(null));
};

const createEmptyBoardFromShape = (board: BoardGrid, width: number, height: number): BoardGrid => {
    if (board.length === 0) return createEmptyBoard(width, height);
    return board.map((col, x) => {
        const next = new Array<BoardGrid[number][number]>(col.length);
        for (let y = 0; y < col.length; y++) {
            if (Object.prototype.hasOwnProperty.call(board[x], y)) next[y] = null;
        }
        return next;
    });
};

const increaseBarbarianInvasionThreat = (current: number): number =>
    Math.min(100, Number((current + BARBARIAN_INVASION_THREAT_STEP).toFixed(1)));

const placeOralTraditionAtBoardCenter = (
    board: BoardGrid,
    playerSymbols: TurnPreparationInput['playerSymbols'],
): { board: BoardGrid; playerSymbols: TurnPreparationInput['playerSymbols'] } => {
    const symList = [...playerSymbols];
    const oralIdx = symList.findIndex((s) => s.definition.id === S.oral_tradition);
    if (oralIdx < 0) return { board, playerSymbols: symList };

    const oralInst = symList[oralIdx]!;
    const b = board.map((col) => col.map((cell) => cell));

    const ax = Math.floor(b.length / 2);
    const ay = Math.max(0, Math.floor((b[0]?.length ?? 1) / 2) - 1);
    let oralX = -1;
    let oralY = -1;

    for (let x = 0; x < b.length; x++) {
        for (let y = 0; y < (b[x]?.length ?? 0); y++) {
            const cell = b[x][y];
            if (cell && cell.instanceId === oralInst.instanceId) {
                if (oralX < 0) {
                    oralX = x;
                    oralY = y;
                }
                b[x][y] = null;
            }
        }
    }

    const occupant = b[ax]?.[ay] ?? null;
    if (occupant && occupant.instanceId !== oralInst.instanceId) {
        let moved = false;
        if (oralX >= 0 && b[oralX]?.[oralY] === null) {
            b[oralX][oralY] = occupant;
            moved = true;
        }
        for (let x = 0; x < b.length && !moved; x++) {
            for (let y = 0; y < (b[x]?.length ?? 0) && !moved; y++) {
                if (x === ax && y === ay) continue;
                if (!b[x][y]) {
                    b[x][y] = occupant;
                    moved = true;
                }
            }
        }
    }

    if (b[ax]) b[ax][ay] = oralInst;
    return { board: b, playerSymbols: symList };
};

export function prepareTurn(input: TurnPreparationInput): TurnPreparationOutput {
    const {
        board,
        playerSymbols,
        turn,
        level,
        boardWidth,
        boardHeight,
        unlockedKnowledgeUpgrades,
        threatState,
        rng,
        createSymbolInstance,
        getThreatLabel,
        forcedNaturalDisasterId = null,
    } = input;

    const {
        barbarianSymbolThreat,
        naturalDisasterThreat,
    } = threatState;

    const newPlayerSymbols = [...playerSymbols];
    const spinUpgrades = unlockedKnowledgeUpgrades || [];
    const newThreats: { instanceId: string; label: string; key: ThreatLabelKey }[] = [];
    let nextBarbarianSymbolThreat = barbarianSymbolThreat;

    if (turn > 0) {
        if (turn < BARBARIAN_INVASION_GRACE_TURNS) {
            nextBarbarianSymbolThreat = 0;
        } else {
            const currentBarbarianSymbolThreat = increaseBarbarianInvasionThreat(barbarianSymbolThreat);
            let spawnedBarbarianInvasion = false;
            if (rng.next() * 100 < currentBarbarianSymbolThreat) {
                const pool = getEnemyPoolForLevel(level);
                const enemyId = rng.pick(pool);
                const enemyDef = getEnemyDefinitionForLevel(enemyId, level);
                if (enemyDef) {
                    const inst = createSymbolInstance(enemyDef, spinUpgrades);
                    inst.spawnedByBarbarianInvasion = true;
                    inst.barbarianInvasionTurnsRemaining = 3;
                    newPlayerSymbols.push(inst);
                    const key = 'threat.barbarian_invasion';
                    newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel(key), key });
                    spawnedBarbarianInvasion = true;
                }
            }
            nextBarbarianSymbolThreat = spawnedBarbarianInvasion
                ? 0
                : currentBarbarianSymbolThreat;
        }
    }

    if (turn > 0 || forcedNaturalDisasterId !== null) {
        const shouldSpawnNaturalDisaster = forcedNaturalDisasterId !== null || rng.next() * 100 < 3;
        if (shouldSpawnNaturalDisaster) {
            const floodId = S.flood;
            const earthquakeId = S.earthquake;
            const droughtId = S.drought;
            const plagueId = S.plague;
            const heatwaveId = S.heatwave;
            const naturalDisasterIds: readonly number[] = [floodId, earthquakeId, droughtId, plagueId, heatwaveId];
            const pick = naturalDisasterIds.includes(forcedNaturalDisasterId ?? -1)
                ? forcedNaturalDisasterId!
                : rng.pick(naturalDisasterIds);

            const addDisaster = (
                symId: number,
                counterMin: number,
                counterMax: number,
                labelKey: Parameters<typeof getThreatLabel>[0],
            ) => {
                const def = SYMBOLS[symId];
                if (!def) return;
                const inst = createSymbolInstance(def, spinUpgrades);
                inst.effect_counter = rng.int(counterMin, counterMax);
                newPlayerSymbols.push(inst);
                newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel(labelKey), key: labelKey });
            };

            if (pick === floodId) {
                const count = rng.int(2, 3);
                for (let i = 0; i < count; i++) addDisaster(floodId, 6, 8, 'threat.flood');
            } else if (pick === earthquakeId) {
                const def = SYMBOLS[earthquakeId];
                if (def) {
                    const inst = createSymbolInstance(def, spinUpgrades);
                    newPlayerSymbols.push(inst);
                    const key = 'threat.earthquake';
                    newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel(key), key });
                }
            } else if (pick === droughtId) {
                const count = rng.int(3, 6);
                for (let i = 0; i < count; i++) addDisaster(droughtId, 5, 8, 'threat.drought');
            } else if (pick === plagueId) {
                addDisaster(plagueId, 2, 4, 'threat.plague');
            } else if (pick === heatwaveId) {
                addDisaster(heatwaveId, 4, 7, 'threat.heatwave');
            }
        }
    }

    const newBoard = createEmptyBoardFromShape(board, boardWidth, boardHeight);
    const combatAndEnemy = rng.shuffle(newPlayerSymbols
        .filter((s) => s.definition.type === SymbolType.ENEMY || s.definition.type === SymbolType.UNIT));
    const friendly = rng.shuffle(newPlayerSymbols
        .filter((s) => s.definition.type !== SymbolType.ENEMY && s.definition.type !== SymbolType.UNIT));
    const positions: BoardCoord[] = [];
    for (let x = 0; x < newBoard.length; x++) {
        for (let y = 0; y < (newBoard[x]?.length ?? 0); y++) {
            if (Object.prototype.hasOwnProperty.call(newBoard[x], y)) positions.push({ x, y });
        }
    }
    const shuffledSymbols = [...combatAndEnemy, ...friendly].slice(0, positions.length);

    const shuffledPositions = rng.shuffle(positions);

    shuffledSymbols.forEach((instance, idx) => {
        const pos = shuffledPositions[idx];
        if (pos) newBoard[pos.x][pos.y] = instance;
    });

    const anchored =
        turn === 0
            ? placeOralTraditionAtBoardCenter(newBoard, newPlayerSymbols)
            : { board: newBoard, playerSymbols: newPlayerSymbols };
    const anchoredBoard = anchored.board;
    const anchoredSymbols = anchored.playerSymbols;

    const newThreatLabels = new Map<string, { label: string; key: ThreatLabelKey }>(
        newThreats.map((n) => [n.instanceId, { label: n.label, key: n.key }]),
    );
    const pendingNewThreatFloats: TurnPreparationOutput['pendingNewThreatFloats'] = [];
    for (let x = 0; x < anchoredBoard.length; x++) {
        for (let y = 0; y < (anchoredBoard[x]?.length ?? 0); y++) {
            if (!Object.prototype.hasOwnProperty.call(anchoredBoard[x], y)) continue;
            const inst = anchoredBoard[x][y];
            if (inst && newThreatLabels.has(inst.instanceId)) {
                const threat = newThreatLabels.get(inst.instanceId)!;
                pendingNewThreatFloats.push({ x, y, label: threat.label, key: threat.key });
            }
        }
    }

    return {
        playerSymbols: anchoredSymbols,
        threatState: {
            barbarianSymbolThreat: turn > 0 ? nextBarbarianSymbolThreat : barbarianSymbolThreat,
            barbarianCampThreat: 0,
            naturalDisasterThreat: turn > 0 ? 3 : naturalDisasterThreat,
        },
        pendingNewThreatFloats,
        activeStatusIds: getActiveStatusIdsForTurn(turn),
        prevBoard: board,
        board: anchoredBoard,
        turn: turn + 1,
    };
}
