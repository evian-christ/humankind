import type { Language } from '../game/state/settingsStore';
import {
    AGRICULTURE_UPGRADE_ID,
    AGRICULTURAL_SURPLUS_UPGRADE_ID,
    ARCHITECTURE_UPGRADE_ID,
    CARAVANSERAI_UPGRADE_ID,
    CELESTIAL_NAVIGATION_UPGRADE_ID,
    CHIEFDOM_UPGRADE_ID,
    MERCANTILISM_UPGRADE_ID,
    DESERT_STORAGE_UPGRADE_ID,
    ELECTRICITY_UPGRADE_ID,
    EDUCATION_UPGRADE_ID,
    EXPLORATION_UPGRADE_ID,
    FEUDALISM_UPGRADE_ID,
    FEUDAL_CORN_UPGRADE_ID,
    FORESTRY_UPGRADE_ID,
    FOREIGN_TRADE_UPGRADE_ID,
    GREAT_MIGRATION_UPGRADE_ID,
    GUILD_UPGRADE_ID,
    IRRIGATION_UPGRADE_ID,
    MARITIME_TRADE_UPGRADE_ID,
    MASON_GUILD_UPGRADE_ID,
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
    SCIENTIFIC_THEORY_UPGRADE_ID,
    SEAFARING_UPGRADE_ID,
    FISHERY_GUILD_UPGRADE_ID,
    SHIPBUILDING_UPGRADE_ID,
    STEAM_POWER_UPGRADE_ID,
    TANNING_UPGRADE_ID,
    THEOCRACY_UPGRADE_ID,
    TRACKING_UPGRADE_ID,
    TROPICAL_AGRICULTURE_UPGRADE_ID,
    TROPICAL_DEVELOPMENT_UPGRADE_ID,
    THREE_FIELD_SYSTEM_UPGRADE_ID,
    URBANIZATION_UPGRADE_ID,
} from '../game/data/knowledgeUpgrades';
import {
    BORDER_RAID_REWARD,
    BORDER_RAID_ENEMY_COUNT,
    DESERT_CARAVAN_FOOD,
    EVERY_TERRAIN_BOUNTY_EACH,
    MILITARY_DRAFT_FOOD,
    FOREST_HARVEST_FOOD,
    GRASSLAND_FESTIVAL_FOOD,
    MARITIME_TRADE_PER_SEA,
    MOUNTAIN_LOOKOUT_PER_MOUNTAIN,
    OASIS_BLESSING_PER_EMPTY,
    PLAINS_PASTURE_PER_CATTLE,
    PLAINS_PASTURE_PER_SHEEP,
    eraScaleIndex,
} from '../game/data/eventDefinitions';
import { ZH_TRANSLATIONS } from './zh';

const translations: Partial<Record<Language, Record<string, string>>> & Record<'en' | 'ko', Record<string, string>> = {
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
        'settings.lang.zh': 'Chinese',
        'settings.tab.gameplay': 'Gameplay',
        'settings.tab.graphics': 'Graphics',
        'settings.tab.general': 'General',
        'settings.tab.audio': 'Audio',
        'settings.fullscreen': 'Fullscreen',
        'settings.fullscreen.on': 'On',
        'settings.fullscreen.off': 'Off',
        'settings.masterVolume': 'Master Volume',
        'settings.musicVolume': 'Music Volume',
        'settings.ambientVolume': 'Ambient Volume',
        'settings.effectVolume': 'SFX Volume',
        'settings.developerMode': 'Developer Mode',
        'settings.developerMode.on': 'On',
        'settings.developerMode.off': 'Off',
        'settings.resetProgress': 'Reset game data',
        'settings.resetProgress.hint': 'Clears saved runs, tutorial completion, and leader progression.',
        'settings.resetProgress.button': 'Reset',
        'settings.resetProgress.confirmTitle': 'Reset game data',
        'settings.resetProgress.confirm': 'Reset all game data? Saved runs, tutorial completion, and leader progression will be deleted. Settings will be kept.',
        'settings.resetProgress.cancel': 'Cancel',
        'settings.resetProgress.confirmButton': 'Reset',

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
        'game.peekBoard': 'View Board',
        'game.returnToSelection': 'Back to Selection',
        'game.chooseRelic': 'Choose a Relic',
        'game.relicShopTitle': 'Relic Shop — New stock in {turns} turns',
        'game.relicShopTitleShort': 'Relic Shop',
        'game.relicShopNewStockHint': '유물 상점 — 신규 입고',
        'game.relicShopNewStockAria': '유물 상점, 신규 입고',
        'game.relicShopSoldOut': 'SOLD OUT',
        'game.relicPanelTitle': 'Relics',
        'game.relicShopBuyDiscountAria': 'Buy for {sale} gold (original price {original})',
        'game.chooseUpgrade': 'Choose a Knowledge Upgrade',
        'knowledgeUpgrade.researchConfirmTitle': 'Research Knowledge Upgrade',
        'knowledgeUpgrade.researchConfirmMessage': 'Research "{name}"?',
        'knowledgeUpgrade.researchCancel': 'Cancel',
        'knowledgeUpgrade.researchConfirm': 'Research',
        'game.knowledgeUpgradeTreeTitle': 'Knowledge Upgrades',
        'game.researchToContinue': 'Research to continue',
        'game.levelUpResearchPointsLabel': 'Research points',
        'game.spendLevelUpResearchPointsFirst': 'Spend research points in Knowledge Upgrades first.',
        'game.levelUpResearchPointsRequired': 'Research points required',
        'game.knowledgeHudPendingTab': 'NEW',
        'game.knowledgeHudPendingTabAria': 'Knowledge upgrades — research available to spend',
        'game.knowledgeHudButtonHintPending': '{title} — research available to spend',
        'game.noUpgradesAvailable': 'No upgrades available',
        'knowledgeUpgrade.effectCompare.beforeLabel': 'Before',
        'knowledgeUpgrade.effectCompare.afterLabel': 'After',
        'knowledgeUpgrade.detail.unlockLevel': 'Unlocks at Lv.{level}',
        'knowledgeUpgrade.detail.prereqComplete': 'Prerequisite complete',
        'knowledgeUpgrade.detail.prereqRequired': 'Prerequisite required',
        'knowledgeUpgrade.detail.dependent': 'Next',
        'knowledgeUpgrade.symbolRelation.pool_add': 'Added Symbols',
        'knowledgeUpgrade.symbolRelation.effect_modify': 'Changed Symbols',
        'knowledgeUpgrade.symbolRelation.pool_remove': 'Removed Symbols',
        'knowledgeUpgrade.relicRelation.gain': 'Gained Relics',
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
        'knowledgeUpgrade.requiresGunpowderShort': 'Needs Stirrups',
        'knowledgeUpgrade.requiresBallisticsShort': 'Needs Ballistics',
        'knowledgeUpgrade.symbolDescAfter.9.archer': 'Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.symbolDescAfter.22.warrior': 'Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.symbolDescAfter.33.archer': 'Replaces Archer with Crossbowman. Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.symbolDescAfter.48.warrior': 'Replaces Warrior with Knight. Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.symbolDescAfter.55.crossbowman': 'Replaces Crossbowman with Cannon. Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.symbolDescAfter.62.cavalry': 'Replaces Knight with Infantry. Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.symbolDescAfter.6.warrior': 'Melee units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.symbolDescAfter.16.wheat':
            'Wheat: every 10 turns: 10 Food. Per adjacent Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.16.rice':
            'Rice: every 20 turns: 25 Food. Per adjacent Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.5.wheat':
            'Wheat: every 10 turns: 15 Food. Adjacent to Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.5.rice':
            'Rice: every 20 turns: 30 Food. Adjacent to Grassland: +1/turn.',
        'knowledgeUpgrade.symbolDescAfter.3.plains': '+2 Food.',
        'knowledgeUpgrade.symbolDescAfter.13.warrior': 'Melee units gain +1 Attack and +1 HP.',
        'knowledgeUpgrade.symbolDescAfter.35.warrior': 'Melee units gain +1 Attack and +1 HP.',
        'knowledgeUpgrade.symbolDescAfter.14.fish': 'With 1 Sea on the board: +2 Food; 2 Seas: +3 Food; 3+ Seas: +5 Food.',
        'knowledgeUpgrade.symbolDescAfter.14.crab': 'With 1 Sea on the board: +2 Food, +1 Gold; 2 Seas: +3 Food, +2 Gold; 3+ Seas: +3 Food, +2 Gold.',
        'knowledgeUpgrade.symbolDescAfter.27.fish': 'With 1 Sea on the board: +3 Food; 2 Seas: +5 Food; 3+ Seas: +10 Food.',
        'knowledgeUpgrade.symbolDescAfter.27.crab': 'With 1 Sea on the board: +3 Food, +3 Gold; 2 Seas: +5 Food, +5 Gold; 3+ Seas: +5 Food, +5 Gold.',
        'knowledgeUpgrade.symbolDescAfter.15.sea': '+1 Gold per 2 adjacent symbols.',
        'knowledgeUpgrade.symbolDescAfter.39.sea': '+1 Gold per 3 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.39.seaWithCelestial': '+1 Gold per 2 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.15.pearl': 'With 1 Sea on the board: +4 Gold; 2 Seas: +5 Gold; 3+ Seas: +7 Gold.',
        'knowledgeUpgrade.symbolDescAfter.34.sea': '+2 Gold per 2 adjacent symbols.',
        'knowledgeUpgrade.symbolDescAfter.34.seaWithShipbuilding': '+2 Gold per 2 adjacent symbols. Counts as 2 Seas while placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.34.pearl': 'With 1 Sea on the board: +5 Gold; 2 Seas: +7 Gold; 3+ Seas: +10 Gold.',
        'knowledgeUpgrade.symbolDescAfter.52.fish': 'With 1 Sea on the board: +5 Food; 2 Seas: +8 Food; 3+ Seas: +15 Food.',
        'knowledgeUpgrade.symbolDescAfter.52.crab': 'With 1 Sea on the board: +5 Food, +5 Gold; 2 Seas: +8 Food, +8 Gold; 3+ Seas: +8 Food, +8 Gold.',
        'knowledgeUpgrade.symbolDescAfter.52.pearl': 'With 1 Sea on the board: +10 Gold; 2 Seas: +20 Gold; 3+ Seas: +30 Gold.',
        'knowledgeUpgrade.symbolDescAfter.52.sea': '+2 Gold per adjacent symbol.',
        'knowledgeUpgrade.symbolDescAfter.52.seaWithShipbuilding': '+2 Gold per adjacent symbol. Counts as 2 Seas while placed on the board.',
        [`knowledgeUpgrade.symbolDescAfter.${TROPICAL_AGRICULTURE_UPGRADE_ID}.rainforest`]: '+3 Food.',
        'knowledgeUpgrade.symbolDescAfter.6.stone':
            '+2 Gold; when a Mountain is in the same column: +4 additional Gold.',
        [`knowledgeUpgrade.symbolDescAfter.${MASON_GUILD_UPGRADE_ID}.stone`]:
            '+2 Gold; if there is a Mountain on the board: +4 additional Gold.',
        'knowledgeUpgrade.symbolDescAfter.29.banana': '+1 Food; every 7 times adjacent to Rainforest: +1 additional Food production.',
        'knowledgeUpgrade.symbolDescAfter.20.forest': 'If 3 or more Forests are placed on the board: +2 Food; 5 or more: +2 Gold; if Forest is the only terrain on the board: +2 Food.',
        'knowledgeUpgrade.symbolDescAfter.20.deer': '+1 Food per adjacent Forest.',
        'knowledgeUpgrade.symbolDescAfter.30.fur': '+1 Gold per Forest placed on the board.',
        'knowledgeUpgrade.symbolDescAfter.30.deer': '+2 Food per adjacent Forest.',
        'knowledgeUpgrade.symbolDescAfter.46.forest': 'If 3 or more Forests are placed on the board: +3 Food; 5 or more: +3 Gold; if Forest is the only terrain on the board: +3 Food.',
        'knowledgeUpgrade.symbolDescAfter.57.deer': '+3 Food per adjacent Forest.',
        'knowledgeUpgrade.symbolDescAfter.60.rainforest': '+5 Food, +5 Gold, +5 Knowledge.',
        'knowledgeUpgrade.symbolDescAfter.60.expedition': 'When adjacent to Rainforest: +1-10 Food, +1-10 Gold, and +1-10 Knowledge.',
        'knowledgeUpgrade.symbolDescAfter.26.mountain': '+2 Food, +4 Knowledge.',
        'knowledgeUpgrade.symbolDescAfter.3.sheep':
            '+1 Food; 10% chance to produce Sheep. Butcher when adjacent to Plains: +5 Food, +5 Gold.',
        'knowledgeUpgrade.symbolDescAfter.3.cattle':
            '+1 Food; 10% chance to produce Cattle. Butcher when adjacent to Plains: +10 Food.',
        'game.reroll': 'Reroll',
        'game.rerollKnowledgeUpgrade': 'Replace this card with another upgrade (once per choice)',
        'game.skip': 'Skip',
        'game.plagueOutbreak': 'Plague Outbreak',
        'game.plagueSelectionBlocked': 'Symbol Selection Blocked',
        'game.event': 'Event',
        'game.condition': 'Condition',
        'game.back': 'Back',
        'game.attack': 'Attack',
        'game.defense': 'Defense',
        'tribalVillage.button': 'Consume',
        'tribalVillage.aria': 'Consume for selection phases',
        'ownedSymbols.title': 'Owned Symbols',
        'ownedSymbols.close': 'Close',
        'ownedSymbols.empty': 'No owned symbols',
        'ownedSymbols.types': 'Owned symbol types',
        'ownedSymbols.sort': 'Sort',
        'ownedSymbols.sort.acquired': 'Acquired',
        'ownedSymbols.sort.type': 'Type',
        'ownedSymbols.sort.name': 'Name',
        'ownedSymbols.sort.count': 'Count',
        'ownedSymbols.sort.asc': 'Ascending',
        'ownedSymbols.sort.desc': 'Descending',
        /** HUD 기본 생산 툴팁: 식량·골드·지식은 `food16x16.png` / `gold16x16.png` / `knowledge16x16.png` */
        'game.hudBaseProductionShort': 'Base production +{n}',

        // Pre-game: Demo / Stage / Leader
        'mainMenu.title': 'Humankind in a nutshell',
        'mainMenu.actionsLabel': 'Main menu',
        'mainMenu.play': 'Play',
        'mainMenu.tutorial': 'Tutorial',
        'mainMenu.restart': 'New game',
        'mainMenu.resume': 'Continue',
        'mainMenu.newGame': 'New game',
        'mainMenu.continue': 'Continue',
        'mainMenu.achievements': 'Achievements',
        'mainMenu.leaders': 'Leaders',
        'mainMenu.settings': 'Settings',
        'leaderProgress.title': 'Leaders',
        'leaderProgress.rosterLabel': 'Leader roster',
        'leaderProgress.currentLevel': 'Lv.{level}',
        'leaderProgress.xp': 'Experience',
        'leaderProgress.unlocksLabel': 'Leader level unlocks',
        'leaderProgress.levelShort': 'Lv.{level}',
        'leaderProgress.emptyUnlock': 'Undecided',
        'leaderProgress.emptyUnlockDesc': 'This level reward will be added later.',
        'leaderProgress.unlocked': 'Unlocked',
        'leaderProgress.lockedUntil': 'Unlocks at Lv.{level}',
        'pregame.demoTitle': 'Humankind in a Nutshell Gameplay Demo v0.1',
        'pregame.demoSubtitle': 'A quick primer before you choose your leader.',
        'pregame.demoTutorialTitle': 'How to Play',
        'pregame.demoTutorial.1': 'Your goal is to survive the food payments and grow your civilization by stacking strong symbol synergies.',
        'pregame.demoTutorial.2': 'Each turn, press SPIN. Your owned symbols are placed randomly on the 5x4 board, then their effects resolve automatically.',
        'pregame.demoTutorial.3': 'Food keeps you alive, Gold pays for rerolls and relics, and Knowledge drives era progress and stronger upgrades.',
        'pregame.demoTutorial.4': 'After turns and events, you gain chances to add new symbols. Favor symbols that help each other through adjacency, terrain, or destruction effects.',
        'pregame.demoTutorial.5': 'Every 10 turns, the people demand Food. If you cannot pay, the run ends, so keep your economy stable while scaling up.',
        'pregame.demoPlay': 'Play',
        'pregame.leaderTitle': 'Please select a leader',
        'pregame.leaderPortraitPlaceholder': 'No portrait',
        'pregame.leaderPlay': 'Play',
        'pregame.leaderDetails': 'Details',
        'pregame.difficultySelect': 'Difficulty',
        'pregame.difficulty.normal': 'Normal',
        'pregame.difficulty.hard': 'Hard',
        'pregame.difficulty.pro': 'Pro',
        'pregame.draftTitle': 'Choose your starting symbols',
        'pregame.draftProgress': 'Pick {current} / {total}',
        'pregame.picks': 'picks',
        'leader.ramesses.name': 'Ramesses II',
        'leader.ramesses.nameSubtitle': 'Pharaoh of Egypt',
        'leader.ramesses.desc': 'Main: Golden Trade / Sub: Relic Vault.',
        'leader.ramesses.main.name': 'Golden Trade',
        'leader.ramesses.main.desc': 'Whenever the Relic Shop restocks, one random relic in stock is 50% off.',
        'leader.ramesses.sub.name': 'Relic Vault',
        'leader.ramesses.sub.desc': 'For each non-consumable relic you own: +1 Knowledge per turn.',
        'leaderUnlock.ramesses.kadeshBattleEscape.name': 'Exclusive Event Unlock: Escape from Kadesh',
        'leaderUnlock.shihuang.currencyStandardization.name': 'Exclusive Event Unlock: Currency Standardization',
        'leaderUnlock.shihuang.foxtailMillet.name': 'Exclusive Symbol Unlock: Foxtail Millet',
        'leaderUnlock.ramesses.heqet.name': 'Exclusive Symbol Unlock: Heqet',
        'leader.shihuang.name': 'Qin Shi Huang',
        'leader.shihuang.nameSubtitle': 'First Emperor of China',
        'leader.shihuang.desc': 'Main: Heaven and Earth Prosper / Sub: Foundations of Unification.',
        'leader.shihuang.main.name': 'Heaven and Earth Prosper',
        'leader.shihuang.main.desc': 'Per 4/3/2 symbols on the board: +1 Food per turn. Per 4/3/2 empty board slots: +1 Knowledge per turn. (Ancient/Medieval/Modern)',
        'leader.shihuang.sub.name': 'Foundations of Unification',
        'leader.shihuang.sub.desc': 'Each time you enter a new era, gain 2 Ancient Relic Debris and 1 Pioneer.',
        'leader.locked.name': '???',
        'leader.locked.desc': 'Not available yet.',
        'leader.locked.main.name': '—',
        'leader.locked.main.desc': 'This leader will be added in a future update.',
        'leader.locked.sub.name': '—',
        'leader.locked.sub.desc': '—',

        // Threat labels (floating text on first placement)
        'threat.barbarian_invasion': 'Barbarian invasion',
        'threat.flood': 'Flood',
        'threat.earthquake': 'Earthquake',
        'threat.drought': 'Drought',
        'threat.plague': 'Plague',
        'threat.heatwave': 'Heatwave',

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
        'era.primitive': 'Primitive',
        'era.ancient': 'Ancient',
        'era.medieval': 'Medieval',
        'era.modern': 'Modern',
        'era.future': 'Future',
        'era.terrain': 'Terrain',
        'era.unit': 'Unit',
        'era.enemy': 'Enemy',
        'era.disaster': 'Disaster',

        // Rarity names
        'rarity.common': 'Common',
        'rarity.uncommon': 'Uncommon',
        'rarity.rare': 'Rare',
        'rarity.epic': 'Epic',
        'rarity.legendary': 'Legendary',

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
        'dataBrowser.events': 'Events',
        'dataBrowser.searchPlaceholder': 'Search (name, desc, ID)...',
        'dataBrowser.allEras': 'All Types',
        'dataBrowser.allTypes': 'All Categories',
        'dataBrowser.friendly': 'Friendly',
        'dataBrowser.enemy': 'Enemy',
        'dataBrowser.combat': 'Combat',
        'dataBrowser.colName': 'Name',
        'dataBrowser.colEra': 'Type',
        'dataBrowser.colRarity': 'Rarity',
        'dataBrowser.colBasePool': 'Base Pool',
        'dataBrowser.colType': 'Type',
        'dataBrowser.colCost': 'Cost',
        'dataBrowser.colTags': 'Tags',
        'dataBrowser.colDesc': 'Desc',
        'dataBrowser.colPlayerDesc': 'Player Desc',
        'dataBrowser.colSprite': 'Sprite',
        'dataBrowser.colIcon': 'Icon',
        'dataBrowser.colColor': 'Color',
        'dataBrowser.colCategory': 'Category',
        'dataBrowser.colAvailability': 'Availability',
        'dataBrowser.knowledgeUpgrades': 'Knowledge Upgrades',
        'dataBrowser.intensity': 'Intensity',
        'dataBrowser.enemies': 'Enemies',
        'dataBrowser.rewards': 'Rewards',
        'dataBrowser.statuses': 'Statuses',
        'status.clan_formation.name': 'Clan Formation',
        'status.clan_formation.desc': 'Barbarian invasion chance is fixed at 0%.',
        'eventCategory.basic': 'Basic',
        'eventCategory.conditional': 'Conditional',
        'eventCategory.leader': 'Leader',
        'event.ancient_food_cache.name': 'Granary Stores',
        'event.ancient_food_cache.desc': 'Gain 6 Food immediately.',
        'event.ancient_food_cache.availability': 'Ancient era only.',
        'event.ancient_gold_cache.name': 'Bronze Tribute',
        'event.ancient_gold_cache.desc': 'Gain 5 Gold immediately.',
        'event.ancient_gold_cache.availability': 'Ancient era only.',
        'event.ancient_knowledge_cache.name': 'Clay Tablet Archive',
        'event.ancient_knowledge_cache.desc': 'Gain 8 Knowledge immediately.',
        'event.ancient_knowledge_cache.availability': 'Ancient era only.',
        'event.medieval_food_cache.name': 'Manor Granary',
        'event.medieval_food_cache.desc': 'Gain 15 Food immediately.',
        'event.medieval_food_cache.availability': 'Medieval era only.',
        'event.medieval_gold_cache.name': 'Guild Patronage',
        'event.medieval_gold_cache.desc': 'Gain 12 Gold immediately.',
        'event.medieval_gold_cache.availability': 'Medieval era only.',
        'event.medieval_knowledge_cache.name': 'Monastery Scriptorium',
        'event.medieval_knowledge_cache.desc': 'Gain 18 Knowledge immediately.',
        'event.medieval_knowledge_cache.availability': 'Medieval era only.',
        'event.modern_food_cache.name': 'Ration Stockpile',
        'event.modern_food_cache.desc': 'Gain 35 Food immediately.',
        'event.modern_food_cache.availability': 'Modern era only.',
        'event.modern_gold_cache.name': 'Industrial Investment',
        'event.modern_gold_cache.desc': 'Gain 28 Gold immediately.',
        'event.modern_gold_cache.availability': 'Modern era only.',
        'event.modern_knowledge_cache.name': 'Research Grant',
        'event.modern_knowledge_cache.desc': 'Gain 40 Knowledge immediately.',
        'event.modern_knowledge_cache.availability': 'Modern era only.',
        'event.artifact_market_refresh.name': 'Relic Caravan',
        'event.artifact_market_refresh.desc': 'Refresh the relic shop.',
        'event.artifact_market_refresh.availability': '-',
        'event.kadesh_battle_escape.name': 'Escape from Kadesh',
        'event.kadesh_battle_escape.desc': 'Add a barbarian unit with 1 HP.',
        'event.kadesh_battle_escape.availability': '-',
        'event.currency_standardization.name': 'Currency Standardization',
        'event.currency_standardization.desc': 'For the next 5 turns, double Gold base production.',
        'event.currency_standardization.availability': '-',
        'event.border_raid.name': 'Barbarian Suppression',
        'event.border_raid.desc.ancient': `Gain ${BORDER_RAID_REWARD[0]} Food and ${BORDER_RAID_REWARD[0]} Gold immediately. Summon ${BORDER_RAID_ENEMY_COUNT} barbarian units.`,
        'event.border_raid.desc.medieval': `Gain ${BORDER_RAID_REWARD[1]} Food and ${BORDER_RAID_REWARD[1]} Gold immediately. Summon ${BORDER_RAID_ENEMY_COUNT} barbarian units.`,
        'event.border_raid.desc.modern': `Gain ${BORDER_RAID_REWARD[2]} Food and ${BORDER_RAID_REWARD[2]} Gold immediately. Summon ${BORDER_RAID_ENEMY_COUNT} barbarian units.`,
        'event.border_raid.availability': '-',
        'event.grassland_festival.name': 'Grassland Festival',
        'event.grassland_festival.desc.ancient': `Gain ${GRASSLAND_FESTIVAL_FOOD[0]} Food immediately.`,
        'event.grassland_festival.desc.medieval': `Gain ${GRASSLAND_FESTIVAL_FOOD[1]} Food immediately.`,
        'event.grassland_festival.desc.modern': `Gain ${GRASSLAND_FESTIVAL_FOOD[2]} Food immediately.`,
        'event.grassland_festival.availability': 'Requires owning at least 3 Grassland symbols.',
        'event.capital_relocation.name': 'Capital Relocation',
        'event.capital_relocation.desc': 'Destroy 2 random owned symbols.\nGain 25 Food and 15 Knowledge.',
        'event.capital_relocation.availability': 'Requires owning at least 10 symbols.',
        'event.plains_pasture.name': 'Plains Pasture',
        'event.plains_pasture.desc.ancient': `Gain ${PLAINS_PASTURE_PER_CATTLE[0]} Food per Cattle and ${PLAINS_PASTURE_PER_SHEEP[0]} Gold per Sheep on the board.`,
        'event.plains_pasture.desc.medieval': `Gain ${PLAINS_PASTURE_PER_CATTLE[1]} Food per Cattle and ${PLAINS_PASTURE_PER_SHEEP[1]} Gold per Sheep on the board.`,
        'event.plains_pasture.desc.modern': `Gain ${PLAINS_PASTURE_PER_CATTLE[2]} Food per Cattle and ${PLAINS_PASTURE_PER_SHEEP[2]} Gold per Sheep on the board.`,
        'event.plains_pasture.availability': 'Requires owning at least 2 Plains symbols.',
        'event.maritime_trade.name': 'Maritime Trade',
        'event.maritime_trade.desc.ancient': `Gain ${MARITIME_TRADE_PER_SEA[0]} Food and ${MARITIME_TRADE_PER_SEA[0]} Gold per Sea on the board.`,
        'event.maritime_trade.desc.medieval': `Gain ${MARITIME_TRADE_PER_SEA[1]} Food and ${MARITIME_TRADE_PER_SEA[1]} Gold per Sea on the board.`,
        'event.maritime_trade.desc.modern': `Gain ${MARITIME_TRADE_PER_SEA[2]} Food and ${MARITIME_TRADE_PER_SEA[2]} Gold per Sea on the board.`,
        'event.maritime_trade.availability': 'Requires owning at least 3 Sea symbols.',
        'event.forest_harvest.name': 'Forest Harvest',
        'event.forest_harvest.desc.ancient': `Gain ${FOREST_HARVEST_FOOD[0]} Food immediately. Add a Forest to your symbols.`,
        'event.forest_harvest.desc.medieval': `Gain ${FOREST_HARVEST_FOOD[1]} Food immediately. Add a Forest to your symbols.`,
        'event.forest_harvest.desc.modern': `Gain ${FOREST_HARVEST_FOOD[2]} Food immediately. Add a Forest to your symbols.`,
        'event.forest_harvest.availability': 'Requires owning at least 3 Forest symbols.',
        'event.jungle_expedition.name': 'Jungle Expedition',
        'event.jungle_expedition.desc': 'Trigger the effect of every Banana on the board once.',
        'event.jungle_expedition.availability': 'Requires owning at least 2 Rainforest symbols.',
        'event.desert_caravan.name': 'Desert Caravan',
        'event.desert_caravan.desc.ancient': `Gain ${DESERT_CARAVAN_FOOD[0]} Food immediately.`,
        'event.desert_caravan.desc.medieval': `Gain ${DESERT_CARAVAN_FOOD[1]} Food immediately.`,
        'event.desert_caravan.desc.modern': `Gain ${DESERT_CARAVAN_FOOD[2]} Food immediately.`,
        'event.desert_caravan.availability': 'Requires owning at least 1 Desert symbol.',
        'event.mountain_lookout.name': 'Mountain Lookout',
        'event.mountain_lookout.desc.ancient': `Gain ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[0]} Food, ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[0]} Gold, and ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[0]} Knowledge per owned Mountain.`,
        'event.mountain_lookout.desc.medieval': `Gain ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[1]} Food, ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[1]} Gold, and ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[1]} Knowledge per owned Mountain.`,
        'event.mountain_lookout.desc.modern': `Gain ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[2]} Food, ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[2]} Gold, and ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[2]} Knowledge per owned Mountain.`,
        'event.mountain_lookout.availability': 'Requires owning at least 1 Mountain symbol.',
        'event.oasis_blessing.name': 'Oasis Blessing',
        'event.oasis_blessing.desc.ancient': `Gain ${OASIS_BLESSING_PER_EMPTY[0]} Food per empty slot on the board.`,
        'event.oasis_blessing.desc.medieval': `Gain ${OASIS_BLESSING_PER_EMPTY[1]} Food per empty slot on the board.`,
        'event.oasis_blessing.desc.modern': `Gain ${OASIS_BLESSING_PER_EMPTY[2]} Food per empty slot on the board.`,
        'event.oasis_blessing.availability': 'Requires owning at least 1 Oasis symbol.',
        'event.military_draft.name': 'Military Draft',
        'event.military_draft.desc.ancient': `Gain ${MILITARY_DRAFT_FOOD[0]} Food immediately. A barbarian unit is summoned.`,
        'event.military_draft.desc.medieval': `Gain ${MILITARY_DRAFT_FOOD[1]} Food immediately. A barbarian unit is summoned.`,
        'event.military_draft.desc.modern': `Gain ${MILITARY_DRAFT_FOOD[2]} Food immediately. A barbarian unit is summoned.`,
        'event.military_draft.availability': 'Requires owning at least 3 unit symbols.',
        'event.every_terrain_bounty.name': 'Bounty of All Terrains',
        'event.every_terrain_bounty.desc.ancient': `Gain ${EVERY_TERRAIN_BOUNTY_EACH[0]} Food, ${EVERY_TERRAIN_BOUNTY_EACH[0]} Gold, and ${EVERY_TERRAIN_BOUNTY_EACH[0]} Knowledge immediately.`,
        'event.every_terrain_bounty.desc.medieval': `Gain ${EVERY_TERRAIN_BOUNTY_EACH[1]} Food, ${EVERY_TERRAIN_BOUNTY_EACH[1]} Gold, and ${EVERY_TERRAIN_BOUNTY_EACH[1]} Knowledge immediately.`,
        'event.every_terrain_bounty.desc.modern': `Gain ${EVERY_TERRAIN_BOUNTY_EACH[2]} Food, ${EVERY_TERRAIN_BOUNTY_EACH[2]} Gold, and ${EVERY_TERRAIN_BOUNTY_EACH[2]} Knowledge immediately.`,
        'event.every_terrain_bounty.availability': 'Requires owning at least 1 of every terrain symbol.',
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
        'symbol.enemy_warrior.name': 'Warrior',
        'symbol.enemy_cavalry.name': 'Cavalry',
        'symbol.enemy_knight.name': 'Knight',
        'symbol.enemy_cavalry_corps.name': 'Cavalry Corps',
        'symbol.enemy_musketman.name': 'Musketman',
        'symbol.enemy_infantry.name': 'Infantry',
        'symbol.enemy_archer.name': 'Archer',
        'symbol.enemy_tracker_archer.name': 'Tracker Archer',
        'symbol.enemy_crossbowman.name': 'Crossbowman',
        'symbol.enemy_cannon.name': 'Cannon',
        'symbol.flood.name': 'Flood',
        'symbol.earthquake.name': 'Earthquake',
        'symbol.drought.name': 'Drought',
        'symbol.plague.name': 'Plague',
        'symbol.heatwave.name': 'Heatwave',
        'symbol.fur.name': 'Fur',

        // 47-49: Candidates promoted to actual symbols
        'symbol.salt.name': 'Salt',
        'symbol.honey.name': 'Honey',
        'symbol.corn.name': 'Corn',
        'symbol.foxtail_millet.name': 'Foxtail Millet',
        'symbol.wild_berries.name': 'Wild Berries',
        'symbol.hay.name': 'Hay',
        'symbol.spices.name': 'Spices',
        'symbol.tax.name': 'Tax',
        'symbol.aqueduct.name': 'Aqueduct',
        'symbol.rye.name': 'Rye',
        'symbol.sheep.name': 'Sheep',
        'symbol.scholar.name': 'Scholar',
        'symbol.holy_relic.name': 'Holy Relic',
        'symbol.monastery_garden.name': 'Monastery Garden',
        'symbol.tax_storehouse.name': 'Tax Storehouse',
        'symbol.pioneer.name': 'Pioneer',
        'symbol.edict.name': 'Edict',
        'symbol.royal_colony.name': 'Royal Colony',
        'symbol.agi_core.name': 'AGI Core',
        'symbol.wild_seeds.name': 'Wild Seeds',
        'symbol.wild_seeds.desc': '+1 Food. Destroyed after 5 turns.',
        'symbol.bronze_tribute_chest.name': 'Bronze Tribute Chest',
        'symbol.bronze_tribute_chest.desc': '+1 Gold. Destroyed after 3 turns.',
        'symbol.heqet.name': 'Heqet',
        'symbol.heqet.desc': '+1 Food; adjacent to Grassland: +2 additional Food; adjacent to Wheat: +2 Knowledge.',
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
        'symbol.fish.desc': 'With 1 Sea on the board: +1 Food; 2 Seas: +2 Food; 3+ Seas: +4 Food.',
        'symbol.sea.desc': '+1 Gold per 3 adjacent symbols.',
        'symbol.stone.desc': '+1 Gold; when a Mountain is in the same column: +2 additional Gold.',
        'symbol.grassland.desc': '+2 Food.',
        'symbol.grassland.descWithIrrigation': '+3 Food.',
        'symbol.grassland.descWithThreeField': '+5 Food.',
        'symbol.monument.desc': '+5 Knowledge.',
        'symbol.oasis.desc': '+2 Food per 2 adjacent empty slots.',
        'symbol.oral_tradition.desc': 'After 10 turns: destroyed; on destroy: +10 Knowledge per adjacent symbol.',
        'symbol.rainforest.desc': '+1 Food.',
        'symbol.plains.desc': '+1 Food.',
        'symbol.mountain.desc': '+1 Food.',
        'symbol.totem.desc': 'In a corner: +12 Knowledge.',
        'symbol.omen.desc': '50% chance for +3 Food.',
        'symbol.campfire.desc': 'Gain Food equal to the Food produced this turn by the highest-producing adjacent symbol. Destroyed.',
        'symbol.pottery.desc': '+4 Food stored per turn; on destroy: gain Food equal to stored Counter.',
        'symbol.tribal_village.desc': 'Consume to trigger symbol selection phase 2 times.',
        'symbol.merchant.desc': 'Produces Gold equal to the highest Food produced by an adjacent symbol.',
        'symbol.horse.desc': '+2 Food, +2 Gold. Triggers even when not placed on the board.',
        'symbol.crab.desc': 'With 1 Sea on the board: +1 Food, +1 Gold; 2 Seas: +2 Food, +2 Gold; 3+ Seas: +2 Food, +2 Gold.',
        'symbol.library.desc': '+1 Knowledge per adjacent symbol.',
        'symbol.pearl.desc': 'With 1 Sea on the board: +2 Gold; 2 Seas: +3 Gold; 3+ Seas: +5 Gold.',
        'symbol.compass.desc': 'With 1 Sea on the board: +5 Knowledge; 2 Seas: +10 Knowledge; 3+ Seas: +15 Knowledge.',
        'symbol.desert.desc': 'When adjacent: destroys 1 random Normal or era symbol.',
        'symbol.forest.desc': 'If 3 or more Forests are placed on the board: +2 Food; 5 or more: +1 Gold; if Forest is the only terrain on the board: +1 Food.',
        'symbol.deer.desc': '+1 Food per adjacent Forest.',
        'symbol.loot.desc': 'Open to gain a Normal reward. When adjacent to Loot: absorb it and upgrade into Greater Loot.',
        'symbol.greater_loot.desc': 'Open to gain a Large reward. When adjacent to Greater Loot: absorb it and upgrade into Radiant Loot.',
        'symbol.radiant_loot.desc': 'Open to gain an Extra Large reward.',
        'symbol.fur.desc': '+2 Gold per 2 Forests placed on the board.',
        'symbol.date.desc': '+1 Food; on destroy: +10 Food.',
        'symbol.christianity.desc': '+Food equal to the highest Food produced by an adjacent symbol. Destroyed if two or more Religion symbols are on the board.',
        'symbol.islam.desc': '+2 Food per Knowledge-producing symbol on the board. Destroyed if two or more Religion symbols are on the board.',
        'symbol.buddhism.desc': '+2 Food per empty slot on the board. Destroyed if two or more Religion symbols are on the board.',
        'symbol.hinduism.desc': 'If there are no duplicate symbols on the board: +1 Food per 2 symbols on the board. Destroyed if two or more Religion symbols are on the board.',
        'symbol.warrior.desc': 'Melee: attacks the first adjacent enemy symbol.',
        'symbol.archer.desc': 'Ranged: attacks the first enemy symbol on the board.',
        'symbol.tracker_archer.desc': 'Ancient ranged unit. When adjacent to Forest: +1 Food.',
        'symbol.knight.desc': 'Melee: attacks the first adjacent enemy symbol.',
        'symbol.cavalry.desc': 'Melee: attacks the first adjacent enemy symbol.',
        'symbol.cavalry_corps.desc': 'Medieval melee unit.',
        'symbol.crossbowman.desc': 'Ranged: attacks the first enemy symbol on the board.',
        'symbol.musketman.desc': 'Medieval melee unit.',
        'symbol.cannon.desc': 'Ranged: attacks the first enemy symbol on the board.',
        'symbol.infantry.desc': 'Melee: attacks the first adjacent enemy symbol.',
        'symbol.relic_caravan.desc': 'Destroyed; on destroy: refreshes relic shop.',
        'symbol.stargazer.desc': 'Per 4 empty slots: +4 Knowledge.',
        'symbol.stone_tablet.desc': 'Per non-consumable relic owned: +2 Knowledge.',
        'symbol.enemy_warrior.desc': '-3 Food.',
        'symbol.enemy_cavalry.desc': '-5 Food.',
        'symbol.enemy_knight.desc': '-3 Food.',
        'symbol.enemy_cavalry_corps.desc': '-6 Food.',
        'symbol.enemy_musketman.desc': '-6 Food.',
        'symbol.enemy_infantry.desc': '-8 Food.',
        'symbol.enemy_archer.desc': '-3 Food.',
        'symbol.enemy_tracker_archer.desc': '-3 Food.',
        'symbol.enemy_crossbowman.desc': '-5 Food.',
        'symbol.enemy_cannon.desc': '-8 Food.',
        'symbol.flood.desc': 'Disables production from adjacent terrain symbols. When counter reaches 0: Destroy.',
        'symbol.earthquake.desc': 'Destroyed. On destroy: destroy every symbol in the same column.',
        'symbol.drought.desc': 'When counter reaches 0: Destroy.',
        'symbol.plague.desc': 'Disables the symbol selection phase. When counter reaches 0: Destroy.',
        'symbol.heatwave.desc': 'Reduces symbol choices to two. When counter reaches 0: Destroy.',
        'symbol.salt.desc': '+1 Food per adjacent terrain symbol.',
        'symbol.honey.desc': 'If 5 or more of the same terrain are placed on the board: +5 Food.',
        'symbol.corn.desc': '+2 Food.',
        'symbol.foxtail_millet.desc': '+5 Food per 2 adjacent Terrain symbols.',
        'symbol.wild_berries.desc': '+1 Food; when adjacent to Forest or Rainforest: +2 Food; when adjacent to Mountain: +2 Knowledge.',
        'symbol.hay.desc': 'When adjacent to Plains: counter +1. On destroy: gain Food equal to Counter.',
        'symbol.spices.desc': '+1 Food per different terrain type placed.',
        'symbol.tax.desc': '+Gold equal to a random adjacent symbol\'s Food produced this turn.',
        'symbol.aqueduct.desc': 'Adjacent Wheat, Rice, and Rye produce double Food this turn.',
        'symbol.rye.desc': '+2 Food; when adjacent to Plains: +2 additional Food.',
        'symbol.sheep.desc':
            '+1 Food. When adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold.',
        'symbol.sheep.descBoard.pastoral':
            '+1 Food; 10% chance to produce Sheep. When adjacent to Plains, can butcher; on butcher: +5 Food, +5 Gold.',
        'symbol.scholar.desc': 'Destroys all adjacent Ancient symbols. This Scholar permanently produces +5 Knowledge per Ancient symbol destroyed.',
        'symbol.holy_relic.desc': 'If there is a Religion symbol on the board: +7 Knowledge, +7 Gold.',
        'symbol.monastery_garden.desc': 'If there is a Religion symbol on the board: +7 Food, +7 Knowledge.',
        'symbol.tax_storehouse.desc': '+8 Food stored per turn; on destroy: gain Food equal to stored Counter.',
        'symbol.pioneer.desc': 'Destroyed; on destroy: next symbol selection includes at least one Terrain symbol.',
        'symbol.edict.desc': 'Consume this to destroy 1 adjacent symbol.',
        'symbol.royal_colony.desc': 'Destroyed; on destroy: next symbol selection includes at least one Event.',
        'symbol.agi_core.desc': 'Absorbs the Knowledge production of all symbols on the board. When absorbed Knowledge reaches 500, you win the game.',
        'symbol.expedition.desc': 'When adjacent to Rainforest: produces a random 1-10 Food, Gold, or Knowledge.',
        'symbol.dye.desc': '+1 Gold; on destroy: +10 Gold.',
        'symbol.papyrus.desc': '+1 Knowledge; on destroy: +10 Knowledge.',
        'symbol.caravanserai.desc': '+10 per symbol destroyed this turn; matches the destroyed symbol\'s production type. Not destroyed by Desert.',

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
        'relic.13.desc': 'Consumes this relic to trigger a symbol selection.',
        'relic.14.name': 'Epicurus\' Atomic Plaque',
        'relic.14.desc': 'If no Religion symbol on the board: +3 Knowledge per turn.',
        'relic.15.name': 'State Reorganization',
        'relic.15.desc': 'Consumes this relic to destroy 1 symbol on the board.',
        'relic.16.name': 'Terra Fossil Grape',
        'relic.16.desc': 'Natural disaster symbols produce +2 Food.',
        'relic.17.name': 'Antoninianus Silver Coin',
        'relic.17.desc': 'When you skip symbol selection: +2 Gold.',
        'relic.18.name': 'Andean Chuño',
        'relic.18.desc': '+2 Food per turn.',
        'relic.19.name': 'Pioneer',
        'relic.19.desc': 'Consumes this relic to trigger a terrain selection.',
        'relic.20.name': 'Lascaux Cave Pigment',
        'relic.20.desc': 'Every 5 turns: gain +5 random Food, Gold, or Knowledge.',
        'relic.21.name': 'Venus of Willendorf',
        'relic.21.desc': 'After each 10-turn Food payment: next turn, gain +10 Food.',
        'relic.22.name': "Otzi's Copper Axe",
        'relic.22.desc': 'If there is a Forest on the board: +1 Gold per turn.',
        'relic.23.name': 'Sestertius Coin',
        'relic.23.desc': 'If you have 50 or more Gold: +1 Knowledge per turn.',
        'relic.24.name': 'Trojan Gold Loot',
        'relic.24.desc': 'One-use: immediately gain +{gold} Gold. Click to use.',
        'relic.25.name': 'Gladius',
        'relic.25.desc': 'When an enemy is defeated: +3 Gold.',
        'relic.26.name': 'Ishtar Gate Bull Relief',
        'relic.26.desc': 'Each turn: +1 Gold per Cattle, Sheep, or Horse.',
        'relic.27.name': 'Baekje Gilt-bronze Incense Burner',
        'relic.27.desc': 'If there is a Religion symbol on the board: +2 Knowledge per turn.',
        'relic.28.name': 'Terracotta Army',
        'relic.28.desc': 'Each turn: +2 Gold per combat symbol you own.',
        'relic.29.name': 'Siyang Fangzun Bronze',
        'relic.29.desc': 'If all 4 corner slots are occupied: +1 Food, +1 Gold, and +1 Knowledge.',
        'relic.30.name': 'Moai Statue',
        'relic.30.desc': 'Each turn: +1 Gold per 3 empty slots.',
        'relic.31.name': 'Nineveh Lion Relief',
        'relic.31.desc': 'When an enemy is defeated: +8 Gold. If an enemy is on the board: +2 Knowledge per turn.',
        'relic.32.name': "Solomon's Seal Ring",
        'relic.32.desc': 'The symbol in slot 1 triggers its effect twice.',
        'relic.33.name': "Gudea's Foundation Peg",
        'relic.33.desc': 'All symbols are treated as if they are in a corner.',
        'relic.34.name': 'Hereford Mappa Mundi',
        'relic.34.desc': 'If all terrain types are on the board: +10 Food, +10 Gold, and +10 Knowledge per turn.',
        'relic.35.name': 'Sumerian King List',
        'relic.35.desc': 'Each turn: +1 Food per era symbol on the board.',
        'relic.36.name': 'Alexandria Mouseion Inscription',
        'relic.36.desc': 'Whenever you research a Knowledge upgrade: +3 Gold.',
        'relic.37.name': 'Egyptian Granary Model',
        'relic.37.desc': 'One-use: immediately gain +30 Food. Click to use.',
        'relic.38.name': 'Ashurbanipal Index Tablet',
        'relic.38.desc': 'If there are no duplicate symbols on the board: +5 Food and +5 Gold per turn.',
        'relic.39.name': 'Conscription Order',
        'relic.39.desc': 'Consumes this relic to trigger a unit selection.',
        'relic.40.name': 'Prophecy Die',
        'relic.40.desc': 'Consumes this relic to trigger an event selection.',

        // ── Knowledge Upgrades ──
        'knowledgeUpgrade.17.name': 'Writing System',
        'knowledgeUpgrade.17.desc': 'Unlocks Library.',
        'knowledgeUpgrade.22.name': 'Iron Working',
        'knowledgeUpgrade.22.desc': 'Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.16.name': 'Irrigation',
        'knowledgeUpgrade.16.desc': 'Upgrades Wheat, Rice, and Grassland.',
        'knowledgeUpgrade.21.name': 'Theology',
        'knowledgeUpgrade.21.desc': 'Unlocks Religion symbols for selection.',
        'knowledgeUpgrade.9.name': 'Archery',
        'knowledgeUpgrade.9.desc': 'Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.11.name': 'Currency',
        'knowledgeUpgrade.11.desc': 'Unlocks Merchant symbol.',
        'knowledgeUpgrade.13.name': 'Horsemanship',
        'knowledgeUpgrade.13.desc': 'Adds Horse to the selection pool. Melee units gain +1 Attack and +1 HP.',
        'knowledgeUpgrade.12.name': 'Sacrificial Rite',
        'knowledgeUpgrade.12.desc': 'Gain 3 State Reorganizations.',
        'knowledgeUpgrade.64.name': 'Inquisition',
        'knowledgeUpgrade.64.desc': 'Gain 3 State Reorganizations.',
        'knowledgeUpgrade.65.name': 'Restructuring',
        'knowledgeUpgrade.65.desc': 'Gain 3 State Reorganizations.',
        'knowledgeUpgrade.66.name': 'Public Administration',
        'knowledgeUpgrade.66.desc':
            'In the selection phase, each card is 2x as likely to become an event.',
        'knowledgeUpgrade.67.name': 'Mass Media',
        'knowledgeUpgrade.67.desc':
            'In the selection phase, each card is 2x as likely to become an event.',
        'knowledgeUpgrade.68.name': 'Election System',
        'knowledgeUpgrade.68.desc': 'The first reroll in each selection phase is free.',
        'knowledgeUpgrade.72.name': 'Colonialism',
        'knowledgeUpgrade.72.desc': 'Gain 3 Pioneers.',
        [`knowledgeUpgrade.${GREAT_MIGRATION_UPGRADE_ID}.name`]: 'Great Migration',
        [`knowledgeUpgrade.${GREAT_MIGRATION_UPGRADE_ID}.desc`]: 'Gain 2 Pioneers and 1 State Reorganization.',
        'knowledgeUpgrade.73.name': 'Tribal Federation',
        'knowledgeUpgrade.73.desc': 'Base Food production +1. Gain 2 Conscription Orders.',
        'knowledgeUpgrade.74.name': 'Mercenaries',
        'knowledgeUpgrade.74.desc': 'Base Gold production +2. Gain 2 Conscription Orders.',
        'knowledgeUpgrade.75.name': 'Total Mobilization',
        'knowledgeUpgrade.75.desc': 'Gain 4 Conscription Orders.',
        'knowledgeUpgrade.4.name': 'Fisheries',
        'knowledgeUpgrade.4.desc': 'Crab and Pearl are added to the symbol selection pool.',
        'knowledgeUpgrade.14.name': 'Navigation',
        'knowledgeUpgrade.14.desc': 'Upgrades Fish and Crab.',
        'knowledgeUpgrade.15.name': 'Celestial Navigation',
        'knowledgeUpgrade.15.desc': 'Upgrades Pearl and Sea.',
        'knowledgeUpgrade.6.name': 'Mining',
        'knowledgeUpgrade.6.desc': 'Upgrades Stone. Melee units gain +1 Attack and +2 HP.',
        [`knowledgeUpgrade.${MASON_GUILD_UPGRADE_ID}.name`]: 'Mason Guild',
        [`knowledgeUpgrade.${MASON_GUILD_UPGRADE_ID}.desc`]: 'Upgrades Stone. Melee units gain +1 Attack and +2 HP.',
        [`knowledgeUpgrade.${TROPICAL_AGRICULTURE_UPGRADE_ID}.name`]: 'Tropical Agriculture',
        [`knowledgeUpgrade.${TROPICAL_AGRICULTURE_UPGRADE_ID}.desc`]: 'Upgrades Rainforest.',
        'knowledgeUpgrade.2.name': 'Hunting',
        'knowledgeUpgrade.2.desc': 'Unlocks Fur for selection.',
        'knowledgeUpgrade.10.name': 'Law Code',
        'knowledgeUpgrade.10.desc': 'Base Knowledge production +2.',
        'knowledgeUpgrade.7.name': 'Foreign Trade',
        'knowledgeUpgrade.7.desc': 'Upgrades Desert.',
        'knowledgeUpgrade.symbolDescAfter.7.desert': '+2 Gold; destroys 1 random adjacent Normal or era symbol.',
        'knowledgeUpgrade.18.name': 'Architecture',
        'knowledgeUpgrade.18.desc': 'Base Knowledge production +1. Upgrades Salt.',
        'knowledgeUpgrade.symbolDescAfter.18.salt': '+2 Food per adjacent terrain symbol.',
        'knowledgeUpgrade.49.name': 'Nationalism',
        'knowledgeUpgrade.49.desc': 'Base Knowledge production +2. Gain 1 State Reorganization. Upgrades Monument.',
        'knowledgeUpgrade.symbolDescAfter.49.monument': '+10 Knowledge.',
        'knowledgeUpgrade.38.name': 'Exploration',
        'knowledgeUpgrade.38.desc': 'Base Gold production +2. Upgrades Honey.',
        'knowledgeUpgrade.symbolDescAfter.38.honey': 'If 5 or more of the same terrain are placed on the board: +10 Food.',
        'knowledgeUpgrade.50.name': 'Mercantilism',
        'knowledgeUpgrade.35.name': 'Military Science',
        'knowledgeUpgrade.50.desc': 'Base Gold production +2. Upgrades Spices.',
        'knowledgeUpgrade.35.desc': 'Horse produces +3 Food and +4 Gold. Melee units gain +1 Attack and +1 HP.',
        'knowledgeUpgrade.symbolDescAfter.50.spices': '+3 Food per different terrain type placed.',
        'knowledgeUpgrade.symbolDescAfter.35.horse': '+3 Food, +4 Gold. Triggers even when not placed on the board.',
        'knowledgeUpgrade.19.name': 'Trade Goods Exchange',
        'knowledgeUpgrade.19.desc': 'Dye and Papyrus are added to the symbol selection pool.',
        'knowledgeUpgrade.32.name': 'Dry Storage',
        'knowledgeUpgrade.32.desc': 'Upgrades Desert, Oasis, and Date.',
        'knowledgeUpgrade.symbolDescAfter.32.desert': '+5 Gold. Destroys all adjacent Normal and era symbols.',
        'knowledgeUpgrade.symbolDescAfter.32.oasis': '+4 Food per 2 adjacent empty slots.',
        'knowledgeUpgrade.symbolDescAfter.32.date': '+1 Food; on destroy: +20 Food.',
        'knowledgeUpgrade.45.name': 'Caravanserai',
        'knowledgeUpgrade.45.desc': 'Unlocks Caravanserai. Upgrades Dye and Papyrus.',
        'knowledgeUpgrade.symbolDescAfter.45.dye': '+1 Gold; on destroy: +20 Gold.',
        'knowledgeUpgrade.symbolDescAfter.45.papyrus': '+1 Knowledge; on destroy: +20 Knowledge.',
        'knowledgeUpgrade.54.name': 'Oasis Recovery Network',
        'knowledgeUpgrade.54.desc': 'Upgrades Desert and Oasis.',
        'knowledgeUpgrade.33.name': 'Mechanics',
        'knowledgeUpgrade.33.desc': 'Replaces Archer with Crossbowman. Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.48.name': 'Stirrups',
        'knowledgeUpgrade.48.desc': 'Replaces Warrior with Knight. Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.55.name': 'Ballistics',
        'knowledgeUpgrade.55.desc': 'Replaces Crossbowman with Cannon. Ranged units gain +1 Attack and +2 HP.',
        'knowledgeUpgrade.62.name': 'Interchangeable Parts',
        'knowledgeUpgrade.62.desc': 'Replaces Knight with Infantry. Melee units gain +2 Attack and +4 HP.',
        'knowledgeUpgrade.symbolDescAfter.54.desert':
            '+10 Food and +10 Gold. Destroys all Normal and era symbols on the board.',
        'knowledgeUpgrade.symbolDescAfter.54.oasis': '+6 Food per 2 adjacent empty slots.',
        'knowledgeUpgrade.8.name': 'Chiefdom',
        'knowledgeUpgrade.8.desc': 'Base Food production +1. Gain 1 State Reorganization. Upgrades Wild Berries.',
        'knowledgeUpgrade.symbolDescAfter.8.wild_berries':
            '+1 Food; when adjacent to Forest or Rainforest: +4 Food; when adjacent to Mountain: +5 Knowledge.',
        'knowledgeUpgrade.36.name': 'Feudalism',
        'knowledgeUpgrade.36.desc': 'Base Food production +1. Gain 1 State Reorganization. Upgrades Corn.',
        'knowledgeUpgrade.symbolDescAfter.36.corn': '+4 Food.',
        'knowledgeUpgrade.23.name': 'Mathematics',
        'knowledgeUpgrade.23.desc': 'Base Food production +1, Base Knowledge production +1.',
        'knowledgeUpgrade.25.name': 'State Labor',
        'knowledgeUpgrade.25.desc': 'Base Food production +1. Base Gold production +1. Gain 1 State Reorganization.',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.name`]: 'Urbanization',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.desc`]: 'Base Food production +4. Base Gold production +4.',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.name`]: 'Steam Power',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.desc`]: 'Base Gold production +4. Base Knowledge production +2.',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.name`]: 'Electricity',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.desc`]: 'Base Food production +3. Base Gold production +3. Base Knowledge production +3.',
        'knowledgeUpgrade.70.name': 'Buttress',
        'knowledgeUpgrade.70.desc': 'Base Food production +2.',
        'knowledgeUpgrade.71.name': 'Castle',
        'knowledgeUpgrade.71.desc': 'Enemy units spawned by barbarian invasion do not plunder Food for 3 turns.',
        'knowledgeUpgrade.1.name': 'Ancient Era',
        'knowledgeUpgrade.1.desc': 'Unlocks all Ancient symbols.',
        'knowledgeUpgrade.3.name': 'Pastoralism',
        'knowledgeUpgrade.3.desc': 'Upgrades Cattle, Sheep, and Plains.',
        'knowledgeUpgrade.5.name': 'Agriculture',
        'knowledgeUpgrade.5.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.26.name': 'Medieval Age',
        'knowledgeUpgrade.26.desc': 'Ancient symbols no longer appear. Unlocks all Medieval symbols. Terrain symbol odds become x0.2. Upgrades Mountain.',
        'knowledgeUpgrade.51.name': 'Modern Age',
        'knowledgeUpgrade.51.desc': 'Medieval symbols no longer appear. Unlocks all Modern symbols. Terrain symbols no longer appear.',
        'knowledgeUpgrade.63.name': 'AGI Project',
        'knowledgeUpgrade.63.desc': 'Adds AGI Core to the symbol selection pool.',
        'knowledgeUpgrade.40.name': 'Education',
        'knowledgeUpgrade.40.desc': 'Upgrades Library.',
        'knowledgeUpgrade.41.name': 'Theocracy',
        'knowledgeUpgrade.41.desc': 'Upgrades Christianity, Islam, Buddhism, and Hinduism.',
        'knowledgeUpgrade.37.name': 'Guild',
        'knowledgeUpgrade.37.desc': 'Upgrades Merchant.',
        'knowledgeUpgrade.symbolDescAfter.41.christianity': '+Food equal to the highest Food produced by any symbol on the board. Destroyed if two or more Religion symbols are on the board.',
        'knowledgeUpgrade.symbolDescAfter.41.islam': '+3 Food per Knowledge-producing symbol on the board. Destroyed if two or more Religion symbols are on the board.',
        'knowledgeUpgrade.symbolDescAfter.41.buddhism': '+4 Food per empty slot on the board. Destroyed if two or more Religion symbols are on the board.',
        'knowledgeUpgrade.symbolDescAfter.41.hinduism': 'If there are no duplicate symbols on the board: +1 Food per symbol on the board. Destroyed if two or more Religion symbols are on the board.',
        'knowledgeUpgrade.symbolDescAfter.37.merchant': 'Produces Gold equal to the highest Food produced by a symbol on the board.',
        'knowledgeUpgrade.symbolDescAfter.40.library': '+2 Knowledge per adjacent symbol.',
        'knowledgeUpgrade.59.name': 'Scientific Theory',
        'knowledgeUpgrade.59.desc': 'Upgrades Library.',
        'knowledgeUpgrade.symbolDescAfter.59.library': '+2 Knowledge per symbol on the board.',
        'knowledgeUpgrade.44.name': 'Printing Press',
        'knowledgeUpgrade.44.desc': 'Base Gold +2, Base Knowledge +2.',
        'knowledgeUpgrade.28.name': 'Three-field System',
        'knowledgeUpgrade.28.desc': 'Upgrades Wheat, Rice, and Grassland.',
        'knowledgeUpgrade.43.name': 'Agricultural Surplus',
        'knowledgeUpgrade.43.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.56.name': 'Modern Agriculture',
        'knowledgeUpgrade.56.desc': 'Upgrades Wheat and Rice.',
        'knowledgeUpgrade.47.name': 'Pasture Management',
        'knowledgeUpgrade.47.desc': 'Upgrades Plains.',
        'knowledgeUpgrade.24.name': 'Nomadic Tradition',
        'knowledgeUpgrade.24.desc': 'Upgrades Cattle and Sheep.',
        'knowledgeUpgrade.31.name': 'Compass',
        'knowledgeUpgrade.31.desc': 'Compass is added to the symbol selection pool.',
        'knowledgeUpgrade.39.name': 'Shipbuilding',
        'knowledgeUpgrade.39.desc': 'Upgrades Sea.',
        'knowledgeUpgrade.27.name': 'Fishery Guild',
        'knowledgeUpgrade.27.desc': 'Upgrades Fish and Crab.',
        'knowledgeUpgrade.34.name': 'Maritime Trade',
        'knowledgeUpgrade.34.desc': 'Upgrades Pearl and Sea.',
        'knowledgeUpgrade.52.name': 'Oceanic Routes',
        'knowledgeUpgrade.52.desc': 'Upgrades Fish, Crab, Pearl, and Sea.',
        'knowledgeUpgrade.29.name': 'Plantation',
        'knowledgeUpgrade.29.desc': 'Upgrades Banana.',
        'knowledgeUpgrade.20.name': 'Tracking',
        'knowledgeUpgrade.20.desc': 'Upgrades Forest.',
        'knowledgeUpgrade.30.name': 'Tanning',
        'knowledgeUpgrade.30.desc': 'Upgrades Fur and Deer.',
        'knowledgeUpgrade.46.name': 'Forestry',
        'knowledgeUpgrade.46.desc': 'Upgrades Forest.',
        'knowledgeUpgrade.57.name': 'Preservation',
        'knowledgeUpgrade.57.desc': 'Upgrades Deer.',
        'knowledgeUpgrade.42.name': 'Jungle Expedition',
        'knowledgeUpgrade.42.desc': 'Expedition is added to the symbol selection pool.',
        'knowledgeUpgrade.60.name': 'Tropical Development',
        'knowledgeUpgrade.60.desc': 'Upgrades Rainforest and Expedition.',
        'destroySelection.riteTitle': 'Sacrificial Rite — choose symbols to destroy',
        'destroySelection.riteDesc': 'Destroy up to 3 owned symbols. Confirm to gain +10 Gold per destroyed symbol.',
        'destroySelection.territoryTitle': 'Territorial Reorganization — choose symbols to remove',
        'destroySelection.territoryDesc': 'Remove up to 3 owned symbols (destroy effects do not trigger). +10 Gold each. Then you get 1 terrain choice and 3 symbol choices.',
        'destroySelection.edictTitle': 'Edict — remove 1 owned symbol',
        'destroySelection.edictDesc': 'Choose 1 symbol to remove from your collection (destroy effects do not trigger). Then continue to symbol selection.',
        'destroySelection.edictConfirm': 'Remove 1 and continue',
        'destroySelection.oblivionTitle': 'State Reorganization',
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
        'lootOpen.button': 'Open',
        'lootOpen.aria': 'Open for treasure rewards',
        'lootReward.title.small': 'Open Loot',
        'lootReward.title.medium': 'Open Greater Loot',
        'lootReward.title.large': 'Open Radiant Loot',
        'lootReward.choose': 'Choose a reward',
        'lootReward.rarity.common': 'Normal',
        'lootReward.rarity.rare': 'Large',
        'lootReward.rarity.legendary': 'Extra Large',
        'lootReward.desc.gain': 'Gain {items}.',
        'lootReward.desc.randomRelic': 'Gain 1 random Relic.',
        'lootReward.desc.relicCount': '{name} x{count}',
        'lootReward.desc.and': ' and ',
        'lootReward.relicFallback': 'Relic',
        'resource.food': 'Food',
        'resource.gold': 'Gold',
        'resource.knowledge': 'Knowledge',
        'reward.food_common.name': 'Dry Bread',
        'reward.food_rare.name': 'Bountiful Harvest',
        'reward.food_legendary.name': 'Divine Favor',
        'reward.gold_common.name': 'Handful of Coins',
        'reward.gold_rare.name': 'Gold',
        'reward.gold_legendary.name': 'Gold Hoard',
        'reward.knowledge_common.name': 'Fragment of Knowledge',
        'reward.knowledge_rare.name': 'Ancient Tome',
        'reward.knowledge_legendary.name': 'Sacred Wisdom',
        'reward.relic_legendary.name': 'Mysterious Relic',
        'reward.ancient_relic_debris_common.name': 'Excavated Debris',
        'reward.national_reform_rare.name': 'Reform Order',
        'reward.ancient_relic_debris_rare.name': 'Relic Debris Pile',
        'reward.national_reform_legendary.name': 'Grand Reform Edict',
        'reward.ancient_relic_debris_legendary.name': 'Ancient Relic Cache',
        'reward.pioneer_expedition_legendary.name': 'Pioneer Expedition',
        'knowledgeUpgrade.obsolete.11.name': 'Golden Trade',
        'knowledgeUpgrade.obsolete.11.desc': 'Whenever the Relic Shop restocks, one random relic in stock is 50% off.',
        'knowledgeUpgrade.obsolete.12.name': 'Relic Vault',
        'knowledgeUpgrade.obsolete.12.desc': 'For each non-consumable relic you own: +1 Knowledge per turn.',
        'knowledgeUpgrade.obsolete.13.name': 'Heaven and Earth Prosper',
        'knowledgeUpgrade.obsolete.13.desc': 'Per 2 symbols on the board: +1 Food per turn. Per 2 empty board slots: +1 Knowledge per turn.',
        'knowledgeUpgrade.obsolete.14.name': 'Foundations of Unification',
        'knowledgeUpgrade.obsolete.14.desc': 'Each time you enter a new era, gain 1 Ancient Relic Debris and 1 Pioneer.',
    },
    ko: {
        'pregame.difficulty.normal': '보통',
        'pregame.difficulty.hard': '어려움',
        'pregame.difficulty.pro': '프로',
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
        'settings.lang.zh': '중국어',
        'settings.tab.gameplay': '게임플레이',
        'settings.tab.graphics': '그래픽',
        'settings.tab.general': '일반',
        'settings.tab.audio': '오디오',
        'settings.fullscreen': '전체화면',
        'settings.fullscreen.on': '켜짐',
        'settings.fullscreen.off': '꺼짐',
        'settings.masterVolume': '마스터 볼륨',
        'settings.musicVolume': '음악 볼륨',
        'settings.ambientVolume': '앰비언트 볼륨',
        'settings.effectVolume': '효과음 볼륨',
        'settings.developerMode': '개발자 모드',
        'settings.developerMode.on': '켜짐',
        'settings.developerMode.off': '꺼짐',
        'settings.resetProgress': '게임 데이터 초기화',
        'settings.resetProgress.hint': '저장된 런, 튜토리얼 완료 여부, 지도자 진행도를 삭제합니다.',
        'settings.resetProgress.button': '초기화',
        'settings.resetProgress.confirmTitle': '게임 데이터 초기화',
        'settings.resetProgress.confirm': '모든 게임 데이터를 초기화할까요? 저장된 런, 튜토리얼 완료 여부, 지도자 진행도가 삭제됩니다. 설정값은 유지됩니다.',
        'settings.resetProgress.cancel': '취소',
        'settings.resetProgress.confirmButton': '초기화',

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
        'game.peekBoard': '보드 보기',
        'game.returnToSelection': '돌아오기',
        'game.chooseRelic': '유물 선택',
        'game.relicShopTitle': '유물 상점 - 새로운 유물 입고까지 {turns}턴',
        'game.relicShopTitleShort': '유물 상점',
        'game.relicShopNewStockHint': '유물 상점 — 신규 입고',
        'game.relicShopNewStockAria': '유물 상점, 신규 입고',
        'game.relicShopSoldOut': '품절',
        'game.relicPanelTitle': '유물',
        'game.relicShopBuyDiscountAria': '구매, 할인가 {sale} 골드 (정가 {original})',
        'game.chooseUpgrade': '지식 업그레이드 선택',
        'game.researchToContinue': '연구 포인트를 소진하세요',
        'knowledgeUpgrade.researchConfirmTitle': '지식 업그레이드 연구',
        'knowledgeUpgrade.researchConfirmMessage': '"{name}" 연구할까요?',
        'knowledgeUpgrade.researchCancel': '취소',
        'knowledgeUpgrade.researchConfirm': '연구',
        'game.knowledgeUpgradeTreeTitle': '지식 업그레이드',
        'game.levelUpResearchPointsLabel': '연구 포인트',
        'game.spendLevelUpResearchPointsFirst': '지식 업그레이드에서 연구 포인트를 먼저 쓰세요.',
        'game.levelUpResearchPointsRequired': '연구 포인트 필요',
        'game.knowledgeHudPendingTab': 'NEW',
        'game.knowledgeHudPendingTabAria': '지식 업그레이드 — 사용 가능한 연구 포인트 있음',
        'game.knowledgeHudButtonHintPending': '{title} — 연구 포인트 사용 가능',
        'game.noUpgradesAvailable': '선택 가능한 업그레이드가 없습니다',
        'tribalVillage.button': '소모',
        'knowledgeUpgrade.effectCompare.beforeLabel': '적용 전',
        'knowledgeUpgrade.effectCompare.afterLabel': '적용 후',
        'knowledgeUpgrade.detail.unlockLevel': 'Lv.{level} 해금',
        'knowledgeUpgrade.detail.prereqComplete': '선행 완료',
        'knowledgeUpgrade.detail.prereqRequired': '선행 필요',
        'knowledgeUpgrade.detail.dependent': '후속',
        'knowledgeUpgrade.symbolRelation.pool_add': '추가되는 심볼',
        'knowledgeUpgrade.symbolRelation.effect_modify': '변경되는 심볼',
        'knowledgeUpgrade.symbolRelation.pool_remove': '제거되는 심볼',
        'knowledgeUpgrade.relicRelation.gain': '획득하는 유물',
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
        'knowledgeUpgrade.requiresGunpowderShort': '등자 필요',
        'knowledgeUpgrade.requiresBallisticsShort': '탄도학 필요',
        'knowledgeUpgrade.symbolDescAfter.9.archer': '원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.symbolDescAfter.22.warrior': '근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.symbolDescAfter.33.archer': '궁수가 석궁병으로 대체됩니다. 원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.symbolDescAfter.48.warrior': '전사가 기사로 대체됩니다. 근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.symbolDescAfter.55.crossbowman': '석궁병이 대포로 대체됩니다. 원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.symbolDescAfter.62.cavalry': '기사가 보병으로 대체됩니다. 근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.symbolDescAfter.6.warrior': '근접 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.symbolDescAfter.16.wheat': '밀: 10턴마다: 식량10. 인접한 초원마다: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.16.rice': '쌀: 20턴마다: 식량25. 인접한 초원마다: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.5.wheat': '밀: 10턴마다: 식량15. 초원에 인접 시: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.5.rice': '쌀: 20턴마다: 식량30. 초원에 인접 시: 턴 +1.',
        'knowledgeUpgrade.symbolDescAfter.3.plains': '식량 +2.',
        'knowledgeUpgrade.symbolDescAfter.14.fish': '보드에 배치된 바다가 1개: 식량 +2; 2개: 식량 +3; 3개 이상: 식량 +5.',
        'knowledgeUpgrade.symbolDescAfter.14.crab': '보드에 배치된 바다가 1개: 식량 +2, 골드 +1; 2개: 식량 +3, 골드 +2; 3개 이상: 식량 +3, 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.27.fish': '보드에 배치된 바다가 1개: 식량 +3; 2개: 식량 +5; 3개 이상: 식량 +10.',
        'knowledgeUpgrade.symbolDescAfter.27.crab': '보드에 배치된 바다가 1개: 식량 +3, 골드 +3; 2개: 식량 +5, 골드 +5; 3개 이상: 식량 +5, 골드 +5.',
        'knowledgeUpgrade.symbolDescAfter.15.sea': '인접한 심볼 2개당: 골드 +1.',
        'knowledgeUpgrade.symbolDescAfter.39.sea': '인접한 심볼 3개당: 골드 +1. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.39.seaWithCelestial': '인접한 심볼 2개당: 골드 +1. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.15.pearl': '보드에 배치된 바다가 1개: 골드 +4; 2개: 골드 +5; 3개 이상: 골드 +7.',
        'knowledgeUpgrade.symbolDescAfter.34.sea': '인접한 심볼 2개당: 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.34.seaWithShipbuilding': '인접한 심볼 2개당: 골드 +2. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        'knowledgeUpgrade.symbolDescAfter.34.pearl': '보드에 배치된 바다가 1개: 골드 +5; 2개: 골드 +7; 3개 이상: 골드 +10.',
        'knowledgeUpgrade.symbolDescAfter.52.fish': '보드에 배치된 바다가 1개: 식량 +5; 2개: 식량 +8; 3개 이상: 식량 +15.',
        'knowledgeUpgrade.symbolDescAfter.52.crab': '보드에 배치된 바다가 1개: 식량 +5, 골드 +5; 2개: 식량 +8, 골드 +8; 3개 이상: 식량 +8, 골드 +8.',
        'knowledgeUpgrade.symbolDescAfter.52.pearl': '보드에 배치된 바다가 1개: 골드 +10; 2개: 골드 +20; 3개 이상: 골드 +30.',
        'knowledgeUpgrade.symbolDescAfter.52.sea': '인접한 심볼 1개당: 골드 +2.',
        'knowledgeUpgrade.symbolDescAfter.52.seaWithShipbuilding': '인접한 심볼 1개당: 골드 +2. 보드 위 배치 시, 2개 배치된 것으로 간주합니다.',
        [`knowledgeUpgrade.symbolDescAfter.${TROPICAL_AGRICULTURE_UPGRADE_ID}.rainforest`]: '식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.6.stone': '골드 +2; 같은 열에 산이 있으면: 골드 +4 추가.',
        [`knowledgeUpgrade.symbolDescAfter.${MASON_GUILD_UPGRADE_ID}.stone`]:
            '골드 +2; 보드 위에 산이 있으면: 골드 +4 추가.',
        'knowledgeUpgrade.symbolDescAfter.29.banana': '식량 +1; 열대우림에 7회 인접마다: 추가 식량 생산 +1.',
        'knowledgeUpgrade.symbolDescAfter.20.forest': '보드에 배치된 숲이 3개 이상: 식량 +2; 5개 이상: 골드 +2; 보드에 유일한 지형이 숲이면: 식량 +2.',
        'knowledgeUpgrade.symbolDescAfter.20.deer': '인접한 숲마다: 식량 +1.',
        'knowledgeUpgrade.symbolDescAfter.30.fur': '보드에 배치된 숲마다: 골드 +1.',
        'knowledgeUpgrade.symbolDescAfter.30.deer': '인접한 숲마다: 식량 +2.',
        'knowledgeUpgrade.symbolDescAfter.46.forest': '보드에 배치된 숲이 3개 이상: 식량 +3; 5개 이상: 골드 +3; 보드에 유일한 지형이 숲이면: 식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.57.deer': '인접한 숲마다: 식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.60.rainforest': '식량 +5, 골드 +5, 지식 +5.',
        'knowledgeUpgrade.symbolDescAfter.60.expedition': '열대우림 인접 시: 식량, 골드, 지식을 각각 1~10씩 생산합니다.',
        'knowledgeUpgrade.symbolDescAfter.26.mountain': '식량 +2, 지식 +4.',
        'knowledgeUpgrade.symbolDescAfter.3.sheep':
            '식량 +1; 10% 확률로 양 생산. 평원 인접 시 도축 시 식량 +5, 골드 +5.',
        'knowledgeUpgrade.symbolDescAfter.3.cattle':
            '식량 +1; 10% 확률로 소 생산. 평원 인접 시 도축 시 식량 +10.',
        'game.reroll': '리롤',
        'game.rerollKnowledgeUpgrade': '이 카드를 다른 업그레이드로 바꾸기 (이번 선택에 한 번만)',
        'game.skip': '건너뛰기',
        'game.plagueOutbreak': '역병 창궐',
        'game.plagueSelectionBlocked': '심볼 선택 불가',
        'game.event': '이벤트',
        'game.condition': '조건',
        'game.back': '뒤로가기',
        'game.attack': '공격력',
        'game.defense': '방어력',
        'ownedSymbols.title': '보유 심볼',
        'ownedSymbols.close': '닫기',
        'ownedSymbols.empty': '보유 심볼이 없습니다',
        'ownedSymbols.types': '보유 심볼 종류',
        'ownedSymbols.sort': '정렬',
        'ownedSymbols.sort.acquired': '획득순',
        'ownedSymbols.sort.type': '종류순',
        'ownedSymbols.sort.name': '이름순',
        'ownedSymbols.sort.count': '개수순',
        'ownedSymbols.sort.asc': '오름차순',
        'ownedSymbols.sort.desc': '내림차순',
        'game.hudBaseProductionShort': '기본 생산 +{n}',

        // Pre-game: Demo / Stage / Leader
        'mainMenu.title': 'Humankind in a nutshell',
        'mainMenu.actionsLabel': '메인 메뉴',
        'mainMenu.play': '플레이',
        'mainMenu.tutorial': '튜토리얼',
        'mainMenu.restart': '새로하기',
        'mainMenu.resume': '이어하기',
        'mainMenu.newGame': '새 게임',
        'mainMenu.continue': '계속하기',
        'mainMenu.achievements': '도전과제',
        'mainMenu.leaders': '지도자',
        'mainMenu.settings': '설정',
        'leaderProgress.title': '지도자',
        'leaderProgress.rosterLabel': '지도자 목록',
        'leaderProgress.currentLevel': 'Lv.{level}',
        'leaderProgress.xp': '경험치',
        'leaderProgress.unlocksLabel': '지도자 레벨 해금',
        'leaderProgress.levelShort': 'Lv.{level}',
        'leaderProgress.emptyUnlock': '미정',
        'leaderProgress.emptyUnlockDesc': '이 레벨 보상은 추후 추가됩니다.',
        'leaderProgress.unlocked': '해금됨',
        'leaderProgress.lockedUntil': 'Lv.{level} 해금',
        'pregame.demoTitle': 'Humankind in a nutshell 게임플레이 데모 v0.1',
        'pregame.demoSubtitle': '지도자를 고르기 전에 꼭 알아두면 좋은 핵심만 모았습니다.',
        'pregame.demoTutorialTitle': '튜토리얼',
        'pregame.demoTutorial.1': '목표는 식량 부족 없이 버티면서, 시너지가 좋은 심볼을 쌓아 문명을 성장시키는 것입니다.',
        'pregame.demoTutorial.2': '매 턴 SPIN을 누르면 보유 심볼이 5x4 보드에 무작위로 배치되고, 효과가 자동으로 순서대로 발동합니다.',
        'pregame.demoTutorial.3': '식량은 생존, 골드는 리롤과 유물 구매, 지식은 시대 전환과 강력한 업그레이드에 쓰입니다.',
        'pregame.demoTutorial.4': '턴 진행 후 새 심볼을 얻을 기회가 옵니다. 인접, 지형, 파괴 효과가 서로 맞물리는 조합을 우선해서 고르세요.',
        'pregame.demoTutorial.5': '10턴마다 백성이 식량을 요구합니다. 지불하지 못하면 즉시 패배하니, 초반에는 안정적인 식량 기반을 먼저 만드세요.',
        'pregame.demoPlay': '플레이',
        'pregame.leaderTitle': '지도자를 선택하세요',
        'pregame.leaderPortraitPlaceholder': '초상화 없음',
        'pregame.leaderPlay': '플레이',
        'pregame.leaderDetails': '상세 보기',
        'pregame.difficultySelect': '난이도',
        'pregame.draftTitle': '시작 심볼을 고르세요',
        'pregame.draftProgress': '{current} / {total} 선택',
        'pregame.picks': '회 선택',
        'leader.ramesses.name': '람세스 2세',
        'leader.ramesses.nameSubtitle': '이집트 파라오',
        'leader.ramesses.desc': '메인: 황금의 거래 / 서브: 유물 보관소.',
        'leader.ramesses.main.name': '황금의 거래',
        'leader.ramesses.main.desc': '새로운 유물 입고 시 무작위 유물의 가격이 50% 할인됩니다.',
        'leader.ramesses.sub.name': '유물 보관소',
        'leader.ramesses.sub.desc': '비소모형 유물 1개당 매 턴 지식 생산 +1',
        'leaderUnlock.ramesses.kadeshBattleEscape.name': '전용 이벤트 해금: 카데시 전투 탈출',
        'leaderUnlock.shihuang.currencyStandardization.name': '전용 이벤트 해금: 화폐 통일',
        'leaderUnlock.shihuang.foxtailMillet.name': '전용 심볼 해금: 조',
        'leaderUnlock.ramesses.heqet.name': '전용 심볼 해금: 헤케트',
        'leader.shihuang.name': '진시황',
        'leader.shihuang.nameSubtitle': '중국 최초의 황제',
        'leader.shihuang.desc': '메인: 천하부강 / 서브: 천하통일의 기틀.',
        'leader.shihuang.main.name': '천하부강',
        'leader.shihuang.main.desc': '보드에 배치된 심볼 4/3/2개마다 매 턴 식량 +1. 빈 슬롯 4/3/2개마다 매 턴 지식 +1. (고대/중세/현대)',
        'leader.shihuang.sub.name': '천하통일의 기틀',
        'leader.shihuang.sub.desc': '새 시대마다 고대 유물 잔해 2개와 개척자 1개를 획득합니다.',
        'leader.locked.name': '???',
        'leader.locked.desc': '아직 선택할 수 없습니다.',
        'leader.locked.main.name': '—',
        'leader.locked.main.desc': '추후 업데이트에서 추가될 예정입니다.',
        'leader.locked.sub.name': '—',
        'leader.locked.sub.desc': '—',

        // Threat labels (첫 배치 시 플로팅 텍스트)
        'threat.barbarian_invasion': '야만인 침공',
        'threat.flood': '홍수 발생',
        'threat.earthquake': '지진 발생',
        'threat.drought': '가뭄 발생',
        'threat.plague': '전염병 발생',
        'threat.heatwave': '폭염 발생',

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
        'era.primitive': '원시',
        'era.ancient': '고대',
        'era.medieval': '중세',
        'era.modern': '현대',
        'era.future': '미래',
        'era.terrain': '지형',
        'era.unit': '유닛',
        'era.enemy': '적',
        'era.disaster': '자연재해',

        // Rarity names
        'rarity.common': '일반',
        'rarity.uncommon': '고급',
        'rarity.rare': '희귀',
        'rarity.epic': '영웅',
        'rarity.legendary': '전설',

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
        'dataBrowser.events': '이벤트',
        'dataBrowser.searchPlaceholder': '검색 (이름, 설명, ID)...',
        'dataBrowser.allEras': '모든 타입',
        'dataBrowser.allTypes': '모든 카테고리',
        'dataBrowser.friendly': '우호',
        'dataBrowser.enemy': '적',
        'dataBrowser.combat': '전투',
        'dataBrowser.colName': '이름',
        'dataBrowser.colEra': '타입',
        'dataBrowser.colRarity': '희귀도',
        'dataBrowser.colBasePool': '기본 풀',
        'dataBrowser.colType': '타입',
        'dataBrowser.colCost': '비용',
        'dataBrowser.colTags': '태그',
        'dataBrowser.colDesc': '설명',
        'dataBrowser.colPlayerDesc': '플레이어 설명',
        'dataBrowser.colSprite': '스프라이트',
        'dataBrowser.colIcon': '아이콘',
        'dataBrowser.colColor': '색상',
        'dataBrowser.colCategory': '분류',
        'dataBrowser.colAvailability': '등장 조건',
        'dataBrowser.knowledgeUpgrades': '지식 업그레이드',
        'dataBrowser.intensity': '강도',
        'dataBrowser.enemies': '적 유닛',
        'dataBrowser.rewards': '보상',
        'dataBrowser.statuses': '상태',
        'status.clan_formation.name': '씨족 형성기',
        'status.clan_formation.desc': '야만인 침략 확률이 0%로 고정됩니다.',
        'eventCategory.basic': '기본',
        'eventCategory.conditional': '조건부',
        'eventCategory.leader': '지도자',
        'event.ancient_food_cache.name': '곡물 저장고',
        'event.ancient_food_cache.desc': '즉시 식량 6을 획득합니다.',
        'event.ancient_food_cache.availability': '고대 시대에만 등장합니다.',
        'event.ancient_gold_cache.name': '청동 공물',
        'event.ancient_gold_cache.desc': '즉시 골드 5를 획득합니다.',
        'event.ancient_gold_cache.availability': '고대 시대에만 등장합니다.',
        'event.ancient_knowledge_cache.name': '점토판 기록',
        'event.ancient_knowledge_cache.desc': '즉시 지식 8을 획득합니다.',
        'event.ancient_knowledge_cache.availability': '고대 시대에만 등장합니다.',
        'event.medieval_food_cache.name': '장원 곡창',
        'event.medieval_food_cache.desc': '즉시 식량 15를 획득합니다.',
        'event.medieval_food_cache.availability': '중세 시대에만 등장합니다.',
        'event.medieval_gold_cache.name': '길드 후원',
        'event.medieval_gold_cache.desc': '즉시 골드 12를 획득합니다.',
        'event.medieval_gold_cache.availability': '중세 시대에만 등장합니다.',
        'event.medieval_knowledge_cache.name': '수도원 필사실',
        'event.medieval_knowledge_cache.desc': '즉시 지식 18을 획득합니다.',
        'event.medieval_knowledge_cache.availability': '중세 시대에만 등장합니다.',
        'event.modern_food_cache.name': '비축 식량 배급',
        'event.modern_food_cache.desc': '즉시 식량 35를 획득합니다.',
        'event.modern_food_cache.availability': '현대 시대에만 등장합니다.',
        'event.modern_gold_cache.name': '산업 투자',
        'event.modern_gold_cache.desc': '즉시 골드 28을 획득합니다.',
        'event.modern_gold_cache.availability': '현대 시대에만 등장합니다.',
        'event.modern_knowledge_cache.name': '연구 보조금',
        'event.modern_knowledge_cache.desc': '즉시 지식 40을 획득합니다.',
        'event.modern_knowledge_cache.availability': '현대 시대에만 등장합니다.',
        'event.artifact_market_refresh.name': '유물 상단',
        'event.artifact_market_refresh.desc': '유물 상점을 새로고침 합니다.',
        'event.artifact_market_refresh.availability': '-',
        'event.kadesh_battle_escape.name': '카데시 전투 탈출',
        'event.kadesh_battle_escape.desc': '체력이 1인 야만인을 추가합니다.',
        'event.kadesh_battle_escape.availability': '-',
        'event.currency_standardization.name': '화폐 통일',
        'event.currency_standardization.desc': '다음 5턴 동안 골드 기본 생산량이 두 배가 됩니다.',
        'event.currency_standardization.availability': '-',
        'event.border_raid.name': '야만인 소탕',
        'event.border_raid.desc.ancient': `즉시 식량 ${BORDER_RAID_REWARD[0]}과 골드 ${BORDER_RAID_REWARD[0]}을 획득합니다. 야만인 유닛 ${BORDER_RAID_ENEMY_COUNT}개를 추가합니다.`,
        'event.border_raid.desc.medieval': `즉시 식량 ${BORDER_RAID_REWARD[1]}과 골드 ${BORDER_RAID_REWARD[1]}을 획득합니다. 야만인 유닛 ${BORDER_RAID_ENEMY_COUNT}개를 추가합니다.`,
        'event.border_raid.desc.modern': `즉시 식량 ${BORDER_RAID_REWARD[2]}과 골드 ${BORDER_RAID_REWARD[2]}을 획득합니다. 야만인 유닛 ${BORDER_RAID_ENEMY_COUNT}개를 추가합니다.`,
        'event.border_raid.availability': '-',
        'event.grassland_festival.name': '초원 축제',
        'event.grassland_festival.desc.ancient': `즉시 식량 ${GRASSLAND_FESTIVAL_FOOD[0]}을 획득합니다.`,
        'event.grassland_festival.desc.medieval': `즉시 식량 ${GRASSLAND_FESTIVAL_FOOD[1]}을 획득합니다.`,
        'event.grassland_festival.desc.modern': `즉시 식량 ${GRASSLAND_FESTIVAL_FOOD[2]}을 획득합니다.`,
        'event.grassland_festival.availability': '초원 심볼을 3개 이상 보유해야 등장합니다.',
        'event.capital_relocation.name': '수도 이전',
        'event.capital_relocation.desc': '보유 심볼 2개를 무작위로 파괴합니다.\n식량 25와 지식 15를 획득합니다.',
        'event.capital_relocation.availability': '보유 심볼이 10개 이상이어야 등장합니다.',
        'event.plains_pasture.name': '평원의 목축',
        'event.plains_pasture.desc.ancient': `보드 위 소 한 개당 식량 ${PLAINS_PASTURE_PER_CATTLE[0]}, 양 한 개당 골드 ${PLAINS_PASTURE_PER_SHEEP[0]}을 획득합니다.`,
        'event.plains_pasture.desc.medieval': `보드 위 소 한 개당 식량 ${PLAINS_PASTURE_PER_CATTLE[1]}, 양 한 개당 골드 ${PLAINS_PASTURE_PER_SHEEP[1]}을 획득합니다.`,
        'event.plains_pasture.desc.modern': `보드 위 소 한 개당 식량 ${PLAINS_PASTURE_PER_CATTLE[2]}, 양 한 개당 골드 ${PLAINS_PASTURE_PER_SHEEP[2]}을 획득합니다.`,
        'event.plains_pasture.availability': '평원 심볼을 2개 이상 보유해야 등장합니다.',
        'event.maritime_trade.name': '해상 무역',
        'event.maritime_trade.desc.ancient': `보드 위 바다 한 개당 식량과 골드를 각각 ${MARITIME_TRADE_PER_SEA[0]}씩 획득합니다.`,
        'event.maritime_trade.desc.medieval': `보드 위 바다 한 개당 식량과 골드를 각각 ${MARITIME_TRADE_PER_SEA[1]}씩 획득합니다.`,
        'event.maritime_trade.desc.modern': `보드 위 바다 한 개당 식량과 골드를 각각 ${MARITIME_TRADE_PER_SEA[2]}씩 획득합니다.`,
        'event.maritime_trade.availability': '바다 심볼을 3개 이상 보유해야 등장합니다.',
        'event.forest_harvest.name': '숲의 수확',
        'event.forest_harvest.desc.ancient': `즉시 식량 ${FOREST_HARVEST_FOOD[0]}을 획득하고 숲 심볼을 영입합니다.`,
        'event.forest_harvest.desc.medieval': `즉시 식량 ${FOREST_HARVEST_FOOD[1]}을 획득하고 숲 심볼을 영입합니다.`,
        'event.forest_harvest.desc.modern': `즉시 식량 ${FOREST_HARVEST_FOOD[2]}을 획득하고 숲 심볼을 영입합니다.`,
        'event.forest_harvest.availability': '숲 심볼을 3개 이상 보유해야 등장합니다.',
        'event.jungle_expedition.name': '정글 탐험',
        'event.jungle_expedition.desc': '보드 위 모든 바나나의 효과를 한 번씩 발동시킵니다.',
        'event.jungle_expedition.availability': '열대우림 심볼을 2개 이상 보유해야 등장합니다.',
        'event.desert_caravan.name': '사막 대상',
        'event.desert_caravan.desc.ancient': `즉시 식량 ${DESERT_CARAVAN_FOOD[0]}을 획득합니다.`,
        'event.desert_caravan.desc.medieval': `즉시 식량 ${DESERT_CARAVAN_FOOD[1]}을 획득합니다.`,
        'event.desert_caravan.desc.modern': `즉시 식량 ${DESERT_CARAVAN_FOOD[2]}을 획득합니다.`,
        'event.desert_caravan.availability': '사막 심볼을 1개 이상 보유해야 등장합니다.',
        'event.mountain_lookout.name': '산악 전망',
        'event.mountain_lookout.desc.ancient': `보유한 산 한 개당 식량, 골드, 지식을 각각 ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[0]}씩 획득합니다.`,
        'event.mountain_lookout.desc.medieval': `보유한 산 한 개당 식량, 골드, 지식을 각각 ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[1]}씩 획득합니다.`,
        'event.mountain_lookout.desc.modern': `보유한 산 한 개당 식량, 골드, 지식을 각각 ${MOUNTAIN_LOOKOUT_PER_MOUNTAIN[2]}씩 획득합니다.`,
        'event.mountain_lookout.availability': '산 심볼을 1개 이상 보유해야 등장합니다.',
        'event.oasis_blessing.name': '오아시스의 축복',
        'event.oasis_blessing.desc.ancient': `보드 위 빈칸 한 개당 식량 ${OASIS_BLESSING_PER_EMPTY[0]}을 획득합니다.`,
        'event.oasis_blessing.desc.medieval': `보드 위 빈칸 한 개당 식량 ${OASIS_BLESSING_PER_EMPTY[1]}을 획득합니다.`,
        'event.oasis_blessing.desc.modern': `보드 위 빈칸 한 개당 식량 ${OASIS_BLESSING_PER_EMPTY[2]}을 획득합니다.`,
        'event.oasis_blessing.availability': '오아시스 심볼을 1개 이상 보유해야 등장합니다.',
        'event.military_draft.name': '징병령',
        'event.military_draft.desc.ancient': `즉시 식량 ${MILITARY_DRAFT_FOOD[0]}을 획득합니다. 야만인 유닛이 소환됩니다.`,
        'event.military_draft.desc.medieval': `즉시 식량 ${MILITARY_DRAFT_FOOD[1]}을 획득합니다. 야만인 유닛이 소환됩니다.`,
        'event.military_draft.desc.modern': `즉시 식량 ${MILITARY_DRAFT_FOOD[2]}을 획득합니다. 야만인 유닛이 소환됩니다.`,
        'event.military_draft.availability': '유닛 심볼을 3개 이상 보유해야 등장합니다.',
        'event.every_terrain_bounty.name': '온 지형의 결실',
        'event.every_terrain_bounty.desc.ancient': `즉시 식량, 골드, 지식을 각각 ${EVERY_TERRAIN_BOUNTY_EACH[0]}씩 획득합니다.`,
        'event.every_terrain_bounty.desc.medieval': `즉시 식량, 골드, 지식을 각각 ${EVERY_TERRAIN_BOUNTY_EACH[1]}씩 획득합니다.`,
        'event.every_terrain_bounty.desc.modern': `즉시 식량, 골드, 지식을 각각 ${EVERY_TERRAIN_BOUNTY_EACH[2]}씩 획득합니다.`,
        'event.every_terrain_bounty.availability': '모든 지형 심볼을 각각 1개 이상 보유해야 등장합니다.',
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
        'symbol.cavalry.name': '기사',
        'symbol.cavalry_corps.name': '기병대',
        'symbol.crossbowman.name': '석궁병',
        'symbol.musketman.name': '머스킷병',
        'symbol.cannon.name': '대포',
        'symbol.infantry.name': '보병',
        'symbol.relic_caravan.name': '유물 상단',
        'symbol.stargazer.name': '별 관찰자',
        'symbol.stone_tablet.name': '석판',
        'symbol.enemy_warrior.name': '전사',
        'symbol.enemy_cavalry.name': '기사',
        'symbol.enemy_knight.name': '검사',
        'symbol.enemy_cavalry_corps.name': '기병대',
        'symbol.enemy_musketman.name': '머스킷병',
        'symbol.enemy_infantry.name': '보병',
        'symbol.enemy_archer.name': '궁수',
        'symbol.enemy_tracker_archer.name': '추적 궁수',
        'symbol.enemy_crossbowman.name': '석궁병',
        'symbol.enemy_cannon.name': '대포',
        'symbol.flood.name': '홍수',
        'symbol.earthquake.name': '지진',
        'symbol.drought.name': '가뭄',
        'symbol.plague.name': '역병',
        'symbol.heatwave.name': '폭염',
        'symbol.fur.name': '모피',

        // 47-52: 후보 -> 실제 심볼
        'symbol.salt.name': '소금',
        'symbol.honey.name': '꿀',
        'symbol.corn.name': '옥수수',
        'symbol.foxtail_millet.name': '조',
        'symbol.wild_berries.name': '야생열매',
        'symbol.hay.name': '건초',
        'symbol.spices.name': '향신료',
        'symbol.tax.name': '세금',
        'symbol.aqueduct.name': '송수로',
        'symbol.rye.name': '귀리',
        'symbol.sheep.name': '양',
        'symbol.scholar.name': '학자',
        'symbol.holy_relic.name': '성유물',
        'symbol.monastery_garden.name': '수도원 정원',
        'symbol.tax_storehouse.name': '징세 창고',
        'symbol.pioneer.name': '개척자',
        'symbol.edict.name': '칙령',
        'symbol.royal_colony.name': '왕도 개척',
        'symbol.agi_core.name': 'AGI 코어',
        'symbol.wild_seeds.name': '야생 씨앗',
        'symbol.wild_seeds.desc': '식량 +1. 5턴 후 파괴.',
        'symbol.bronze_tribute_chest.name': '청동 공물함',
        'symbol.bronze_tribute_chest.desc': '골드 +1. 3턴 후 파괴.',
        'symbol.heqet.name': '헤케트',
        'symbol.heqet.desc': '식량 +1; 초원과 인접 시: 추가 식량 +2; 밀과 인접 시: 지식 +2.',
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
        'symbol.grassland.desc': '식량 +2.',
        'symbol.grassland.descWithIrrigation': '식량 +3.',
        'symbol.grassland.descWithThreeField': '식량 +5.',
        'symbol.monument.desc': '지식 +5.',
        'symbol.oasis.desc': '인접 빈 슬롯 2개당: 식량 +2.',
        'symbol.oral_tradition.desc': '10턴 후: 파괴; 파괴 시: 인접 심볼 1개당 지식 +10.',
        'symbol.rainforest.desc': '식량 +1.',
        'symbol.plains.desc': '식량 +1.',
        'symbol.mountain.desc': '식량 +1.',
        'symbol.totem.desc': '구석 배치 시: 지식 +12.',
        'symbol.omen.desc': '50% 확률로 식량 +3.',
        'symbol.campfire.desc': '이번 턴 식량 생산이 가장 높은 인접 심볼의 식량만큼 획득. 파괴.',
        'symbol.pottery.desc': '매 턴 저장 식량 +4; 파괴 시: 저장량만큼 식량 획득.',
        'symbol.tribal_village.desc': '소모하여 심볼 선택 페이즈 2회 발동.',
        'symbol.merchant.desc': '인접한 심볼 중, 식량을 가장 많이 생산한 심볼의 식량 생산량 만큼 골드를 생산합니다.',
        'symbol.horse.desc': '식량 +2, 골드 +2. 보드에 배치되지 않아도 발동합니다.',
        'symbol.crab.desc': '보드에 배치된 바다가 1개: 식량 +1, 골드 +1; 2개: 식량 +2, 골드 +2; 3개 이상: 식량 +2, 골드 +2.',
        'symbol.library.desc': '인접한 심볼 하나당 지식 +1.',
        'symbol.pearl.desc': '보드에 배치된 바다가 1개: 골드 +2; 2개: 골드 +3; 3개 이상: 골드 +5.',
        'symbol.compass.desc': '보드에 배치된 바다가 1개: 지식 +5; 2개: 지식 +10; 3개 이상: 지식 +15.',
        'symbol.desert.desc': '무작위 인접한 일반·시대 심볼 1개 파괴.',
        'symbol.forest.desc': '보드에 배치된 숲이 3개 이상: 식량 +2; 5개 이상: 골드 +1; 보드에 유일한 지형이 숲이면: 식량 +1.',
        'symbol.deer.desc': '인접한 숲마다: 식량 +1.',
        'symbol.loot.desc': '개봉하여 일반 보상을 획득합니다. 전리품에 인접 시: 흡수하며 대형 전리품으로 업그레이드 됩니다.',
        'symbol.greater_loot.desc': '개봉하여 대형 보상을 획득합니다. 대형 전리품에 인접 시: 흡수하며 빛나는 전리품으로 업그레이드 됩니다.',
        'symbol.radiant_loot.desc': '개봉하여 초대형 보상을 획득합니다.',
        'symbol.fur.desc': '보드에 배치된 숲 2개마다: 골드 +2.',
        'symbol.date.desc': '식량 +1; 파괴 시: 식량 +10.',
        'symbol.christianity.desc': '인접한 심볼 중 가장 높은 식량 생산량만큼 식량을 생산합니다. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'symbol.islam.desc': '보드 위 지식을 생산하는 심볼 하나당 식량 +2. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'symbol.buddhism.desc': '보드 위 빈 슬롯 1개당 식량 +2. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'symbol.hinduism.desc': '보드 위 같은 심볼이 없다면: 보드 위 심볼 2개당 식량 +1. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'symbol.warrior.desc': '근접: 인접한 첫 번째 적 심볼을 공격합니다.',
        'symbol.archer.desc': '원거리: 보드 위의 첫 번째 적 심볼을 공격합니다.',
        'symbol.tracker_archer.desc': '고대 원거리 유닛. 숲과 인접 시: 식량 +1.',
        'symbol.knight.desc': '근접: 인접한 첫 번째 적 심볼을 공격합니다.',
        'symbol.cavalry.desc': '근접: 인접한 첫 번째 적 심볼을 공격합니다.',
        'symbol.cavalry_corps.desc': '중세 근접 유닛.',
        'symbol.crossbowman.desc': '원거리: 보드 위의 첫 번째 적 심볼을 공격합니다.',
        'symbol.musketman.desc': '중세 근접 유닛.',
        'symbol.cannon.desc': '원거리: 보드 위의 첫 번째 적 심볼을 공격합니다.',
        'symbol.infantry.desc': '근접: 인접한 첫 번째 적 심볼을 공격합니다.',
        'symbol.relic_caravan.desc': '파괴; 파괴 시: 유물 상점 새로고침.',
        'symbol.stargazer.desc': '빈 슬롯 4개당: 지식 +4.',
        'symbol.stone_tablet.desc': '보유한 비소모형 유물 1개당: 지식 +2.',
        'symbol.enemy_warrior.desc': '식량 -3.',
        'symbol.enemy_cavalry.desc': '식량 -5.',
        'symbol.enemy_knight.desc': '식량 -3.',
        'symbol.enemy_cavalry_corps.desc': '식량 -6.',
        'symbol.enemy_musketman.desc': '식량 -6.',
        'symbol.enemy_infantry.desc': '식량 -8.',
        'symbol.enemy_archer.desc': '식량 -3.',
        'symbol.enemy_tracker_archer.desc': '식량 -3.',
        'symbol.enemy_crossbowman.desc': '식량 -5.',
        'symbol.enemy_cannon.desc': '식량 -8.',
        'symbol.flood.desc': '인접한 지형 심볼들의 생산을 비활성화합니다. 카운터 0에 도달 시: 파괴.',
        'symbol.earthquake.desc': '파괴. 파괴 시: 자신 포함 같은 열의 모든 심볼 파괴.',
        'symbol.drought.desc': '카운터 0 도달 시: 파괴.',
        'symbol.plague.desc': '심볼 선택 페이즈를 비활성화합니다; 카운터 0 도달 시: 파괴.',
        'symbol.heatwave.desc': '심볼 선택지를 두 개로 줄입니다. 카운터 0 도달 시: 파괴.',
        'symbol.salt.desc': '인접 지형 심볼 1개당: 식량 +1.',
        'symbol.honey.desc': '같은 지형이 5개 이상 배치 시: 식량 +5.',
        'symbol.corn.desc': '식량 +2.',
        'symbol.foxtail_millet.desc': '인접한 지형 심볼 2개마다 식량 +5.',
        'symbol.wild_berries.desc': '식량 +1; 숲 혹은 열대우림 인접 시: 식량 +2; 산 인접 시: 지식 +2.',
        'symbol.hay.desc': '평원 인접 시: 카운터 +1. 파괴 시: 카운터 만큼 식량 생산.',
        'symbol.spices.desc': '배치 된 다른 지형 유형 하나당: 식량 +1.',
        'symbol.tax.desc': '무작위 인접 심볼이 이번 턴 생산한 식량만큼 골드를 생산합니다.',
        'symbol.aqueduct.desc': '인접한 밀·쌀·귀리의 이번 턴 식량 생산이 2배가 됩니다.',
        'symbol.rye.desc': '식량 +2. 평원 인접 시: 식량 +2 추가.',
        'symbol.sheep.desc':
            '식량 +1. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +5.',
        'symbol.sheep.descBoard.pastoral':
            '식량 +1; 10% 확률로 양 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +5, 골드 +5.',
        'symbol.scholar.desc': '인접한 고대 심볼을 모두 파괴합니다. 파괴한 고대 심볼 하나당 이 학자의 지식 생산량이 영구적으로 +5.',
        'symbol.holy_relic.desc': '보드 위에 종교 심볼이 있으면: 지식 +7, 골드 +7.',
        'symbol.monastery_garden.desc': '보드 위에 종교 심볼이 있으면: 식량 +7, 지식 +7.',
        'symbol.tax_storehouse.desc': '매 턴 저장 식량 +8; 파괴 시: 저장량만큼 식량 획득.',
        'symbol.pioneer.desc': '파괴. 파괴 시: 다음 심볼 선택지에 지형 심볼이 최소 1개 등장합니다.',
        'symbol.edict.desc': '소모하여 인접한 심볼 1개를 파괴할 수 있습니다.',
        'symbol.royal_colony.desc': '파괴. 파괴 시: 다음 심볼 선택지에 이벤트가 최소 1개 등장합니다.',
        'symbol.agi_core.desc': '보드 위 모든 심볼의 지식 생산량만큼 흡수합니다. 흡수한 지식이 500에 도달하면 게임에서 승리합니다.',
        'symbol.expedition.desc': '열대우림 인접 시: 식량, 골드, 지식 중 무작위로 1~10만큼 생산합니다.',
        'symbol.dye.desc': '골드 +1; 파괴 시: 골드 +10.',
        'symbol.papyrus.desc': '지식 +1; 파괴 시: 지식 +10.',
        'symbol.caravanserai.desc': '이번 턴 파괴된 심볼 1개당 생산 +10. 생산 종류는 파괴된 심볼과 같습니다. 사막에 의해 파괴되지 않습니다.',

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
        'relic.13.desc': '소모하여 심볼 선택을 발동합니다.',
        'relic.14.name': '에피쿠로스 원자론 명판',
        'relic.14.desc': '보드에 종교 심볼이 없으면 매 턴 지식 +3.',
        'relic.15.name': '국가 정비',
        'relic.15.desc': '소모하여 보드 위에 있는 심볼 1개 파괴.',
        'relic.16.name': '테라의 화석 포도',
        'relic.16.desc': '자연재해 심볼이 식량 +2를 추가로 생산합니다.',
        'relic.17.name': '안토니니아누스 은화',
        'relic.17.desc': '심볼 선택을 건너뛰면 골드 +2.',
        'relic.18.name': '안데스의 추뇨',
        'relic.18.desc': '매 턴 식량 +2.',
        'relic.19.name': '개척자',
        'relic.19.desc': '소모하여 지형 선택을 발동합니다.',
        'relic.20.name': '라스코 동굴 안료',
        'relic.20.desc': '매 5턴마다 식량/골드/지식 중 무작위 1종 +5.',
        'relic.21.name': '빌렌도르프 비너스',
        'relic.21.desc': '매 10턴 식량 납부 직후 다음 턴 식량 +10.',
        'relic.22.name': '외치의 구리 도끼',
        'relic.22.desc': '보드에 숲이 있을 때 매 턴 골드 +1.',
        'relic.23.name': '세스테르티우스 동전',
        'relic.23.desc': '골드 50 이상일 때 매 턴 지식 +1.',
        'relic.24.name': '트로이 황금 노획품',
        'relic.24.desc': '1회용: 즉시 골드 +{gold}. 클릭하여 사용.',
        'relic.25.name': '글라디우스',
        'relic.25.desc': '적 처치 시 골드 +3.',
        'relic.26.name': '이슈타르 문 황소 부조',
        'relic.26.desc': '매 턴 소/양/말 하나당 골드 +1.',
        'relic.27.name': '백제 금동대향로',
        'relic.27.desc': '보드에 종교 심볼이 있을 때 매 턴 지식 +2.',
        'relic.28.name': '진시황 병마용',
        'relic.28.desc': '매 턴 보유 전투 심볼 수당 골드 +2.',
        'relic.29.name': '사양방존 청동기',
        'relic.29.desc': '구석 4칸 모두에 심볼 배치 시, 식량, 골드 및 지식 +1.',
        'relic.30.name': '모아이 석상',
        'relic.30.desc': '매 턴 빈 슬롯 3개당 골드 +1.',
        'relic.31.name': '니네베의 사자 부조',
        'relic.31.desc': '적 처치 시 골드 +8, 적이 보드에 있을 때 매 턴 지식 +2.',
        'relic.32.name': '솔로몬의 인장 반지',
        'relic.32.desc': '1번 슬롯에 배치된 심볼의 효과 두 번 발동.',
        'relic.33.name': '구데아의 정초 못',
        'relic.33.desc': '모든 심볼을 구석에 있는 것으로 취급합니다.',
        'relic.34.name': '헤레포드 마파문디',
        'relic.34.desc': '보드 위에 모든 유형의 지형을 보유 시 매 턴 식량 +10, 골드 +10, 지식 +10.',
        'relic.35.name': '수메르 왕명표',
        'relic.35.desc': '보드에 배치된 시대 심볼 1개당 매 턴 식량 +1.',
        'relic.36.name': '알렉산드리아 무세이온 명문',
        'relic.36.desc': '지식 업그레이드를 연구할 때마다 골드 +3.',
        'relic.37.name': '이집트 곡창 모형',
        'relic.37.desc': '1회용: 즉시 식량 +30. 클릭하여 사용.',
        'relic.38.name': '아슈르바니팔 색인 점토판',
        'relic.38.desc': '보드 위에 같은 심볼이 하나도 없을 때 매 턴 식량 +5, 골드 +5.',
        'relic.39.name': '징집령',
        'relic.39.desc': '소모하여 유닛 선택을 발동합니다.',
        'relic.40.name': '예언의 주사위',
        'relic.40.desc': '소모하여 이벤트 선택을 발동합니다.',

        // ── Knowledge Upgrades ──
        'knowledgeUpgrade.17.name': '문자',
        'knowledgeUpgrade.17.desc': '도서관을 해금합니다.',
        'knowledgeUpgrade.22.name': '철제 기술',
        'knowledgeUpgrade.22.desc': '근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.16.name': '관개',
        'knowledgeUpgrade.16.desc': '밀, 쌀, 초원을 업그레이드합니다.',
        'knowledgeUpgrade.21.name': '신학',
        'knowledgeUpgrade.21.desc': '종교 심볼들을 해금합니다.',
        'knowledgeUpgrade.9.name': '궁술',
        'knowledgeUpgrade.9.desc': '원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.11.name': '화폐',
        'knowledgeUpgrade.11.desc': '상인 심볼을 해금합니다.',
        'knowledgeUpgrade.13.name': '기마술',
        'knowledgeUpgrade.13.desc': '말을 해금합니다. 근접 유닛의 공격력 +1, 체력 +1.',
        'knowledgeUpgrade.12.name': '희생 제의',
        'knowledgeUpgrade.12.desc': '국가 정비를 3개 획득합니다.',
        'knowledgeUpgrade.64.name': '이단 심문',
        'knowledgeUpgrade.64.desc': '국가 정비를 3개 획득합니다.',
        'knowledgeUpgrade.65.name': '구조조정',
        'knowledgeUpgrade.65.desc': '국가 정비를 3개 획득합니다.',
        'knowledgeUpgrade.66.name': '공공행정',
        'knowledgeUpgrade.66.desc': '선택 페이즈에서 각 카드의 이벤트가 나올 확률을 2배 올립니다.',
        'knowledgeUpgrade.67.name': '대중매체',
        'knowledgeUpgrade.67.desc': '선택 페이즈에서 각 카드의 이벤트가 나올 확률을 2배 올립니다.',
        'knowledgeUpgrade.68.name': '선거 제도',
        'knowledgeUpgrade.68.desc': '선택 페이즈 첫 리롤은 무료입니다.',
        'knowledgeUpgrade.72.name': '식민주의',
        'knowledgeUpgrade.72.desc': '개척자 3개를 획득합니다.',
        [`knowledgeUpgrade.${GREAT_MIGRATION_UPGRADE_ID}.name`]: '대이주',
        [`knowledgeUpgrade.${GREAT_MIGRATION_UPGRADE_ID}.desc`]: '개척자 2개와 국가 정비 1개를 획득합니다.',
        'knowledgeUpgrade.73.name': '부족 연맹',
        'knowledgeUpgrade.73.desc': '기본 식량 생산 +1. 징집령 2개를 획득합니다.',
        'knowledgeUpgrade.74.name': '용병',
        'knowledgeUpgrade.74.desc': '기본 골드 생산 +2. 징집령 2개를 획득합니다.',
        'knowledgeUpgrade.75.name': '총동원령',
        'knowledgeUpgrade.75.desc': '징집령 4개를 획득합니다.',
        'knowledgeUpgrade.4.name': '어업',
        'knowledgeUpgrade.4.desc': '게와 진주를 해금합니다.',
        'knowledgeUpgrade.14.name': '항해술',
        'knowledgeUpgrade.14.desc': '물고기와 게를 업그레이드합니다.',
        'knowledgeUpgrade.15.name': '천문항법',
        'knowledgeUpgrade.15.desc': '진주와 바다를 업그레이드합니다.',
        'knowledgeUpgrade.6.name': '채광',
        'knowledgeUpgrade.6.desc': '돌을 업그레이드합니다. 근접 유닛의 공격력 +1, 체력 +2.',
        [`knowledgeUpgrade.${MASON_GUILD_UPGRADE_ID}.name`]: '석공 길드',
        [`knowledgeUpgrade.${MASON_GUILD_UPGRADE_ID}.desc`]: '돌을 업그레이드합니다. 근접 유닛의 공격력 +1, 체력 +2.',
        [`knowledgeUpgrade.${TROPICAL_AGRICULTURE_UPGRADE_ID}.name`]: '열대 농경',
        [`knowledgeUpgrade.${TROPICAL_AGRICULTURE_UPGRADE_ID}.desc`]: '열대우림을 업그레이드합니다.',
        'knowledgeUpgrade.2.name': '수렵',
        'knowledgeUpgrade.2.desc': '모피를 해금합니다.',
        'knowledgeUpgrade.10.name': '법전',
        'knowledgeUpgrade.10.desc': '기본 지식 생산 +2.',
        'knowledgeUpgrade.7.name': '외국 무역',
        'knowledgeUpgrade.7.desc': '사막을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.7.desert': '골드 +2; 무작위 인접 일반·시대 심볼 1개 파괴.',
        'knowledgeUpgrade.18.name': '건축',
        'knowledgeUpgrade.18.desc': '기본 지식 생산 +1. 소금을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.18.salt': '인접 지형 심볼 1개당: 식량 +2.',
        'knowledgeUpgrade.49.name': '민족주의',
        'knowledgeUpgrade.49.desc': '기본 지식 생산 +2. 국가 정비를 1개 획득합니다. 기념비를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.49.monument': '지식 +10.',
        'knowledgeUpgrade.38.name': '탐험',
        'knowledgeUpgrade.38.desc': '기본 골드 생산 +2. 꿀을 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.38.honey': '같은 지형 5개 이상 배치 시: 식량 +10.',
        'knowledgeUpgrade.50.name': '중상주의',
        'knowledgeUpgrade.35.name': '군사 과학',
        'knowledgeUpgrade.50.desc': '기본 골드 생산 +2. 향신료를 업그레이드합니다.',
        'knowledgeUpgrade.35.desc': '말이 식량 +3, 골드 +4를 생산합니다. 근접 유닛의 공격력 +1, 체력 +1.',
        'knowledgeUpgrade.symbolDescAfter.50.spices': '배치된 다른 지형 유형 하나당: 식량 +3.',
        'knowledgeUpgrade.symbolDescAfter.35.horse': '식량 +3, 골드 +4. 보드에 배치되지 않아도 발동합니다.',
        'knowledgeUpgrade.19.name': '대상품 교역',
        'knowledgeUpgrade.19.desc': '염료와 파피루스를 해금합니다.',
        'knowledgeUpgrade.32.name': '건조 저장술',
        'knowledgeUpgrade.32.desc': '사막과 오아시스, 대추를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.32.desert': '골드 +5. 인접한 일반 및 시대 심볼 모두 파괴.',
        'knowledgeUpgrade.symbolDescAfter.32.oasis': '인접 빈 슬롯 2개당: 식량 +4.',
        'knowledgeUpgrade.symbolDescAfter.32.date': '식량 +1; 파괴 시: 식량 +20.',
        'knowledgeUpgrade.45.name': '카라밴세라이',
        'knowledgeUpgrade.45.desc': '카라밴세라이를 해금합니다. 염료와 파피루스를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.45.dye': '골드 +1; 파괴 시: 골드 +20.',
        'knowledgeUpgrade.symbolDescAfter.45.papyrus': '지식 +1; 파괴 시: 지식 +20.',
        'knowledgeUpgrade.54.name': '오아시스 회수망',
        'knowledgeUpgrade.54.desc': '사막과 오아시스를 업그레이드 합니다.',
        'knowledgeUpgrade.33.name': '기계장치',
        'knowledgeUpgrade.33.desc': '궁수가 석궁병으로 대체됩니다. 원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.48.name': '등자',
        'knowledgeUpgrade.48.desc': '전사가 기사로 대체됩니다. 근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.55.name': '탄도학',
        'knowledgeUpgrade.55.desc': '석궁병이 대포로 대체됩니다. 원거리 유닛의 공격력 +1, 체력 +2.',
        'knowledgeUpgrade.62.name': '교체식 부품',
        'knowledgeUpgrade.62.desc': '기사가 보병으로 대체됩니다. 근접 유닛의 공격력 +2, 체력 +4.',
        'knowledgeUpgrade.symbolDescAfter.54.desert': '식량 +10 및 골드 +10. 보드 위 모든 일반 및 시대 심볼 파괴.',
        'knowledgeUpgrade.symbolDescAfter.54.oasis': '인접 빈 슬롯 2개당: 식량 +6.',
        'knowledgeUpgrade.8.name': '족장제',
        'knowledgeUpgrade.8.desc': '기본 식량 생산 +1. 국가 정비를 1개 획득합니다. 야생열매를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.8.wild_berries': '식량 +1; 숲 혹은 열대우림 인접 시: 식량 +4; 산 인접 시: 지식 +5.',
        'knowledgeUpgrade.36.name': '봉건제',
        'knowledgeUpgrade.36.desc': '기본 식량 생산 +1. 국가 정비를 1개 획득합니다. 옥수수를 업그레이드합니다.',
        'knowledgeUpgrade.symbolDescAfter.36.corn': '식량 +4.',
        'knowledgeUpgrade.23.name': '수학',
        'knowledgeUpgrade.23.desc': '기본 식량 생산 +1, 기본 지식 생산 +1.',
        'knowledgeUpgrade.25.name': '국가 노동력',
        'knowledgeUpgrade.25.desc': '기본 식량 생산 +1. 기본 골드 생산 +1. 국가 정비를 1개 획득합니다.',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.name`]: '도시화',
        [`knowledgeUpgrade.${URBANIZATION_UPGRADE_ID}.desc`]: '기본 식량 생산 +4. 기본 골드 생산 +4.',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.name`]: '증기력',
        [`knowledgeUpgrade.${STEAM_POWER_UPGRADE_ID}.desc`]: '기본 골드 생산 +4. 기본 지식 생산 +2.',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.name`]: '전기',
        [`knowledgeUpgrade.${ELECTRICITY_UPGRADE_ID}.desc`]: '기본 식량 생산 +3. 기본 골드 생산 +3. 기본 지식 생산 +3.',
        'knowledgeUpgrade.70.name': '지지대',
        'knowledgeUpgrade.70.desc': '기본 식량 생산 +2.',
        'knowledgeUpgrade.71.name': '성',
        'knowledgeUpgrade.71.desc': '야만인 침입으로 추가된 적 심볼은 3턴 동안 식량 약탈을 하지 않습니다.',
        'knowledgeUpgrade.1.name': '고대 시대',
        'knowledgeUpgrade.1.desc': '고대 심볼을 모두 해금합니다.',
        'knowledgeUpgrade.3.name': '목축업',
        'knowledgeUpgrade.3.desc': '소, 양, 평원을 업그레이드합니다.',
        'knowledgeUpgrade.5.name': '농업',
        'knowledgeUpgrade.5.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.26.name': '중세시대',
        'knowledgeUpgrade.26.desc': '고대 심볼이 더 이상 등장하지 않습니다. 중세 심볼을 모두 해금합니다. 지형 심볼 등장 확률이 x0.2로 감소합니다. 산이 업그레이드됩니다.',
        'knowledgeUpgrade.51.name': '현대 시대',
        'knowledgeUpgrade.51.desc': '중세 심볼이 더 이상 등장하지 않습니다. 현대 심볼을 모두 해금합니다. 지형 심볼이 더 이상 등장하지 않습니다.',
        'knowledgeUpgrade.63.name': 'AGI 프로젝트',
        'knowledgeUpgrade.63.desc': 'AGI 코어가 심볼 선택 풀에 등장합니다.',
        'knowledgeUpgrade.40.name': '교육',
        'knowledgeUpgrade.40.desc': '도서관을 업그레이드 합니다.',
        'knowledgeUpgrade.41.name': '신권',
        'knowledgeUpgrade.41.desc': '기독교, 이슬람, 불교, 힌두교를 업그레이드합니다.',
        'knowledgeUpgrade.37.name': '길드',
        'knowledgeUpgrade.37.desc': '상인을 업그레이드 합니다.',
        'knowledgeUpgrade.symbolDescAfter.41.christianity': '보드 위 심볼 중 가장 높은 식량 생산량 만큼 식량을 생산합니다. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.41.islam': '보드 위 지식을 생산하는 심볼 하나당 식량 +3. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.41.buddhism': '보드 위 빈 슬롯 1개당 식량 +4. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.41.hinduism': '보드 위 같은 심볼이 없다면: 보드 위 심볼 1개당 식량 +1. 보드에 종교 심볼이 두 개 이상일 경우: 파괴.',
        'knowledgeUpgrade.symbolDescAfter.37.merchant': '보드 위 식량을 가장 많이 생산한 심볼의 식량 생산량 만큼 골드를 생산합니다.',
        'knowledgeUpgrade.symbolDescAfter.40.library': '인접한 심볼 하나당 지식 +2.',
        'knowledgeUpgrade.59.name': '과학이론',
        'knowledgeUpgrade.59.desc': '도서관을 업그레이드 합니다.',
        'knowledgeUpgrade.symbolDescAfter.59.library': '보드 위 심볼 하나당: 지식 +2.',
        'knowledgeUpgrade.44.name': '인쇄술',
        'knowledgeUpgrade.44.desc': '기본 골드 생산 +2, 기본 지식 생산 +2.',
        'knowledgeUpgrade.28.name': '삼포제',
        'knowledgeUpgrade.28.desc': '밀, 쌀, 초원을 업그레이드합니다.',
        'knowledgeUpgrade.43.name': '농업 잉여',
        'knowledgeUpgrade.43.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.56.name': '현대 농업',
        'knowledgeUpgrade.56.desc': '밀과 쌀을 업그레이드합니다.',
        'knowledgeUpgrade.47.name': '목장제',
        'knowledgeUpgrade.47.desc': '평원을 업그레이드합니다.',
        'knowledgeUpgrade.24.name': '유목 전통',
        'knowledgeUpgrade.24.desc': '소, 양을 업그레이드합니다.',
        'knowledgeUpgrade.31.name': '나침반',
        'knowledgeUpgrade.31.desc': '나침반을 해금합니다.',
        'knowledgeUpgrade.39.name': '조선',
        'knowledgeUpgrade.39.desc': '바다를 업그레이드합니다.',
        'knowledgeUpgrade.27.name': '어업 조합',
        'knowledgeUpgrade.27.desc': '물고기, 게를 업그레이드합니다.',
        'knowledgeUpgrade.34.name': '해상 무역',
        'knowledgeUpgrade.34.desc': '진주와 바다를 업그레이드합니다.',
        'knowledgeUpgrade.52.name': '원양 항로',
        'knowledgeUpgrade.52.desc': '물고기, 게, 진주 및 바다를 업그레이드합니다.',
        'knowledgeUpgrade.29.name': '플랜테이션',
        'knowledgeUpgrade.29.desc': '바나나를 업그레이드합니다.',
        'knowledgeUpgrade.20.name': '추적술',
        'knowledgeUpgrade.20.desc': '숲을 업그레이드합니다.',
        'knowledgeUpgrade.30.name': '무두질',
        'knowledgeUpgrade.30.desc': '모피와 사슴을 업그레이드합니다.',
        'knowledgeUpgrade.46.name': '임업',
        'knowledgeUpgrade.46.desc': '숲을 업그레이드 합니다.',
        'knowledgeUpgrade.57.name': '보존',
        'knowledgeUpgrade.57.desc': '사슴을 업그레이드합니다.',
        'knowledgeUpgrade.42.name': '정글탐사',
        'knowledgeUpgrade.42.desc': '탐사대를 해금합니다.',
        'knowledgeUpgrade.60.name': '열대 개발',
        'knowledgeUpgrade.60.desc': '열대우림과 탐사대를 업그레이드합니다.',
        'destroySelection.riteTitle': '희생 제의 (파괴할 심볼 선택)',
        'destroySelection.riteDesc': '보유 중인 심볼을 최대 3개까지 파괴할 수 있습니다. 선택 후 확정하면 파괴한 심볼 하나당 골드 +10을 획득합니다.',
        'destroySelection.territoryTitle': '영토 정비 (제거할 심볼 선택)',
        'destroySelection.territoryDesc': '보유 심볼 최대 3개까지 제거합니다(파괴 효과는 발동하지 않음). 제거한 심볼마다 골드 +10. 이후 지형 선택 1회와 심볼 선택 3회가 이어집니다.',
        'destroySelection.edictTitle': '칙령 — 보유 심볼 1개 제거',
        'destroySelection.edictDesc': '컬렉션에서 제거할 심볼 1개를 고릅니다(파괴 효과는 발동하지 않음). 이후 심볼 선택으로 이어집니다.',
        'destroySelection.edictConfirm': '1개 제거 후 심볼 선택',
        'destroySelection.oblivionTitle': '국가 정비',
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
        'lootOpen.button': '개봉',
        'lootOpen.aria': '전리품 보상 개봉',
        'lootReward.title.small': '전리품 개봉',
        'lootReward.title.medium': '대형 전리품 개봉',
        'lootReward.title.large': '빛나는 전리품 개봉',
        'lootReward.choose': '보상을 선택하세요',
        'lootReward.rarity.common': '일반',
        'lootReward.rarity.rare': '대형',
        'lootReward.rarity.legendary': '초대형',
        'lootReward.desc.gain': '{items} 획득.',
        'lootReward.desc.randomRelic': '랜덤 유물 1개 획득.',
        'lootReward.desc.relicCount': '{name} {count}개',
        'lootReward.desc.and': ' 및 ',
        'lootReward.relicFallback': '유물',
        'resource.food': '식량',
        'resource.gold': '골드',
        'resource.knowledge': '지식',
        'reward.food_common.name': '마른 빵',
        'reward.food_rare.name': '풍요로운 수확',
        'reward.food_legendary.name': '신의 은총',
        'reward.gold_common.name': '동전 한 줌',
        'reward.gold_rare.name': '황금',
        'reward.gold_legendary.name': '황금 보고',
        'reward.knowledge_common.name': '지식의 조각',
        'reward.knowledge_rare.name': '고서',
        'reward.knowledge_legendary.name': '신성한 지혜',
        'reward.relic_legendary.name': '신비한 유물',
        'reward.ancient_relic_debris_common.name': '발굴 잔해',
        'reward.national_reform_rare.name': '정비 명령서',
        'reward.ancient_relic_debris_rare.name': '유물 잔해 더미',
        'reward.national_reform_legendary.name': '대정비 칙령',
        'reward.ancient_relic_debris_legendary.name': '고대 유물 저장고',
        'reward.pioneer_expedition_legendary.name': '개척 원정대',
        'knowledgeUpgrade.obsolete.11.name': '황금의 거래',
        'knowledgeUpgrade.obsolete.11.desc': '새로운 유물 입고 시 무작위 유물의 가격이 50% 할인됩니다.',
        'knowledgeUpgrade.obsolete.12.name': '유물 보관소',
        'knowledgeUpgrade.obsolete.12.desc': '비소모형 유물 1개당 매 턴 지식 생산 +1',
        'knowledgeUpgrade.obsolete.13.name': '천하부강',
        'knowledgeUpgrade.obsolete.13.desc': '보드에 배치된 심볼 수 두 개당 매 턴 식량 +1. 빈 슬롯 두 개당 매 턴 지식 +1.',
        'knowledgeUpgrade.obsolete.14.name': '천하통일의 기틀',
        'knowledgeUpgrade.obsolete.14.desc': '새 시대마다 고대 유물 잔해와 개척자를 하나씩 얻습니다.',
    },
};

translations.zh = {
    ...translations.en,
    ...ZH_TRANSLATIONS,
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
    if (lang === 'zh') {
        return symbolKey === 'wheat'
            ? `小麦：每 10 回合获得 ${food} 食物 + 棋盘上的草原数量。每个相邻草原：每回合 +1。`
            : `稻米：每 20 回合获得 ${food} 食物 + 棋盘上的草原数量。每个相邻草原：每回合 +1。`;
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
    if (lang === 'zh') {
        return symbolKey === 'wheat'
            ? `小麦：每 10 回合获得 ${food} 食物 + 棋盘上的草原数量。每个相邻草原：每回合 +2。`
            : `稻米：每 20 回合获得 ${food} 食物 + 棋盘上的草原数量。每个相邻草原：每回合 +2。`;
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
    if (lang === 'zh') {
        return symbolKey === 'wheat'
            ? `小麦：每 10 回合获得 ${food} 食物 + 棋盘上的草原数量。棋盘上每个草原：每回合 +1。`
            : `稻米：每 20 回合获得 ${food} 食物 + 棋盘上的草原数量。棋盘上每个草原：每回合 +1。`;
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
            if (lang === 'zh') {
                return '+1 食物；10% 概率生产牛。与平原相邻时可屠宰；屠宰时：+20 食物。';
            }
            return lang === 'ko'
                ? '식량 +1; 10% 확률로 소 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +20.'
                : '+1 Food; 10% chance to produce Cattle. When adjacent to Plains, can butcher; on butcher: +20 Food.';
        }
        if (hasNomadicTradition) {
            if (lang === 'zh') {
                return '+1 食物。与平原相邻时可屠宰；屠宰时：+20 食物。';
            }
            return lang === 'ko'
                ? '식량 +1. 평원 인접 시 도축 가능; 도축 시: 식량 +20.'
                : '+1 Food. When adjacent to Plains, can butcher; on butcher: +20 Food.';
        }
        if (hasPast) return t('symbol.cattle.descBoard.pastoral', lang);
        return t('symbol.cattle.desc', lang);
    }
    if (symbolKey === 'sheep') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(NOMADIC_TRADITION_UPGRADE_ID)) {
            if (lang === 'zh') {
                return have.has(PASTORALISM_UPGRADE_ID)
                    ? '+1 食物；10% 概率生产羊。与平原相邻时可屠宰；屠宰时：+10 食物，+10 金币。'
                    : '+1 食物。与平原相邻时可屠宰；屠宰时：+10 食物，+10 金币。';
            }
            return have.has(PASTORALISM_UPGRADE_ID)
                ? lang === 'ko'
                    ? '식량 +1; 10% 확률로 양 생산. 평원 인접 시 도축 가능; 도축 시: 식량 +10, 골드 +10.'
                    : '+1 Food; 10% chance to produce Sheep. When adjacent to Plains, can butcher; on butcher: +10 Food, +10 Gold.'
                : lang === 'ko'
                    ? '식량 +1. 평원 인접 시 도축 가능; 도축 시: 식량 +10, 골드 +10.'
                    : '+1 Food. When adjacent to Plains, can butcher; on butcher: +10 Food, +10 Gold.';
        }
        return have.has(PASTORALISM_UPGRADE_ID)
            ? t('symbol.sheep.descBoard.pastoral', lang)
            : t('symbol.sheep.desc', lang);
    }
    if (symbolKey === 'plains') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        const base = have.has(PASTORALISM_UPGRADE_ID) ? 2 : 1;
        if (have.has(PASTURE_MANAGEMENT_UPGRADE_ID)) {
            if (lang === 'zh') {
                return `+${base} 食物 + 计数器。相邻的牛或羊被屠宰时：计数器 +1。`;
            }
            return lang === 'ko'
                ? `식량 +${base}+카운터. 인접한 소 또는 양이 도축될 때: 카운터 +1.`
                : `+${base} Food + Counter. When adjacent Cattle or Sheep is butchered: +1 Counter.`;
        }
        if (have.has(PASTORALISM_UPGRADE_ID)) {
            if (lang === 'zh') {
                return '+2 食物。';
            }
            return lang === 'ko'
                ? `식량 +2.`
                : `+2 Food.`;
        }
        return t('symbol.plains.desc', lang);
    }
    if (symbolKey === 'fish') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.52.fish', lang)
            : have.has(FISHERY_GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.27.fish', lang)
            : have.has(SEAFARING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.14.fish', lang)
            : t('symbol.fish.desc', lang);
    }
    if (symbolKey === 'crab') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.52.crab', lang)
            : have.has(FISHERY_GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.27.crab', lang)
            : have.has(SEAFARING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.14.crab', lang)
            : t('symbol.crab.desc', lang);
    }
    if (symbolKey === 'sea') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(OCEANIC_ROUTES_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.52.seaWithShipbuilding', lang);
        }
        if (have.has(OCEANIC_ROUTES_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.52.sea', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(MARITIME_TRADE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.34.seaWithShipbuilding', lang);
        }
        if (have.has(MARITIME_TRADE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.34.sea', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID) && have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.39.seaWithCelestial', lang);
        }
        if (have.has(SHIPBUILDING_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.39.sea', lang);
        }
        return have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.15.sea', lang)
            : t('symbol.sea.desc', lang);
    }
    if (symbolKey === 'pearl') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(OCEANIC_ROUTES_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.52.pearl', lang)
            : have.has(MARITIME_TRADE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.34.pearl', lang)
            : have.has(CELESTIAL_NAVIGATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.15.pearl', lang)
            : t('symbol.pearl.desc', lang);
    }
    if (symbolKey === 'stone') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(MASON_GUILD_UPGRADE_ID)
            ? t(`knowledgeUpgrade.symbolDescAfter.${MASON_GUILD_UPGRADE_ID}.stone`, lang)
            : have.has(MINING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.6.stone', lang)
            : t('symbol.stone.desc', lang);
    }
    if (symbolKey === 'rainforest') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TROPICAL_DEVELOPMENT_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.60.rainforest', lang)
            : have.has(TROPICAL_AGRICULTURE_UPGRADE_ID)
            ? t(`knowledgeUpgrade.symbolDescAfter.${TROPICAL_AGRICULTURE_UPGRADE_ID}.rainforest`, lang)
            : t('symbol.rainforest.desc', lang);
    }
    if (symbolKey === 'mountain') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(FEUDALISM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.26.mountain', lang)
            : t('symbol.mountain.desc', lang);
    }
    if (symbolKey === 'forest') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(FORESTRY_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.46.forest', lang)
            : have.has(TRACKING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.20.forest', lang)
            : t('symbol.forest.desc', lang);
    }
    if (symbolKey === 'banana') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(PLANTATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.29.banana', lang)
            : t('symbol.banana.desc', lang);
    }
    if (symbolKey === 'fur') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TANNING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.30.fur', lang)
            : t('symbol.fur.desc', lang);
    }
    if (symbolKey === 'deer') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(PRESERVATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.57.deer', lang)
            : have.has(TANNING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.30.deer', lang)
            : have.has(TRACKING_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.20.deer', lang)
            : t('symbol.deer.desc', lang);
    }
    if (symbolKey === 'expedition') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(TROPICAL_DEVELOPMENT_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.60.expedition', lang)
            : t('symbol.expedition.desc', lang);
    }
    if (symbolKey === 'desert') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(OASIS_RECOVERY_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.54.desert', lang);
        }
        if (have.has(DESERT_STORAGE_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.32.desert', lang);
        }
        return have.has(FOREIGN_TRADE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.7.desert', lang)
            : t('symbol.desert.desc', lang);
    }
    if (symbolKey === 'oasis') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        if (have.has(OASIS_RECOVERY_UPGRADE_ID)) {
            return t('knowledgeUpgrade.symbolDescAfter.54.oasis', lang);
        }
        return have.has(DESERT_STORAGE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.32.oasis', lang)
            : t('symbol.oasis.desc', lang);
    }
    if (symbolKey === 'date') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(DESERT_STORAGE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.32.date', lang)
            : t('symbol.date.desc', lang);
    }
    if (symbolKey === 'dye') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CARAVANSERAI_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.45.dye', lang)
            : t('symbol.dye.desc', lang);
    }
    if (symbolKey === 'papyrus') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CARAVANSERAI_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.45.papyrus', lang)
            : t('symbol.papyrus.desc', lang);
    }
    if (symbolKey === 'wild_berries') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(CHIEFDOM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.8.wild_berries', lang)
            : t('symbol.wild_berries.desc', lang);
    }
    if (symbolKey === 'library') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(SCIENTIFIC_THEORY_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.59.library', lang)
            : have.has(EDUCATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.40.library', lang)
            : t('symbol.library.desc', lang);
    }
    if (symbolKey === 'merchant') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(GUILD_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.37.merchant', lang)
            : t('symbol.merchant.desc', lang);
    }
    if (symbolKey === 'horse') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(MILITARY_SCIENCE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.35.horse', lang)
            : t('symbol.horse.desc', lang);
    }
    if (symbolKey === 'corn') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(FEUDAL_CORN_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.36.corn', lang)
            : t('symbol.corn.desc', lang);
    }
    if (symbolKey === 'salt') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(ARCHITECTURE_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.18.salt', lang)
            : t('symbol.salt.desc', lang);
    }
    if (symbolKey === 'monument') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(NATIONALISM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.49.monument', lang)
            : t('symbol.monument.desc', lang);
    }
    if (symbolKey === 'honey') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(EXPLORATION_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.38.honey', lang)
            : t('symbol.honey.desc', lang);
    }
    if (symbolKey === 'spices') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(MERCANTILISM_UPGRADE_ID)
            ? t('knowledgeUpgrade.symbolDescAfter.50.spices', lang)
            : t('symbol.spices.desc', lang);
    }
    if (symbolKey === 'christianity' || symbolKey === 'islam' || symbolKey === 'buddhism' || symbolKey === 'hinduism') {
        const have = new Set((unlockedKnowledgeUpgrades ?? []).map((x) => Number(x)));
        return have.has(THEOCRACY_UPGRADE_ID)
            ? t(`knowledgeUpgrade.symbolDescAfter.41.${symbolKey}`, lang)
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
        if (hasAg) return t('knowledgeUpgrade.symbolDescAfter.5.wheat', lang);
        if (hasIrr) return t('knowledgeUpgrade.symbolDescAfter.16.wheat', lang);
        return t('symbol.wheat.desc', lang);
    }
    if (hasModernAgriculture) return cropModernAgricultureDesc('rice', lang, hasAg);
    if (hasAgriculturalSurplus) return cropAgriculturalSurplusDesc('rice', lang, hasAg);
    if (hasThreeField) return cropThreeFieldDesc('rice', lang, hasAg);
    if (hasIrr && hasAg) return t('symbol.rice.descBoard.both', lang);
    if (hasAg) return t('knowledgeUpgrade.symbolDescAfter.5.rice', lang);
    if (hasIrr) return t('knowledgeUpgrade.symbolDescAfter.16.rice', lang);
    return t('symbol.rice.desc', lang);
}

export function t(key: string, lang: Language): string {
    return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}

const ERA_DESC_SUFFIX = ['ancient', 'medieval', 'modern'] as const;
const ERA_LABELS_KO = ['고대', '중세', '현대'] as const;

/** 이벤트 효과 텍스트 — 시대 스케일 키가 있으면 현재 시대 기준으로 반환, 없으면 기본 desc로 폴백 */
export function getEventDescription(eventKey: string, era: number, lang: Language): string {
    const suffix = ERA_DESC_SUFFIX[eraScaleIndex(era)];
    const eraKey = `event.${eventKey}.desc.${suffix}`;
    const eraValue = translations[lang]?.[eraKey] ?? translations['en'][eraKey];
    if (eraValue != null) return eraValue;
    return t(`event.${eventKey}.desc`, lang);
}

/**
 * 데이터 브라우저용 — 세 시대의 설명을 모두 반환.
 * 시대별 설명 키가 없는 이벤트(스케일 없음)면 null 반환.
 */
export function getEventDescriptionAllEras(
    eventKey: string,
    lang: Language,
): { label: string; text: string }[] | null {
    const descs = ERA_DESC_SUFFIX.map((suffix, i) => {
        const key = `event.${eventKey}.desc.${suffix}`;
        const val = translations[lang]?.[key] ?? translations['en']?.[key];
        return val != null ? { label: ERA_LABELS_KO[i], text: val } : null;
    });
    if (descs.some((d) => d == null)) return null;
    return descs as { label: string; text: string }[];
}
