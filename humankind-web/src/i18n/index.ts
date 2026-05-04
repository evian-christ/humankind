import type { Language } from '../game/state/settingsStore';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    COLONIALISM_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    HORSEMANSHIP_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MILITARY_SCIENCE_UPGRADE_ID,
    MODERN_AGRICULTURE_UPGRADE_ID,
    MINING_UPGRADE_ID,
    NATIONALISM_UPGRADE_ID,
    NOMADIC_TRADITION_UPGRADE_ID,
    OCEANIC_ROUTES_UPGRADE_ID,
    OASIS_RECOVERY_UPGRADE_ID,
    PASTURE_MANAGEMENT_UPGRADE_ID,
    PASTORALISM_UPGRADE_ID,
    PLANTATION_UPGRADE_ID,
    PRESERVATION_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    STATE_LABOR_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
} from '../game/data/knowledgeUpgrades';

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Pause Menu
        'pause.title': 'PAUSED',
        'pause.resume': 'RESUME',
        'pause.settings': 'SETTINGS',
        'pause.mainMenu': 'MAIN MENU',

        // Settings
        'settings.title': 'SETTINGS',
        'settings.resolution': 'Resolution',
        'settings.language': 'Language',
        'settings.back': 'BACK',
        'settings.effectSpeed': 'Effect Speed',
        'settings.spinSpeed': 'Spin Speed',
        'settings.lang.en': 'English',
        'settings.lang.ko': 'Korean',
        'settings.tab.gameplay': 'Gameplay',
        'settings.tab.graphics': 'Graphics',
        'settings.tab.general': 'General',
        'settings.fullscreen': 'Fullscreen',
        'settings.fullscreen.on': 'On',
        'settings.fullscreen.off': 'Off',

        // Game UI
        'game.spin': 'SPIN',
        'game.turn': 'Turn',
        'game.food': 'Food',
        'game.gold': 'Gold',
        'game.knowledge': 'KN',
        'game.era': 'Era',
        'game.foodDemand': 'The people demand {amount} food in {turns} turns',
        'game.foodDemandFlavor': 'In {turns} turns, the people demand {amount} food.',
        'game.gameOver': 'GAME OVER',
        'game.victory': 'VICTORY!',
        'game.notEnoughFood': 'Not enough food',
        'game.restart': 'RESTART',
        'game.chooseSymbol': 'Choose a Symbol',
        'game.chooseRelic': 'Choose a Relic',
        'game.relicShopTitle': 'Relic Shop — New stock in {turns} turns',
        'game.relicShopTitleShort': 'Relic Shop',
        'game.relicShopNewStockHint': '유물 상점 — 신규 입고',
        'game.relicShopNewStockAria': '유물 상점, 신규 입고',
        'game.relicPanelTitle': 'Relics',
        'game.relicShopBuyDiscountAria': 'Buy for {sale} gold (original price {original})',
        'game.chooseUpgrade': 'Choose a Knowledge Upgrade',
        'game.knowledgeUpgradeTreeTitle': 'Knowledge Upgrades',
        'game.levelUpResearchPointsLabel': 'Research points',
        'game.spendLevelUpResearchPointsFirst': 'Spend research points in Knowledge Upgrades first.',
        'game.levelUpResearchPointsRequired': 'Research points required',
        'game.knowledgeHudPendingTab': 'NEW',
        'game.knowledgeHudPendingTabAria': 'Knowledge upgrades — research available to spend',
        'game.knowledgeHudButtonHintPending': '{title} — research available to spend',
        'game.noUpgradesAvailable': 'No upgrades available',
        'knowledgeUpgrade.effectCompare.beforeLabel': 'Before',
        'knowledgeUpgrade.effectCompare.afterLabel': 'After',
        'knowledgeUpgrade.requiresArchery': 'Requires Archery research first',
        'knowledgeUpgrade.requiresArcheryShort': 'Needs Archery',
        'knowledgeUpgrade.requiresAgricultureShort': 'Needs Agriculture',
        'knowledgeUpgrade.requiresPastoralismShort': 'Needs Pastoralism',
        'knowledgeUpgrade.requiresFisheriesShort': 'Needs Fisheries',
        'knowledgeUpgrade.requiresForeignTradeShort': 'Needs Foreign Trade',
        'knowledgeUpgrade.requiresTradeGoodsExchangeShort': 'Needs Trade Goods Exchange',
        'knowledgeUpgrade.requiresDryStorageShort': 'Needs Dry Storage',
        'knowledgeUpgrade.requiresCaravanseraiShort': 'Needs Caravanserai',
        'knowledgeUpgrade.requiresSeafaringShort': 'Needs Navigation',
        'knowledgeUpgrade.requiresCelestialNavigationShort': 'Needs Celestial Navigation',
        'knowledgeUpgrade.requiresHuntingShort': 'Needs Hunting',
        'knowledgeUpgrade.requiresTrackingShort': 'Needs Tracking',
        'knowledgeUpgrade.requiresTanningShort': 'Needs Tanning',
        'knowledgeUpgrade.requiresForestryShort': 'Needs Forestry',
        'knowledgeUpgrade.requiresMiningShort': 'Needs Mining',
        'knowledgeUpgrade.requiresPlantationShort': 'Needs Plantation',
        'knowledgeUpgrade.requiresJungleExpeditionShort': 'Needs Jungle Expedition',
        'knowledgeUpgrade.requiresMaritimeTradeShort': 'Needs Maritime Trade',
        'knowledgeUpgrade.requiresFisheryGuildShort': 'Needs Fishery Guild',
        'knowledgeUpgrade.requiresWritingShort': 'Needs Writing System',
        'knowledgeUpgrade.requiresAncientShort': 'Needs Ancient Era',
        'knowledgeUpgrade.requiresFeudalismShort': 'Needs Medieval Age',
        'knowledgeUpgrade.requiresModernAgeShort': 'Needs Modern Age',
        'knowledgeUpgrade.requiresIrrigationShort': 'Needs Irrigation',
        'knowledgeUpgrade.requiresThreeFieldShort': 'Needs Three-field System',
        'knowledgeUpgrade.requiresAgriculturalSurplusShort': 'Needs Agricultural Surplus',
        'knowledgeUpgrade.requiresNomadicTraditionShort': 'Needs Nomadic Tradition',
        'knowledgeUpgrade.requiresIronWorkingShort': 'Needs Iron Working',
        'knowledgeUpgrade.requiresMechanicsShort': 'Needs Mechanics',
        'knowledgeUpgrade.requiresGunpowderShort': 'Needs Gunpowder',
        'knowledgeUpgrade.requiresBallisticsShort': 'Needs Ballistics',
        'knowledgeUpgrade.symbolDescAfter.2.warrior': 'Warrior becomes Knight.',
        'knowledgeUpgrade.symbolDescAfter.56.archer': 'Archer becomes Crossbowman.',
        'knowledgeUpgrade.symbolDescAfter.57.knight': 'Knight becomes Musketman.',
        'knowledgeUpgrade.symbolDescAfter.58.crossbowman': 'Crossbowman becomes Cannon.',
        'knowledgeUpgrade.symbolDescAfter.59.musketman': 'Musketman becomes Infantry.',
        'knowledgeUpgrade.symbolDescAfter.3.wheat':
            'Wheat: every 10 turns: 10 Food. Per adjacent Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.3.rice':
            'Rice: every 20 turns: 25 Food. Per adjacent Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.27.wheat':
            'Wheat: every 10 turns: 15 Food. Adjacent to Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.27.rice':
            'Rice: every 20 turns: 30 Food. Adjacent to Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.7.plains': '+2 Food.',
        'knowledgeUpgrade.symbolDescAfter.28.fish': 'With 1 Sea: +2 Food; 2 Seas: +3 Food; 3+ Seas: +5 Food.',
        'knowledgeUpgrade.symbolDescAfter.28.crab': 'With 1 Sea: +2 Food, +1 Gold; 2 Seas: +3 Food, +2 Gold; 3+ Seas: +3 Food, +2 Gold.',
        'knowledgeUpgrade.symbolDescAfter.42.fish': 'With 1 Sea: +3 Food; 2 Seas: +5 Food; 3+ Seas: +10 Food.',
        'knowledgeUpgrade.symbolDescAfter.42.crab': 'With 1 Sea: +3 Food, +3 Gold; 2 Seas: +5 Food, +5 Gold; 3+ Seas: +5 Food, +5 Gold.',
        'knowledgeUpgrade.symbolDescAfter.29.sea': '+1 Gold per 2 adjacent symbols.',
        'knowledgeUpgrade.symbolDescAfter.41.sea': '+1 Gold per 3 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.41.seaWithCelestial': '+1 Gold per 2 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.29.pearl': 'With 1 Sea: +4 Gold; 2 Seas: +5 Gold; 3+ Seas: +7 Gold.',
        'knowledgeUpgrade.symbolDescAfter.43.sea': '+2 Gold per 2 adjacent symbols.',
        'knowledgeUpgrade.symbolDescAfter.43.seaWithShipbuilding': '+2 Gold per 2 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.43.pearl': 'With 1 Sea: +5 Gold; 2 Seas: +7 Gold; 3+ Seas: +10 Gold.',
        'knowledgeUpgrade.symbolDescAfter.44.fish': 'With 1 Sea: +5 Food; 2 Seas: +8 Food; 3+ Seas: +15 Food.',
        'knowledgeUpgrade.symbolDescAfter.44.crab': 'With 1 Sea: +5 Food, +5 Gold; 2 Seas: +8 Food, +8 Gold; 3+ Seas: +8 Food, +8 Gold.',
        'knowledgeUpgrade.symbolDescAfter.44.pearl': 'With 1 Sea: +10 Gold; 2 Seas: +20 Gold; 3+ Seas: +30 Gold.',
        'knowledgeUpgrade.symbolDescAfter.44.sea': '+2 Gold per adjacent symbol.',
        'knowledgeUpgrade.symbolDescAfter.44.seaWithShipbuilding': '+2 Gold per adjacent symbol. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.30.rainforest': '+3 Food.',
        'knowledgeUpgrade.symbolDescAfter.30.stone':
            '+1 Gold; when a Mountain is in the same column: +5 additional Gold.',
        'knowledgeUpgrade.symbolDescAfter.45.banana': '+1 Food; every 7 times adjacent to Rainforest: +1 additional Food production.',
        'knowledgeUpgrade.symbolDescAfter.45.rainforest': '+3 Food, +3 Gold.',
        'knowledgeUpgrade.symbolDescAfter.48.forest': 'If 3 or more Forests are placed on the board: +3 Food; 5 or more: +3 Gold; if Forest is the only terrain on the board: +3 Food.',
        'knowledgeUpgrade.symbolDescAfter.48.mushroom': '+4 Food, +4 Knowledge; if not adjacent to Forest: destroy.',
        'knowledgeUpgrade.symbolDescAfter.48.deer': '+1 Food per adjacent Forest. When adjacent to a ranged unit: Tracker Archer training opportunity.',
        'knowledgeUpgrade.symbolDescAfter.49.fur': '+1 Gold per Forest placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.49.deer': '+2 Food per adjacent Forest. When adjacent to a ranged unit: Tracker Archer training opportunity.',
        'knowledgeUpgrade.symbolDescAfter.50.forest': 'If 3 or more Forests are placed on the board: +5 Food; 5 or more: +5 Gold; 7 or more: +3 Knowledge; if Forest is the only terrain on the board: production x2.',
        'knowledgeUpgrade.symbolDescAfter.51.deer': '+3 Food per adjacent Forest. When adjacent to a ranged unit: Tracker Archer training opportunity.',
        'knowledgeUpgrade.symbolDescAfter.51.mushroom': '+9 Food, +9 Knowledge; if not adjacent to Forest: destroy.',
        'knowledgeUpgrade.symbolDescAfter.47.rainforest': '+5 Food, +5 Gold, +5 Knowledge.',
        'knowledgeUpgrade.symbolDescAfter.47.expedition': 'When adjacent to Rainforest: +1-10 Food, +1-10 Gold, and +1-10 Knowledge.',
        'knowledgeUpgrade.symbolDescAfter.15.mountain': '+2 Food; when adjacent to enemy units: they lose 3 HP each spin.',
        'knowledgeUpgrade.symbolDescAfter.26.sheep':
            '+1 Food; 10% chance to produce Sheep; 10% chance to produce Wool. Butcher when adjacent to Plains: +5 Food, +5 Gold.',
        'knowledgeUpgrade.symbolDescAfter.26.cattle':
            '+1 Food; 10% chance to produce Cattle. Butcher when adjacent to Plains: +10 Food.',
        'game.reroll': 'Reroll',
        'game.rerollKnowledgeUpgrade': 'Replace this card with another upgrade (once per choice)',
        'game.skip': 'Skip',
        'game.back': 'Back',
        'game.attack': 'Attack',
        'game.defense': 'Defense',
        'ownedSymbols.title': 'Owned Symbols',
        'ownedSymbols.close': 'Close',
        'ownedSymbols.empty': 'No owned symbols',
        /** HUD 기본 생산 툴팁: 식량·골드·지식은 `food16x16.png` / `gold16x16.png` / `knowledge16x16.png` */
        'game.hudBaseProductionShort': 'Base production +{n}',

        // Pre-game: Demo / Stage / Leader
        'pregame.demoTitle': 'Humankind in a Nutshell Gameplay Demo v0.1',
        'pregame.demoSubtitle': 'A quick primer before you choose your stage.',
        'pregame.demoTutorialTitle': 'How to Play',
        'pregame.demoTutorial.1': 'Your goal is to survive the food payments and grow your civilization by stacking strong symbol synergies.',
        'pregame.demoTutorial.2': 'Each turn, press SPIN. Your owned symbols are placed randomly on the 5x4 board, then their effects resolve automatically.',
        'pregame.demoTutorial.3': 'Food keeps you alive, Gold pays for rerolls and relics, and Knowledge drives era progress and stronger upgrades.',
        'pregame.demoTutorial.4': 'After turns and events, you gain chances to add new symbols. Favor symbols that help each other through adjacency, terrain, or destruction effects.',
        'pregame.demoTutorial.5': 'Every 10 turns, the people demand Food. If you cannot pay, the run ends, so keep your economy stable while scaling up.',
        'pregame.demoPlay': 'Play',
        'pregame.stageTitle': 'Select Stage',
        'pregame.difficultyLabel': 'Stage',
        'pregame.leaderTitle': 'Please select a leader',
        'pregame.leaderPortraitPlaceholder': 'No portrait',
        'pregame.leaderPlay': 'Select',
        'pregame.draftTitle': 'Choose your starting symbols',
        'pregame.draftProgress': 'Pick {current} / {total}',
        'pregame.picks': 'picks',
        'stage.1.name': '1',
        'stage.2.name': '2',
        'stage.3.name': '3',
        'stage.4.name': '4',
        'stage.5.name': '5',
        'stage.6.name': '6',
        'stage.7.name': '7',
        'stage.8.name': '8',
        'stage.9.name': '9',
        'stage.10.name': '10',
        'stage.11.name': '11',
        'stage.12.name': '12',
        'stage.13.name': '13',
        'stage.14.name': '14',
        'stage.15.name': '15',
        'stage.16.name': '16',
        'stage.17.name': '17',
        'stage.18.name': '18',
        'stage.19.name': '19',
        'stage.20.name': '20',
        'leader.ramesses.name': 'Ramesses II',
        'leader.ramesses.nameSubtitle': 'Pharaoh of Egypt',
        'leader.ramesses.desc': 'Main: Golden Trade / Sub: Relic Vault.',
        'leader.ramesses.main.name': 'Golden Trade',
        'leader.ramesses.main.desc': 'Whenever the Relic Shop restocks, one random relic in stock is 50% off.',
        'leader.ramesses.sub.name': 'Relic Vault',
        'leader.ramesses.sub.desc': 'For each relic you own: +1 Knowledge per turn.',
        'leader.shihuang.name': 'Qin Shi Huang',
        'leader.shihuang.nameSubtitle': 'First Emperor of Qin',
        'leader.shihuang.desc': 'Main: Heaven and Earth Prosper / Sub: Foundations of Unification.',
        'leader.shihuang.main.name': 'Heaven and Earth Prosper',
        'leader.shihuang.main.desc': 'Per 2 symbols on the board: +1 Food per turn. Per 2 empty board slots: +1 Knowledge per turn.',
        'leader.shihuang.sub.name': 'Foundations of Unification',
        'leader.shihuang.sub.desc': 'Each time you enter a new era, gain 1 Ancient Relic Debris and 1 Ancient Tribal Joining.',
        'leader.locked.name': '???',
        'leader.locked.desc': 'Not available yet.',
        'leader.locked.main.name': '—',
        'leader.locked.main.desc': 'This leader will be added in a future update.',
        'leader.locked.sub.name': '—',
        'leader.locked.sub.desc': '—',

        // Threat labels (floating text on first placement)
        'threat.barbarian_invasion': 'Barbarian invasion',
        'threat.barbarian_camp': 'Barbarian camp',
        'threat.flood': 'Flood',
        'threat.earthquake': 'Earthquake',
        'threat.drought': 'Drought',

        // Era Unlock
        'eraUnlock.title': 'Medieval Era Begins',
        'eraUnlock.desc': 'Choose a path for your civilization',
        'eraUnlock.religion': 'Unlock Religion',
        'eraUnlock.religion_desc': 'Christianity, Islam, Buddhism, and Hinduism become available in the symbol pool.',
        'eraUnlock.knowledge': 'Permanent +100 Knowledge',
        'eraUnlock.knowledge_desc': 'Gain +100 Knowledge every turn, permanently.',

        // Era names
        'era.special': 'Religion',
        'era.specialSymbol': 'Special',
        'era.normal': 'Normal',
        'era.ancient': 'Ancient',
        'era.medieval': 'Medieval',
        'era.modern': 'Modern',
        'era.terrain': 'Terrain',
        'era.unit': 'Unit',
        'era.enemy': 'Enemy',
        'era.disaster': 'Disaster',

        // Tags
        'tag.religion': 'Religion',
        'tag.terrain': 'Terrain',
        'tag.water': 'Water',
        'tag.expert': 'Expert',
        'tag.unit': 'Unit',
        'tag.melee': 'Melee',
        'tag.ranged': 'Ranged',

        // Data Browser
        'dataBrowser.title': 'DATA BROWSER',
        'dataBrowser.symbols': 'Symbols',
        'dataBrowser.relics': 'Relics',
        'dataBrowser.searchPlaceholder': 'Search (name, desc, ID)...',
        'dataBrowser.allEras': 'All Types',
        'dataBrowser.allTypes': 'All Categories',
        'dataBrowser.friendly': 'Friendly',
        'dataBrowser.enemy': 'Enemy',
        'dataBrowser.combat': 'Combat',
        'dataBrowser.colName': 'Name',
        'dataBrowser.colEra': 'Type',
        'dataBrowser.colBasePool': 'Base Pool',
        'dataBrowser.colType': 'Type',
        'dataBrowser.colCost': 'Cost',
        'dataBrowser.colTags': 'Tags',
        'dataBrowser.colDesc': 'Desc',
        'dataBrowser.colPlayerDesc': 'Player Desc',
        'dataBrowser.colSprite': 'Sprite',
        'dataBrowser.colIcon': 'Icon',
        'dataBrowser.colColor': 'Color',
        'dataBrowser.knowledgeUpgrades': 'Knowledge Upgrades',
        'dataBrowser.intensity': 'Intensity',
        'dataBrowser.enemies': 'Enemies',
        'dataBrowser.effectType.food_loss': 'Food Loss',
        'dataBrowser.effectType.gold_loss': 'Gold Loss',
        'dataBrowser.effectType.mixed_loss': 'Mixed Loss',
        'dataBrowser.effectType.destruction': 'Destruction',
        'dataBrowser.effectType.debuff': 'Debuff',
        'dataBrowser.effectType.passive': 'Passive',
        'dataBrowser.effectType.on_acquire': 'On Acquire',
        'dataBrowser.effectType.conditional': 'Conditional',



        // ── Symbol Names ──
        'symbol.wheat.name': 'Wheat',
        'symbol.rice.name': 'Rice',
        'symbol.cattle.name': 'Cattle',
        'symbol.banana.name': 'Banana',
        'symbol.fish.name': 'Fish',
        'symbol.sea.name': 'Sea',
        'symbol.stone.name': 'Stone',
        'symbol.grassland.name': 'Grassland',
        'symbol.monument.name': 'Monument',
        'symbol.oasis.name': 'Oasis',
        'symbol.oral_tradition.name': 'Oral Tradition',
        'symbol.rainforest.name': 'Rainforest',
        'symbol.plains.name': 'Plains',
        'symbol.mountain.name': 'Mountain',
        'symbol.totem.name': 'Totem',
        'symbol.omen.name': 'Omen',
        'symbol.campfire.name': 'Campfire',
        'symbol.pottery.name': 'Pottery',
        'symbol.tribal_village.name': 'Tribal Village',
        'symbol.merchant.name': 'Merchant',
        'symbol.horse.name': 'Horse',
        'symbol.crab.name': 'Crab',
        'symbol.library.name': 'Library',
        'symbol.pearl.name': 'Pearl',
        'symbol.compass.name': 'Compass',
        'symbol.desert.name': 'Desert',
        'symbol.forest.name': 'Forest',
        'symbol.deer.name': 'Deer',
        'symbol.date.name': 'Date',

        'symbol.christianity.name': 'Christianity',
        'symbol.islam.name': 'Islam',
        'symbol.buddhism.name': 'Buddhism',
        'symbol.hinduism.name': 'Hinduism',

        'symbol.warrior.name': 'Warrior',
        'symbol.archer.name': 'Archer',
        'symbol.tracker_archer.name': 'Tracker Archer',
        'symbol.knight.name': 'Knight',
        'symbol.cavalry.name': 'Cavalry',
        'symbol.cavalry_corps.name': 'Cavalry Corps',
        'symbol.crossbowman.name': 'Crossbowman',
        'symbol.musketman.name': 'Musketman',
        'symbol.cannon.name': 'Cannon',
        'symbol.infantry.name': 'Infantry',
        'symbol.relic_caravan.name': 'Relic Caravan',
        'symbol.stargazer.name': 'Stargazer',
        'symbol.stone_tablet.name': 'Stone Tablet',
        'symbol.barbarian_camp.name': 'Barbarian Camp',
        'symbol.enemy_warrior.name': 'Enemy Warrior',
        'symbol.flood.name': 'Flood',
        'symbol.earthquake.name': 'Earthquake',
        'symbol.drought.name': 'Drought',
        'symbol.fur.name': 'Fur',
        'symbol.wool.name': 'Wool',

        // 47-49: Candidates promoted to actual symbols
        'symbol.salt.name': 'Salt',
        'symbol.honey.name': 'Honey',
        'symbol.corn.name': 'Corn',
        'symbol.wild_berries.name': 'Wild Berries',
        'symbol.hay.name': 'Hay',
        'symbol.spices.name': 'Spices',
        'symbol.tax.name': 'Tax',
        'symbol.aqueduct.name': 'Aqueduct',
        'symbol.rye.name': 'Rye',
        'symbol.sheep.name': 'Sheep',
        'symbol.mushroom.name': 'Mushroom',
        'symbol.scholar.name': 'Scholar',
        'symbol.holy_relic.name': 'Holy Relic',
        'symbol.telescope.name': 'Telescope',
        'symbol.scales.name': 'Scales',
        'symbol.pioneer.name': 'Pioneer',
        'symbol.edict.name': 'Edict',
        'symbol.agi_core.name': 'AGI Core',
        'symbol.wild_seeds.name': 'Wild Seeds',
        'symbol.wild_seeds.desc': '+1 Food. Destroyed after 5 turns.',
        'symbol.embassy.name': 'Embassy',
        'symbol.expedition.name': 'Expedition',
        'symbol.dye.name': 'Dye',
        'symbol.papyrus.name': 'Papyrus',
        'symbol.caravanserai.name': 'Caravanserai',
        'symbol.loot.name': 'Loot',
        'symbol.greater_loot.name': 'Greater Loot',
        'symbol.radiant_loot.name': 'Radiant Loot',

        // ── Symbol Descriptions ──
        'symbol.wheat.desc': 'Wheat: every 10 turns: 10 Food. Adjacent to Grassland: +1/turn.',
        'symbol.wheat.descBoard.both': 'Wheat: every 10 turns: 15 Food. Per adjacent Grassland: +1/turn.',
        'symbol.rice.desc': 'Rice: every 20 turns: 25 Food. Adjacent to Grassland: +1/turn.',
        'symbol.rice.descBoard.both': 'Rice: every 20 turns: 30 Food. Per adjacent Grassland: +1/turn.',
        'symbol.cattle.desc': '+1 Food. When adjacent to Plains, can butcher; on butcher: +10 Food.',
        'symbol.cattle.descBoard.pastoral':
            '+1 Food; 10% chance to produce Cattle. When adjacent to Plains, can butcher; on butcher: +10 Food.',
        'symbol.cattle.descBoard.stirrup': '+3 Food per turn. When adjacent to Plains, can butcher; on butcher: +10 Food.',
        'symbol.cattle.descBoard.stirrupPastoral':
            '+3 Food per turn; 10% chance to produce Cattle. When adjacent to Plains, can butcher; on butcher: +10 Food.',
        'symbol.banana.desc': '+1 Food; every 10 turns adjacent to Rainforest: +1 additional Food production.',
        'symbol.fish.desc': 'When adjacent to Sea: +2 Food.',
        'symbol.sea.desc': '+1 Gold per 3 adjacent symbols.',
        'symbol.stone.desc': '+1 Gold; when a Mountain is in the same column: +2 additional Gold.',
        'symbol.grassland.desc': '+1 Food.',
        'symbol.grassland.descWithIrrigation': '+2 Food.',
        'symbol.grassland.descWithThreeField': '+5 Food.',
        'symbol.monument.desc': '+5 Knowledge.',
        'symbol.oasis.desc': '+1 Food per 2 adjacent empty slots.',
        'symbol.oral_tradition.desc': 'After 10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.',
        'symbol.rainforest.desc': '+1 Food.',
        'symbol.plains.desc': '+1 Food.',
        'symbol.mountain.desc': '+1 Food.',
        'symbol.totem.desc': 'In a corner: +20 Knowledge.',
        'symbol.omen.desc': '50% chance for +3 Food.',
        'symbol.campfire.desc': 'Gain Food equal to the Food produced this turn by the highest-producing adjacent symbol. Destroyed.',
        'symbol.pottery.desc': '+3 Food stored per turn; on destroy: gain Food equal to stored Counter.',
        'symbol.tribal_village.desc': 'Destroyed; on destroy: adds 2 random Normal symbols.',
        'symbol.merchant.desc': 'Produces Gold equal to the Food produced by a random adjacent symbol.',
        'symbol.horse.desc': '+1 Food, +1 Gold; when adjacent to Plains: +2 additional Food. When adjacent to a melee unit: Cavalry training opportunity.',
        'symbol.crab.desc': 'When adjacent to Sea or Harbor: +1 Food, +2 Gold.',
        'symbol.library.desc': '+1 Knowledge per adjacent symbol.',
        'symbol.pearl.desc': 'When adjacent to Sea: +3 Gold.',
        'symbol.compass.desc': 'With 1 Sea: +5 Knowledge; 2 Seas: +10 Knowledge; 3+ Seas: +15 Knowledge.',
        'symbol.desert.desc': 'When adjacent: destroys 1 random Normal or era symbol.',
        'symbol.forest.desc': 'If 3 or more Forests are placed on the board: +2 Food; 5 or more: +2 Gold; if Forest is the only terrain on the board: +2 Food.',
        'symbol.deer.desc': '+1 Food per adjacent Forest.',
        'symbol.loot.desc': 'Open to gain a small reward. When adjacent to Loot: absorb it and upgrade into Greater Loot.',
        'symbol.greater_loot.desc': 'Open to gain a reward. When adjacent to Greater Loot: absorb it and upgrade into Radiant Loot.',
        'symbol.radiant_loot.desc': 'Open to gain a large reward.',
        'symbol.fur.desc': '+2 Gold per 2 Forests placed on the board.',
        'symbol.date.desc': '+1 Food; on destroy: +10 Food.',
        'symbol.christianity.desc': '+Food equal to the highest Food produced by an adjacent symbol. Destroyed if another Religion symbol is on the board.',
        'symbol.islam.desc': '+2 Gold per Knowledge-producing symbol on the board. Destroyed if another Religion symbol is on the board.',
        'symbol.buddhism.desc': '+2 Food per empty slot on the board. Destroyed if another Religion symbol is on the board.',
        'symbol.hinduism.desc': 'If placed in a corner: +10 Food and +10 Knowledge. Destroyed if another Religion symbol is on the board.',
        'symbol.warrior.desc': 'Primitive melee unit.',
        'symbol.archer.desc': 'Ancient ranged unit.',
        'symbol.tracker_archer.desc': 'Ancient ranged unit. When adjacent to Forest: +1 Food.',
        'symbol.knight.desc': 'Ancient melee unit.',
        'symbol.cavalry.desc': 'Ancient melee unit.',
        'symbol.cavalry_corps.desc': 'Medieval melee unit.',
        'symbol.crossbowman.desc': 'Medieval ranged unit.',
        'symbol.musketman.desc': 'Medieval melee unit.',
        'symbol.cannon.desc': 'Modern ranged unit.',
        'symbol.infantry.desc': 'Modern melee unit.',
        'symbol.relic_caravan.desc': 'Destroyed; on destroy: refreshes relic shop.',
        'symbol.stargazer.desc': 'Per 2 empty slots: +1 Knowledge.',
        'symbol.stone_tablet.desc': 'Per relic owned: +5 Knowledge.',
        'symbol.barbarian_camp.desc': 'Every 8 turns: adds 1 random current era enemy combat unit.',
        'symbol.enemy_warrior.desc': '-5 Food.',
        'symbol.flood.desc': 'Disables all adjacent terrain symbols. When counter reaches 0: Destroy.',
        'symbol.earthquake.desc': 'Destroyed. On destroy: destroy 1 random adjacent symbol.',
        'symbol.drought.desc': 'When counter reaches 0: Destroy.',
        'symbol.wool.desc': 'Destroyed after 3 turns; on destroy: +5 Gold.',
        'symbol.wool.descWithNomadicTradition': 'Destroyed after 3 turns; on destroy: +10 Gold.',

        'symbol.salt.desc': '+1 Food per adjacent terrain symbol.',
        'symbol.honey.desc': 'If 5 or more of the same terrain are placed on the board: +5 Food.',
        'symbol.corn.desc': '+2 Food.',
        'symbol.wild_berries.desc': '+1 Food; when adjacent to Forest or Rainforest: +2 Food; when adjacent to Mountain: +2 Knowledge.',
        'symbol.hay.desc': 'When adjacent to Plains: counter +1. On destroy: gain Food equal to Counter.',
        'symbol.spices.desc': '+1 Food per different terrain type placed.',
        'symbol.tax.desc': '+Gold equal to a random adjacent symbol\'s Food produced this turn.',
        'symbol.aqueduct.desc': 'Adjacent Wheat, Rice, and Rye produce double Food this turn.',
        'symbol.rye.desc': '+2 Food; when adjacent to Plains: +2 additional Food.',
        'symbol.sheep.desc':
            '+1 Food; 10% chance to produce Wool. When adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold.',
        'symbol.sheep.descBoard.pastoral':
            '+1 Food; 10% chance to produce Sheep; 10% chance to produce Wool. When adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold.',
        'symbol.mushroom.desc': '+2 Food, +2 Knowledge; if not adjacent to Forest: destroy.',
        'symbol.scholar.desc': 'Destroys all adjacent Ancient symbols. Permanently gain +5 Knowledge per Ancient symbol destroyed.',
        'symbol.holy_relic.desc': 'If there is a Religion symbol on the board: +7 Knowledge, +7 Gold.',
        'symbol.telescope.desc': '+Knowledge equal to this slot number (1–20, top-left first).',
        'symbol.scales.desc': '+8 Knowledge.',
        'symbol.pioneer.desc': 'Destroyed; on destroy: next symbol selection includes at least one Terrain symbol.',
        'symbol.edict.desc': 'Consume this to destroy 1 adjacent symbol.',
        'symbol.agi_core.desc': 'Absorbs the Knowledge production of all symbols on the board. When absorbed Knowledge reaches 500, you win the game.',
        'symbol.embassy.desc': 'Destroyed; on destroy: the next symbol-selection reroll costs 0 Gold.',
        'symbol.expedition.desc': 'When adjacent to Rainforest: produces a random 1-10 Food, Gold, or Knowledge.',
        'symbol.dye.desc': '+1 Gold; on destroy: +10 Gold.',
        'symbol.papyrus.desc': '+1 Knowledge; on destroy: +10 Knowledge.',
        'symbol.caravanserai.desc': '+10 per symbol destroyed this turn; matches the destroyed symbol\'s production type.',

        // ── Relics ──
        'relic.1.name': 'Clovis Spear Point',
        'relic.1.desc': 'Each turn, reduces a random enemy unit\'s HP by 1.',
        'relic.2.name': 'Electrum Coin of Lydia',
        'relic.2.desc': 'Reroll cost discounted by 50%; maximum 3 rerolls per turn.',
        'relic.3.name': 'Chariot Wheel of Ur',
        'relic.3.desc': 'For 3 turns: each turn destroys the lowest Food-producing symbol; 10 Gold per symbol destroyed.',
        'relic.4.name': 'Jomon Pottery Shard',
        'relic.4.desc': 'Each turn, stores 1 Food on this relic. Click to cash out: gain stored Food ×2; the relic is destroyed.',
        'relic.5.name': 'Egyptian Copper Saw',
        'relic.5.desc': 'Mountain: +1 Gold per adjacent empty slot.',
        'relic.6.name': 'Babylonian Map of the World',
        'relic.6.desc': '+1 Food; if the symbol in slot 20 produces 0 or less Food, this relic permanently produces +1 more Food.',
        'relic.7.name': 'Kuk Swamp Banana Fossil',
        'relic.7.desc': 'Rainforest: +2 Food per adjacent Banana.',
        'relic.8.name': 'Tablet of the Ten Commandments',
        'relic.8.desc': 'Adds Stone Tablet to the symbol pool.',
        'relic.9.name': 'Black Silt of the Nile',
        'relic.9.desc': 'For 3 turns after acquisition: gain Food equal to Food produced on the board this turn; then destroyed.',
        'relic.10.name': 'Göbekli Tepe Pillar',
        'relic.10.desc': '+1 Food per empty slot on the board.',
        'relic.11.name': 'Çatalhöyük Goddess Statuette',
        'relic.11.desc': 'If 15 or more symbols on the board: +5 Food.',
        'relic.12.name': 'Ancient Egyptian Scarab Amulet',
        'relic.12.desc': 'At end of turn, gain 3 Gold per symbol destroyed this turn.',
        'relic.13.name': 'Ancient Relic Debris',
        'relic.13.desc': 'One symbol pick. Click to activate.',
        'relic.14.name': 'Epicurus\' Atomic Plaque',
        'relic.14.desc': 'If no Religion symbol on the board: +3 Knowledge per turn.',
        'relic.15.name': 'Furnace of Oblivion',
        'relic.15.desc': 'Consumes this relic to destroy 1 symbol on the board.',
        'relic.16.name': 'Terra Fossil Grape',
        'relic.16.desc': 'Natural disaster symbols produce +2 Food.',
        'relic.17.name': 'Antoninianus Silver Coin',
        'relic.17.desc': 'When you skip symbol selection: +2 Gold.',
        'relic.18.name': 'Andean Chuño',
        'relic.18.desc': '+2 Food per turn.',
        'relic.19.name': 'Ancient Tribal Joining',
        'relic.19.desc': 'One terrain pick: all three choices are random terrain symbols. Click to use.',

        // ── Knowledge Upgrades ──
        'knowledgeUpgrade.1.name': 'Writing System',
        'knowledgeUpgrade.1.desc': 'Unlocks Library.',
        'knowledgeUpgrade.2.name': 'Iron Working',
        'knowledgeUpgrade.2.desc': 'Upgrades Warrior into Knight.',
        'knowledgeUpgrade.3.name': 'Irrigation',
        'knowledgeUpgrade.3.desc': 'Upgrades Wheat, Rice, and Grassland.',
        'knowledgeUpgrade.4.name': 'Theology',
        'knowledgeUpgrade.4.desc': 'Unlocks Religion symbols for selection.',
        'knowledgeUpgrade.5.name': 'Archery',
        'knowledgeUpgrade.5.desc': 'Unlocks Archer.',
        'knowledgeUpgrade.6.name': 'Currency',
        'knowledgeUpgrade.6.desc': 'Unlocks Merchant symbol.',
        'knowledgeUpgrade.7.name': 'Horsemanship',
        'knowledgeUpgrade.7.desc': 'Adds Horse to the symbol selection pool. Upgrades Plains.',
        'knowledgeUpgrade.8.name': 'Sacrificial Rite',
        'knowledgeUpgrade.8.desc':
            'Gain 3 Furnaces of Oblivion. Each consumes the relic to destroy 1 symbol on the board.',
        'knowledgeUpgrade.9.name': 'Fisheries',
        'knowledgeUpgrade.9.desc': 'Crab and Pearl are added to the symbol selection pool.',
        'knowledgeUpgrade.28.name': 'Navigation',
        'knowledgeUpgrade.28.desc': 'Upgrades Fish and Crab.',
        'knowledgeUpgrade.29.name': 'Celestial Navigation',
        'knowledgeUpgrade.29.desc': 'Upgrades Pearl and Sea.',
        'knowledgeUpgrade.30.name': 'Mining',
        'knowledgeUpgrade.30.desc': 'Upgrades Rainforest and Stone.',
        'knowledgeUpgrade.31.name': 'Hunting',
        'knowledgeUpgrade.31.desc': 'Unlocks Mushroom and Fur for selection.',
        'knowledgeUpgrade.32.name': 'Law Code',
        'knowledgeUpgrade.32.desc': 'Base Knowledge production +2.',
        'knowledgeUpgrade.33.name': 'Foreign Trade',
        'knowledgeUpgrade.33.desc': 'Upgrades Desert.',
        'knowledgeUpgrade.symbolDescAfter.33.desert': '+2 Gold; destroys 1 random adjacent Normal or era symbol.',
        'knowledgeUpgrade.67.name': 'Architecture',
        'knowledgeUpgrade.67.desc': 'Base Knowledge production +1. Upgrades Salt.',
        'knowledgeUpgrade.symbolDescAfter.67.salt': '+2 Food per adjacent terrain symbol.',
        'knowledgeUpgrade.68.name': 'Nationalism',
        'knowledgeUpgrade.68.desc': 'Base Knowledge production +3. Upgrades Monument.',
        'knowledgeUpgrade.symbolDescAfter.68.monument': '+10 Knowledge.',
        'knowledgeUpgrade.69.name': 'Exploration',
        'knowledgeUpgrade.69.desc': 'Base Gold production +2. Upgrades Honey.',
        'knowledgeUpgrade.symbolDescAfter.69.honey': 'If 5 or more of the same terrain are placed on the board: +10 Food.',
        'knowledgeUpgrade.70.name': 'Colonialism',
        'knowledgeUpgrade.71.name': 'Military Science',
        'knowledgeUpgrade.70.desc': 'Base Gold production +3. Upgrades Spices.',
        'knowledgeUpgrade.71.desc': 'Upgrades Horse.',
        'knowledgeUpgrade.symbolDescAfter.70.spices': '+3 Food per different terrain type placed.',
        'knowledgeUpgrade.symbolDescAfter.71.horse': '+2 Food, +2 Gold; when adjacent to Plains: +4 additional Food. When adjacent to a melee unit: Cavalry Corps training opportunity.',
        'knowledgeUpgrade.52.name': 'Trade Goods Exchange',
        'knowledgeUpgrade.52.desc': 'Dye and Papyrus are added to the symbol selection pool.',
        'knowledgeUpgrade.53.name': 'Dry Storage',
        'knowledgeUpgrade.53.desc': 'Upgrades Desert, Oasis, and Date.',
        'knowledgeUpgrade.symbolDescAfter.53.desert': '+5 Gold. Destroys all adjacent Normal and era symbols.',
        'knowledgeUpgrade.symbolDescAfter.53.oasis': '+1 Food per adjacent empty slot.',
        'knowledgeUpgrade.symbolDescAfter.53.date': '+1 Food; on destroy: +20 Food.',
        'knowledgeUpgrade.54.name': 'Caravanserai',
        'knowledgeUpgrade.54.desc': 'Unlocks Caravanserai. Upgrades Dye and Papyrus.',
        'knowledgeUpgrade.symbolDescAfter.54.dye': '+1 Gold; on destroy: +20 Gold.',
        'knowledgeUpgrade.symbolDescAfter.54.papyrus': '+1 Knowledge; on destroy: +20 Knowledge.',
        'knowledgeUpgrade.55.name': 'Oasis Recovery Network',
        'knowledgeUpgrade.55.desc': 'Upgrades Desert and Oasis.',
        'knowledgeUpgrade.56.name': 'Mechanics',
        'knowledgeUpgrade.56.desc': 'Upgrades Archer into Crossbowman.',
        'knowledgeUpgrade.57.name': 'Gunpowder',
        'knowledgeUpgrade.57.desc': 'Upgrades Knight into Musketman.',
        'knowledgeUpgrade.58.name': 'Ballistics',
        'knowledgeUpgrade.58.desc': 'Upgrades Crossbowman into Cannon.',
        'knowledgeUpgrade.59.name': 'Interchangeable Parts',
        'knowledgeUpgrade.59.desc': 'Upgrades Musketman into Infantry.',
        'knowledgeUpgrade.symbolDescAfter.55.desert':
            '+10 Food and +10 Gold. Destroys all Normal and era symbols on the board.',
        'knowledgeUpgrade.symbolDescAfter.55.oasis': '+3 Food per adjacent empty slot.',
        'knowledgeUpgrade.34.name': 'Chiefdom',
        'knowledgeUpgrade.34.desc': 'Base Food production +2. Upgrades Wild Berries.',
        'knowledgeUpgrade.symbolDescAfter.34.wild_berries':
            '+1 Food; when adjacent to Forest or Rainforest: +4 Food; when adjacent to Mountain: +5 Knowledge.',
        'knowledgeUpgrade.66.name': 'Feudalism',
        'knowledgeUpgrade.66.desc': 'Base Food production +2. Upgrades Corn.',
        'knowledgeUpgrade.symbolDescAfter.66.corn': '+4 Food.',
        'knowledgeUpgrade.10.name': 'Mathematics',
        'knowledgeUpgrade.10.desc': 'Base Food production +1, Base Knowledge production +1.',
        'knowledgeUpgrade.65.name': 'State Labor',
        'knowledgeUpgrade.65.desc': 'Base Food production +1. Base Gold production +1.',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.name`]: 'Urbanization',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.desc`]: 'Base Food production +10. Base Gold production +2.',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.name`]: 'Steam Power',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.desc`]: 'Base Gold production +8. Base Knowledge production +4.',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.name`]: 'Electricity',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.desc`]: 'Base Food production +5. Base Gold production +10. Base Knowledge production +5.',
        'knowledgeUpgrade.25.name': 'Ancient Era',
        'knowledgeUpgrade.25.desc': 'Unlocks all Ancient symbols.',
        'knowledgeUpgrade.26.name': 'Pastoralism',
        'knowledgeUpgrade.26.desc': 'Upgrades Cattle and Sheep.',
        'knowledgeUpgrade.27.name': 'Agriculture',
        'knowledgeUpgrade.27.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.15.name': 'Medieval Age',
        'knowledgeUpgrade.15.desc': 'Ancient symbols no longer appear. Unlocks all Medieval symbols. Terrain symbol odds become x0.2.',
        'knowledgeUpgrade.60.name': 'Modern Age',
        'knowledgeUpgrade.60.desc': 'Medieval symbols no longer appear. Unlocks all Modern symbols. Terrain symbols no longer appear.',
        'knowledgeUpgrade.61.name': 'AGI Project',
        'knowledgeUpgrade.61.desc': 'Gain the AGI Core.',
        'knowledgeUpgrade.16.name': 'Education',
        'knowledgeUpgrade.16.desc': 'Upgrades Library.',
        'knowledgeUpgrade.63.name': 'Theocracy',
        'knowledgeUpgrade.63.desc': 'Upgrades Christianity, Islam, Buddhism, and Hinduism.',
        'knowledgeUpgrade.64.name': 'Guild',
        'knowledgeUpgrade.64.desc': 'Upgrades Merchant.',
        'knowledgeUpgrade.symbolDescAfter.63.christianity': '+Food equal to the highest Food produced by any symbol on the board. Destroyed if another Religion symbol is on the board.',
        'knowledgeUpgrade.symbolDescAfter.63.islam': '+3 Gold per Knowledge-producing symbol on the board. Destroyed if another Religion symbol is on the board.',
        'knowledgeUpgrade.symbolDescAfter.63.buddhism': '+4 Food per empty slot on the board. Destroyed if another Religion symbol is on the board.',
        'knowledgeUpgrade.symbolDescAfter.63.hinduism': 'If placed in a corner: +20 Food and +20 Knowledge. Destroyed if another Religion symbol is on the board.',
        'knowledgeUpgrade.symbolDescAfter.64.merchant': 'Produces Gold equal to the highest Food produced by an adjacent symbol.',
        'knowledgeUpgrade.symbolDescAfter.16.library': '+2 Knowledge per adjacent symbol.',
        'knowledgeUpgrade.62.name': 'Scientific Theory',
        'knowledgeUpgrade.62.desc': 'Upgrades Library.',
        'knowledgeUpgrade.symbolDescAfter.62.library': '+2 Knowledge per symbol on the board.',
        'knowledgeUpgrade.24.name': 'Printing Press',
        'knowledgeUpgrade.24.desc': 'Base Gold +2, Base Knowledge +2.',
        'knowledgeUpgrade.35.name': 'Three-field System',
        'knowledgeUpgrade.35.desc': 'Upgrades Wheat, Rice, and Grassland.',
        'knowledgeUpgrade.36.name': 'Agricultural Surplus',
        'knowledgeUpgrade.36.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.37.name': 'Modern Agriculture',
        'knowledgeUpgrade.37.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.38.name': 'Pasture Management',
        'knowledgeUpgrade.38.desc': 'Upgrades Plains.',
        'knowledgeUpgrade.39.name': 'Nomadic Tradition',
        'knowledgeUpgrade.39.desc': 'Upgrades Cattle, Sheep, and Wool.',
        'knowledgeUpgrade.40.name': 'Compass',
        'knowledgeUpgrade.40.desc': 'Compass is added to the symbol selection pool.',
        'knowledgeUpgrade.41.name': 'Shipbuilding',
        'knowledgeUpgrade.41.desc': 'Upgrades Sea.',
        'knowledgeUpgrade.42.name': 'Fishery Guild',
        'knowledgeUpgrade.42.desc': 'Upgrades Fish and Crab.',
        'knowledgeUpgrade.43.name': 'Maritime Trade',
        'knowledgeUpgrade.43.desc': 'Upgrades Pearl and Sea.',
        'knowledgeUpgrade.44.name': 'Oceanic Routes',
        'knowledgeUpgrade.44.desc': 'Upgrades Fish, Crab, Pearl, and Sea.',
        'knowledgeUpgrade.45.name': 'Plantation',
        'knowledgeUpgrade.45.desc': 'Upgrades Banana and Rainforest.',
        'knowledgeUpgrade.48.name': 'Tracking',
        'knowledgeUpgrade.48.desc': 'Upgrades Forest, Mushroom, and Deer.',
        'knowledgeUpgrade.49.name': 'Tanning',
        'knowledgeUpgrade.49.desc': 'Upgrades Fur and Deer.',
        'knowledgeUpgrade.50.name': 'Forestry',
        'knowledgeUpgrade.50.desc': 'Upgrades Forest.',
        'knowledgeUpgrade.51.name': 'Preservation',
        'knowledgeUpgrade.51.desc': 'Upgrades Deer and Mushroom.',
        'knowledgeUpgrade.46.name': 'Jungle Expedition',
        'knowledgeUpgrade.46.desc': 'Expedition is added to the symbol selection pool.',
        'knowledgeUpgrade.47.name': 'Tropical Development',
        'knowledgeUpgrade.47.desc': 'Upgrades Rainforest and Expedition.',
        'destroySelection.riteTitle': 'Sacrificial Rite — choose symbols to destroy',
        'destroySelection.riteDesc': 'Destroy up to 3 owned symbols. Confirm to gain +10 Gold per destroyed symbol.',
        'destroySelection.territoryTitle': 'Territorial Reorganization — choose symbols to remove',
        'destroySelection.territoryDesc': 'Remove up to 3 owned symbols (destroy effects do not trigger). +10 Gold each. Then you get 1 terrain choice and 3 symbol choices.',
        'destroySelection.edictTitle': 'Edict — remove 1 owned symbol',
        'destroySelection.edictDesc': 'Choose 1 symbol to remove from your collection (destroy effects do not trigger). Then continue to symbol selection.',
        'destroySelection.edictConfirm': 'Remove 1 and continue',
        'destroySelection.oblivionTitle': 'Furnace of Oblivion',
        'destroySelection.oblivionDesc': 'Consumes this relic to destroy 1 symbol on the board.',
        'destroySelection.oblivionConfirm': 'Destroy',
        'destroySelection.shortDesc': 'Choose a symbol to destroy.',
        'destroySelection.confirmSacrifice': '{n} symbol(s) — +{gold} Gold',
        'oblivionBoard.title': 'Remove a symbol',
        'oblivionBoard.remove': 'Remove',
        'oblivionBoard.cancel': 'Cancel',
        'edictBoard.title': 'Edict: destroy an adjacent symbol',
        'edictBoard.remove': 'Destroy',
        'edictBoard.cancel': 'Cancel',
        'cattleButcher.button': 'Butcher',
        'cattleButcher.aria': 'Butcher for bonus resources',
        'horseTrain.button': 'Train',
        'horseTrain.aria': 'Train an adjacent melee unit',
        'lootOpen.button': 'Open',
        'lootOpen.aria': 'Open for treasure rewards',
        'knowledgeUpgrade.11.name': 'Golden Trade',
        'knowledgeUpgrade.11.desc': 'Whenever the Relic Shop restocks, one random relic in stock is 50% off.',
        'knowledgeUpgrade.12.name': 'Relic Vault',
        'knowledgeUpgrade.12.desc': 'For each relic you own: +1 Knowledge per turn.',
        'knowledgeUpgrade.13.name': 'Heaven and Earth Prosper',
        'knowledgeUpgrade.13.desc': 'Per 2 symbols on the board: +1 Food per turn. Per 2 empty board slots: +1 Knowledge per turn.',
        'knowledgeUpgrade.14.name': 'Foundations of Unification',
        'knowledgeUpgrade.14.desc': 'Each time you enter a new era, gain 1 Ancient Relic Debris and 1 Ancient Tribal Joining.',
    },
    ko: {
        // Pause Menu
        'pause.title': '일시정지',
        'pause.resume': '계속하기',
        'pause.settings': '설정',
        'pause.mainMenu': '메인 메뉴',

        // Settings
        'settings.title': '설정',
        'settings.resolution': '해상도',
        'settings.language': '언어',
        'settings.back': '뒤로',
        'settings.effectSpeed': '효과 속도',
        'settings.spinSpeed': '스핀 속도',
        'settings.lang.en': '영어',
        'settings.lang.ko': '한국어',
        'settings.tab.gameplay': '게임플레이',
        'settings.tab.graphics': '그래픽',
        'settings.tab.general': '일반',
        'settings.fullscreen': '전체화면',
        'settings.fullscreen.on': '켜짐',
        'settings.fullscreen.off': '꺼짐',

        // Game UI (스핀 = 보드 돌리기 버튼, 턴 = 게임 턴 개념)
        'game.spin': '스핀',
        'game.turn': '턴',
        'game.food': '식량',
        'game.gold': '골드',
        'game.knowledge': '지식',
        'game.era': '시대',
        'game.foodDemand': '백성이 {turns}턴 후 식량 {amount}을 요구합니다',
        'game.foodDemandFlavor': '{turns}턴 뒤, 백성이 식량 {amount}을 요구합니다.',
        'game.gameOver': '게임 오버',
        'game.victory': '승리!',
        'game.notEnoughFood': '식량 부족',
        'game.restart': '재시작',
        'game.chooseSymbol': '심볼을 선택하세요',
        'game.chooseRelic': '유물 선택',
        'game.relicShopTitle': '유물 상점 - 새로운 유물 입고까지 {turns}턴',
        'game.relicShopTitleShort': '유물 상점',
        'game.relicShopNewStockHint': '유물 상점 — 신규 입고',
        'game.relicShopNewStockAria': '유물 상점, 신규 입고',
        'game.relicPanelTitle': '유물',
        'game.relicShopBuyDiscountAria': '구매, 할인가 {sale} 골드 (정가 {original})',
        'game.chooseUpgrade': '지식 업그레이드 선택',
        'game.knowledgeUpgradeTreeTitle': '지식 업그레이드',
        'game.levelUpResearchPointsLabel': '연구 포인트',
        'game.spendLevelUpResearchPointsFirst': '지식 업그레이드에서 연구 포인트를 먼저 쓰세요.',
        'game.levelUpResearchPointsRequired': '연구 포인트 필요',
        'game.knowledgeHudPendingTab': 'NEW',
        'game.knowledgeHudPendingTabAria': '지식 업그레이드 — 사용 가능한 연구 포인트 있음',
        'game.knowledgeHudButtonHintPending': '{title} — 연구 포인트 사용 가능',
        'game.noUpgradesAvailable': '선택 가능한 업그레이드가 없습니다',
        'knowledgeUpgrade.effectCompare.beforeLabel': '적용 전',
        'knowledgeUpgrade.effectCompare.afterLabel': '적용 후',
        'knowledgeUpgrade.requiresArchery': '궁술을 먼저 연구해야 합니다',
        'knowledgeUpgrade.requiresArcheryShort': '궁술 필요',
        'knowledgeUpgrade.requiresAgricultureShort': '농업 필요',
        'knowledgeUpgrade.requiresPastoralismShort': '목축업 필요',
        'knowledgeUpgrade.requiresFisheriesShort': '어업 필요',
        'knowledgeUpgrade.requiresForeignTradeShort': '외국 무역 필요',
        'knowledgeUpgrade.requiresTradeGoodsExchangeShort': '대상품 교역 필요',
        'knowledgeUpgrade.requiresDryStorageShort': '건조 저장술 필요',
        'knowledgeUpgrade.requiresCaravanseraiShort': '카라밴세라이 필요',
        'knowledgeUpgrade.requiresSeafaringShort': '항해술 필요',
        'knowledgeUpgrade.requiresCelestialNavigationShort': '천문항법 필요',
        'knowledgeUpgrade.requiresHuntingShort': '수렵 필요',
        'knowledgeUpgrade.requiresTrackingShort': '추적술 필요',
        'knowledgeUpgrade.requiresTanningShort': '무두질 필요',
        'knowledgeUpgrade.requiresForestryShort': '임업 필요',
        'knowledgeUpgrade.requiresMiningShort': '채광 필요',
        'knowledgeUpgrade.requiresPlantationShort': '플랜테이션 필요',
        'knowledgeUpgrade.requiresJungleExpeditionShort': '정글탐사 필요',
        'knowledgeUpgrade.requiresMaritimeTradeShort': '해상 무역 필요',
        'knowledgeUpgrade.requiresFisheryGuildShort': '어업 조합 필요',
        'knowledgeUpgrade.requiresWritingShort': '문자 필요',
        'knowledgeUpgrade.requiresAncientShort': '고대 시대 필요',
        'knowledgeUpgrade.requiresFeudalismShort': '중세 시대 필요',
        'knowledgeUpgrade.requiresModernAgeShort': '현대 시대 필요',
        'knowledgeUpgrade.requiresIrrigationShort': '관개 필요',
        'knowledgeUpgrade.requiresThreeFieldShort': '삼포제 필요',
        'knowledgeUpgrade.requiresAgriculturalSurplusShort': '농업 잉여 필요',
        'knowledgeUpgrade.requiresNomadicTraditionShort': '유목 전통 필요',
        'knowledgeUpgrade.requiresIronWorkingShort': '철제 기술 필요',
        'knowledgeUpgrade.requiresMechanicsShort': '기계장치 필요',
        'knowledgeUpgrade.requiresGunpowderShort': '화약 필요',
        'knowledgeUpgrade.requiresBallisticsShort': '탄도학 필요',
        'knowledgeUpgrade.symbolDescAfter.2.warrior': '전사를 검사로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.56.archer': '궁수를 석궁병으로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.57.knight': '검사를 머스킷병으로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.58.crossbowman': '석궁병을 대포로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.59.musketman': '머스킷병을 보병으로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.3.wheat': '밀: 10턴마다: 식량10. 인접한 초원마다: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.3.rice': '쌀: 20턴마다: 식량25. 인접한 초원마다: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.27.wheat': '밀: 10턴마다: 식량15. 초원에 인접 시: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.27.rice': '쌀: 20턴마다: 식량30. 초원에 인접 시: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.7.plains': '식량 +2.',
        'knowledgeUpgrade.symbolDescAfter.28.fish': '보드에 배치된 바다가 1개: 식량 +2; 2개: 식량 +3; 3개 이상: 식량 +5.',
        'knowledgeUpgrade.symbolDescAfter.28.crab': '보드에 배치된 바다가 1개: 식량 +2, 골드 +1; 2개: 식량 +3, 골드 +2; 3개 이상: 식량 +3, 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.42.fish': '보드에 배치된 바다가 1개: 식량 +3; 2개: 식량 +5; 3개 이상: 식량 +10.',
        'knowledgeUpgrade.symbolDescAfter.42.crab': '보드에 배치된 바다가 1개: 식량 +3, 골드 +3; 2개: 식량 +5, 골드 +5; 3개 이상: 식량 +5, 골드 +5.',
        'knowledgeUpgrade.symbolDescAfter.29.sea': '인접한 심볼 2개당: 골드 +1.',
        'knowledgeUpgrade.symbolDescAfter.41.sea': '인접한 심볼 3개당: 골드 +1. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.41.seaWithCelestial': '인접한 심볼 2개당: 골드 +1. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.29.pearl': '보드에 배치된 바다가 1개: 골드 +4; 2개: 골드 +5; 3개 이상: 골드 +7.',
        'knowledgeUpgrade.symbolDescAfter.43.sea': '인접한 심볼 2개당: 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.43.seaWithShipbuilding': '인접한 심볼 2개당: 골드 +2. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.43.pearl': '보드에 배치된 바다가 1개: 골드 +5; 2개: 골드 +7; 3개 이상: 골드 +10.',
        'knowledgeUpgrade.symbolDescAfter.44.fish': '보드에 배치된 바다가 1개: 식량 +5; 2개: 식량 +8; 3개 이상: 식량 +15.',
        'knowledgeUpgrade.symbolDescAfter.44.crab': '보드에 배치된 바다가 1개: 식량 +5, 골드 +5; 2개: 식량 +8, 골드 +8; 3개 이상: 식량 +8, 골드 +8.',
        'knowledgeUpgrade.symbolDescAfter.44.pearl': '보드에 배치된 바다가 1개: 골드 +10; 2개: 골드 +20; 3개 이상: 골드 +30.',
        'knowledgeUpgrade.symbolDescAfter.44.sea': '인접한 심볼 1개당: 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.44.seaWithShipbuilding': '인접한 심볼 1개당: 골드 +2. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.30.rainforest': '식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.30.stone': '골드 +1; 같은 열에 산이 있으면: 골드 +5 추가.',
        'knowledgeUpgrade.symbolDescAfter.45.banana': '식량 +1; 열대우림에 7회 인접마다: 추가 식량 생산 +1.',
        'knowledgeUpgrade.symbolDescAfter.45.rainforest': '식량 +3, 골드 +3.',
        'knowledgeUpgrade.symbolDescAfter.48.forest': '보드에 배치된 숲이 3개 이상: 식량 +3; 5개 이상: 골드 +3; 보드에 유일한 지형이 숲이면: 식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.48.mushroom': '식량 +4, 지식 +4; 숲이 인접하지 않으면: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.48.deer': '인접한 숲마다: 식량 +1. 원거리 유닛에 인접 시: 추적궁병 훈련 기회.',
        'knowledgeUpgrade.symbolDescAfter.49.fur': '보드에 배치된 숲마다: 골드 +1.',
        'knowledgeUpgrade.symbolDescAfter.49.deer': '인접한 숲마다: 식량 +2. 원거리 유닛에 인접 시: 추적궁병 훈련 기회.',
        'knowledgeUpgrade.symbolDescAfter.50.forest': '보드에 배치된 숲이 3개 이상: 식량 +5; 5개 이상: 골드 +5; 7개 이상: 지식 +3; 보드에 유일한 지형이 숲이면: 생산 x2.',
        'knowledgeUpgrade.symbolDescAfter.51.deer': '인접한 숲마다: 식량 +3. 원거리 유닛에 인접 시: 추적궁병 훈련 기회.',
        'knowledgeUpgrade.symbolDescAfter.51.mushroom': '식량 +9, 지식 +9; 숲이 인접하지 않으면: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.47.rainforest': '식량 +5, 골드 +5, 지식 +5.',
        'knowledgeUpgrade.symbolDescAfter.47.expedition': '열대우림 인접 시: 식량, 골드, 지식을 각각 1~10씩 생산합니다.',
        'knowledgeUpgrade.symbolDescAfter.15.mountain': '식량 +2; 적 유닛 인접 시: 매 스핀 체력 3 감소.',
        'knowledgeUpgrade.symbolDescAfter.26.sheep':
            '식량 +1; 10% 확률로 양 생산; 10% 확률로 양모 생산. 평원 인접 시 도축 시 식량 +5, 골드 +5.',
        'knowledgeUpgrade.symbolDescAfter.26.cattle':
            '식량 +1; 10% 확률로 소 생산. 평원 인접 시 도축 시 식량 +10.',
        'game.reroll': '리롤',
        'game.rerollKnowledgeUpgrade': '이 카드를 다른 업그레이드로 바꾸기 (이번 선택에 한 번만)',
        'game.skip': '건너뛰기',
        'game.back': '뒤로가기',
        'game.attack': '공격력',
        'game.defense': '방어력',
        'ownedSymbols.title': '보유 심볼',
        'ownedSymbols.close': '닫기',
        'ownedSymbols.empty': '보유 심볼이 없습니다',
        'game.hudBaseProductionShort': '기본 생산 +{n}',

        // Pre-game: Demo / Stage / Leader
        'pregame.demoTitle': 'Humankind in a nutshell 게임플레이 데모 v0.1',
        'pregame.demoSubtitle': '스테이지를 고르기 전에 꼭 알아두면 좋은 핵심만 모았습니다.',
        'pregame.demoTutorialTitle': '튜토리얼',
        'pregame.demoTutorial.1': '목표는 식량 부족 없이 버티면서, 시너지가 좋은 심볼을 쌓아 문명을 성장시키는 것입니다.',
        'pregame.demoTutorial.2': '매 턴 SPIN을 누르면 보유 심볼이 5x4 보드에 무작위로 배치되고, 효과가 자동으로 순서대로 발동합니다.',
        'pregame.demoTutorial.3': '식량은 생존, 골드는 리롤과 유물 구매, 지식은 시대 전환과 강력한 업그레이드에 쓰입니다.',
        'pregame.demoTutorial.4': '턴 진행 후 새 심볼을 얻을 기회가 옵니다. 인접, 지형, 파괴 효과가 서로 맞물리는 조합을 우선해서 고르세요.',
        'pregame.demoTutorial.5': '10턴마다 백성이 식량을 요구합니다. 지불하지 못하면 즉시 패배하니, 초반에는 안정적인 식량 기반을 먼저 만드세요.',
        'pregame.demoPlay': '플레이',
        'pregame.stageTitle': '스테이지 선택',
        'pregame.leaderTitle': '지도자를 선택하세요',
        'pregame.leaderPortraitPlaceholder': '초상화 없음',
        'pregame.leaderPlay': '선택',
        'pregame.difficultyLabel': '스테이지',
        'pregame.draftTitle': '시작 심볼을 고르세요',
        'pregame.draftProgress': '{current} / {total} 선택',
        'pregame.picks': '회 선택',
        'stage.1.name': '1',
        'stage.2.name': '2',
        'stage.3.name': '3',
        'stage.4.name': '4',
        'stage.5.name': '5',
        'stage.6.name': '6',
        'stage.7.name': '7',
        'stage.8.name': '8',
        'stage.9.name': '9',
        'stage.10.name': '10',
        'stage.11.name': '11',
        'stage.12.name': '12',
        'stage.13.name': '13',
        'stage.14.name': '14',
        'stage.15.name': '15',
        'stage.16.name': '16',
        'stage.17.name': '17',
        'stage.18.name': '18',
        'stage.19.name': '19',
        'stage.20.name': '20',
        'leader.ramesses.name': '람세스 2세',
        'leader.ramesses.nameSubtitle': '이집트 파라오',
        'leader.ramesses.desc': '메인: 황금의 거래 / 서브: 유물 보관소.',
        'leader.ramesses.main.name': '황금의 거래',
        'leader.ramesses.main.desc': '새로운 유물 입고 시 무작위 유물의 가격이 50% 할인됩니다.',
        'leader.ramesses.sub.name': '유물 보관소',
        'leader.ramesses.sub.desc': '유물 1개당 매 턴 지식 생산 +1',
        'leader.shihuang.name': '진시황',
        'leader.shihuang.nameSubtitle': '진(秦) 시황제',
        'leader.shihuang.desc': '메인: 천하부강 / 서브: 천하통일의 기틀.',
        'leader.shihuang.main.name': '천하부강',
        'leader.shihuang.main.desc': '보드에 배치된 심볼 수 두 개당 매 턴 식량 +1. 빈 슬롯 두 개당 매 턴 지식 +1.',
        'leader.shihuang.sub.name': '천하통일의 기틀',
        'leader.shihuang.sub.desc': '새 시대마다 고대 유물 잔해와 고대 부족 합류를 하나씩 얻습니다.',
        'leader.locked.name': '???',
        'leader.locked.desc': '아직 선택할 수 없습니다.',
        'leader.locked.main.name': '—',
        'leader.locked.main.desc': '추후 업데이트에서 추가될 예정입니다.',
        'leader.locked.sub.name': '—',
        'leader.locked.sub.desc': '—',

        // Threat labels (첫 배치 시 플로팅 텍스트)
        'threat.barbarian_invasion': '야만인 침공',
        'threat.barbarian_camp': '야만인 주둔',
        'threat.flood': '홍수 발생',
        'threat.earthquake': '지진 발생',
        'threat.drought': '가뭄 발생',

        // Era Unlock
        'eraUnlock.title': '중세 시대가 열립니다',
        'eraUnlock.desc': '문명의 방향을 선택하세요',
        'eraUnlock.religion': '종교 해금',
        'eraUnlock.religion_desc': '기독교, 이슬람, 불교, 힌두교가 심볼 선택 풀에 추가됩니다.',
        'eraUnlock.knowledge': '영구 지식 +100',
        'eraUnlock.knowledge_desc': '매 턴 영구적으로 지식 +100을 획득합니다.',

        // Era names
        'era.special': '종교',
        'era.specialSymbol': '특수',
        'era.normal': '일반',
        'era.ancient': '고대',
        'era.medieval': '중세',
        'era.modern': '현대',
        'era.terrain': '지형',
        'era.unit': '유닛',
        'era.enemy': '적',
        'era.disaster': '자연재해',

        // Tags
        'tag.religion': '종교',
        'tag.terrain': '지형',
        'tag.water': '물',
        'tag.expert': '전문가',
        'tag.unit': '유닛',
        'tag.melee': '근접',
        'tag.ranged': '원거리',

        // Data Browser
        'dataBrowser.title': '데이터 브라우저',
        'dataBrowser.symbols': '심볼',
        'dataBrowser.relics': '유물',
        'dataBrowser.searchPlaceholder': '검색 (이름, 설명, ID)...',
        'dataBrowser.allEras': '모든 타입',
        'dataBrowser.allTypes': '모든 카테고리',
        'dataBrowser.friendly': '우호',
        'dataBrowser.enemy': '적',
        'dataBrowser.combat': '전투',
        'dataBrowser.colName': '이름',
        'dataBrowser.colEra': '타입',
        'dataBrowser.colBasePool': '기본 풀',
        'dataBrowser.colType': '타입',
        'dataBrowser.colCost': '비용',
        'dataBrowser.colTags': '태그',
        'dataBrowser.colDesc': '설명',
        'dataBrowser.colPlayerDesc': '플레이어 설명',
        'dataBrowser.colSprite': '스프라이트',
        'dataBrowser.colIcon': '아이콘',
        'dataBrowser.colColor': '색상',
        'dataBrowser.knowledgeUpgrades': '지식 업그레이드',
        'dataBrowser.intensity': '강도',
        'dataBrowser.enemies': '적 유닛',
        'dataBrowser.effectType.food_loss': '식량 감소',
        'dataBrowser.effectType.gold_loss': '골드 감소',
        'dataBrowser.effectType.mixed_loss': '복합 감소',
        'dataBrowser.effectType.destruction': '파괴',
        'dataBrowser.effectType.debuff': '디버프',
        'dataBrowser.effectType.passive': '패시브',
        'dataBrowser.effectType.on_acquire': '획득 시',
        'dataBrowser.effectType.conditional': '조건부',



        // ── Symbol Names ──
        'symbol.wheat.name': '밀',
        'symbol.rice.name': '쌀',
        'symbol.cattle.name': '소',
        'symbol.banana.name': '바나나',
        'symbol.fish.name': '물고기',
        'symbol.sea.name': '바다',
        'symbol.stone.name': '돌',
        'symbol.grassland.name': '초원',
        'symbol.monument.name': '기념비',
        'symbol.oasis.name': '오아시스',
        'symbol.oral_tradition.name': '구전 설화',
        'symbol.rainforest.name': '열대우림',
        'symbol.plains.name': '평원',
        'symbol.mountain.name': '산',
        'symbol.totem.name': '토템',
        'symbol.omen.name': '징조',
        'symbol.campfire.name': '모닥불',
        'symbol.pottery.name': '토기',
        'symbol.tribal_village.name': '부족 마을',
        'symbol.merchant.name': '상인',
        'symbol.horse.name': '말',
        'symbol.crab.name': '게',
        'symbol.library.name': '도서관',
        'symbol.pearl.name': '진주',
        'symbol.compass.name': '나침반',
        'symbol.desert.name': '사막',
        'symbol.forest.name': '숲',
        'symbol.deer.name': '사슴',
        'symbol.date.name': '대추',
        'symbol.christianity.name': '기독교',
        'symbol.islam.name': '이슬람',
        'symbol.buddhism.name': '불교',
        'symbol.hinduism.name': '힌두교',

        'symbol.warrior.name': '전사',
        'symbol.archer.name': '궁수',
        'symbol.tracker_archer.name': '추적궁병',
        'symbol.knight.name': '검사',
        'symbol.cavalry.name': '기마병',
        'symbol.cavalry_corps.name': '기병대',
        'symbol.crossbowman.name': '석궁병',
        'symbol.musketman.name': '머스킷병',
        'symbol.cannon.name': '대포',
        'symbol.infantry.name': '보병',
        'symbol.relic_caravan.name': '유물 상단',
        'symbol.stargazer.name': '별 관찰자',
        'symbol.stone_tablet.name': '석판',
        'symbol.barbarian_camp.name': '야만인 주둔지',
        'symbol.enemy_warrior.name': '전사',
        'symbol.flood.name': '홍수',
        'symbol.earthquake.name': '지진',
        'symbol.drought.name': '가뭄',
        'symbol.fur.name': '모피',
        'symbol.wool.name': '양모',

        // 47-52: 후보 -> 실제 심볼
        'symbol.salt.name': '소금',
        'symbol.honey.name': '꿀',
        'symbol.corn.name': '옥수수',
        'symbol.wild_berries.name': '야생열매',
        'symbol.hay.name': '건초',
        'symbol.spices.name': '향신료',
        'symbol.tax.name': '세금',
        'symbol.aqueduct.name': '송수로',
        'symbol.rye.name': '귀리',
        'symbol.sheep.name': '양',
        'symbol.mushroom.name': '버섯',
        'symbol.scholar.name': '학자',
        'symbol.holy_relic.name': '성유물',
        'symbol.telescope.name': '망원경',
        'symbol.scales.name': '저울',
        'symbol.pioneer.name': '개척자',
        'symbol.edict.name': '칙령',
        'symbol.agi_core.name': 'AGI 코어',
        'symbol.wild_seeds.name': '야생 씨앗',
        'symbol.wild_seeds.desc': '식량 +1. 5턴 후 파괴.',
        'symbol.embassy.name': '사절단',
        'symbol.expedition.name': '탐사대',
        'symbol.dye.name': '염료',
        'symbol.papyrus.name': '파피루스',
        'symbol.caravanserai.name': '카라밴세라이',
        'symbol.loot.name': '전리품',
        'symbol.greater_loot.name': '대형 전리품',
        'symbol.radiant_loot.name': '빛나는 전리품',

        // ── Symbol Descriptions ──
        'symbol.wheat.desc': '밀: 10턴마다: 식량10. 초원에 인접 시: 턴 +1.',
        'symbol.wheat.descBoard.both': '밀: 10턴마다: 식량15. 인접한 초원마다: 턴 +1.',
        'symbol.rice.desc': '쌀: 20턴마다: 식량25. 초원에 인접 시: 턴 +1.',
        'symbol.rice.descBoard.both': '쌀: 20턴마다: 식량30. 인접한 초원마다: 턴 +1.',
        'symbol.cattle.desc': '식량 +1. 평원 인접 시 도축 가능; 도축 시: 식량 +10.',
        'symbol.cattle.descBoard.pastoral':
            '식량 +1; 10% 확률로 소 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +10.',
        'symbol.cattle.descBoard.stirrup': '턴당 식량 +3. 평원 인접 시 도축 가능; 도축 시: 식량 +10.',
        'symbol.cattle.descBoard.stirrupPastoral':
            '턴당 식량 +3; 10% 확률로 소 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +10.',
        'symbol.banana.desc': '식량 +1; 열대우림에 10회 인접마다: 추가 식량 생산 +1.',
        'symbol.fish.desc': '보드에 배치된 바다가 1개: 식량 +1; 2개: 식량 +2; 3개 이상: 식량 +4.',
        'symbol.sea.desc': '인접한 심볼 3개당: 골드 +1.',
        'symbol.stone.desc': '골드 +1; 같은 열에 산이 있으면: 골드 +2 추가.',
        'symbol.grassland.desc': '식량 +1.',
        'symbol.grassland.descWithIrrigation': '식량 +2.',
        'symbol.grassland.descWithThreeField': '식량 +5.',
        'symbol.monument.desc': '지식 +5.',
        'symbol.oasis.desc': '인접 빈 슬롯 2개당: 식량 +1.',
        'symbol.oral_tradition.desc': '10턴 후: 파괴; 파괴 시: 인접 심볼 1개당 지식 +10.',
        'symbol.rainforest.desc': '식량 +1.',
        'symbol.plains.desc': '식량 +1.',
        'symbol.mountain.desc': '식량 +1.',
        'symbol.totem.desc': '구석 배치 시: 지식 +20.',
        'symbol.omen.desc': '50% 확률로 식량 +3.',
        'symbol.campfire.desc': '이번 턴 식량 생산이 가장 높은 인접 심볼의 식량만큼 획득. 파괴.',
        'symbol.pottery.desc': '매 턴 저장 식량 +3; 파괴 시: 저장량만큼 식량 획득.',
        'symbol.tribal_village.desc': '파괴; 파괴 시: 무작위 일반 심볼 2개 추가.',
        'symbol.merchant.desc': '무작위 인접 심볼의 식량 생산량 만큼 골드를 생산합니다.',
        'symbol.horse.desc': '식량 +1, 골드 +1; 평원에 인접 시: 식량 +2 추가 생산. 근접 유닛에 인접 시: 기마병 훈련 기회.',
        'symbol.crab.desc': '보드에 배치된 바다가 1개: 식량 +1, 골드 +1; 2개: 식량 +2, 골드 +2; 3개 이상: 식량 +2, 골드 +2.',
        'symbol.library.desc': '인접한 심볼 하나당 지식 +1.',
        'symbol.pearl.desc': '보드에 배치된 바다가 1개: 골드 +2; 2개: 골드 +3; 3개 이상: 골드 +5.',
        'symbol.compass.desc': '보드에 배치된 바다가 1개: 지식 +5; 2개: 지식 +10; 3개 이상: 지식 +15.',
        'symbol.desert.desc': '무작위 인접한 일반·시대 심볼 1개 파괴.',
        'symbol.forest.desc': '보드에 배치된 숲이 3개 이상: 식량 +2; 5개 이상: 골드 +2; 보드에 유일한 지형이 숲이면: 식량 +2.',
        'symbol.deer.desc': '인접한 숲마다: 식량 +1.',
        'symbol.loot.desc': '개봉하여 작은 보상을 획득합니다. 전리품에 인접 시: 흡수하며 대형 전리품으로 업그레이드 됩니다.',
        'symbol.greater_loot.desc': '개봉하여 보상을 획득합니다. 대형 전리품에 인접 시: 흡수하며 빛나는 전리품으로 업그레이드 됩니다.',
        'symbol.radiant_loot.desc': '개봉하여 큰 보상을 획득합니다.',
        'symbol.fur.desc': '보드에 배치된 숲 2개마다: 골드 +2.',
        'symbol.date.desc': '식량 +1; 파괴 시: 식량 +10.',
        'symbol.christianity.desc': '인접한 심볼 중 가장 높은 식량 생산량만큼 식량을 생산합니다. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'symbol.islam.desc': '보드 위 지식을 생산하는 심볼 하나당 골드 +2. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'symbol.buddhism.desc': '보드 위 빈 슬롯 1개당 식량 +2. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'symbol.hinduism.desc': '구석에 배치 시 식량 +10, 지식 +10. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'symbol.warrior.desc': '원시 근접 유닛.',
        'symbol.archer.desc': '고대 원거리 유닛.',
        'symbol.tracker_archer.desc': '고대 원거리 유닛. 숲과 인접 시: 식량 +1.',
        'symbol.knight.desc': '고대 근접 유닛.',
        'symbol.cavalry.desc': '고대 근접 유닛.',
        'symbol.cavalry_corps.desc': '중세 근접 유닛.',
        'symbol.crossbowman.desc': '중세 원거리 유닛.',
        'symbol.musketman.desc': '중세 근접 유닛.',
        'symbol.cannon.desc': '근대 원거리 유닛.',
        'symbol.infantry.desc': '근대 근접 유닛.',
        'symbol.relic_caravan.desc': '파괴; 파괴 시: 유물 상점 새로고침.',
        'symbol.stargazer.desc': '빈 슬롯 2개당: 지식 +1.',
        'symbol.stone_tablet.desc': '보유 유물 1개당: 지식 +5.',
        'symbol.barbarian_camp.desc': '8턴마다: 무작위 현재 시대 적 전투 유닛 1개 추가.',
        'symbol.enemy_warrior.desc': '식량 -5.',
        'symbol.flood.desc': '인접한 모든 지형 심볼을 비활성화 합니다. 카운터 0에 도달 시: 파괴.',
        'symbol.earthquake.desc': '파괴. 파괴 시: 무작위 인접 심볼 한 개 파괴.',
        'symbol.drought.desc': '카운터 0 도달 시: 파괴.',
        'symbol.wool.desc': '3턴 후 파괴; 파괴 시: 골드 +5.',
        'symbol.wool.descWithNomadicTradition': '3턴 후 파괴; 파괴 시: 골드 +10.',

        'symbol.salt.desc': '인접 지형 심볼 1개당: 식량 +1.',
        'symbol.honey.desc': '같은 지형이 5개 이상 배치 시: 식량 +5.',
        'symbol.corn.desc': '식량 +2.',
        'symbol.wild_berries.desc': '식량 +1; 숲 혹은 열대우림 인접 시: 식량 +2; 산 인접 시: 지식 +2.',
        'symbol.hay.desc': '평원 인접 시: 카운터 +1. 파괴 시: 카운터 만큼 식량 생산.',
        'symbol.spices.desc': '배치 된 다른 지형 유형 하나당: 식량 +1.',
        'symbol.tax.desc': '무작위 인접 심볼이 이번 턴 생산한 식량만큼 골드를 생산합니다.',
        'symbol.aqueduct.desc': '인접한 밀·쌀·귀리의 이번 턴 식량 생산이 2배가 됩니다.',
        'symbol.rye.desc': '식량 +2. 평원 인접 시: 식량 +2 추가.',
        'symbol.sheep.desc':
            '식량 +1; 10% 확률로 양모 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +5.',
        'symbol.sheep.descBoard.pastoral':
            '식량 +1; 10% 확률로 양 생산; 10% 확률로 양모 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +5.',
        'symbol.mushroom.desc': '식량 +2, 지식 +2; 숲이 인접하지 않으면: 파괴.',
        'symbol.scholar.desc': '인접한 고대 심볼을 모두 파괴합니다. 파괴한 고대 심볼 하나당 매턴 영구 지식 +5.',
        'symbol.holy_relic.desc': '보드 위에 종교 심볼이 있으면: 지식 +7, 골드 +7.',
        'symbol.telescope.desc': '슬롯 번호(1–20, 좌상단부터)만큼 지식을 생산합니다.',
        'symbol.scales.desc': '지식 +8.',
        'symbol.pioneer.desc': '파괴. 파괴 시: 다음 심볼 선택지에 지형 심볼이 최소 1개 포함됩니다.',
        'symbol.edict.desc': '소모하여 인접한 심볼 1개를 파괴할 수 있습니다.',
        'symbol.agi_core.desc': '보드 위 모든 심볼의 지식 생산량만큼 흡수합니다. 흡수한 지식이 500에 도달하면 게임에서 승리합니다.',
        'symbol.embassy.desc': '파괴. 파괴 시: 다음 심볼 선택 단계에서 첫 리롤이 골드 0입니다.',
        'symbol.expedition.desc': '열대우림 인접 시: 식량, 골드, 지식 중 무작위로 1~10만큼 생산합니다.',
        'symbol.dye.desc': '골드 +1; 파괴 시: 골드 +10.',
        'symbol.papyrus.desc': '지식 +1; 파괴 시: 지식 +10.',
        'symbol.caravanserai.desc': '이번 턴 파괴된 심볼 1개당 생산 +10. 생산 종류는 파괴된 심볼과 같습니다.',

        // ── Relics ──
        'relic.1.name': '클로비스 투창촉',
        'relic.1.desc': '매 턴 무작위 적 유닛의 체력을 1 깎습니다.',
        'relic.2.name': '리디아 호박금 주화',
        'relic.2.desc': '리롤 비용 50% 할인; 턴당 최대 3회 리롤 가능.',
        'relic.3.name': '우르 전차 바퀴',
        'relic.3.desc': '3턴 동안 매 턴 식량 생산량이 가장 낮은 심볼을 파괴하고, 파괴한 심볼 하나당 골드 10을 생산합니다.',
        'relic.4.name': '조몬 토기 조각',
        'relic.4.desc': '매 턴 이 유물에 식량 1이 저장됩니다. 클릭하여 발동하면 저장된 식량의 2배를 얻고 이 유물은 파괴됩니다.',
        'relic.5.name': '이집트 구리 톱',
        'relic.5.desc': '산: 인접한 빈 슬롯 하나당 골드 +1.',
        'relic.6.name': '바빌로니아 세계 지도',
        'relic.6.desc': '식량 +1; 슬롯 20 심볼의 식량 생산이 0 이하면: 이 유물의 식량 생산 영구적으로 +1 증가.',
        'relic.7.name': '쿠크 바나나 화석',
        'relic.7.desc': '열대우림: 인접한 바나나 하나당 식량 +2 추가 생산.',
        'relic.8.name': '십계명 석판',
        'relic.8.desc': '석판 심볼을 심볼 풀에 추가.',
        'relic.9.name': '나일 비옥한 흑니',
        'relic.9.desc': '획득 후 3턴 동안 이번 턴 보드에서 생산된 식량만큼 식량을 추가로 생산한 뒤 파괴됩니다.',
        'relic.10.name': '괴베클리 테페 신전 석주',
        'relic.10.desc': '빈 슬롯 하나당 매 턴 식량 1을 생산합니다.',
        'relic.11.name': '차탈회위크 여신상',
        'relic.11.desc': '보드에 심볼이 15개 이상이면 매 턴 식량 5를 생산합니다.',
        'relic.12.name': '이집트 쇠똥구리 부적',
        'relic.12.desc': '이번 턴에 파괴된 심볼 하나당, 턴 종료 시 골드 3을 생산합니다.',
        'relic.13.name': '고대 유물 잔해',
        'relic.13.desc': '심볼 선택을 1회 할 수 있습니다. 클릭하여 발동합니다.',
        'relic.14.name': '에피쿠로스 원자론 명판',
        'relic.14.desc': '보드에 종교 심볼이 없으면 매 턴 지식 +3.',
        'relic.15.name': '망각의 화로',
        'relic.15.desc': '소모하여 보드 위에 있는 심볼 1개 파괴.',
        'relic.16.name': '테라의 화석 포도',
        'relic.16.desc': '자연재해 심볼이 식량 +2를 추가로 생산합니다.',
        'relic.17.name': '안토니니아누스 은화',
        'relic.17.desc': '심볼 선택을 건너뛰면 골드 +2.',
        'relic.18.name': '안데스의 추뇨',
        'relic.18.desc': '매 턴 식량 +2.',
        'relic.19.name': '고대 부족 합류',
        'relic.19.desc': '지형 선택을 1회 합니다. 클릭하여 사용.',

        // ── Knowledge Upgrades ──
        'knowledgeUpgrade.1.name': '문자',
        'knowledgeUpgrade.1.desc': '도서관을 해금합니다.',
        'knowledgeUpgrade.2.name': '철제 기술',
        'knowledgeUpgrade.2.desc': '전사를 검사로 업그레이드합니다.',
        'knowledgeUpgrade.3.name': '관개',
        'knowledgeUpgrade.3.desc': '밀, 쌀, 초원을 업그레이드합니다.',
        'knowledgeUpgrade.4.name': '신학',
        'knowledgeUpgrade.4.desc': '종교 심볼들을 해금합니다.',
        'knowledgeUpgrade.5.name': '궁술',
        'knowledgeUpgrade.5.desc': '궁수를 해금합니다.',
        'knowledgeUpgrade.6.name': '화폐',
        'knowledgeUpgrade.6.desc': '상인 심볼을 해금합니다.',
        'knowledgeUpgrade.7.name': '기마술',
        'knowledgeUpgrade.7.desc': '말을 해금합니다. 평원을 업그레이드합니다.',
        'knowledgeUpgrade.8.name': '희생 제의',
        'knowledgeUpgrade.8.desc': '망각의 화로 3개. 소모하여 보드 위에 있는 심볼 1개씩 파괴.',
        'knowledgeUpgrade.9.name': '어업',
        'knowledgeUpgrade.9.desc': '게와 진주를 해금합니다.',
        'knowledgeUpgrade.28.name': '항해술',
        'knowledgeUpgrade.28.desc': '물고기와 게를 업그레이드합니다.',
        'knowledgeUpgrade.29.name': '천문항법',
        'knowledgeUpgrade.29.desc': '진주와 바다를 업그레이드합니다.',
        'knowledgeUpgrade.30.name': '채광',
        'knowledgeUpgrade.30.desc': '열대우림과 돌을 업그레이드합니다.',
        'knowledgeUpgrade.31.name': '수렵',
        'knowledgeUpgrade.31.desc': '버섯과 모피를 해금합니다.',
        'knowledgeUpgrade.32.name': '법전',
        'knowledgeUpgrade.32.desc': '기본 지식 생산 +2.',
        'knowledgeUpgrade.33.name': '외국 무역',
        'knowledgeUpgrade.33.desc': '사막을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.33.desert': '골드 +2; 무작위 인접 일반·시대 심볼 1개 파괴.',
        'knowledgeUpgrade.67.name': '건축',
        'knowledgeUpgrade.67.desc': '기본 지식 생산 +1. 소금을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.67.salt': '인접 지형 심볼 1개당: 식량 +2.',
        'knowledgeUpgrade.68.name': '민족주의',
        'knowledgeUpgrade.68.desc': '기본 지식 생산 +3. 기념비를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.68.monument': '지식 +10.',
        'knowledgeUpgrade.69.name': '탐험',
        'knowledgeUpgrade.69.desc': '기본 골드 생산 +2. 꿀을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.69.honey': '같은 지형 5개 이상 배치 시: 식량 +10.',
        'knowledgeUpgrade.70.name': '식민주의',
        'knowledgeUpgrade.71.name': '군사 과학',
        'knowledgeUpgrade.70.desc': '기본 골드 생산 +3. 향신료를 업그레이드합니다.',
        'knowledgeUpgrade.71.desc': '말을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.70.spices': '배치된 다른 지형 유형 하나당: 식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.71.horse': '식량 +2, 골드 +2; 평원에 인접 시: 식량 +4 추가 생산. 근접 유닛에 인접 시: 기병대 훈련 기회.',
        'knowledgeUpgrade.52.name': '대상품 교역',
        'knowledgeUpgrade.52.desc': '염료와 파피루스를 해금합니다.',
        'knowledgeUpgrade.53.name': '건조 저장술',
        'knowledgeUpgrade.53.desc': '사막과 오아시스, 대추를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.53.desert': '골드 +5. 인접한 일반 및 시대 심볼 모두 파괴.',
        'knowledgeUpgrade.symbolDescAfter.53.oasis': '인접 빈 슬롯 당: 식량 +1.',
        'knowledgeUpgrade.symbolDescAfter.53.date': '식량 +1; 파괴 시: 식량 +20.',
        'knowledgeUpgrade.54.name': '카라밴세라이',
        'knowledgeUpgrade.54.desc': '카라밴세라이를 해금합니다. 염료와 파피루스를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.54.dye': '골드 +1; 파괴 시: 골드 +20.',
        'knowledgeUpgrade.symbolDescAfter.54.papyrus': '지식 +1; 파괴 시: 지식 +20.',
        'knowledgeUpgrade.55.name': '오아시스 회수망',
        'knowledgeUpgrade.55.desc': '사막과 오아시스를 업그레이드 합니다.',
        'knowledgeUpgrade.56.name': '기계장치',
        'knowledgeUpgrade.56.desc': '궁수를 석궁병으로 업그레이드합니다.',
        'knowledgeUpgrade.57.name': '화약',
        'knowledgeUpgrade.57.desc': '검사를 머스킷병으로 업그레이드합니다.',
        'knowledgeUpgrade.58.name': '탄도학',
        'knowledgeUpgrade.58.desc': '석궁병을 대포로 업그레이드합니다.',
        'knowledgeUpgrade.59.name': '교체식 부품',
        'knowledgeUpgrade.59.desc': '머스킷병을 보병으로 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.55.desert': '식량 +10 및 골드 +10. 보드 위 모든 일반 및 시대 심볼 파괴.',
        'knowledgeUpgrade.symbolDescAfter.55.oasis': '인접한 빈 슬롯 당: 식량 +3.',
        'knowledgeUpgrade.34.name': '족장제',
        'knowledgeUpgrade.34.desc': '기본 식량 생산 +2. 야생열매를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.34.wild_berries': '식량 +1; 숲 혹은 열대우림 인접 시: 식량 +4; 산 인접 시: 지식 +5.',
        'knowledgeUpgrade.66.name': '봉건제',
        'knowledgeUpgrade.66.desc': '기본 식량 생산 +2. 옥수수를 업그레이드 합니다.',
        'knowledgeUpgrade.symbolDescAfter.66.corn': '식량 +4.',
        'knowledgeUpgrade.10.name': '수학',
        'knowledgeUpgrade.10.desc': '기본 식량 생산 +1, 기본 지식 생산 +1.',
        'knowledgeUpgrade.65.name': '국가 노동력',
        'knowledgeUpgrade.65.desc': '기본 식량 생산 +1. 기본 골드 생산 +1.',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.name`]: '도시화',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.desc`]: '기본 식량 생산 +10. 기본 골드 생산 +2.',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.name`]: '증기력',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.desc`]: '기본 골드 생산 +8. 기본 지식 생산 +4.',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.name`]: '전기',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.desc`]: '기본 식량 생산 +5. 기본 골드 생산 +10. 기본 지식 생산 +5.',
        'knowledgeUpgrade.25.name': '고대 시대',
        'knowledgeUpgrade.25.desc': '고대 심볼을 모두 해금합니다.',
        'knowledgeUpgrade.26.name': '목축업',
        'knowledgeUpgrade.26.desc': '소와 양을 업그레이드합니다.',
        'knowledgeUpgrade.27.name': '농업',
        'knowledgeUpgrade.27.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.15.name': '중세시대',
        'knowledgeUpgrade.15.desc': '고대 심볼이 더 이상 등장하지 않습니다. 중세 심볼을 모두 해금합니다. 지형 심볼 등장 확률이 x0.2로 감소합니다.',
        'knowledgeUpgrade.60.name': '현대 시대',
        'knowledgeUpgrade.60.desc': '중세 심볼이 더 이상 등장하지 않습니다. 현대 심볼을 모두 해금합니다. 지형 심볼이 더 이상 등장하지 않습니다.',
        'knowledgeUpgrade.61.name': 'AGI 프로젝트',
        'knowledgeUpgrade.61.desc': 'AGI 코어를 획득합니다.',
        'knowledgeUpgrade.16.name': '교육',
        'knowledgeUpgrade.16.desc': '도서관을 업그레이드 합니다.',
        'knowledgeUpgrade.63.name': '신권',
        'knowledgeUpgrade.63.desc': '기독교, 이슬람, 불교, 힌두교를 업그레이드합니다.',
        'knowledgeUpgrade.64.name': '길드',
        'knowledgeUpgrade.64.desc': '상인을 업그레이드 합니다.',
        'knowledgeUpgrade.symbolDescAfter.63.christianity': '보드 위 심볼 중 가장 높은 식량 생산량 만큼 식량을 생산합니다. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.63.islam': '보드 위 지식을 생산하는 심볼 하나당 골드 +3. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.63.buddhism': '보드 위 빈 슬롯 하나당 식량 +4. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.63.hinduism': '구석에 배치 시 식량 +20, 지식 +20. 보드에 다른 종교 심볼이 있을 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.64.merchant': '인접 심볼 중 가장 높은 식량 생산량 만큼 골드를 생산합니다.',
        'knowledgeUpgrade.symbolDescAfter.16.library': '인접한 심볼 하나당 지식 +2.',
        'knowledgeUpgrade.62.name': '과학이론',
        'knowledgeUpgrade.62.desc': '도서관을 업그레이드 합니다.',
        'knowledgeUpgrade.symbolDescAfter.62.library': '보드 위 심볼 하나당: 지식 +2.',
        'knowledgeUpgrade.24.name': '인쇄술',
        'knowledgeUpgrade.24.desc': '기본 골드 생산 +2, 기본 지식 생산 +2.',
        'knowledgeUpgrade.35.name': '삼포제',
        'knowledgeUpgrade.35.desc': '밀, 쌀, 초원을 업그레이드합니다.',
        'knowledgeUpgrade.36.name': '농업 잉여',
        'knowledgeUpgrade.36.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.37.name': '현대 농업',
        'knowledgeUpgrade.37.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.38.name': '목장제',
        'knowledgeUpgrade.38.desc': '평원을 업그레이드합니다.',
        'knowledgeUpgrade.39.name': '유목 전통',
        'knowledgeUpgrade.39.desc': '소, 양, 양모를 업그레이드합니다.',
        'knowledgeUpgrade.40.name': '나침반',
        'knowledgeUpgrade.40.desc': '나침반을 해금합니다.',
        'knowledgeUpgrade.41.name': '조선',
        'knowledgeUpgrade.41.desc': '바다를 업그레이드합니다.',
        'knowledgeUpgrade.42.name': '어업 조합',
        'knowledgeUpgrade.42.desc': '물고기, 게를 업그레이드합니다.',
        'knowledgeUpgrade.43.name': '해상 무역',
        'knowledgeUpgrade.43.desc': '진주와 바다를 업그레이드합니다.',
        'knowledgeUpgrade.44.name': '원양 항로',
        'knowledgeUpgrade.44.desc': '물고기, 게, 진주 및 바다를 업그레이드합니다.',
        'knowledgeUpgrade.45.name': '플랜테이션',
        'knowledgeUpgrade.45.desc': '바나나와 열대우림을 업그레이드합니다.',
        'knowledgeUpgrade.48.name': '추적술',
        'knowledgeUpgrade.48.desc': '숲과 버섯, 사슴을 업그레이드합니다.',
        'knowledgeUpgrade.49.name': '무두질',
        'knowledgeUpgrade.49.desc': '모피와 사슴을 업그레이드합니다.',
        'knowledgeUpgrade.50.name': '임업',
        'knowledgeUpgrade.50.desc': '숲을 업그레이드 합니다.',
        'knowledgeUpgrade.51.name': '보존',
        'knowledgeUpgrade.51.desc': '사슴과 버섯을 업그레이드 합니다.',
        'knowledgeUpgrade.46.name': '정글탐사',
        'knowledgeUpgrade.46.desc': '탐사대를 해금합니다.',
        'knowledgeUpgrade.47.name': '열대 개발',
        'knowledgeUpgrade.47.desc': '열대우림과 탐사대를 업그레이드합니다.',
        'destroySelection.riteTitle': '희생 제의 (파괴할 심볼 선택)',
        'destroySelection.riteDesc': '보유 중인 심볼을 최대 3개까지 파괴할 수 있습니다. 선택 후 확정하면 파괴한 심볼 하나당 골드 +10을 획득합니다.',
        'destroySelection.territoryTitle': '영토 정비 (제거할 심볼 선택)',
        'destroySelection.territoryDesc': '보유 심볼 최대 3개까지 제거합니다(파괴 효과는 발동하지 않음). 제거한 심볼마다 골드 +10. 이후 지형 선택 1회와 심볼 선택 3회가 이어집니다.',
        'destroySelection.edictTitle': '칙령 — 보유 심볼 1개 제거',
        'destroySelection.edictDesc': '컬렉션에서 제거할 심볼 1개를 고릅니다(파괴 효과는 발동하지 않음). 이후 심볼 선택으로 이어집니다.',
        'destroySelection.edictConfirm': '1개 제거 후 심볼 선택',
        'destroySelection.oblivionTitle': '망각의 화로',
        'destroySelection.oblivionDesc': '소모하여 보드 위에 있는 심볼 1개 파괴.',
        'destroySelection.oblivionConfirm': '파괴',
        'destroySelection.shortDesc': '파괴할 심볼을 선택하세요.',
        'destroySelection.confirmSacrifice': '{n}개 파괴 및 {gold} 골드 획득',
        'oblivionBoard.title': '심볼 제거',
        'oblivionBoard.remove': '제거',
        'oblivionBoard.cancel': '취소',
        'edictBoard.title': '칙령: 인접 심볼 파괴',
        'edictBoard.remove': '파괴',
        'edictBoard.cancel': '취소',
        'cattleButcher.button': '도축',
        'cattleButcher.aria': '도축 시 보너스 획득',
        'horseTrain.button': '훈련',
        'horseTrain.aria': '인접한 근접 유닛 훈련',
        'lootOpen.button': '개봉',
        'lootOpen.aria': '전리품 보상 개봉',
        'knowledgeUpgrade.11.name': '황금의 거래',
        'knowledgeUpgrade.11.desc': '새로운 유물 입고 시 무작위 유물의 가격이 50% 할인됩니다.',
        'knowledgeUpgrade.12.name': '유물 보관소',
        'knowledgeUpgrade.12.desc': '유물 1개당 매 턴 지식 생산 +1',
        'knowledgeUpgrade.13.name': '천하부강',
        'knowledgeUpgrade.13.desc': '보드에 배치된 심볼 수 두 개당 매 턴 식량 +1. 빈 슬롯 두 개당 매 턴 지식 +1.',
        'knowledgeUpgrade.14.name': '천하통일의 기틀',
        'knowledgeUpgrade.14.desc': '새 시대마다 고대 유물 잔해와 고대 부족 합류를 하나씩 얻습니다.',
    },
};

/** 지식 카드 ‘적용 전’: 해당 업그레이드 ID를 제외한 보유 연구 기준 */
export function unlocksExcluding(unlocked: readonly number[] | undefined, omitId: number): number[] {
    return (unlocked ?? []).map(Number).filter((id) => id !== omitId);
}

/** 지식 카드 ‘적용 후’: 해당 업그레이드 ID를 포함한 보유 연구 기준 */
export function unlocksIncluding(unlocked: readonly number[] | undefined, addId: number): number[] {
    return [...new Set([...(unlocked ?? []).map(Number), Number(addId)])];
}

function cropThreeFieldDesc(symbolKey: 'wheat' | 'rice', lang: Language, hasAgriculture: boolean): string {
    const food = symbolKey === 'wheat'
        ? hasAgriculture ? 15 : 10
        : hasAgriculture ? 30 : 25;
    if (lang === 'ko') {
        return symbolKey === 'wheat'
            ? `밀: 10턴마다: 식량 +${food}+보드 위 초원 수. 인접한 초원마다: 턴 +1.`
            : `쌀: 20턴마다: 식량 +${food}+보드 위 초원 수. 인접한 초원마다: 턴 +1.`;
    }
    return symbolKey === 'wheat'
        ? `Wheat: every 10 turns: ${food} Food + number of Grasslands on the board. Per adjacent Grassland: +1/turn.`
        : `Rice: every 20 turns: ${food} Food + number of Grasslands on the board. Per adjacent Grassland: +1/turn.`;
}

function cropAgriculturalSurplusDesc(symbolKey: 'wheat' | 'rice', lang: Language, hasAgriculture: boolean): string {
    const food = symbolKey === 'wheat'
        ? hasAgriculture ? 15 : 10
        : hasAgriculture ? 30 : 25;
    if (lang === 'ko') {
        return symbolKey === 'wheat'
            ? `밀: 10턴마다: 식량 +${food}+보드 위 초원 수. 인접한 초원마다: 턴 +2.`
            : `쌀: 20턴마다: 식량 +${food}+보드 위 초원 수. 인접한 초원마다: 턴 +2.`;
    }
    return symbolKey === 'wheat'
        ? `Wheat: every 10 turns: ${food} Food + number of Grasslands on the board. Per adjacent Grassland: +2/turn.`
        : `Rice: every 20 turns: ${food} Food + number of Grasslands on the board. Per adjacent Grassland: +2/turn.`;
}

function cropModernAgricultureDesc(symbolKey: 'wheat' | 'rice', lang: Language, hasAgriculture: boolean): string {
    const food = symbolKey === 'wheat'
        ? hasAgriculture ? 15 : 10
        : hasAgriculture ? 30 : 25;
    if (lang === 'ko') {
        return symbolKey === 'wheat'
            ? `밀: 10턴마다: 식량 +${food}+보드 위 초원 수. 보드 위 초원 1개당: 턴 +1.`
            : `쌀: 20턴마다: 식량 +${food}+보드 위 초원 수. 보드 위 초원 1개당: 턴 +1.`;
    }
    return symbolKey === 'wheat'
        ? `Wheat: every 10 turns: ${food} Food + number of Grasslands on the board. Per Grassland on the board: +1/turn.`
        : `Rice: every 20 turns: ${food} Food + number of Grasslands on the board. Per Grassland on the board: +1/turn.`;
}

/** 보드·선택 UI: 밀/쌀·초원·평원·소·양 등 연구 상태에 따라 툴팁 문구가 바뀜 */
export function getBoardSymbolTooltipDesc(
    symbolKey: string,
    lang: Language,
    unlockedKnowledgeUpgrades: readonly number[] | undefined,
): string {
    if (symbolKey === 'grassland') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(THREE_FIELD_SYSTEM_UPGRADE_ID)) {
            return t('symbol.grassland.descWithThreeField', lang);
        }
        return have.has(IRRIGATION_UPGRADE_ID)
            ? t('symbol.grassland.descWithIrrigation', lang)
            : t('symbol.grassland.desc', lang);
    }
    if (symbolKey === 'cattle') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        const hasPast = have.has(PASTORALISM_UPGRADE_ID);
        const hasNomadicTradition = have.has(NOMADIC_TRADITION_UPGRADE_ID);
        if (hasNomadicTradition && hasPast) {
            return lang === 'ko'
                ? '식량 +1; 10% 확률로 소 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +15.'
                : '+1 Food; 10% chance to produce Cattle. When adjacent to Plains, can butcher; on butcher: +15 Food.';
        }
        if (hasNomadicTradition) {
            return lang === 'ko'
                ? '식량 +1. 평원 인접 시 도축 가능; 도축 시: 식량 +15.'
                : '+1 Food. When adjacent to Plains, can butcher; on butcher: +15 Food.';
        }
        if (hasPast) return t('symbol.cattle.descBoard.pastoral', lang);
        return t('symbol.cattle.desc', lang);
    }
    if (symbolKey === 'sheep') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(NOMADIC_TRADITION_UPGRADE_ID)) {
            return have.has(PASTORALISM_UPGRADE_ID)
                ? lang === 'ko'
                    ? '식량 +1; 10% 확률로 양 생산; 10% 확률로 양모 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +10.'
                    : '+1 Food; 10% chance to produce Sheep; 10% chance to produce Wool. When adjacent to Plains, can butcher; on butcher: +5 Food, +10 Gold.'
                : lang === 'ko'
                    ? '식량 +1; 10% 확률로 양모 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +10.'
                    : '+1 Food; 10% chance to produce Wool. When adjacent to Plains, can butcher; on butcher: +5 Food, +10 Gold.';
        }
        return have.has(PASTORALISM_UPGRADE_ID)
            ? t('symbol.sheep.descBoard.pastoral', lang)
            : t('symbol.sheep.desc', lang);
    }
    if (symbolKey === 'wool') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(NOMADIC_TRADITION_UPGRADE_ID)
            ? t('symbol.wool.descWithNomadicTradition', lang)
            : t('symbol.wool.desc', lang);
    }
    if (symbolKey === 'plains') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(PASTURE_MANAGEMENT_UPGRADE_ID)) {
            const base = have.has(HORSEMANSHIP_UPGRADE_ID) ? 2 : 1;
            return lang === 'ko'
                ? `식량 +${base}+카운터. 인접한 소 또는 양이 도축될 때: 카운터 +1.`
                : `+${base} Food + Counter. When adjacent Cattle or Sheep is butchered: +1 Counter.`;
        }
        return have.has(HORSEMANSHIP_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.7.plains', lang)
            : t('symbol.plains.desc', lang);
    }
    if (symbolKey === 'fish') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.44.fish', lang)
            : have.has(FISHERY_GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.42.fish', lang)
            : have.has(SEAFARING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.28.fish', lang)
            : t('symbol.fish.desc', lang);
    }
    if (symbolKey === 'crab') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.44.crab', lang)
            : have.has(FISHERY_GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.42.crab', lang)
            : have.has(SEAFARING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.28.crab', lang)
            : t('symbol.crab.desc', lang);
    }
    if (symbolKey === 'sea') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(OCEANIC_ROUTES_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.44.seaWithShipbuilding', lang);
        }
        if (have.has(OCEANIC_ROUTES_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.44.sea', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(MARITIME_TRADE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.43.seaWithShipbuilding', lang);
        }
        if (have.has(MARITIME_TRADE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.43.sea', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.41.seaWithCelestial', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.41.sea', lang);
        }
        return have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.29.sea', lang)
            : t('symbol.sea.desc', lang);
    }
    if (symbolKey === 'pearl') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.44.pearl', lang)
            : have.has(MARITIME_TRADE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.43.pearl', lang)
            : have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.29.pearl', lang)
            : t('symbol.pearl.desc', lang);
    }
    if (symbolKey === 'stone') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(MINING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.30.stone', lang)
            : t('symbol.stone.desc', lang);
    }
    if (symbolKey === 'rainforest') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TROPICAL_DEVELOPMENT_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.47.rainforest', lang)
            : have.has(PLANTATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.45.rainforest', lang)
            : have.has(MINING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.30.rainforest', lang)
            : t('symbol.rainforest.desc', lang);
    }
    if (symbolKey === 'forest') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(FORESTRY_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.50.forest', lang)
            : have.has(TRACKING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.48.forest', lang)
            : t('symbol.forest.desc', lang);
    }
    if (symbolKey === 'banana') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(PLANTATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.45.banana', lang)
            : t('symbol.banana.desc', lang);
    }
    if (symbolKey === 'mushroom') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(PRESERVATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.51.mushroom', lang)
            : have.has(TRACKING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.48.mushroom', lang)
            : t('symbol.mushroom.desc', lang);
    }
    if (symbolKey === 'fur') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TANNING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.49.fur', lang)
            : t('symbol.fur.desc', lang);
    }
    if (symbolKey === 'deer') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(PRESERVATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.51.deer', lang)
            : have.has(TANNING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.49.deer', lang)
            : have.has(TRACKING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.48.deer', lang)
            : t('symbol.deer.desc', lang);
    }
    if (symbolKey === 'expedition') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TROPICAL_DEVELOPMENT_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.47.expedition', lang)
            : t('symbol.expedition.desc', lang);
    }
    if (symbolKey === 'desert') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(OASIS_RECOVERY_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.55.desert', lang);
        }
        if (have.has(DESERT_STORAGE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.53.desert', lang);
        }
        return have.has(FOREIGN_TRADE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.33.desert', lang)
            : t('symbol.desert.desc', lang);
    }
    if (symbolKey === 'oasis') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(OASIS_RECOVERY_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.55.oasis', lang);
        }
        return have.has(DESERT_STORAGE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.53.oasis', lang)
            : t('symbol.oasis.desc', lang);
    }
    if (symbolKey === 'date') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(DESERT_STORAGE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.53.date', lang)
            : t('symbol.date.desc', lang);
    }
    if (symbolKey === 'dye') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CARAVANSERAI_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.54.dye', lang)
            : t('symbol.dye.desc', lang);
    }
    if (symbolKey === 'papyrus') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CARAVANSERAI_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.54.papyrus', lang)
            : t('symbol.papyrus.desc', lang);
    }
    if (symbolKey === 'wild_berries') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CHIEFDOM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.34.wild_berries', lang)
            : t('symbol.wild_berries.desc', lang);
    }
    if (symbolKey === 'library') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(62)
            ? t('knowledgeUpgrade.symbolDescAfter.62.library', lang)
            : have.has(16)
            ? t('knowledgeUpgrade.symbolDescAfter.16.library', lang)
            : t('symbol.library.desc', lang);
    }
    if (symbolKey === 'merchant') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.64.merchant', lang)
            : t('symbol.merchant.desc', lang);
    }
    if (symbolKey === 'horse') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(MILITARY_SCIENCE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.71.horse', lang)
            : t('symbol.horse.desc', lang);
    }
    if (symbolKey === 'corn') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(FEUDAL_CORN_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.66.corn', lang)
            : t('symbol.corn.desc', lang);
    }
    if (symbolKey === 'salt') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(ARCHITECTURE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.67.salt', lang)
            : t('symbol.salt.desc', lang);
    }
    if (symbolKey === 'monument') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(NATIONALISM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.68.monument', lang)
            : t('symbol.monument.desc', lang);
    }
    if (symbolKey === 'honey') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(EXPLORATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.69.honey', lang)
            : t('symbol.honey.desc', lang);
    }
    if (symbolKey === 'spices') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(COLONIALISM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.70.spices', lang)
            : t('symbol.spices.desc', lang);
    }
    if (symbolKey === 'christianity' || symbolKey === 'islam' || symbolKey === 'buddhism' || symbolKey === 'hinduism') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(THEOCRACY_UPGRADE_ID)
            ? t(`knowledgeUpgrade.symbolDescAfter.63.${symbolKey}`, lang)
            : t(`symbol.${symbolKey}.desc`, lang);
    }
    if (symbolKey !== 'wheat' && symbolKey !== 'rice') {
        return t(`symbol.${symbolKey}.desc`, lang);
    }
    const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
    const hasModernAgriculture = have.has(MODERN_AGRICULTURE_UPGRADE_ID);
    const hasAgriculturalSurplus = have.has(AGRICULTURAL_SURPLUS_UPGRADE_ID);
    const hasThreeField = have.has(THREE_FIELD_SYSTEM_UPGRADE_ID);
    const hasIrr = have.has(IRRIGATION_UPGRADE_ID);
    const hasAg = have.has(AGRICULTURE_UPGRADE_ID);

    if (symbolKey === 'wheat') {
        if (hasModernAgriculture) return cropModernAgricultureDesc('wheat', lang, hasAg);
        if (hasAgriculturalSurplus) return cropAgriculturalSurplusDesc('wheat', lang, hasAg);
        if (hasThreeField) return cropThreeFieldDesc('wheat', lang, hasAg);
        if (hasIrr && hasAg) return t('symbol.wheat.descBoard.both', lang);
        if (hasAg) return t('knowledgeUpgrade.symbolDescAfter.27.wheat', lang);
        if (hasIrr) return t('knowledgeUpgrade.symbolDescAfter.3.wheat', lang);
        return t('symbol.wheat.desc', lang);
    }
    if (hasModernAgriculture) return cropModernAgricultureDesc('rice', lang, hasAg);
    if (hasAgriculturalSurplus) return cropAgriculturalSurplusDesc('rice', lang, hasAg);
    if (hasThreeField) return cropThreeFieldDesc('rice', lang, hasAg);
    if (hasIrr && hasAg) return t('symbol.rice.descBoard.both', lang);
    if (hasAg) return t('knowledgeUpgrade.symbolDescAfter.27.rice', lang);
    if (hasIrr) return t('knowledgeUpgrade.symbolDescAfter.3.rice', lang);
    return t('symbol.rice.desc', lang);
}

export function t(key: string, lang: Language): string {
    return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}
