import type { SymbolDefinition } from './symbolDefinitions';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

export const hasSymbolSprite = (sprite: string | undefined | null): boolean =>
    Boolean(sprite && sprite !== '-' && sprite !== '-.png');

export const getSymbolSpriteFileName = (symbolId: number): string =>
    `${String(symbolId).padStart(3, '0')}.png`;

export const getSymbolSpriteUrl = (
    symbol: Pick<SymbolDefinition, 'id' | 'sprite'>,
): string | null => {
    if (!hasSymbolSprite(symbol.sprite)) return null;
    return `${ASSET_BASE_URL}assets/symbols/${symbol.sprite}`;
};
