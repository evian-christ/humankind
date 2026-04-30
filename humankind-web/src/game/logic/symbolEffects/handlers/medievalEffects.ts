import { S, SymbolType } from '../../../data/symbolDefinitions';
import type { SymbolEffectHandler } from '../core';

export const handleMedievalEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, adj, state }) => {
    switch (symbolInstance.definition.id) {
        case S.scholar: {
            let n = 0;
            for (const p of adj) {
                const t = boardGrid[p.x][p.y];
                if (t && !t.is_marked_for_destruction && t.definition.type === SymbolType.ANCIENT) {
                    t.is_marked_for_destruction = true;
                    n++;
                    state.contributors.push(p);
                }
            }
            state.bonusXpPerTurnDelta += n * 5;
            return true;
        }

        case S.holy_relic: {
            for (let bx = 0; bx < boardGrid.length; bx++) {
                for (let by = 0; by < (boardGrid[bx]?.length ?? 0); by++) {
                    const cell = boardGrid[bx][by];
                    if (cell && !cell.is_marked_for_destruction && cell.definition.type === SymbolType.RELIGION) {
                        state.knowledge += 7;
                        state.gold += 7;
                        return true;
                    }
                }
            }
            return true;
        }

        case S.pioneer:
            symbolInstance.is_marked_for_destruction = true;
            state.forceTerrainInNextChoices = true;
            return true;

        case S.edict:
            return true;

        case S.tax:
            return true;

        default:
            return false;
    }
};
