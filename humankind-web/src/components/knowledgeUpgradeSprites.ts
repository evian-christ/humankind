const ASSET_BASE_URL = import.meta.env.BASE_URL;

const UPGRADE_SPRITE_VERSION: Record<string, string> = {
    '001.png': 'updated-20260505-1354',
    '002.png': 'updated-20260505-1300',
    '003.png': 'updated-20260505-1541',
    '004.png': 'updated-20260505-1556',
    '005.png': 'updated-20260505-1552',
    '006.png': 'updated-20260505-1638',
    '007.png': 'updated-20260505-1641',
    '008.png': 'updated-20260505-1643',
    '009.png': 'updated-20260506-0019',
};

export function resolveUpgradeSpriteFile(sprite: string): string {
    const version = UPGRADE_SPRITE_VERSION[sprite];
    const query = version ? `?v=${version}` : '';
    return `${ASSET_BASE_URL}assets/upgrades/${sprite}${query}`;
}

export function hasUpgradeSprite(sprite: string | undefined): sprite is string {
    return Boolean(sprite && sprite !== '-' && sprite !== '-.png');
}

/** upgrades/ 폴더의 스프라이트 경로를 반환합니다. 스프라이트가 없으면 빈 상태로 둡니다. */
export function resolveUpgradeSprite(sprite: string | undefined): string | undefined {
    if (!hasUpgradeSprite(sprite)) return undefined;
    return resolveUpgradeSpriteFile(sprite);
}
