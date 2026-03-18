import * as PIXI from 'pixi.js';
import { SYMBOLS } from '../../game/data/symbolDefinitions';
import { RELICS } from '../../game/data/relicDefinitions';
import { KNOWLEDGE_UPGRADES } from '../../game/data/knowledgeUpgrades';

let assetsLoaded = false;

/** 지식 업그레이드 선택 카드용 64x64 스프라이트 경로 (없으면 000.png) */
const getUpgradeSpritePaths = (): string[] => {
    const paths = new Set<string>(['/assets/upgrades/000.png']);
    for (const u of Object.values(KNOWLEDGE_UPGRADES)) {
        if (u.sprite && u.sprite !== '-' && u.sprite !== '-.png') {
            paths.add(`/assets/upgrades/${u.sprite}`);
        }
    }
    return Array.from(paths);
};

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    try {
        const symbolPaths = Object.values(SYMBOLS)
            .filter(s => s.sprite && s.sprite !== '-' && s.sprite !== '-.png')
            .map(s => `/assets/symbols/${s.sprite}`);
        const relicPaths = Object.values(RELICS)
            .filter(r => r.sprite && r.sprite !== '-' && r.sprite !== '-.png')
            .map(r => `/assets/relics/${r.sprite}`);
        const upgradePaths = getUpgradeSpritePaths();

        await PIXI.Assets.load([
            '/assets/ui/slot_bg.png',
            '/assets/ui/buttons/menu0.png',
            '/assets/ui/buttons/menu1.png',
            ...symbolPaths,
            ...relicPaths,
            ...upgradePaths,
        ]);
        assetsLoaded = true;
    } catch (error) {
        console.warn("Some assets failed to load, proceeding anyway:", error);
    }
};
