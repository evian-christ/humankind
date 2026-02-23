import * as PIXI from 'pixi.js';

let assetsLoaded = false;

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    try {
        const symbolPaths = Array.from({ length: 30 }, (_, i) => `./assets/sprites/${String(i + 1).padStart(3, '0')}.png`);
        await PIXI.Assets.load([
            './assets/sprites/slot_bg.png',
            './assets/sprites/pasture.png',
            './assets/ui/stonebar_1880x82.png',
            './assets/ui/buttons/menu0.png',
            './assets/ui/buttons/menu1.png',
            ...symbolPaths
        ]);
        assetsLoaded = true;
    } catch (error) {
        console.warn("Some assets failed to load, proceeding anyway:", error);
    }
};
