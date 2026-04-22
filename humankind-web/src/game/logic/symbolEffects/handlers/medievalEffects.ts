import { RELIGION_DOCTRINE_IDS, S, SymbolType } from '../../../data/symbolDefinitions';
import { BOARD_WIDTH } from '../core';
import type { SymbolEffectHandler } from '../core';

export const handleMedievalEffects: SymbolEffectHandler = ({ symbolInstance, boardGrid, x, y, adj, state }) => {
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
            state.knowledge += n * 10;
            return true;
        }

        case S.holy_relic: {
            state.knowledge += 5;
            const hasDoctrine = adj.some((p) => {
                const n = boardGrid[p.x][p.y];
                return n && RELIGION_DOCTRINE_IDS.has(n.definition.id) && !n.is_marked_for_destruction;
            });
            if (hasDoctrine) {
                symbolInstance.effect_counter = (symbolInstance.effect_counter || 0) + 1;
                if (symbolInstance.effect_counter >= 10) {
                    symbolInstance.effect_counter = 0;
                    state.bonusXpPerTurnDelta += 5;
                }
            }
            return true;
        }

        case S.telescope:
            state.knowledge += y * BOARD_WIDTH + x + 1;
            return true;

        case S.scales:
            state.knowledge += 8;
            return true;

        case S.pioneer:
            symbolInstance.is_marked_for_destruction = true;
            state.forceTerrainInNextChoices = true;
            return true;

        case S.edict:
            symbolInstance.is_marked_for_destruction = true;
            state.edictRemovalPendingFlag = true;
            return true;

        case S.embassy:
            symbolInstance.is_marked_for_destruction = true;
            state.freeSelectionRerollsAcc += 1;
            return true;

        case S.tax:
            return true;

        default:
            return false;
    }
};
