import * as PIXI from 'pixi.js';
import { SYMBOLS } from '../../game/data/symbolDefinitions';
import { RELICS } from '../../game/data/relicDefinitions';
import { KNOWLEDGE_UPGRADES } from '../../game/data/knowledgeUpgrades';
import { STATUSES } from '../../game/data/statusDefinitions';
import {
    FOOD_RESOURCE_ICON_URL,
    GOLD_RESOURCE_ICON_URL,
    KNOWLEDGE_RESOURCE_ICON_URL,
    RELIC_PANEL_TITLE_ICON_URL,
} from '../../uiAssetUrls';
import { hasUpgradeSprite, resolveUpgradeSpriteFile } from '../knowledgeUpgradeSprites';
import { getSymbolSpriteUrl } from '../../game/data/symbolSpritePaths';

const ASSET_BASE_URL = import.meta.env.BASE_URL;

let assetsLoaded = false;

/** 지식 업그레이드 선택 카드용 64x64 스프라이트 경로 (없으면 000.png) */
const getUpgradeSpritePaths = (): string[] => {
    const paths = new Set<string>();
    for (const u of Object.values(KNOWLEDGE_UPGRADES)) {
        if (hasUpgradeSprite(u.sprite)) {
            paths.add(resolveUpgradeSpriteFile(u.sprite));
        }
    }
    return Array.from(paths);
};

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    const symbolPaths = Object.values(SYMBOLS)
        .map(getSymbolSpriteUrl)
        .filter(Boolean) as string[];
    const relicPaths = Object.values(RELICS)
        .filter(r => r.sprite && r.sprite !== '-' && r.sprite !== '-.png')
        .map(r => `${ASSET_BASE_URL}assets/relics/${r.sprite}`);
    const statusPaths = Object.values(STATUSES)
        .filter(s => s.sprite && s.sprite !== '-' && s.sprite !== '-.png')
        .map(s => `${ASSET_BASE_URL}assets/status/${s.sprite}`);
    const upgradePaths = getUpgradeSpritePaths();

    const allPaths = [
        `${ASSET_BASE_URL}assets/ui/slot_bg.png`,
        FOOD_RESOURCE_ICON_URL,
        GOLD_RESOURCE_ICON_URL,
        KNOWLEDGE_RESOURCE_ICON_URL,
        RELIC_PANEL_TITLE_ICON_URL,
        `${ASSET_BASE_URL}assets/ui/buttons/menu0.png`,
        `${ASSET_BASE_URL}assets/ui/buttons/menu1.png`,
        ...symbolPaths,
        ...relicPaths,
        ...statusPaths,
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
