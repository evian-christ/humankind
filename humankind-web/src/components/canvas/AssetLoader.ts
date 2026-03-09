import * as PIXI from 'pixi.js';
import { SYMBOLS } from '../../game/data/symbolDefinitions';
import { RELICS } from '../../game/data/relicDefinitions';

let assetsLoaded = false;

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    try {
        const symbolPaths = Object.values(SYMBOLS)
            .filter(s => s.sprite && s.sprite !== '-' && s.sprite !== '-.png')
            .map(s => `/assets/symbols/${s.sprite}`);
        const relicPaths = Object.values(RELICS)
            .filter(r => r.sprite && r.sprite !== '-' && r.sprite !== '-.png')
            .map(r => `/assets/relics/${r.sprite}`);

        await PIXI.Assets.load([
            '/assets/ui/slot_bg.png',
            '/assets/ui/buttons/menu0.png',
            '/assets/ui/buttons/menu1.png',
            ...symbolPaths,
            ...relicPaths,
        ]);
        assetsLoaded = true;
    } catch (error) {
        console.warn("Some assets failed to load, proceeding anyway:", error);
    }
};
