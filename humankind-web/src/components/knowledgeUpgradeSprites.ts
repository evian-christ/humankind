const ASSET_BASE_URL = import.meta.env.BASE_URL;

const UPGRADE_SPRITE_VERSION: Record<string, string> = {
    '001.png': 'updated-20260512-2145',
    '002.png': 'updated-20260512-2328',
    '003.png': 'updated-20260512-2333',
    '004.png': 'updated-20260512-2356',
    '005.png': 'updated-20260512-2100',
    '006.png': 'updated-20260512-2338',
    '007.png': 'updated-20260512-2356',
    '008.png': 'updated-20260513-0002',
    '009.png': 'updated-20260512-2134',
    '010.png': 'updated-20260513-0019',
    '011.png': 'updated-20260506-0101',
    '012.png': 'updated-20260506-0104',
    '013.png': 'updated-20260513-0015',
    '014.png': 'updated-20260513-0016',
    '015.png': 'updated-20260513-0031',
    '016.png': 'updated-20260513-0020',
    '017.png': 'updated-20260506-0116',
    '018.png': 'updated-20260512-2104',
    '019.png': 'updated-20260506-0120',
    '020.png': 'updated-20260513-0033',
    '021.png': 'updated-20260513-0034',
    '022.png': 'updated-20260506-0135',
    '023.png': 'updated-20260506-0141',
    '024.png': 'updated-20260513-0035',
    '025.png': 'updated-20260506-0145',
    '026.png': 'updated-20260513-0036',
    '027.png': 'updated-20260513-0037',
    '028.png': 'updated-20260513-0038',
    '029.png': 'updated-20260513-0040',
    '030.png': 'updated-20260513-0041',
    '031.png': 'updated-20260513-0029',
    '032.png': 'updated-20260513-0042',
    '033.png': 'updated-20260513-0043',
    '034.png': 'updated-20260513-0044',
    '035.png': 'updated-20260513-0045',
    '036.png': 'updated-20260513-0046',
    '037.png': 'updated-20260513-0047',
    '038.png': 'updated-20260513-0048',
    '039.png': 'updated-20260513-0049',
    '040.png': 'updated-20260513-0050',
    '041.png': 'updated-20260513-0051',
    '042.png': 'updated-20260513-0052',
    '043.png': 'updated-20260513-0053',
    '044.png': 'updated-20260513-0054',
    '045.png': 'updated-20260513-0055',
    '046.png': 'updated-20260513-0056',
    '047.png': 'updated-20260513-0057',
    '048.png': 'updated-20260513-0058',
    '049.png': 'updated-20260513-0059',
    '050.png': 'updated-20260513-0100',
    '051.png': 'updated-20260513-0101',
    '052.png': 'updated-20260513-0102',
    '053.png': 'updated-20260513-0103',
    '054.png': 'updated-20260513-0104',
    '055.png': 'updated-20260513-0105',
    '056.png': 'updated-20260513-0106',
    '057.png': 'updated-20260513-0107',
    '058.png': 'updated-20260513-0108',
    '059.png': 'updated-20260513-0109',
    '060.png': 'updated-20260513-0110',
    '061.png': 'updated-20260513-0111',
    '062.png': 'updated-20260513-0112',
    '063.png': 'updated-20260513-0113',
    '068.png': 'updated-20260520-election',
    '072.png': 'updated-20260520-colonialism',
    '073.png': 'updated-20260521-tribal-federation',
    '074.png': 'updated-20260521-mercenaries',
    '075.png': 'updated-20260521-total-mobilization',
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
