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
    '010.png': 'updated-20260506-0057',
    '011.png': 'updated-20260506-0101',
    '012.png': 'updated-20260506-0104',
    '013.png': 'updated-20260506-0106',
    '014.png': 'updated-20260506-0111',
    '015.png': 'updated-20260506-0115',
    '016.png': 'updated-20260506-0116',
    '017.png': 'updated-20260506-0116',
    '018.png': 'updated-20260506-0119',
    '019.png': 'updated-20260506-0120',
    '020.png': 'updated-20260506-0125',
    '021.png': 'updated-20260506-0130',
    '022.png': 'updated-20260506-0135',
    '023.png': 'updated-20260506-0141',
    '024.png': 'updated-20260506-0144',
    '025.png': 'updated-20260506-0145',
    '026.png': 'updated-20260506-0148',
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
