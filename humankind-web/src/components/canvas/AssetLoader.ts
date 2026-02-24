import * as PIXI from 'pixi.js';

let assetsLoaded = false;

export const loadGameAssets = async () => {
    if (assetsLoaded) return;

    try {
        const availableSymbols = ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '013', '014', '015', '016', '017', '018', '019', '020', '021', '035'];
        const symbolPaths = availableSymbols.map(id => `./assets/symbols_new/${id}.png`);
        await PIXI.Assets.load([
            './assets/sprites/slot_bg.png',
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
