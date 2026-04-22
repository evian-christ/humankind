const ASSET_BASE_URL = import.meta.env.BASE_URL;

/** upgrades/ 폴더의 스프라이트를 불러옵니다. sprite가 없으면 000.png 사용 */
export function resolveUpgradeSprite(sprite: string | undefined): string {
    if (sprite && sprite !== '-' && sprite !== '-.png') return `${ASSET_BASE_URL}assets/upgrades/${sprite}`;
    return `${ASSET_BASE_URL}assets/upgrades/000.png`;
}

