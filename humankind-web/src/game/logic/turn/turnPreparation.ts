import { STIRRUP_UPGRADE_ID } from '../../data/knowledgeUpgrades';
import { S, SYMBOLS, SymbolType, Sym, type SymbolDefinition } from '../../data/symbolDefinitions';
import { getBronzeWorkingHpBonus } from '../../state/gameCalculations';
import type { BoardGrid, BoardCoord, TurnPreparationInput, TurnPreparationOutput } from './turnTypes';

const createEmptyBoard = (width: number, height: number): BoardGrid => {
    return Array(width).fill(null).map(() => Array(height).fill(null));
};

const getAdjacentCoords = (x: number, y: number, width: number, height: number): BoardCoord[] => {
    const adj: BoardCoord[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) adj.push({ x: nx, y: ny });
        }
    }
    return adj;
};

const placeOralTraditionAtBoardCenter = (
    board: BoardGrid,
    playerSymbols: TurnPreparationInput['playerSymbols'],
): { board: BoardGrid; playerSymbols: TurnPreparationInput['playerSymbols'] } => {
    const symList = [...playerSymbols];
    const oralIdx = symList.findIndex((s) => s.definition.id === S.oral_tradition);
    if (oralIdx < 0) return { board, playerSymbols: symList };

    const oralInst = symList[oralIdx]!;
    const b = board.map((col) => [...col]);

    const ax = Math.floor(b.length / 2);
    const ay = Math.max(0, Math.floor((b[0]?.length ?? 1) / 2) - 1);

    for (let x = 0; x < b.length; x++) {
        for (let y = 0; y < (b[x]?.length ?? 0); y++) {
            const cell = b[x][y];
            if (cell && cell.instanceId === oralInst.instanceId) b[x][y] = null;
        }
    }

    const occupant = b[ax]?.[ay] ?? null;
    if (occupant && occupant.instanceId !== oralInst.instanceId) {
        let ox = -1;
        let oy = -1;
        for (let x = 0; x < b.length; x++) {
            for (let y = 0; y < (b[x]?.length ?? 0); y++) {
                const cell = b[x][y];
                if (cell && cell.instanceId === oralInst.instanceId) {
                    ox = x;
                    oy = y;
                }
            }
        }
        if (ox >= 0) b[ox][oy] = occupant;
    }

    if (b[ax]) b[ax][ay] = oralInst;
    return { board: b, playerSymbols: symList };
};

const applyWarriorEliteTransforms = (
    board: BoardGrid,
    playerSymbols: TurnPreparationInput['playerSymbols'],
    unlockedKnowledgeUpgrades: readonly number[],
    width: number,
    height: number,
): { board: BoardGrid; playerSymbols: TurnPreparationInput['playerSymbols'] } => {
    const upgrades = unlockedKnowledgeUpgrades || [];
    const b = board.map((col) => [...col]);
    const symList = [...playerSymbols];

    const removeFromList = (instanceId: string) => {
        const idx = symList.findIndex((s) => s.instanceId === instanceId);
        if (idx >= 0) symList.splice(idx, 1);
    };

    const makeElite = (base: TurnPreparationInput['playerSymbols'][number], def: SymbolDefinition) => {
        const baseHp = def.base_hp ?? 0;
        const enemyHp = baseHp + (upgrades.includes(2) ? getBronzeWorkingHpBonus(def) : 0);
        return {
            ...base,
            definition: def,
            enemy_hp: enemyHp,
            remaining_attacks: def.base_attack ? 3 : 0,
        };
    };

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const cell = b[x][y];
            if (!cell || cell.definition.id !== S.warrior) continue;

            if (upgrades.includes(STIRRUP_UPGRADE_ID)) {
                const horsePos = getAdjacentCoords(x, y, width, height).find((p) => b[p.x][p.y]?.definition.id === S.horse);
                if (horsePos) {
                    const horseInst = b[horsePos.x][horsePos.y]!;
                    b[horsePos.x][horsePos.y] = null;
                    removeFromList(horseInst.instanceId);
                    const knight = makeElite(cell, Sym.knight);
                    b[x][y] = knight;
                    const wi = symList.findIndex((s) => s.instanceId === cell.instanceId);
                    if (wi >= 0) symList[wi] = knight;
                    continue;
                }
            }

            if (upgrades.includes(21)) {
                const seaAdj = getAdjacentCoords(x, y, width, height).some((p) => b[p.x][p.y]?.definition.id === S.sea);
                if (seaAdj) {
                    const caravel = makeElite(cell, Sym.caravel);
                    b[x][y] = caravel;
                    const wi = symList.findIndex((s) => s.instanceId === cell.instanceId);
                    if (wi >= 0) symList[wi] = caravel;
                }
            }
        }
    }

    return { board: b, playerSymbols: symList };
};

export function prepareTurn(input: TurnPreparationInput): TurnPreparationOutput {
    const {
        board,
        playerSymbols,
        turn,
        era,
        boardWidth,
        boardHeight,
        unlockedKnowledgeUpgrades,
        threatState,
        rng,
        createSymbolInstance,
        getThreatLabel,
    } = input;

    let {
        barbarianSymbolThreat,
        barbarianCampThreat,
        naturalDisasterThreat,
    } = threatState;

    const newPlayerSymbols = [...playerSymbols];
    const spinUpgrades = unlockedKnowledgeUpgrades || [];
    const newThreats: { instanceId: string; label: string }[] = [];

    if (era === 1) {
        const castleSlow = spinUpgrades.includes(23);

        barbarianSymbolThreat += castleSlow ? 0.5 : 1;
        if (rng.next() * 100 < barbarianSymbolThreat) {
            barbarianSymbolThreat = 0;
            const enemyDef = Sym.enemy_warrior;
            if (enemyDef) {
                const inst = createSymbolInstance(enemyDef, spinUpgrades);
                newPlayerSymbols.push(inst);
                newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel('threat.barbarian_invasion') });
            }
        }

        barbarianCampThreat += castleSlow ? 0.1 : 0.2;
        if (rng.next() * 100 < barbarianCampThreat) {
            barbarianCampThreat = 0;
            const campDef = Sym.barbarian_camp;
            if (campDef) {
                const inst = createSymbolInstance(campDef, spinUpgrades);
                newPlayerSymbols.push(inst);
                newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel('threat.barbarian_camp') });
            }
        }

        naturalDisasterThreat += 0.5;
        if (rng.next() * 100 < naturalDisasterThreat) {
            naturalDisasterThreat = 0;
            const floodId = S.flood;
            const earthquakeId = S.earthquake;
            const droughtId = S.drought;
            const pick = rng.pick([floodId, earthquakeId, droughtId]);

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
                newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel(labelKey) });
            };

            if (pick === floodId) {
                const count = rng.int(2, 3);
                for (let i = 0; i < count; i++) addDisaster(floodId, 6, 8, 'threat.flood');
            } else if (pick === earthquakeId) {
                const def = SYMBOLS[earthquakeId];
                if (def) {
                    const inst = createSymbolInstance(def, spinUpgrades);
                    newPlayerSymbols.push(inst);
                    newThreats.push({ instanceId: inst.instanceId, label: getThreatLabel('threat.earthquake') });
                }
            } else {
                const count = rng.int(3, 6);
                for (let i = 0; i < count; i++) addDisaster(droughtId, 5, 8, 'threat.drought');
            }
        }
    }

    const newBoard = createEmptyBoard(boardWidth, boardHeight);
    const combatAndEnemy = rng.shuffle(newPlayerSymbols
        .filter((s) => s.definition.type === SymbolType.ENEMY || s.definition.type === SymbolType.UNIT));
    const friendly = rng.shuffle(newPlayerSymbols
        .filter((s) => s.definition.type !== SymbolType.ENEMY && s.definition.type !== SymbolType.UNIT));
    const shuffledSymbols = [...combatAndEnemy, ...friendly].slice(0, boardWidth * boardHeight);

    const positions: BoardCoord[] = [];
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            positions.push({ x, y });
        }
    }
    const shuffledPositions = rng.shuffle(positions);

    shuffledSymbols.forEach((instance, idx) => {
        const pos = shuffledPositions[idx];
        if (pos) newBoard[pos.x][pos.y] = instance;
    });

    const { board: placedBoard, playerSymbols: placedSymbols } = applyWarriorEliteTransforms(
        newBoard,
        newPlayerSymbols,
        spinUpgrades,
        boardWidth,
        boardHeight,
    );

    const anchored =
        turn === 0
            ? placeOralTraditionAtBoardCenter(placedBoard, placedSymbols)
            : { board: placedBoard, playerSymbols: placedSymbols };
    const anchoredBoard = anchored.board;
    const anchoredSymbols = anchored.playerSymbols;

    const newThreatLabels = new Map<string, string>(newThreats.map((n) => [n.instanceId, n.label]));
    const pendingNewThreatFloats: TurnPreparationOutput['pendingNewThreatFloats'] = [];
    for (let x = 0; x < boardWidth; x++) {
        for (let y = 0; y < boardHeight; y++) {
            const inst = anchoredBoard[x][y];
            if (inst && newThreatLabels.has(inst.instanceId)) {
                pendingNewThreatFloats.push({ x, y, label: newThreatLabels.get(inst.instanceId)! });
            }
        }
    }

    return {
        playerSymbols: anchoredSymbols,
        threatState: {
            barbarianSymbolThreat,
            barbarianCampThreat,
            naturalDisasterThreat,
        },
        pendingNewThreatFloats,
        prevBoard: board,
        board: anchoredBoard,
        turn: turn + 1,
    };
}
