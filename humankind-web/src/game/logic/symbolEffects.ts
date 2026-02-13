import type { PlayerSymbolInstance } from '../types';

export interface EffectResult {
    food: number;
    exp: number;
    gold: number;
}

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 4;

const getNearbyCoordinates = (x: number, y: number): { x: number, y: number }[] => {
    const nearby: { x: number, y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                nearby.push({ x: nx, y: ny });
            }
        }
    }
    return nearby;
};

const isReligionSymbol = (id: number): boolean => {
    return id >= 15 && id <= 18;
};

export const processSingleSymbolEffects = (
    symbolInstance: PlayerSymbolInstance,
    boardGrid: (PlayerSymbolInstance | null)[][],
    x: number,
    y: number
): EffectResult => {
    const definition = symbolInstance.definition;
    let food = definition.passive_food;
    let exp = 0;
    let gold = 0;

    symbolInstance.effect_counter = (symbolInstance.effect_counter || 0);

    switch (definition.id) {
        case 1: // Wheat
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 6) {
                food += 8;
            }
            break;
        case 2: // Rice
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 8) {
                food += 11;
            }
            break;
        case 3: // Fish
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 5) {
                symbolInstance.is_marked_for_destruction = true;
            }
            break;
        case 4: { // Fishing Boat
            getNearbyCoordinates(x, y).forEach(pos => {
                const target = boardGrid[pos.x][pos.y];
                if (target && target.definition.id === 3) {
                    target.is_marked_for_destruction = true;
                }
            });
            break;
        }
        case 5: // Banana
            if (symbolInstance.effect_counter < 10) {
                symbolInstance.effect_counter++;
                food += (1 - definition.passive_food);
            } else {
                food += (2 - definition.passive_food);
            }
            break;
        case 6: { // Sugar
            let sugarCount = 0;
            getNearbyCoordinates(x, y).forEach(pos => {
                const target = boardGrid[pos.x][pos.y];
                if (target && target.definition.id === 6) sugarCount++;
            });
            food += sugarCount;
            break;
        }
        case 11: { // Cow
            let hasCow = false;
            getNearbyCoordinates(x, y).forEach(pos => {
                const target = boardGrid[pos.x][pos.y];
                if (target && target.definition.id === 11) hasCow = true;
            });
            if (hasCow) food += 1;
            break;
        }
        case 12: // Sheep
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 10) {
                gold += 1;
            }
            break;
        case 13: // Library
            exp += 1;
            break;
        case 14: // Ritual
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter >= 3) {
                symbolInstance.is_marked_for_destruction = true;
                exp += 3;
            }
            break;
        case 15: // Protestantism
        case 16: // Buddhism
        case 17: // Hinduism
        case 18: { // Islam
            let nearReligion = 0;
            getNearbyCoordinates(x, y).forEach(pos => {
                const target = boardGrid[pos.x][pos.y];
                if (target && isReligionSymbol(target.definition.id)) nearReligion++;
            });
            if (nearReligion > 0) food -= 50 * nearReligion;

            if (definition.id === 15) {
                let nearSymbols = 0;
                getNearbyCoordinates(x, y).forEach(pos => {
                    if (boardGrid[pos.x][pos.y]) nearSymbols++;
                });
                food += nearSymbols * 2;
                exp += 1;
            }
            break;
        }
        case 29: // Campfire
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter % 5 === 0) food += 5;
            break;

        case 32: // Wine
            symbolInstance.effect_counter++;
            exp -= 1;
            if (symbolInstance.effect_counter >= 3) symbolInstance.is_marked_for_destruction = true;
            break;

        case 33: // Taxation
            symbolInstance.effect_counter++;
            if (symbolInstance.effect_counter <= 3) gold += 2;
            if (symbolInstance.effect_counter >= 3) symbolInstance.is_marked_for_destruction = true;
            break;

        case 34: { // Merchant
            let nearbyCount = 0;
            getNearbyCoordinates(x, y).forEach(pos => {
                if (boardGrid[pos.x][pos.y]) nearbyCount++;
            });
            gold += nearbyCount;
            break;
        }

        case 35: { // Guild
            let emptyCount = 0;
            getNearbyCoordinates(x, y).forEach(pos => {
                if (!boardGrid[pos.x][pos.y]) emptyCount++;
            });
            gold += emptyCount * 5;
            break;
        }
    }

    return { food, exp, gold };
};
