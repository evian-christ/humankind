import * as PIXI from 'pixi.js';
import { SYMBOLS } from '../../game/data/symbolDefinitions';
import { RELICS } from '../../game/data/relicDefinitions';
import { KNOWLEDGE_UPGRADES } from '../../game/data/knowledgeUpgrades';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

let assetsLoaded = false;

/** 지식 업그레이드 선택 카드용 64x64 스프라이트 경로 (없으면 000.png) */
const getUpgradeSpritePaths = (): string[] => {
    const paths = new Set<string>([`${ASSET_BASE_URL}assets/upgrades/000.png`]);
    for (const u of Object.values(KNOWLEDGE_UPGRADES)) {
        if (u.sprite && u.sprite !== '-' && u.sprite !== '-.png') {
            paths.add(`${ASSET_BASE_URL}assets/upgrades/${u.sprite}`);
        }
    }
    return Array.from(paths);
};

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    const symbolPaths = Object.values(SYMBOLS)
        .filter(s => s.sprite && s.sprite !== '-' && s.sprite !== '-.png')
        .map(s => `${ASSET_BASE_URL}assets/symbols/${s.sprite}`);
    const relicPaths = Object.values(RELICS)
        .filter(r => r.sprite && r.sprite !== '-' && r.sprite !== '-.png')
        .map(r => `${ASSET_BASE_URL}assets/relics/${r.sprite}`);
    const upgradePaths = getUpgradeSpritePaths();

    const allPaths = [
        `${ASSET_BASE_URL}assets/ui/slot_bg.png`,
        `${ASSET_BASE_URL}assets/ui/buttons/menu0.png`,
        `${ASSET_BASE_URL}assets/ui/buttons/menu1.png`,
        ...symbolPaths,
        ...relicPaths,
        ...upgradePaths,
    ];

    // 한 파일이 없어도 나머지(특히 slot_bg)는 캐시에 올려야 보드가 보인다.
    const results = await Promise.allSettled(allPaths.map((url) => PIXI.Assets.load(url)));
    const failed = results
        .map((r, i) => (r.status === 'rejected' ? allPaths[i] : null))
        .filter(Boolean) as string[];
    if (failed.length > 0) {
        console.warn('Some assets failed to load:', failed.length, 'file(s); proceeding anyway.');
    }
    assetsLoaded = true;
};
