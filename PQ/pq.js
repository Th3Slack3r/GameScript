// ==UserScript==
// @name         PirateQuest Universal Bot
// @namespace    https://www.piratequest.org/
// @version      8.6
// @description  HitList + Trainer with 6 modes: SNUFF, PASSIVE, ATTACK, SEWER, PSYCHO, AFK. Top bar UI.
// @match        *://www.piratequest.org/index.php*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/Th3Slack3r/GameScript/refs/heads/main/PQ/pq.js
// @downloadURL  https://raw.githubusercontent.com/Th3Slack3r/GameScript/refs/heads/main/PQ/pq.js
// ==/UserScript==

(function () {
  "use strict";

  // Pages where the bot should NOT run (allows manual browsing)
  const EXCLUDED_PAGES = [
    "on=mailbox",
    "on=forum"
  ];

  // Exit early if on excluded page
  const currentPage = window.location.href;
  if (EXCLUDED_PAGES.some(page => currentPage.includes(page))) {
    console.log("PQ Bot: Excluded page, not running");
    return;
  }

  const SYNC_URL = "https://tsn.pw/pq/pq_sync_v2.php";
  const DB_KEY = "PQ_CAPTCHA_DB_V2";
  const LINK_KEY = "PQ_LINK_DB";
  const MAX_SAMPLES_PER_DIGIT = 100;
  const VALID_DIGITS = new Set(["0", "1", "2", "3", "4", "5"]);

  // --- SETTINGS SYSTEM ---
  const SETTINGS_KEY = "PQ_SETTINGS";
  const DEFAULT_SETTINGS = {
    // SNUFF
    snuff_snuffDelayMin: 2500, snuff_snuffDelayMax: 4500,
    snuff_assignDelayMin: 500, snuff_assignDelayMax: 1000,
    snuff_trainDelayMin: 4000, snuff_trainDelayMax: 7000,
    snuff_loopInterval: 5000,
    // PASSIVE
    passive_energyThreshold: 80,
    passive_reloadDelayMin: 5000, passive_reloadDelayMax: 10000,
    // ATTACK
    attack_targetsNeeded: 4,
    attack_onTargetMin: 8000, attack_onTargetMax: 13000,
    attack_betweenMin: 7000, attack_betweenMax: 12000,
    attack_trainDelayMin: 4000, attack_trainDelayMax: 7000,
    // SEWER
    sewer_hpThreshold: 40, sewer_energyThreshold: 5,
    sewer_snuffBuyThreshold: 30000,
    sewer_snuffCooldown: 10,
    sewer_goldThreshold: 50000,
    sewer_fightDelayMin: 8000, sewer_fightDelayMax: 13000,
    // PSYCHO
    psycho_maxLevel: 200, psycho_cooldownMin: 20,
    psycho_attackDelayMin: 5000, psycho_attackDelayMax: 8000,
    psycho_snuffEvery: 4,
    // AFK
    afk_subMode: "SNUFF",
    afk_minHours: 3,
    afk_maxHours: 5
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      return Object.assign({}, DEFAULT_SETTINGS, saved);
    } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }

  function saveSetting(key, value) {
    settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  let settings = loadSettings();

  const MODE_SETTINGS_CONFIG = {
    SNUFF: [
      { key: "snuff_snuffDelayMin", label: "Snuff Min (ms)", min: 100, max: 15000, step: 100 },
      { key: "snuff_snuffDelayMax", label: "Snuff Max (ms)", min: 100, max: 15000, step: 100 },
      { key: "snuff_assignDelayMin", label: "Assign Min (ms)", min: 100, max: 5000, step: 100 },
      { key: "snuff_assignDelayMax", label: "Assign Max (ms)", min: 100, max: 5000, step: 100 },
      { key: "snuff_trainDelayMin", label: "Train Min (ms)", min: 500, max: 30000, step: 500 },
      { key: "snuff_trainDelayMax", label: "Train Max (ms)", min: 500, max: 30000, step: 500 },
      { key: "snuff_loopInterval", label: "Loop Tick (ms)", min: 500, max: 30000, step: 500 }
    ],
    PASSIVE: [
      { key: "passive_energyThreshold", label: "Energy %", min: 10, max: 100, step: 5 },
      { key: "passive_reloadDelayMin", label: "Reload Min (ms)", min: 1000, max: 30000, step: 1000 },
      { key: "passive_reloadDelayMax", label: "Reload Max (ms)", min: 1000, max: 60000, step: 1000 }
    ],
    ATTACK: [
      { key: "attack_targetsNeeded", label: "Targets Needed", min: 1, max: 10, step: 1 },
      { key: "attack_onTargetMin", label: "On Target Min (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "attack_onTargetMax", label: "On Target Max (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "attack_betweenMin", label: "Between Min (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "attack_betweenMax", label: "Between Max (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "attack_trainDelayMin", label: "Train Min (ms)", min: 1000, max: 30000, step: 500 },
      { key: "attack_trainDelayMax", label: "Train Max (ms)", min: 1000, max: 30000, step: 500 }
    ],
    SEWER: [
      { key: "sewer_hpThreshold", label: "HP Threshold %", min: 5, max: 90, step: 5 },
      { key: "sewer_energyThreshold", label: "Energy Threshold %", min: 1, max: 50, step: 1 },
      { key: "sewer_snuffBuyThreshold", label: "Snuff Buy Gold", min: 5000, max: 200000, step: 5000 },
      { key: "sewer_snuffCooldown", label: "Snuff Check (min)", min: 1, max: 60, step: 1 },
      { key: "sewer_goldThreshold", label: "Deposit Gold", min: 10000, max: 500000, step: 5000 },
      { key: "sewer_fightDelayMin", label: "Fight Min (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "sewer_fightDelayMax", label: "Fight Max (ms)", min: 3000, max: 30000, step: 1000 }
    ],
    PSYCHO: [
      { key: "psycho_maxLevel", label: "Max Level", min: 10, max: 1000, step: 10 },
      { key: "psycho_cooldownMin", label: "Cooldown (min)", min: 1, max: 60, step: 1 },
      { key: "psycho_attackDelayMin", label: "Attack Min (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "psycho_attackDelayMax", label: "Attack Max (ms)", min: 3000, max: 30000, step: 1000 },
      { key: "psycho_snuffEvery", label: "Snuff Every N", min: 1, max: 10, step: 1 }
    ],
    AFK: [
      { key: "afk_subMode", label: "Run Mode", type: "select", options: ["SNUFF", "PASSIVE", "ATTACK", "SEWER", "PSYCHO"] },
      { key: "afk_minHours", label: "Min Hours", min: 0.5, max: 24, step: 0.5 },
      { key: "afk_maxHours", label: "Max Hours", min: 0.5, max: 24, step: 0.5 }
    ]
  };

  let handDb = JSON.parse(localStorage.getItem(DB_KEY) || "{}");
  // Migrate from old probability map format {counts,total} to new blob fingerprint format {digit_id: string}
  if (handDb && Object.keys(handDb).length > 0) {
    const firstVal = handDb[Object.keys(handDb)[0]];
    if (firstVal && typeof firstVal === 'object' && typeof firstVal.total === 'number') {
      console.log("DB Migration: Clearing old probability map format (" + Object.keys(handDb).length + " entries)");
      handDb = {};
      localStorage.setItem(DB_KEY, JSON.stringify(handDb));
    }
  }
  let linkDb = JSON.parse(localStorage.getItem(LINK_KEY) || "{}");
  let trainingActive = localStorage.getItem("PQ_BOT_RUNNING") === "true";
  let currentStat = localStorage.getItem("PQ_BOT_STAT") || "str";
  let trainingMode = localStorage.getItem("PQ_BOT_MODE") || "SNUFF";
  let inlineCapEditing = false;
  let lootValueHighlight = false;
  let userIsTyping = false;
  let waitingForResume = false;

  // Attack queue state - using individual keys to bypass SES sandbox JSON.parse bugs
  const ATTACK_COUNT_KEY = "PQ_ATTACK_COUNT";
  const ATTACK_INDEX_KEY = "PQ_ATTACK_INDEX";
  const ATTACK_URL_PREFIX = "PQ_ATTACK_";
  const TRAINING_URL = "https://www.piratequest.org/index.php?on=train";
  const SEWER_URL = "https://www.piratequest.org/index.php?on=attacknpc";
  const BANK_URL = "https://www.piratequest.org/index.php?on=myprofile";
  const SEWER_REFILL_KEY = "PQ_SEWER_REFILL"; // Flag: came from sewer to refill energy
  const SEWER_DEPOSIT_KEY = "PQ_SEWER_DEPOSIT"; // Flag: came from sewer to deposit gold
  const SEWER_BUY_SNUFF_KEY = "PQ_SEWER_BUY_SNUFF"; // Flag: went to market to buy snuff
  const SEWER_SNUFF_COOLDOWN_KEY = "PQ_SEWER_SNUFF_CD"; // Timestamp: next snuff check allowed
  const SEWER_NO_SNUFF_KEY = "PQ_SEWER_NO_SNUFF"; // Count: consecutive refill attempts with no snuff in inventory
  const MARKET_URL = "https://www.piratequest.org/index.php?on=item_market";

  // PSYCHO mode constants
  const PSYCHO_SEARCH_BASE = "https://www.piratequest.org/index.php?on=search&q=YTo5OntpOjA7czoxOiIzIjtzOjU6InZvdGVkIjtzOjE6IjMiO3M6ODoiZG9zZWFyY2giO3M6MToiMSI7czozOiJjaWQiO3M6MjoiMTAiO3M6MTE6ImV4Y2x1ZGVfb3duIjtzOjE6IjAiO3M6MzoiZ2lkIjtzOjE6IjAiO3M6NjoiYXR0YWNrIjtzOjE6IjEiO3M6MTQ6ImV4Y2x1ZGVfb25saW5lIjtzOjE6IjAiO3M6Njoic2VhcmNoIjtzOjE6IjEiO30=";
  const PSYCHO_PAGE_KEY = "PQ_PSYCHO_PAGE";
  const PSYCHO_INDEX_KEY = "PQ_PSYCHO_INDEX";
  const PSYCHO_ATTACKS_KEY = "PQ_PSYCHO_ATTACKS";
  const PSYCHO_NEED_SNUFF_KEY = "PQ_PSYCHO_NEED_SNUFF";
  const PSYCHO_SNUFF_DONE_KEY = "PQ_PSYCHO_SNUFF_DONE";
  const PSYCHO_FIRST_ATTACK_KEY = "PQ_PSYCHO_FIRST_ATTACK";
  const PSYCHO_CYCLE_DONE_KEY = "PQ_PSYCHO_CYCLE_DONE";
  const PSYCHO_SUPPORT_REFRESH_KEY = "PQ_PSYCHO_SUPPORT_REFRESH"; // timestamp of last support tab refresh

  // AFK mode constants
  const AFK_STATE_KEY = "PQ_AFK_STATE"; // JSON: { phase: "run"|"cooldown", endTime: ms, subMode: "SNUFF"|... }
  const AFK_NO_SNUFF_KEY = "PQ_AFK_NO_SNUFF"; // count of consecutive no-snuff ticks
  const AFK_NEXT_REFRESH_KEY = "PQ_AFK_NEXT_REFRESH"; // timestamp: when to do next anti-logout reload

  // Loot Manager constants
  const LOOT_KEY = "PQ_LOOT_DB";            // JSON object: { itemName: count }
  const LOOT_EVENTS_KEY = "PQ_LOOT_EVENTS"; // last seen event count (number)
  const LOOT_ACTIVE_KEY = "PQ_LOOT_ACTIVE"; // "true" when tracking is on

  // Item sell values (shop insta-sell price) — items with 0 sell value omitted
  const LOOT_SELL_VALUES = {
    "Thunder Strike Flintlock": 300000, "Double Barrel Flintlock": 1500000, "Emerald Flintlock": 3500000,
    "Broad Cutlass": 5000000, "Blunderbuss": 101000, "Banished Broadsword": 250000,
    "Heavy Crossbow": 100000, "Emerald Crossbow": 5000000, "Amethyst Broadsword": 3500000,
    "Wheel-Lock Pistol": 30000, "Sapphire Broadsword": 5000000, "Precision Flintlock Pistol": 200000,
    "Broadsword": 75000, "Flintlock Pistol": 20000, "Raven Claw Scimitar": 300000,
    "Mayan Sword": 1000000, "Dusagge": 150000, "Axe of Peril": 200000, "Platinum Cutlass": 9000,
    "Monkey Sword": 9000000, "Scimitar": 15000, "Dangling Hook": 250000, "Golden Cutlass": 7200,
    "Silver Cutlass": 5400, "Mayan Spear": 1000000, "Cutlass": 5000, "Cursed Raven": 5000,
    "Axe": 1500, "Hook Hand": 35000, "Emerald Hook Hand": 3500000, "Captains Parrot": 100,
    "Raven Corset": 300000, "Rapier": 20000, "Venom Armor": 250000, "Cursed Soul Corset": 250000,
    "Coconut Armor": 10000, "French Sabre": 5000000, "Tribal Dagger": 10000,
    "Giant Octopus Shield": 50000, "Assassin Dirk": 100000, "Bill Hook": 5000000,
    "Unstable Blackpowder Kit": 30000, "Marlinespike": 1000, "Tidal Armor": 200000,
    "Ring of Shadows": 12500000, "Shark Fin Bracers": 200000, "Peewee Warrior Mask": 30000,
    "Chain Shirt": 2000000, "Oak Dueling Pistol": 50, "Toucan": 100, "Pirates Hat": 550000,
    "Wood Sword": 800, "The turkey": 8000, "Dagger": 500, "Betrayer Helmet": 200000, "Club": 20,
    "Emerald Mayan Headdress": 5000000, "King Parrot": 100, "Old Captain Hat": 1000000,
    "Mutiny Hat": 250000, "Ruby Silk Mail": 5000000, "Insurgent Pants": 12500000,
    "Brittle Bones Parrot": 100, "Ruby Pirate Helm": 5000000, "Sapphire Pirate Helm": 3500000,
    "Amethyst Sea Buckler": 3500000, "Volcano Parrot": 100, "Amethyst Peg Leg": 5000000,
    "Doubloon Gold Coat": 12500000, "Temple Guard Parrot": 100, "Jeweled Mayan Headdress": 525000,
    "Love Bird": 100, "Berserker Bracers": 55000, "Ring of Fury": 2500000,
    "Cherry Humming Bird": 100, "Coconut Kiwi Bird": 100, "Pirate Earrings": 5000,
    "Black Siege Coat": 12500000, "Smuggler Parrot": 100, "Leather Armor": 12000,
    "Sunrise Lei": 10000, "Mambo Parrot": 100, "Tribal Necklace": 1000, "Island Lei": 10000,
    "Bamboo Armour": 75000, "Sparrow": 50, "Dodo Bird": 100, "Ring of Destiny": 25000,
    "Pocket Pistol": 10000, "Tattered Pirate Hat": 750, "Ring of Envy": 2500000,
    "Ring of Passion": 2500000, "Strange Snuff": 1000, "Poseidon's Tear": 10000,
    "Sour Serpent": 12000, "Snuff": 500, "Rum-soaked poultice (75%)": 500,
    "Royal Pineapple": 12000, "Powdered Poseidon Pearl": 100000, "Poultice (50%)": 300,
    "Captain's Helm": 40000, "Bufanda de la Cabeza": 1500000, "Bandanna of Vitality": 550000,
    "Bandanna of Vigor": 1000000, "TentacleToxin": 5000, "Bandanna of Bravery": 40000,
    "Tree Frog Venom": 9500, "Tiki Typhoon": 12000, "Watermelons": 1000, "Arsenic": 10000,
    "Donna Kiss": 20000, "Strychnine": 20000, "Blue Colonial Hat": 9000000,
    "PeeWee Brain Freeze": 12000, "Cocoa Idol": 6000, "Oranges": 1000,
    "Masterful Studded Leather": 500000, "Heart of the Ocean Corset": 150000,
    "Fire Serpent Armor": 150000, "Tiki Trophy": 500, "Amethyst": 100, "Blue Sea Shell": 1000,
    "Coral": 50, "Deadman's Coin": 500000, "Pirate Shirt": 25000, "Diamond": 50,
    "Fragment of skull": 1000, "Mayan Chocolate Chunk": 10, "Money Bag": 1000,
    "Money Chest": 4000, "Money Sack": 2000, "Ruby": 100, "Sapphire": 100,
    "Skeleton Keys": 100, "Skull of Fortune": 500, "The crocodile's teeth": 1000,
    "Emerald": 100, "Oriental Snuff": 1200, "Ring of Tides": 2500000,
    "Studded Pirate Leather": 50000, "Mystic Sea Water": 8000, "Mystic Fire Water": 8000,
    "Limes": 1000, "Lemons": 1000, "Laced Opium": 2500, "Koko Koffee": 12000,
    "Harsh Coffee": 3000, "Grapes": 1000, "Eels Blood": 8000, "Spider Silk Mail": 450000,
    "Davey Jones' Secret": 20000, "Coconut Stumbler": 12000, "Cocoa Strawberry": 50000,
    "Cherries": 1000, "Bootlegged Rum": 700, "Blue Hurricane": 12000, "Bandages (25%)": 150,
    "Supple Leather": 15000, "Navigator Parrot": 100, "The red shell": 1000,
    "Ludicrous Hat": 110000, "Wooden Snake Burning": 1000, "Wooden Octo Relief": 1000,
    "Wooden Neptune Relief": 1000, "Wooden Maiden Relief": 1000, "Wooden Gator Burning": 1000,
    "Wind Feather": 1000, "Vine Feather": 1000, "Sun Feather": 1000,
    "Wooden Turtle Burning": 1000, "Stormy Feather": 1000, "Stone Shark Carving": 1000,
    "Stone Monkey Carving": 2000, "Stone Knife Carving": 1000, "Stone Gun Carving": 1000,
    "Stone Diamond Carving": 1000, "Stone Cannon Carving": 1000, "Simple Torch": 250,
    "Stone Turtle Carving": 2000, "Shovel": 1750, "Marauder Parrot": 100, "Lookout Parrot": 100,
    "Admiral Parrot": 100, "Sunset Grass Skirt": 10000, "Piranha Pants": 12500000,
    "Paradise Pants": 20000, "Crocodile Pants": 5000000, "Ragged Coat": 10000,
    "Quartermaster Coat": 12500000, "First Mate's Coat": 50000, "Sea Breeze Feather": 1000,
    "Rainbow Feather": 1000, "Sealed Blackpowder Kit": 40000, "Royal Feather": 1000,
    "Privateer Pelican": 100, "Master Dry Blackpowder Kit": 60000, "Gilded Buckler": 50000,
    "Naval Protection 2": 5000, "Portsmouth Sea Gull": 100, "Naval Protection 1": 500,
    "Rumbolt": 25, "Phoenix Parrot": 100, "Worn Mayan Headpiece": 100000,
    "Tutti Frutti Hat": 40000, "Simian Hat": 10000, "Powdered Wig": 12500000,
    "Pirate Helm": 60000, "Pilgrim Hat": 750, "Firework": 12500000, "Basic Torch": 1500,
    "Sea Buckler": 40000, "Black Pearl": 3250, "Medium Loot Bag": 1600, "Lasting Torch": 6000,
    "Monkey Island Map": 1000, "Pearl": 2500, "Island Feather": 1000, "Fruit Feather": 1000,
    "Emerald Feather": 1, "Machete": 2000, "Lava Feather": 1000, "Coastal Feather": 1000,
    "Cloud Feather": 1000, "Cargo Feather": 1000, "Bone Feather": 1000, "Piece of 8": 1750,
    "Coconut Feather": 1000, "Sapphire Woodpecker": 1000000, "Mayan Armor": 525000,
    "Black Bart's Bombs": 200, "Breast Plate": 100000, "Shield": 1000, "Snow Ball Bombs": 200,
    "Grenade": 500, "Powder Flask": 100, "Exploding Coconut": 500, "Mesh Stone Grenade": 75,
    "Stinkpot": 30, "Hero Helm": 100000,
  };

  // Stats Tracker constants
  const STATS_TRACKER_KEY = "PQ_STATS_TRACKER"; // JSON: { baseline: {str, def, spd, snuff}, current: {...} }
  const STATS_ACTIVE_KEY = "PQ_STATS_ACTIVE";   // "true" when tracking is on
  const STAT_CAP_KEY = "PQ_STAT_CAP";           // JSON: { str?: number, def?: number, spd?: number }
  const EQUIP_BONUSES_KEY = "PQ_EQUIP_BONUSES"; // JSON: { str: number, def: number, spd: number }

  let captchaSubmitted = false; // true after Captcha_Submit called, false after we see captcha clear
  let localAttempts = 0;

  // Pending DB training - persisted to localStorage to survive page navigation (sewer mode reloads after captcha)
  const PENDING_TRAINING_KEY = "PQ_PENDING_TRAINING";
  // Load pending training from individual localStorage keys (avoids SES JSON.parse bugs)
  let pendingDbTraining = null;
  const pendingFlag = localStorage.getItem(PENDING_TRAINING_KEY);
  if (pendingFlag === "4") {
    // Reconstruct from individual keys
    pendingDbTraining = [];
    for (let i = 0; i < 4; i++) {
      const digit = localStorage.getItem(PENDING_TRAINING_KEY + "_D" + i);
      const pixelStr = localStorage.getItem(PENDING_TRAINING_KEY + "_P" + i);
      if (digit && pixelStr && pixelStr.length > 0) {
        pendingDbTraining.push({ digit, pixels: pixelStr });
      }
    }
    if (pendingDbTraining.length !== 4) {
      console.log("Pending training: incomplete data (" + pendingDbTraining.length + "/4), discarding");
      pendingDbTraining = null;
    }
  }

  // Clear pending keys helper
  function clearPendingTraining() {
    localStorage.removeItem(PENDING_TRAINING_KEY);
    for (let i = 0; i < 4; i++) {
      localStorage.removeItem(PENDING_TRAINING_KEY + "_D" + i);
      localStorage.removeItem(PENDING_TRAINING_KEY + "_P" + i);
    }
  }

  // Auto-apply pending training on page load
  // Check if captcha is present - if so, the previous answer was WRONG (page reloaded but captcha is back)
  if (pendingDbTraining) {
    const captchaOnLoad = document.querySelector('img[alt="Image Verification"]');
    if (captchaOnLoad) {
      // Captcha is showing on page load = previous answer was wrong, discard training data
      console.log("Page load: Captcha present - previous answer was WRONG, discarding training data");
      pendingDbTraining = null;
      clearPendingTraining();
    } else {
      // No captcha on page = previous answer was correct, train the DB
      console.log("Page load: No captcha - previous answer was CORRECT, training 4 digits");
      for (let i = 0; i < 4; i++) {
        const sample = pendingDbTraining[i];
        trainDigit(sample.digit, sample.pixels);
        console.log("Trained digit:", sample.digit, "pixels length:", sample.pixels.length);
      }
      localStorage.setItem(DB_KEY, JSON.stringify(handDb));
      console.log("DB saved. Total samples:", getDbTotalSamples(handDb));
      pendingDbTraining = null;
      clearPendingTraining();
    }
  } else {
    // No pending training = no captcha was solved last page
    if (pendingFlag) clearPendingTraining(); // clean up stale partial data
  }

  // --- LOOT CHECK (on page load — sewer reloads on each fight, so no polling needed) ---
  if (localStorage.getItem(LOOT_ACTIVE_KEY) === "true") {
    const evEl = document.querySelector("#headerevents b");
    const currentEvCount = evEl ? parseInt(evEl.textContent, 10) : NaN;
    const lastEvCount = parseInt(localStorage.getItem(LOOT_EVENTS_KEY) || "0", 10);
    if (!isNaN(currentEvCount) && currentEvCount > lastEvCount) {
      const itemEl = document.querySelector("#subbox1 > .event a.item_view");
      if (itemEl) {
        const itemName = itemEl.textContent.trim();
        let loot = {};
        try { loot = JSON.parse(localStorage.getItem(LOOT_KEY) || "{}"); } catch {}
        loot[itemName] = (loot[itemName] || 0) + 1;
        localStorage.setItem(LOOT_KEY, JSON.stringify(loot));
      }
    }
    if (!isNaN(currentEvCount)) localStorage.setItem(LOOT_EVENTS_KEY, String(currentEvCount));
  }

  function loadStatCaps() {
    try { return JSON.parse(localStorage.getItem(STAT_CAP_KEY) || "{}"); } catch { return {}; }
  }
  function saveStatCap(stat, value) {
    const caps = loadStatCaps();
    if (!value || isNaN(value) || value <= 0) delete caps[stat];
    else caps[stat] = Number(value);
    localStorage.setItem(STAT_CAP_KEY, JSON.stringify(caps));
  }

  // Equipment item database [str%, def%, spd%] — sourced from EquipmentCalculator.xlsx
  const EQUIP_DB = {
    // Weapons
    "French Sabre": [20, 8, 46], "Raven Claw Scimitar": [45, 22, 45], "Assassin Dirk": [19, 5, 45],
    "Monkey Sword": [35, 18, 42], "Precision Flintlock Pistol": [55, 0, 25], "Dusagge": [40, 33, 20],
    "Rapier": [25, 15, 20], "Emerald Crossbow": [58, 15, 15], "Thunder Strike Flintlock": [87, 22, 10],
    "Platinum Cutlass": [36, 15, 10], "Golden Cutlass": [34, 15, 10], "Silver Cutlass": [32, 15, 10],
    "Cutlass": [30, 15, 10], "Emerald Flintlock": [82, 10, 10], "Amethyst Broadsword": [55, 10, 10],
    "Flintlock Pistol": [50, 0, 10], "Broad Cutlass": [80, -20, 10], "Oak Dueling Pistol": [13, 7, 7],
    "Scimitar": [35, 10, 5], "Wheel-Lock Pistol": [55, 0, 5], "Banished Broadsword": [70, 15, 0],
    "Axe of Peril": [39, 13, 0], "Marlinespike": [15, 10, 0], "Axe": [27, 5, 0],
    "Broadsword": [55, 0, 0], "Sapphire Broadsword": [55, 0, 0], "Wood Sword": [11, 0, 0],
    "Club": [10, 0, 0], "Double Barrel Flintlock": [82, 1, -10], "Blunderbuss": [75, -11, -11],
    "Heavy Crossbow": [58, -10, -15],
    // Armor
    "Raven Corset": [25, 40, 25], "Heart of the Ocean Corset": [0, 25, 25], "Fire Serpent Armor": [0, 25, 25],
    "Mayan Armor": [-15, 70, 25], "Pirate Shirt": [0, 30, 20], "Venom Armor": [23, 38, 15],
    "Cursed Soul Corset": [23, 38, 15], "Coconut Armor": [20, 35, 15], "Tidal Armor": [15, 82, 15],
    "Ruby Silk Mail": [10, 95, 10], "Spider Silk Mail": [0, 95, 10], "Supple Leather": [0, 25, 0],
    "Bamboo Armour": [2, 50, -2], "Leather Armor": [4, 40, -5], "Masterful Studded Leather": [0, 100, -10],
    "Studded Pirate Leather": [0, 50, -10], "Breast Plate": [-5, 80, -10], "Chain Shirt": [15, 95, -30],
    // Head
    "Peewee Warrior Mask": [15, 15, 15], "Emerald Mayan Headdress": [10, 10, 10], "Mutiny Hat": [10, 0, 10],
    "Ruby Pirate Helm": [8, 7, 7], "Old Captain Hat": [10, 10, 5], "Jeweled Mayan Headdress": [6, -5, 5],
    "Tutti Frutti Hat": [0, 10, 5], "Tattered Pirate Hat": [1, 1, 2], "Pirates Hat": [12, 10, 0],
    "Betrayer Helmet": [10, 10, 0], "Sapphire Pirate Helm": [8, 0, 0], "Captain's Helm": [0, 0, 0],
    "Pirate Helm": [0, 0, 0], "Bandanna of Bravery": [0, 0, 0], "Bandanna of Vigor": [0, 0, 0],
    "Bandanna of Vitality": [0, 0, 0], "Bufanda de la Cabeza": [0, 0, 0], "Worn Mayan Headpiece": [0, 0, 0],
    "Bandanna of Rage": [0, 0, 0], "Simian Hat": [0, 0, 0], "Hat of the lost souls": [0, 0, 0],
    "Powdered Wig": [0, 0, 0], "Blue Colonial Hat": [0, 0, 0], "Pilgrim Hat": [0, 0, 0],
    "Ludicrous Hat": [0, -10, 0], "Hero Helm": [-1, -1, -5],
    // Offhand
    "Mayan Spear": [30, -25, 35], "Pocket Pistol": [1, -10, 30], "Hook Hand": [25, 0, 20],
    "Unstable Blackpowder Kit": [15, 0, 0], "Sealed Blackpowder Kit": [0, 0, 0],
    "Master Dry Blackpowder Kit": [0, 0, 0], "Dagger": [10, 5, 5], "Berserker Bracers": [5, 10, 25],
    "Tribal Dagger": [20, 12, 12], "Shark Fin Bracers": [15, 15, 30], "Emerald Hook Hand": [25, 15, 20],
    "Dangling Hook": [35, 20, 30], "Giant Octopus Shield": [20, 20, 10], "Shield": [-5, 20, -5],
    "Bill Hook": [15, 25, 5], "Amethyst Sea Buckler": [8, 30, 10], "Sea Buckler": [0, 30, 0],
    "Mayan Sword": [40, 40, -10], "Gilded Buckler": [0, 42, -10],
    // Boots
    "Black Leather Pirate Boots": [-10, 0, 15], "Black Pirate Boot": [-10, 20, 10], "Pirate Shoes": [0, 0, 9],
    "Amethyst Peg Leg": [7, 5, 5], "Brown Pirate boot": [5, 0, 3], "Hammered Shoes": [0, 0, 2],
    "Boot of the lost souls": [0, 0, 0], "Peg leg & boot": [7, -5, -10],
    // Coats
    "Doubloon Gold Coat": [7, 7, 6], "Black Siege Coat": [5, 6, 6], "First Mate's Coat": [0, 0, 0],
    "Ragged Coat": [0, 0, 0], "Fancy First Mate's Coat": [0, 0, 0], "Deck Hand's Coat": [0, 0, 0],
    "Captains Coat": [0, 0, 0], "Coat of the lost souls": [0, 0, 0], "Quartermaster Coat": [0, 0, 0],
    // Pants
    "Insurgent Pants": [9, 7, 7], "Sunset Grass Skirt": [0, 7, 7], "Crocodile Pants": [0, 5, 5],
    "Pirate pants": [0, 6, 0], "Paradise Pants": [0, 0, 0], "Piranha Pants": [0, 0, 0],
    "Dirty Pants": [0, 2, -1], "Tropical pirate pants": [7, 0, -5],
    // Accessories
    "Cursed Raven": [28, 15, 14], "Marauder Parrot": [0, 11, 11], "Ring of Shadows": [15, 10, 10],
    "King Parrot": [10, 10, 10], "Volcano Parrot": [7, 7, 7], "Cherry Humming Bird": [5, 0, 6],
    "Love Bird": [6, 5, 5], "Pirate Earrings": [5, 0, 5], "Smuggler Parrot": [5, 5, 5],
    "Ring of Passion": [1, 1, 5], "Pirate pipe": [0, 0, 5], "Mambo Parrot": [3, 3, 3],
    "Tribal Necklace": [3, 5, 3], "Sunrise Lei": [3, 0, 2], "Dodo Bird": [2, 2, 2],
    "Ring of Fury": [5, 1, 1], "Ring of Destiny": [2, 1, 1], "Sparrow": [2, 1, 1],
    "Ring of Envy": [1, 5, 1], "Captains Parrot": [25, 0, 0], "Toucan": [12, 0, 0],
    "Temple Guard Parrot": [6, 7, 0], "Coconut Kiwi Bird": [5, 0, 0], "Island Lei": [3, 2, 0],
    "Weak Eye Patch": [0, 0, 0], "Scope": [0, 0, 0], "Bandana of the lost souls": [0, 0, 0],
    "Earrings of the lost souls": [0, 0, 0], "All Seeing Eye patch": [0, 0, 0],
    "Navigator Parrot": [0, 0, 0], "Lookout Parrot": [0, 0, 0], "Privateer Pelican": [0, 0, 0],
    "Portsmouth Sea Gull": [0, 0, 0], "Tiki Trophy": [0, 0, 0], "Ring of Tides": [0, 0, 0],
    "Admiral Parrot": [0, 0, 0], "Phoenix Parrot": [0, 0, 0], "Brittle Bones Parrot": [8, -5, -5],
    "The sapphire genius": [-15, -10, -10],
  };

  // Edibles database [str%, def%, spd%] — for optional preview boost
  const EDIBLES_DB = {
    "None": [0, 0, 0],
    "Tiki Power": [100, 100, 100], "Sour snake": [62, -20, 55], "The Secret of David Jones": [60, -20, 50],
    "Opium": [30, 40, -20], "Tentacle toxins": [30, 30, 30], "Tiki Typhoon": [24, 23, -3],
    "Coconut blow": [24, 23, 45], "Royal Pineapple": [23, 23, -3], "Rum": [20, 20, -10],
    "PeeWee Brain stiffness": [20, 20, 20], "Coco Coffee": [18, 55, 65], "The tear of Poseidon": [15, 15, 15],
    "Poseidon Pearl Powder": [10, 10, 65], "Cocoa Idol": [10, 50, 65], "Blue Whirlwind": [10, 0, 30],
    "Gobbler": [10, 15, -5], "Captain Jack's Drinker": [5, 1, -2], "Captain's Beer": [2, -2, 0],
    "Coffee": [0, 0, 18], "Chocolate Strawberry": [0, 0, 70], "Oriental Trench": [-6, -6, 6],
    "Snuff": [-8, -8, 5], "Strange Gunpowder": [-10, 0, 20], "Tiki Tonic": [-10, -2, 2],
  };

  function runEquipmentCalc() {
    const equipedDiv = document.getElementById("equiped");
    if (!equipedDiv) return;

    // Parse all equipped item names from the page
    const items = [];
    equipedDiv.querySelectorAll(".box").forEach(box => {
      const slot = box.querySelector("h3")?.textContent.trim() || "?";
      const name = box.querySelector(".item_view")?.textContent.trim() || "";
      const stats = EQUIP_DB[name] || null;
      items.push({ slot, name, stats });
    });

    // Sum gear bonuses
    let totalStr = 0, totalDef = 0, totalSpd = 0;
    items.forEach(({ stats }) => {
      if (stats) { totalStr += stats[0]; totalDef += stats[1]; totalSpd += stats[2]; }
    });

    // Save gear bonuses to localStorage (edible not included in saved value)
    localStorage.setItem(EQUIP_BONUSES_KEY, JSON.stringify({ str: totalStr, def: totalDef, spd: totalSpd }));

    // Build or replace the calc div
    let calcDiv = document.getElementById("pq-equip-calc");
    if (!calcDiv) {
      calcDiv = document.createElement("div");
      calcDiv.id = "pq-equip-calc";
      const h1 = equipedDiv.querySelector("h1");
      if (h1) h1.insertAdjacentElement("afterend", calcDiv);
      else equipedDiv.prepend(calcDiv);
    }

    const fmtPct = n => (n > 0 ? `<span style="color:#00ff00">+${n}%</span>` : n < 0 ? `<span style="color:#ff4444">${n}%</span>` : `<span style="color:#888">0%</span>`);
    const thStyle = `padding:4px 8px; text-align:left; color:#aaa; border-bottom:1px solid #333; font-size:11px;`;
    const tdStyle = `padding:3px 8px; font-size:11px; font-family:monospace;`;
    const tdNum = `padding:3px 8px; font-size:11px; font-family:monospace; text-align:right;`;

    // Edibles dropdown options
    const edibleOpts = Object.keys(EDIBLES_DB).map(name =>
      `<option value="${name}">${name}</option>`
    ).join("");

    let rows = items.map(({ slot, name, stats }) => {
      const s = stats || [0, 0, 0];
      const unkn = !stats && name ? `<span style="color:#ff9900" title="Not in database">?</span>` : "";
      return `<tr>
        <td style="${tdStyle}color:#aaa;">${slot}</td>
        <td style="${tdStyle}color:#fff;">${name || "-"}${unkn}</td>
        <td style="${tdNum}">${fmtPct(s[0])}</td>
        <td style="${tdNum}">${fmtPct(s[1])}</td>
        <td style="${tdNum}">${fmtPct(s[2])}</td>
      </tr>`;
    }).join("");

    calcDiv.style.cssText = `background:#111; border:1px solid #333; border-radius:4px; padding:10px; margin:8px 0 12px; font-family:monospace;`;
    calcDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px; flex-wrap:wrap;">
        <b style="color:#00ccff; font-size:13px;">Equipment Bonuses</b>
        <span style="color:#aaa; font-size:11px;">Edible:
          <select id="pq-edible-sel" style="background:#222; color:#ffff00; border:1px solid #444; font-family:monospace; font-size:11px; margin-left:4px;">${edibleOpts}</select>
        </span>
        <span style="font-size:11px; color:#aaa;">
          Total (gear): STR <b id="pq-ec-str">${fmtPct(totalStr)}</b>&nbsp;
          DEF <b id="pq-ec-def">${fmtPct(totalDef)}</b>&nbsp;
          SPD <b id="pq-ec-spd">${fmtPct(totalSpd)}</b>
        </span>
        <span style="font-size:11px; color:#aaa; display:none;" id="pq-ec-edible-row">
          +Edible: STR <b id="pq-ec-estr"></b>&nbsp;DEF <b id="pq-ec-edef"></b>&nbsp;SPD <b id="pq-ec-espd"></b>&nbsp;
          → Total: STR <b id="pq-ec-tstr"></b>&nbsp;DEF <b id="pq-ec-tdef"></b>&nbsp;SPD <b id="pq-ec-tspd"></b>
        </span>
      </div>
      <table style="border-collapse:collapse; width:100%;">
        <thead><tr>
          <th style="${thStyle}">Slot</th><th style="${thStyle}">Item</th>
          <th style="${thStyle}text-align:right;">STR</th>
          <th style="${thStyle}text-align:right;">DEF</th>
          <th style="${thStyle}text-align:right;">SPD</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border-top:2px solid #444;">
          <td style="${tdStyle}color:#aaa;" colspan="2"><b>Gear Total</b></td>
          <td style="${tdNum}"><b>${fmtPct(totalStr)}</b></td>
          <td style="${tdNum}"><b>${fmtPct(totalDef)}</b></td>
          <td style="${tdNum}"><b>${fmtPct(totalSpd)}</b></td>
        </tr></tfoot>
      </table>
    `;

    // Edible dropdown handler
    document.getElementById("pq-edible-sel").onchange = function() {
      const ed = EDIBLES_DB[this.value] || [0, 0, 0];
      const edibleRow = document.getElementById("pq-ec-edible-row");
      if (this.value === "None" || (ed[0] === 0 && ed[1] === 0 && ed[2] === 0)) {
        edibleRow.style.display = "none";
      } else {
        edibleRow.style.display = "inline";
        document.getElementById("pq-ec-estr").innerHTML = fmtPct(ed[0]);
        document.getElementById("pq-ec-edef").innerHTML = fmtPct(ed[1]);
        document.getElementById("pq-ec-espd").innerHTML = fmtPct(ed[2]);
        document.getElementById("pq-ec-tstr").innerHTML = fmtPct(totalStr + ed[0]);
        document.getElementById("pq-ec-tdef").innerHTML = fmtPct(totalDef + ed[1]);
        document.getElementById("pq-ec-tspd").innerHTML = fmtPct(totalSpd + ed[2]);
      }
    };
  }

  function runInventoryCalc() {
    const swapspace = document.getElementById("swapspace");
    const container = document.getElementById("inventory-container");
    if (!swapspace || !container) return;

    const fmtGold = n => "$" + n.toLocaleString();

    // Parse all items in inventory regardless of currently visible category
    let totalValue = 0;
    let knownCount = 0, unknownCount = 0;
    const byCategory = {};  // category h2 text → { value, items: [{name, qty, unitVal}] }
    let currentCat = "Misc";

    for (const node of swapspace.querySelectorAll("h2, .box")) {
      if (node.tagName === "H2") {
        currentCat = node.textContent.trim();
        continue;
      }
      // .box item
      const nameEl = node.querySelector(".item_view");
      if (!nameEl) continue;
      const name = nameEl.textContent.trim();

      // Quantity is in [xN] text node right after the </b> that wraps the link
      let qty = 1;
      const boldEl = nameEl.closest("b") || nameEl.parentElement;
      if (boldEl) {
        const next = boldEl.nextSibling;
        if (next && next.nodeType === 3) {
          const m = next.textContent.match(/\[x([\d,]+)\]/);
          if (m) qty = parseInt(m[1].replace(/,/g, ""), 10);
        }
      }

      const unitVal = LOOT_SELL_VALUES[name] || 0;
      const rowTotal = unitVal * qty;
      if (unitVal > 0) {
        totalValue += rowTotal;
        knownCount++;
      } else {
        unknownCount++;
      }

      if (!byCategory[currentCat]) byCategory[currentCat] = { value: 0, items: [] };
      byCategory[currentCat].value += rowTotal;
      byCategory[currentCat].items.push({ name, qty, unitVal, rowTotal });

      // Inject Auto Sell checkbox under the price, skip if already injected
      if (!node.querySelector(".pq-autosell-wrap")) {
        const storageKey = `PQ_AUTOSELL_NAME_${name}`;
        const checked = localStorage.getItem(storageKey) === "true";

        const wrap = document.createElement("div");
        wrap.className = "pq-autosell-wrap";
        wrap.style.cssText = "margin:4px 0 2px; font-size:11px; font-family:monospace;";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = checked;
        cb.style.cssText = "cursor:pointer; vertical-align:middle; margin-right:4px;";
        cb.addEventListener("change", () => {
          localStorage.setItem(storageKey, cb.checked ? "true" : "false");
        });

        const lbl = document.createElement("label");
        lbl.style.cssText = "cursor:pointer; color:#ff9900; vertical-align:middle;";
        lbl.textContent = "Auto Sell";
        lbl.prepend(cb);
        wrap.appendChild(lbl);

        const priceEl = node.querySelector(".price");
        if (priceEl) priceEl.after(wrap);
        else node.appendChild(wrap);
      }
    }

    // Build or replace summary div
    let invDiv = document.getElementById("pq-inv-calc");
    if (!invDiv) {
      invDiv = document.createElement("div");
      invDiv.id = "pq-inv-calc";
      // Insert before #swapspace
      container.insertBefore(invDiv, swapspace);
    }

    // Build category breakdown rows (collapsed by default)
    const catRows = Object.entries(byCategory)
      .filter(([, d]) => d.value > 0)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([cat, d]) => `
        <tr>
          <td style="padding:2px 8px; color:#aaa; font-size:11px;">${cat}</td>
          <td style="padding:2px 8px; color:#ffff00; font-size:11px; text-align:right; font-family:monospace;">${fmtGold(d.value)}</td>
          <td style="padding:2px 8px; color:#888; font-size:10px; text-align:right;">${d.items.filter(i => i.unitVal > 0).length} items</td>
        </tr>`).join("");

    invDiv.style.cssText = `background:#111; border:1px solid #333; border-radius:4px; padding:10px; margin:8px 0 12px; font-family:monospace;`;
    invDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <b style="color:#00ccff; font-size:13px;">Inventory Value</b>
        <span style="color:#ffff00; font-size:14px; font-weight:bold;">${fmtGold(totalValue)}</span>
        <span style="color:#888; font-size:10px;">${knownCount} priced · ${unknownCount} unpriced</span>
        <button id="pq-autosell-btn" style="background:#222; color:#ff9900; border:1px solid #ff9900; cursor:pointer; font-family:monospace; font-size:10px; padding:2px 8px; margin-left:auto;">Auto Sell</button>
        <button id="pq-inv-toggle" style="background:#222; color:#aaa; border:1px solid #444; cursor:pointer; font-family:monospace; font-size:10px; padding:2px 8px;">▶ breakdown</button>
      </div>
      <div id="pq-inv-breakdown" style="display:none; margin-top:8px;">
        <table style="border-collapse:collapse; width:100%;">
          <thead><tr>
            <th style="padding:3px 8px; text-align:left; color:#666; font-size:10px; border-bottom:1px solid #222;">Category</th>
            <th style="padding:3px 8px; text-align:right; color:#666; font-size:10px; border-bottom:1px solid #222;">Value</th>
            <th style="padding:3px 8px; text-align:right; color:#666; font-size:10px; border-bottom:1px solid #222;"></th>
          </tr></thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>
    `;

    document.getElementById("pq-inv-toggle").onclick = function() {
      const bd = document.getElementById("pq-inv-breakdown");
      const expanded = bd.style.display !== "none";
      bd.style.display = expanded ? "none" : "block";
      this.textContent = expanded ? "▶ breakdown" : "▼ breakdown";
    };

    document.getElementById("pq-autosell-btn").onclick = () => {
      const queue = [];
      swapspace.querySelectorAll(".box").forEach(box => {
        const cb = box.querySelector(".pq-autosell-wrap input[type='checkbox']");
        if (!cb || !cb.checked) return;
        const sellLink = box.querySelector('a[href*="action=sell"]');
        if (!sellLink) return;
        let href = sellLink.getAttribute("href");
        if (!href.startsWith("http")) href = "https://www.piratequest.org/" + href;
        queue.push(href);
      });
      if (queue.length === 0) {
        document.getElementById("msg").textContent = "No items checked for Auto Sell.";
        return;
      }
      // Clear any stale state from previous runs before starting fresh
      localStorage.removeItem("PQ_AUTOSELL_SOLD");
      // Store individual keys to bypass SES sandbox JSON.parse bugs
      for (let i = 0; i < queue.length; i++) localStorage.setItem("PQ_AUTOSELL_" + i, queue[i]);
      localStorage.setItem("PQ_AUTOSELL_COUNT", queue.length.toString());
      localStorage.setItem("PQ_AUTOSELL_ACTIVE", "true");
      window.location.href = queue[0];
    };
  }

  function readCurrentStats() {
    const parseVal = t => parseFloat((t || "0").replace(/,/g, "")) || 0;
    const str = parseVal(document.getElementById("str_stat")?.textContent);
    const def = parseVal(document.getElementById("def_stat")?.textContent);
    const spd = parseVal(document.getElementById("spd_stat")?.textContent);
    let snuff = 0;
    const itemSel = document.getElementById("itemID");
    if (itemSel) {
      for (const opt of itemSel.options) {
        if (opt.text.toLowerCase().includes("snuff")) {
          const m = opt.text.match(/x(\d+)/);
          if (m) snuff += parseInt(m[1]);
        }
      }
    }
    return { str, def, spd, snuff };
  }

  // --- STATS CHECK (on page load, on training page) ---
  if (localStorage.getItem(STATS_ACTIVE_KEY) === "true" && window.location.href.includes("on=train")) {
    const statsNow = readCurrentStats();
    let statsTracker = {};
    try { statsTracker = JSON.parse(localStorage.getItem(STATS_TRACKER_KEY) || "{}"); } catch {}
    statsTracker.current = statsNow;
    if (!statsTracker.baseline) statsTracker.baseline = { ...statsNow };
    localStorage.setItem(STATS_TRACKER_KEY, JSON.stringify(statsTracker));
  }

  // --- HUD SETUP (hidden ghost container for backward-compat IDs) ---
  const statusDiv = document.createElement("div");
  statusDiv.style.display = "none";
  statusDiv.innerHTML = `
    <span id="mode-ui"></span>
    <span id="pwr"></span>
    <span id="stat-name"></span>
    <span id="energy-pct">0%</span>
    <span id="hp-pct">-</span>
    <span id="gold-amt">$0</span>
    <span id="db-count">0</span>
    <span id="msg"></span>
    <button id="start-stop-btn">START</button>
    <button id="add-link-btn">TARGET</button>
    <button id="tools-btn">TOOLS</button>
    <button id="cfg-btn">CFG</button>
  `;
  document.body.appendChild(statusDiv);

  // --- TOOLS PANEL ---
  const toolsDiv = document.createElement("div");
  Object.assign(toolsDiv.style, {
    position: "fixed",
    top: "60px",
    right: "20px",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#00ff00",
    borderRadius: "10px",
    zIndex: "99998",
    fontSize: "11px",
    fontFamily: "monospace",
    border: "2px solid #555",
    display: "none"
  });
  document.body.appendChild(toolsDiv);

  function positionToolsPanel() {
    positionFloatingPanel(toolsDiv);
    toolsDiv.style.boxSizing = "border-box";
  }

  function renderToolsPanel() {
    const btnStyle = `width:100%; background:#333; color:#00ff00; border:1px solid #444; cursor:pointer; font-family:monospace; font-size:11px; padding:5px; margin:3px 0; text-align:left;`;
    const lootActive = localStorage.getItem(LOOT_ACTIVE_KEY) === "true";
    const lootVisible = lootDiv.style.display !== "none";
    toolsDiv.innerHTML = `
      <div style="text-align:center; border-bottom:1px solid #333; margin-bottom:8px; padding-bottom:4px;"><b>Tools</b></div>
      <button id="tool-sync" style="${btnStyle}">Sync Database</button>
      <button id="tool-export" style="${btnStyle}">Export Database</button>
      <button id="tool-import" style="${btnStyle}">Import Database</button>
      <button id="tool-loot" style="${btnStyle}${lootVisible ? " color:#ffff00;" : ""}">Loot Manager${lootActive ? " [ON]" : ""}</button>
      <button id="tool-equip-calc" style="${btnStyle}">Equipment Calculator</button>
    `;
    document.getElementById("tool-sync").onclick = () => {
      syncCloud();
      document.getElementById("tool-sync").textContent = "Syncing...";
      setTimeout(() => { if (document.getElementById("tool-sync")) document.getElementById("tool-sync").textContent = "Sync Database"; }, 3000);
    };
    document.getElementById("tool-export").onclick = () => {
      exportDatabase();
      document.getElementById("tool-export").textContent = "Exported!";
      setTimeout(() => { if (document.getElementById("tool-export")) document.getElementById("tool-export").textContent = "Export Database"; }, 2000);
    };
    document.getElementById("tool-import").onclick = () => {
      importDatabase();
    };
    document.getElementById("tool-loot").onclick = () => {
      if (lootDiv.style.display === "none") {
        renderLootHud();
        lootDiv.style.display = "block";
      } else {
        lootDiv.style.display = "none";
      }
      renderToolsPanel(); // refresh button highlight
    };
    document.getElementById("tool-equip-calc").onclick = () => {
      window.location.href = "index.php?on=inventory";
    };
  }

  document.getElementById("tools-btn").onclick = () => {
    if (toolsDiv.style.display === "none") {
      settingsDiv.style.display = "none";
      positionToolsPanel();
      renderToolsPanel();
      toolsDiv.style.display = "block";
    } else {
      toolsDiv.style.display = "none";
    }
  };

  // --- SETTINGS PANEL ---
  const settingsDiv = document.createElement("div");
  Object.assign(settingsDiv.style, {
    position: "fixed",
    top: "60px",
    right: "20px",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#00ff00",
    borderRadius: "10px",
    zIndex: "99998",
    fontSize: "11px",
    fontFamily: "monospace",
    border: "2px solid #555",
    display: "none",
    maxWidth: "260px"
  });
  document.body.appendChild(settingsDiv);

  // --- HITLIST PANEL ---
  const hitlistDiv = document.createElement("div");
  Object.assign(hitlistDiv.style, {
    position: "fixed",
    top: "60px",
    right: "20px",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#00ff00",
    borderRadius: "10px",
    zIndex: "99998",
    fontSize: "11px",
    fontFamily: "monospace",
    border: "2px solid #555",
    display: "none",
    minWidth: "180px",
    maxWidth: "280px",
  });
  hitlistDiv.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; margin-bottom:5px; padding-bottom:4px;">
      <b>Hit List</b>
      <button id="pq-hl-target" style="background:#1a1a1a; color:#00ff00; border:1px solid #00ff00; cursor:pointer; font-family:monospace; font-size:10px; padding:1px 6px; border-radius:3px;">TARGET</button>
    </div>
    <div id="link-area" style="color:cyan; font-size:10px; max-height:200px; overflow-y:auto;"></div>
  `;
  document.body.appendChild(hitlistDiv);

  function positionFloatingPanel(panel) {
    const topBar = document.getElementById("toptopmeniu");
    if (!topBar) { panel.style.top = "60px"; panel.style.right = "20px"; return; }
    const rect = topBar.getBoundingClientRect();
    panel.style.top = (rect.bottom + 5) + "px";
    panel.style.right = "20px";
  }

  function positionSettingsPanel() {
    positionFloatingPanel(settingsDiv);
  }

  function renderTopBar() {
    const tbStart = document.getElementById("pq-tb-start");
    if (tbStart) {
      tbStart.textContent = trainingActive ? "STOP" : "START";
      tbStart.style.color = trainingActive ? "#ff4444" : "#00ff00";
      tbStart.style.borderColor = trainingActive ? "#ff4444" : "#00ff00";
    }
  }

  function injectTopBar() {
    const topBar = document.getElementById("toptopmeniu");
    if (!topBar || document.getElementById("pq-top-controls")) return;

    topBar.style.position = "relative";

    const btnCss = `display:inline-block; background:#1a1a1a; color:#00ff00; border:1px solid #00ff00; cursor:pointer; font-family:monospace; font-size:10px; padding:1px 6px; border-radius:3px; margin-right:3px; vertical-align:middle;`;



    // Label + Buttons
    const labelEl = document.createElement("span");
    labelEl.id = "pq-top-controls";
    labelEl.style.cssText = "position:absolute; right:5px; top:50%; transform:translateY(-50%); white-space:nowrap; z-index:1000; font-family:monospace; font-size:10px;";
    labelEl.innerHTML = `<b style="color:#00ff00;">PQ Bot v8.6</b>
          <button id="pq-tb-start" style="${btnCss}">START</button>
          <button id="pq-tb-list" style="${btnCss}">Hit List</button>
          <button id="pq-tb-tools" style="${btnCss}">TOOLS</button>
          <button id="pq-tb-cfg" style="${btnCss}">CFG</button>
        `;

    topBar.appendChild(labelEl);

    // Inject status msg into #onlinebar
    const onlineBar = document.getElementById("onlinebar");
    if (onlineBar) {
      const msgEl = document.createElement("span");
      msgEl.id = "msg";
      msgEl.style.cssText = "color:#000000; font-family:monospace; font-size:11px; white-space:nowrap;";
      onlineBar.appendChild(msgEl);
      // Remove the hidden ghost #msg so the visible one is used
      const ghostMsg = statusDiv.querySelector("#msg");
      if (ghostMsg) ghostMsg.remove();
      // Center msg within the bar using fixed positioning once layout is known
      requestAnimationFrame(() => {
        const rect = onlineBar.getBoundingClientRect();
        if (rect.width > 0) {
          msgEl.style.cssText = "position:fixed; left:50%; transform:translateX(-50%); top:" + (rect.top + rect.height / 2 - 7) + "px; color:#000000; font-family:monospace; font-size:11px; white-space:nowrap; pointer-events:none; z-index:9999;";
        }
      });
    }

    document.getElementById("pq-tb-start").onclick = () => document.getElementById("start-stop-btn").click();
    document.getElementById("pq-hl-target").onclick = () => document.getElementById("add-link-btn").click();
    document.getElementById("pq-tb-tools").onclick = () => {
      if (toolsDiv.style.display === "none") {
        settingsDiv.style.display = "none";
        hitlistDiv.style.display = "none";
        positionToolsPanel();
        renderToolsPanel();
        toolsDiv.style.display = "block";
      } else {
        toolsDiv.style.display = "none";
      }
    };
    document.getElementById("pq-tb-cfg").onclick = () => {
      if (settingsDiv.style.display === "none") {
        toolsDiv.style.display = "none";
        hitlistDiv.style.display = "none";
        positionSettingsPanel();
        renderSettingsPanel();
        settingsDiv.style.display = "block";
      } else {
        settingsDiv.style.display = "none";
      }
    };
    document.getElementById("pq-tb-list").onclick = () => {
      if (hitlistDiv.style.display === "none") {
        toolsDiv.style.display = "none";
        settingsDiv.style.display = "none";
        positionFloatingPanel(hitlistDiv);
        hitlistDiv.style.display = "block";
      } else {
        hitlistDiv.style.display = "none";
      }
    };

    renderTopBar();
  }

  function renderSettingsPanel() {
    const config = MODE_SETTINGS_CONFIG[trainingMode] || [];
    const selectStyle = `background:#222; color:#00ff00; border:1px solid #444; font-family:monospace; font-size:11px; padding:1px 3px;`;
    const rowStyle = `display:flex; justify-content:space-between; align-items:center; margin:3px 0;`;
    const labelStyle = `color:#aaa; font-size:10px;`;

    let html = `<div style="text-align:center; border-bottom:1px solid #333; margin-bottom:6px; padding-bottom:4px;"><b>Settings</b></div>`;

    // Mode dropdown
    html += `<div style="${rowStyle}"><span style="${labelStyle}">Mode</span>`;
    html += `<select id="cfg-mode-select" style="${selectStyle}">`;
    for (const m of ["SNUFF","PASSIVE","ATTACK","SEWER","PSYCHO","AFK"]) {
      html += `<option value="${m}"${trainingMode === m ? " selected" : ""}>${m}</option>`;
    }
    html += `</select></div>`;

    // Stat dropdown
    html += `<div style="${rowStyle}"><span style="${labelStyle}">Stat</span>`;
    html += `<select id="cfg-stat-select" style="${selectStyle}">`;
    for (const [val, label] of [["str","STR"],["def","DEF"],["spd","SPD"],["even","EVEN"],["none","NONE"]]) {
      html += `<option value="${val}"${currentStat === val ? " selected" : ""}>${label}</option>`;
    }
    html += `</select></div>`;

    // Mode-specific settings
    if (config.length > 0) {
      html += `<div style="border-top:1px solid #333; margin:6px 0 4px; padding-top:4px; text-align:center; color:#666; font-size:9px;">${trainingMode} SETTINGS</div>`;
      for (const item of config) {
        const val = settings[item.key];
        html += `<div style="${rowStyle}">`;
        html += `<span style="${labelStyle}">${item.label}</span>`;
        if (item.type === "select") {
          html += `<select data-key="${item.key}" style="${selectStyle}">`;
          for (const opt of item.options) {
            html += `<option value="${opt}"${val === opt ? " selected" : ""}>${opt}</option>`;
          }
          html += `</select>`;
        } else {
          html += `<input type="number" data-key="${item.key}" value="${val}" min="${item.min}" max="${item.max}" step="${item.step}" style="width:65px; ${selectStyle} text-align:right;">`;
        }
        html += `</div>`;
      }
    }

    html += `<div style="margin-top:6px; display:flex; gap:5px;">`;
    html += `<button id="settings-reset" style="flex:1; background:#333; color:#ff4444; border:1px solid #ff4444; cursor:pointer; font-size:10px;">RESET</button>`;
    html += `</div>`;
    settingsDiv.innerHTML = html;

    // Mode dropdown handler
    const modeSelect = document.getElementById("cfg-mode-select");
    if (modeSelect) {
      modeSelect.addEventListener('change', () => {
        const newMode = modeSelect.value;
        localStorage.removeItem(AFK_STATE_KEY);
        trainingMode = newMode;
        localStorage.setItem("PQ_BOT_MODE", newMode);
        settings = loadSettings();
        updateHUD();
        renderSettingsPanel();
      });
    }

    // Stat dropdown handler
    const statSelect = document.getElementById("cfg-stat-select");
    if (statSelect) {
      statSelect.addEventListener('change', () => {
        currentStat = statSelect.value;
        localStorage.setItem("PQ_BOT_STAT", currentStat);
        updateHUD();
      });
    }

    // Bind number input change handlers
    settingsDiv.querySelectorAll('input[type="number"]').forEach(inp => {
      inp.addEventListener('change', () => {
        const key = inp.dataset.key;
        const num = parseFloat(inp.value);
        if (!isNaN(num)) saveSetting(key, num);
      });
    });

    // Bind select[data-key] handlers (mode-specific selects like AFK subMode)
    settingsDiv.querySelectorAll('select[data-key]').forEach(sel => {
      sel.addEventListener('change', () => {
        saveSetting(sel.dataset.key, sel.value);
      });
    });

    // Reset button
    const resetBtn = document.getElementById("settings-reset");
    if (resetBtn) {
      resetBtn.onclick = () => {
        const cfg = MODE_SETTINGS_CONFIG[trainingMode] || [];
        for (const item of cfg) {
          saveSetting(item.key, DEFAULT_SETTINGS[item.key]);
        }
        settings = loadSettings();
        renderSettingsPanel();
      };
    }
  }

  document.getElementById("cfg-btn").onclick = () => {
    if (settingsDiv.style.display === "none") {
      toolsDiv.style.display = "none";
      positionSettingsPanel();
      renderSettingsPanel();
      settingsDiv.style.display = "block";
    } else {
      settingsDiv.style.display = "none";
    }
  };

  // --- LOOT MANAGER HUD ---
  const lootDiv = document.createElement("div");
  Object.assign(lootDiv.style, {
    position: "fixed",
    top: "20px",
    left: "20px",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#00ff00",
    borderRadius: "10px",
    zIndex: "99998",
    fontSize: "11px",
    fontFamily: "monospace",
    border: "2px solid #555",
    display: "none",
    minWidth: "200px",
    maxWidth: "280px",
    maxHeight: "80vh",
    overflowY: "auto",
  });
  document.body.appendChild(lootDiv);

  function renderLootHud() {
    const isActive = localStorage.getItem(LOOT_ACTIVE_KEY) === "true";
    let loot = {};
    try { loot = JSON.parse(localStorage.getItem(LOOT_KEY) || "{}"); } catch {}
    const entries = Object.entries(loot).sort((a, b) => b[1] - a[1]);

    // Calculate total sell value
    let totalEarned = 0;
    for (const [name, count] of entries) {
      const unitVal = LOOT_SELL_VALUES[name];
      if (unitVal) totalEarned += unitVal * count;
    }
    const fmtGold = n => "$" + n.toLocaleString();

    const btnStyle = `background:#333; color:#00ff00; border:1px solid #444; cursor:pointer; font-family:monospace; font-size:11px; padding:3px 8px;`;
    let html = `<div style="text-align:center; border-bottom:1px solid #333; margin-bottom:6px; padding-bottom:4px;"><b>Loot Manager</b></div>`;
    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:4px;">`;
    html += `<button id="loot-toggle" style="${btnStyle}">${isActive ? "STOP" : "START"}</button>`;
    const totalStyle = lootValueHighlight
      ? `cursor:pointer; color:#ffff00; background:#1a1a00; border:1px solid #666600; border-radius:3px; padding:2px 6px; font-family:monospace; font-size:11px; font-weight:bold;`
      : `cursor:pointer; color:#ffff00; border:1px solid transparent; border-radius:3px; padding:2px 6px; font-family:monospace; font-size:11px; font-weight:bold;`;
    html += `<span id="loot-total" style="${totalStyle}" title="Click to highlight valued items">${fmtGold(totalEarned)}</span>`;
    html += `<button id="loot-clear" style="${btnStyle}">CLEAR</button>`;
    html += `</div>`;
    html += `<div style="color:#aaa; font-size:10px; margin-bottom:6px;">Status: ${isActive ? '<span style="color:#00ff00">TRACKING</span>' : '<span style="color:#ff4444">STOPPED</span>'}</div>`;

    if (entries.length === 0) {
      html += `<div style="color:#666; font-size:10px;">No loot recorded yet.</div>`;
    } else {
      for (const [name, count] of entries) {
        const unitVal = LOOT_SELL_VALUES[name];
        let rowBg = "";
        let valueLabel = "";
        if (lootValueHighlight && unitVal) {
          rowBg = ` background:#0d1a00;`;
          const rowTotal = unitVal * count;
          valueLabel = `<span style="color:#88ff44; font-size:10px; margin-left:4px;">${fmtGold(rowTotal)}</span>`;
        } else if (lootValueHighlight && !unitVal) {
          rowBg = ` opacity:0.45;`;
        }
        html += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222; padding:2px 0;${rowBg}">`;
        html += `<span style="color:#ccc; margin-right:6px;">${name}</span>`;
        html += `<span style="display:flex; align-items:center; gap:4px;"><span style="color:#ffff00;">x${count}</span>${valueLabel}</span>`;
        html += `</div>`;
      }
    }

    lootDiv.innerHTML = html;

    document.getElementById("loot-total").onclick = () => {
      lootValueHighlight = !lootValueHighlight;
      renderLootHud();
    };
    document.getElementById("loot-toggle").onclick = () => {
      const active = localStorage.getItem(LOOT_ACTIVE_KEY) === "true";
      localStorage.setItem(LOOT_ACTIVE_KEY, active ? "false" : "true");
      if (!active) {
        const evEl = document.querySelector("#headerevents b");
        const cnt = evEl ? parseInt(evEl.textContent, 10) : 0;
        if (!isNaN(cnt)) localStorage.setItem(LOOT_EVENTS_KEY, String(cnt));
      }
      renderLootHud();
    };
    document.getElementById("loot-clear").onclick = () => {
      localStorage.removeItem(LOOT_KEY);
      lootValueHighlight = false;
      renderLootHud();
    };
  }

  function updateStatsIfTracking() {
    if (localStorage.getItem(STATS_ACTIVE_KEY) !== "true") return;
    if (!window.location.href.includes("on=train")) return;
    const current = readCurrentStats();
    let tracker = {};
    try { tracker = JSON.parse(localStorage.getItem(STATS_TRACKER_KEY) || "{}"); } catch {}
    tracker.current = current;
    if (!tracker.baseline) tracker.baseline = { ...current };
    localStorage.setItem(STATS_TRACKER_KEY, JSON.stringify(tracker));
    injectInlineStatsPanel();

    // Stat Cap: check if current stat hit its cap and switch if needed
    if (["str", "def", "spd"].includes(currentStat)) {
      const caps = loadStatCaps();
      const statValues = { str: current.str, def: current.def, spd: current.spd };
      const cap = caps[currentStat];
      if (cap && statValues[currentStat] >= cap) {
        // Find another stat that has a cap and is still under it
        const next = ["str", "def", "spd"].find(s => s !== currentStat && caps[s] && statValues[s] < caps[s]);
        if (next) {
          console.log(`Stat cap reached for ${currentStat} (${statValues[currentStat]} >= ${cap}), switching to ${next}`);
          currentStat = next;
          localStorage.setItem("PQ_BOT_STAT", currentStat);
          const sel = document.getElementById("cfg-stat-select");
          if (sel) sel.value = currentStat;
          updateHUD();
          document.getElementById('msg').textContent = `Cap reached! → ${next.toUpperCase()}`;
        } else {
          // All capped stats are at or above their cap - stop training
          console.log(`All stat caps reached. Stopping training.`);
          trainingActive = false;
          localStorage.setItem("PQ_BOT_RUNNING", "false");
          updateHUD();
          document.getElementById('msg').textContent = "All stat caps reached — stopped.";
        }
      }
    }
  }

  // --- INLINE STATS PANEL (injected below #train_actions on training page) ---
  function injectInlineStatsPanel() {
    const trainActions = document.getElementById("train_actions");
    if (!trainActions) return;
    let panel = document.getElementById("pq-inline-stats");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "pq-inline-stats";
      trainActions.insertAdjacentElement("afterend", panel);
    }

    const isActive = localStorage.getItem(STATS_ACTIVE_KEY) === "true";
    let tracker = {};
    try { tracker = JSON.parse(localStorage.getItem(STATS_TRACKER_KEY) || "{}"); } catch {}
    const baseline = tracker.baseline || null;
    const current = tracker.current || null;
    const caps = loadStatCaps();

    const fmt = n => n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : n.toFixed(1);
    const fmtDelta = n => n > 0
      ? `<span style="color:#00ff00">+${fmt(n)}</span>`
      : `<span style="color:#555">+0.0</span>`;

    const liveSnuff = readCurrentStats().snuff;
    let strGain = 0, defGain = 0, spdGain = 0, snuffUsed = 0;
    if (baseline && current) {
      strGain = Math.max(0, current.str - baseline.str);
      defGain = Math.max(0, current.def - baseline.def);
      spdGain = Math.max(0, current.spd - baseline.spd);
      snuffUsed = Math.max(0, baseline.snuff - current.snuff);
    }
    const totalGain = strGain + defGain + spdGain;
    const ratio = snuffUsed > 0 ? (totalGain / snuffUsed).toFixed(1) : "-";

    let equipBonuses = null;
    try { equipBonuses = JSON.parse(localStorage.getItem(EQUIP_BONUSES_KEY) || "null"); } catch {}

    const btnStyle = col => `background:#1a1a1a;color:${col};border:1px solid ${col};cursor:pointer;font-family:monospace;font-size:10px;padding:2px 7px;border-radius:2px;`;

    panel.style.cssText = `margin-top:6px;padding:7px 12px;background:#111;border:1px solid #2a2a2a;border-radius:4px;font-family:monospace;font-size:11px;color:#ccc;clear:both;`;

    const colW = `flex:1;text-align:center;`;
    const statLbl = `color:#aaa;width:28px;flex-shrink:0;`;
    const statRow = (lbl, val, gain, capKey) => {
      const adjVal = equipBonuses ? val * (1 + equipBonuses[capKey] / 100) : null;
      const capVal = caps[capKey] || null;
      let r = `<div style="display:flex;align-items:center;padding:1px 0;">`;
      r += `<span style="${statLbl}">${lbl}</span>`;
      r += `<span style="${colW}"><b style="color:#fff;">${fmt(val)}</b></span>`;
      r += `<span style="${colW}">${fmtDelta(gain)}</span>`;
      r += `<span style="${colW};color:#00ccff;">${adjVal !== null ? fmt(adjVal) : '<span style="color:#333">—</span>'}</span>`;
      const capCol = inlineCapEditing
        ? `<input id="pq-cap-inp-${capKey}" type="number" min="0" step="1000" value="${capVal !== null ? capVal : ''}" placeholder="—" style="width:90%;background:#1a1a1a;color:#ffaa00;border:1px solid #ffaa00;font-family:monospace;font-size:10px;text-align:center;padding:1px;">`
        : (capVal !== null ? capVal.toLocaleString() : '<span style="color:#333">—</span>');
      r += `<span style="${colW};color:#ffaa00;">${capCol}</span>`;
      r += `</div>`;
      return r;
    };
    const btnRow = `<div style="display:flex;gap:4px;margin-top:5px;justify-content:center;">` +
      `<button id="pq-inline-toggle" style="${btnStyle(isActive ? "#ff4444" : "#00ff00")}">${isActive ? "STOP" : "START"}</button>` +
      `<button id="pq-inline-reset" style="${btnStyle("#ff6600")}">RESET</button>` +
      `<button id="pq-inline-cap-set" style="${btnStyle(inlineCapEditing ? "#ffaa00" : "#ff9900")}">${inlineCapEditing ? "Cap Save" : "Cap Set"}</button>` +
      `</div>`;

    let html = `<div style="margin-bottom:4px;">`;
    html += `<b style="color:#00ccff;font-size:11px;">SESSION STATS</b>`;
    html += `</div>`;

    if (current) {
      html += `<div style="display:flex;align-items:center;padding:0 0 3px;margin-bottom:1px;border-bottom:1px solid #222;">` +
        `<span style="width:28px;flex-shrink:0;"></span>` +
        `<span style="flex:1;text-align:center;color:#555;font-size:9px;">BASE</span>` +
        `<span style="flex:1;text-align:center;color:#555;font-size:9px;">GAIN</span>` +
        `<span style="flex:1;text-align:center;color:#00ccff;font-size:9px;">ADJ</span>` +
        `<span style="flex:1;text-align:center;color:#ffaa00;font-size:9px;">CAP</span>` +
        `</div>`;
      html += statRow("STR", baseline ? baseline.str : current.str, strGain, "str");
      html += statRow("DEF", baseline ? baseline.def : current.def, defGain, "def");
      html += statRow("SPD", baseline ? baseline.spd : current.spd, spdGain, "spd");
      html += btnRow;
      html += `<div style="margin-top:4px;font-size:10px;color:#aaa;text-align:center;">`;
      html += `Snuff <b style="color:#ffaa00;">${liveSnuff.toLocaleString()}</b>`;
      if (snuffUsed > 0) {
        html += ` · used <b style="color:#ff9900;">${snuffUsed.toLocaleString()}</b>`;
        html += ` · <b style="color:#00ccff;">${ratio}</b> pts/snuff`;
      }
      if (totalGain > 0) html += ` · total <b style="color:#00ff00;">+${fmt(totalGain)}</b>`;
      html += `</div>`;
    } else {
      html += btnRow;
      html += `<div style="color:#555;font-size:10px;margin-top:4px;">${isActive ? "Waiting for data..." : "Click START to begin tracking."}</div>`;
    }

    panel.innerHTML = html;

    document.getElementById("pq-inline-toggle").onclick = () => {
      const active = localStorage.getItem(STATS_ACTIVE_KEY) === "true";
      if (!active) {
        const cur = readCurrentStats();
        localStorage.setItem(STATS_TRACKER_KEY, JSON.stringify({ baseline: cur, current: cur }));
        localStorage.setItem(STATS_ACTIVE_KEY, "true");
      } else {
        localStorage.setItem(STATS_ACTIVE_KEY, "false");
      }
      injectInlineStatsPanel();

    };

    document.getElementById("pq-inline-reset").onclick = () => {
      const cur = readCurrentStats();
      localStorage.setItem(STATS_TRACKER_KEY, JSON.stringify({ baseline: cur, current: cur }));
      injectInlineStatsPanel();

    };

    document.getElementById("pq-inline-cap-set").onclick = () => {
      if (!inlineCapEditing) {
        inlineCapEditing = true;
        injectInlineStatsPanel();
      } else {
        for (const key of ["str", "def", "spd"]) {
          const inp = document.getElementById(`pq-cap-inp-${key}`);
          if (inp) {
            const v = parseFloat(inp.value);
            saveStatCap(key, isNaN(v) || v <= 0 ? null : v);
          }
        }
        inlineCapEditing = false;
        injectInlineStatsPanel();

      }
    };
  }

  const sleep = (min, max) => new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

  // --- HITLIST FUNCTIONS ---
  function renderLinks() {
    const targetDiv = document.getElementById("link-area");
    if (!targetDiv) return;
    targetDiv.innerHTML = "";

    for (let url in linkDb) {
      const link = linkDb[url];
      const div = document.createElement("div");

      const a = document.createElement("a");
      a.href = url;
      a.style.color = "cyan";
      a.style.textDecoration = "none";
      a.textContent = link.name || url.split("?")[1] || "Link";

      a.onclick = () => {
        link.timerStart = Date.now();
        localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
      };

      const timerSpan = document.createElement("span");
      timerSpan.style.marginLeft = "6px";
      timerSpan.style.color = "yellow";

      const btn = document.createElement("button");
      btn.textContent = "X";
      btn.style.fontSize = "9px";
      btn.style.marginLeft = "4px";
      btn.onclick = () => {
        delete linkDb[url];
        localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
        renderLinks();
      };

      div.appendChild(a);
      div.appendChild(timerSpan);
      div.appendChild(btn);
      targetDiv.appendChild(div);
    }
    renderTopBar();
  }

  document.getElementById("add-link-btn").onclick = () => {
    const url = window.location.href;
    const nameEl = document.querySelector("#battle .right");
    const name = nameEl ? nameEl.textContent.trim() : url.split("?")[1] || "Link";
    const now = Date.now();
    const duration = 20 * 60 * 1000;

    if (!linkDb[url]) {
      linkDb[url] = { name, timerStart: now, duration };
      localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
      renderLinks();
    }
  };

  renderLinks();

  setInterval(() => {
    const now = Date.now();
    const targetDiv = document.getElementById("link-area");
    if (!targetDiv) return;

    Array.from(targetDiv.children).forEach(div => {
      const a = div.querySelector("a");
      const timerSpan = div.querySelector("span");
      const link = linkDb[a.href];
      if (!link) return;

      const elapsed = now - link.timerStart;
      const remaining = link.duration - elapsed;

      if (remaining <= 0) {
        timerSpan.textContent = "Attack!";
        timerSpan.style.color = "red";
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        timerSpan.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
        timerSpan.style.color = "yellow";
      }
    });
  }, 1000);

  // --- HITLIST ATTACK FUNCTIONS ---
  function isValidTargetUrl(url) {
    return typeof url === 'string' && url.startsWith('https://www.piratequest.org/');
  }

  function getReadyTargets() {
    const ready = [];
    if (typeof linkDb !== 'object' || linkDb === null) return ready;

    for (let url in linkDb) {
      // Validate URL format
      if (!isValidTargetUrl(url)) continue;

      const link = linkDb[url];
      if (!link || typeof link !== 'object') continue;

      const elapsed = Date.now() - link.timerStart;
      const remaining = link.duration - elapsed;
      if (remaining <= 0) ready.push(url);
    }
    return ready;
  }

  function isInAttackMode() {
    return localStorage.getItem(ATTACK_COUNT_KEY) !== null;
  }

  function clearAttackMode() {
    const count = parseInt(localStorage.getItem(ATTACK_COUNT_KEY) || "0");
    for (let i = 0; i < count; i++) {
      localStorage.removeItem(ATTACK_URL_PREFIX + i);
    }
    localStorage.removeItem(ATTACK_COUNT_KEY);
    localStorage.removeItem(ATTACK_INDEX_KEY);
  }

  function saveAttackQueue(targets) {
    // Clear any existing queue first
    clearAttackMode();
    // Save each URL individually
    for (let i = 0; i < targets.length; i++) {
      localStorage.setItem(ATTACK_URL_PREFIX + i, targets[i]);
    }
    localStorage.setItem(ATTACK_COUNT_KEY, targets.length.toString());
    localStorage.setItem(ATTACK_INDEX_KEY, "0");
  }

  function startAttackSequence(targets) {
    if (!targets || targets.length === 0) return;
    const validTargets = targets.filter(isValidTargetUrl);
    if (validTargets.length === 0) return;
    saveAttackQueue(validTargets);
    document.getElementById('msg').textContent = `Attack Sequence: ${validTargets.length} targets`;

    useSnuff();

    // Navigate to first target after short delay
    setTimeout(() => {
      window.location.href = validTargets[0];
    }, 2000);
  }

  function continueAttackSequence() {
    const count = parseInt(localStorage.getItem(ATTACK_COUNT_KEY) || "0");
    if (count === 0) { clearAttackMode(); return; }

    let index = parseInt(localStorage.getItem(ATTACK_INDEX_KEY) || "0");
    index++;
    localStorage.setItem(ATTACK_INDEX_KEY, index.toString());

    if (index < count) {
      const nextTarget = localStorage.getItem(ATTACK_URL_PREFIX + index);
      if (nextTarget && isValidTargetUrl(nextTarget)) {
        document.getElementById('msg').textContent = `Attacking ${index + 1}/${count}...`;
        setTimeout(() => {
          window.location.href = nextTarget;
        }, Math.random() * (settings.attack_betweenMax - settings.attack_betweenMin) + settings.attack_betweenMin);
      } else {
        clearAttackMode();
        window.location.href = TRAINING_URL;
      }
    } else {
      clearAttackMode();
      document.getElementById('msg').textContent = "Attacks Done, Returning...";
      setTimeout(() => {
        window.location.href = TRAINING_URL;
      }, Math.random() * 4000 + 5000);
    }
  }

  function handleAttackModeOnLoad() {
    if (!isInAttackMode()) return false;

    const currentUrl = window.location.href;
    const count = parseInt(localStorage.getItem(ATTACK_COUNT_KEY) || "0");
    const index = parseInt(localStorage.getItem(ATTACK_INDEX_KEY) || "0");

    if (count === 0) { clearAttackMode(); return false; }

    // Check if we're on the training page (attack sequence complete)
    if (currentUrl.includes("on=train")) {
      clearAttackMode();
      return false;
    }

    // Check for captcha - if present, don't schedule continuation yet
    // backgroundSolver will handle it and resume attack after solving
    // Timer reset happens AFTER captcha is solved (in backgroundSolver)
    if (getCaptchaElements()) {
      document.getElementById('msg').textContent = `On Target ${index + 1}/${count} (Captcha)...`;
      console.log("Captcha detected on attack page, waiting for solve...");
      waitingForResume = true;
      return true;
    }

    // No captcha - reset timer now (attack happened)
    if (linkDb[currentUrl]) {
      linkDb[currentUrl].timerStart = Date.now();
      localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
    }

    document.getElementById('msg').textContent = `On Target ${index + 1}/${count}...`;
    setTimeout(() => {
      continueAttackSequence();
    }, Math.random() * (settings.attack_onTargetMax - settings.attack_onTargetMin) + settings.attack_onTargetMin);

    return true; // Signal that we're in attack mode
  }

  // --- HUD UPDATER ---
  function updateHUD() {
    document.getElementById("pwr").textContent = trainingActive ? "ON" : "OFF";
    document.getElementById("pwr").style.color = trainingActive ? "#00ff00" : "red";
    const startStopBtn = document.getElementById("start-stop-btn");
    if (startStopBtn) {
      startStopBtn.textContent = trainingActive ? "STOP" : "START";
      startStopBtn.style.color = trainingActive ? "#ff4444" : "#00ff00";
      startStopBtn.style.borderColor = trainingActive ? "#ff4444" : "#00ff00";
    }
    let modeDisplay = trainingMode;
    try {
      const afkSt = JSON.parse(localStorage.getItem(AFK_STATE_KEY) || "null");
      if (afkSt && afkSt.phase === "run") modeDisplay += " [AFK]";
      else if (afkSt && afkSt.phase === "cooldown") modeDisplay = "AFK:CDN";
    } catch(e) {}
    document.getElementById("mode-ui").textContent = modeDisplay;
    document.getElementById("mode-ui").style.color =
      trainingMode === "PASSIVE" ? "#f1c40f" :
      trainingMode === "ATTACK" ? "#e74c3c" :
      trainingMode === "SEWER" ? "#9b59b6" :
      trainingMode === "PSYCHO" ? "#ff0000" :
      trainingMode === "AFK" ? "#ff8c00" : "cyan";
    document.getElementById("stat-name").textContent = currentStat.toUpperCase();
    const dbSamples = getDbTotalSamples(handDb);
    const dbEl = document.getElementById("db-count");
    if (dbSamples >= 600) { dbEl.textContent = "Local"; dbEl.style.color = "#00ff00"; }
    else { dbEl.textContent = "Update"; dbEl.style.color = "#ff9900"; }
    // Update energy, HP, and gold
    const energyBar = document.getElementById("prog-bar-energy");
    const hpBar = document.getElementById("prog-bar-hp");
    document.getElementById("energy-pct").textContent = energyBar ? (parseInt(energyBar.style.width) || 0) + "%" : "-";
    document.getElementById("hp-pct").textContent = hpBar ? (parseInt(hpBar.style.width) || 0) + "%" : "-";

    // Update gold display
    const goldEl = document.getElementById("coinsupd");
    document.getElementById("gold-amt").textContent = goldEl ? goldEl.textContent : "$0";

    renderTopBar();
  }

  // --- CLOUD SYNC ---

  function getDbTotalSamples(db) {
    if (!db || typeof db !== 'object') return 0;
    return Object.keys(db).filter(k => VALID_DIGITS.has(k.split("_")[0]) && typeof db[k] === 'string').length;
  }

  function isNewDbFormat(db) {
    // New format: keys like "0_abc12" with binary string values
    if (!db || typeof db !== 'object') return false;
    const keys = Object.keys(db);
    if (keys.length === 0) return false;
    const firstKey = keys[0];
    return /^[0-5]_/.test(firstKey) && typeof db[firstKey] === 'string';
  }

  async function syncCloud(payload = null) {
    try {
      if (payload) {
        // POST: push full DB to cloud
        const postBody = JSON.stringify(payload);
        const postResp = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postBody
        });
        const postResult = await postResp.text();
        console.log("Cloud Sync: Pushed DB to cloud. Samples:", getDbTotalSamples(payload), "Response:", postResult, "Size:", postBody.length);
      } else {
        // GET: pull from cloud, compare with local
        const response = await fetch(SYNC_URL, { method: 'GET' });
        const rawText = await response.text();
        // console.log("Cloud Sync GET raw:", rawText.substring(0, 200));
        let data;
        try { data = JSON.parse(rawText); } catch (e) { data = null; }
        // Detect if cloud has SES-corrupted string counts that need cleaning
        const cloudNeedsFix = rawText.includes('"counts":"[');
        if (data && typeof data === 'object') {
          // Check if cloud has valid new-format data
          if (!isNewDbFormat(data)) {
            // Cloud is empty or has old format - push local if we have data
            if (getDbTotalSamples(handDb) > 0) {
              const pushBody = JSON.stringify(handDb);
              const pushResp = await fetch(SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: pushBody
              });
              const pushResult = await pushResp.text();
              console.log("Cloud Sync: Pushed local to cloud. Response:", pushResult, "Size:", pushBody.length);
            } else {
              console.log("Cloud Sync: Cloud empty, local empty - nothing to do");
            }
          } else {
            const cloudSamples = getDbTotalSamples(data);
            const localSamples = getDbTotalSamples(handDb);
            if (cloudSamples > localSamples) {
              handDb = data;
              localStorage.setItem(DB_KEY, JSON.stringify(handDb));
              console.log("Cloud Sync: Pulled from cloud. Samples:", cloudSamples);
            } else if (localSamples > cloudSamples) {
              await fetch(SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(handDb)
              });
              console.log("Cloud Sync: Local larger (" + localSamples + " vs " + cloudSamples + "), pushed to cloud");
            } else if (cloudNeedsFix) {
              // Same sample count but cloud has corrupted string counts - push clean data
              await fetch(SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(handDb)
              });
              console.log("Cloud Sync: Pushed clean data to fix corrupted cloud. Samples:", localSamples);
            } else {
              // console.log("Cloud Sync: In sync. Samples:", localSamples);
            }
          }
        }
      }
      updateHUD();
    } catch (e) {
      console.error("Cloud Sync Failed:", e);
      document.getElementById('msg').textContent = "Sync Error - Check Console";
    }
  }

  function exportDatabase() {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: 2,
      captchaDb: handDb,
      linkDb: linkDb,
      settings: settings,
      stats: (() => {
        try { return JSON.parse(localStorage.getItem(STATS_TRACKER_KEY) || "null"); } catch { return null; }
      })(),
      loot: (() => {
        try { return JSON.parse(localStorage.getItem(LOOT_KEY) || "null"); } catch { return null; }
      })()
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "pq_database_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log("Database exported:", link.download);
  }

  function importDatabase() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          if (!importData || typeof importData !== 'object') {
            throw new Error("Invalid JSON format");
          }
          
          // Import captcha database
          if (importData.captchaDb && typeof importData.captchaDb === 'object') {
            handDb = importData.captchaDb;
            localStorage.setItem(DB_KEY, JSON.stringify(handDb));
            console.log("Imported captcha database. Samples:", getDbTotalSamples(handDb));
          }
          
          // Import link database
          if (importData.linkDb && typeof importData.linkDb === 'object') {
            linkDb = importData.linkDb;
            localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
            console.log("Imported link database. Entries:", Object.keys(linkDb).length);
          }
          
          // Import settings
          if (importData.settings && typeof importData.settings === 'object') {
            settings = Object.assign({}, DEFAULT_SETTINGS, importData.settings);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            console.log("Imported settings");
          }
          
          // Import stats if present
          if (importData.stats && typeof importData.stats === 'object') {
            localStorage.setItem(STATS_TRACKER_KEY, JSON.stringify(importData.stats));
            console.log("Imported stats");
          }
          
          // Import loot if present
          if (importData.loot && typeof importData.loot === 'object') {
            localStorage.setItem(LOOT_KEY, JSON.stringify(importData.loot));
            console.log("Imported loot. Items:", Object.keys(importData.loot).length);
          }
          
          updateHUD();
          document.getElementById('msg').textContent = "Database imported!";
          setTimeout(() => { if (document.getElementById('msg')) document.getElementById('msg').textContent = ""; }, 3000);
          console.log("Database import completed successfully");
        } catch (err) {
          console.error("Import failed:", err);
          document.getElementById('msg').textContent = "Import Error - Check Console";
          setTimeout(() => { if (document.getElementById('msg')) document.getElementById('msg').textContent = ""; }, 3000);
        }
      };
      reader.onerror = () => {
        console.error("File read error");
        document.getElementById('msg').textContent = "File Read Error";
        setTimeout(() => { if (document.getElementById('msg')) document.getElementById('msg').textContent = ""; }, 3000);
      };
      reader.readAsText(file);
    };
    
    fileInput.click();
  }

  function getCaptchaElements() {
    const img = document.querySelector('img[alt="Image Verification"]');
    if (!img) return null;
    const container = img.closest('form') || img.parentElement;
    const input = container.querySelector('input[type="text"]');
    const submit = container.querySelector('input[type="submit"]')
      || container.querySelector('button[type="submit"]')
      || container.querySelector('input[value="Go"]')
      || container.querySelector('button');
    return { img, input, submit, form: img.closest('form') };
  }

  // --- BLOB DETECTION FOR HAND SIGN CAPTCHA ---
  // Erase horizontal white lines (noise bands) by zeroing rows that are >80% bright
  function eraseHorizontalLines(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let y = 0; y < h; y++) {
      let bright = 0;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4] > 200) bright++;
      }
      if (bright > w * 0.8) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Find connected blobs of hand pixels (threshold >30), merge splits caused by erased lines
  function getHandBlobs(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const visited = new Uint8Array(w * h);
    const rawBlobs = [];

    const floodFill = (sx, sy) => {
      const stack = [sy * w + sx];
      let minX = sx, maxX = sx, minY = sy, maxY = sy, size = 0;
      while (stack.length) {
        const idx = stack.pop();
        if (idx < 0 || idx >= w * h || visited[idx]) continue;
        const di = idx * 4;
        if ((data[di] + data[di + 1] + data[di + 2]) / 3 <= 30) continue;
        visited[idx] = 1;
        size++;
        const x = idx % w, y = (idx / w) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x + 1 < w) stack.push(idx + 1);
        if (x - 1 >= 0) stack.push(idx - 1);
        if (y + 1 < h) stack.push(idx + w);
        if (y - 1 >= 0) stack.push(idx - w);
      }
      return { minX, maxX, minY, maxY, size };
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!visited[idx]) {
          const di = idx * 4;
          if ((data[di] + data[di + 1] + data[di + 2]) / 3 > 30) {
            const blob = floodFill(x, y);
            if (blob.size >= 50) rawBlobs.push(blob);
          }
        }
      }
    }

    // Merge blobs with overlapping x ranges (same hand split by erased horizontal line)
    rawBlobs.sort((a, b) => a.minX - b.minX);
    const merged = [];
    for (const b of rawBlobs) {
      let found = false;
      for (const m of merged) {
        if (b.minX <= m.maxX && b.maxX >= m.minX) {
          m.minX = Math.min(m.minX, b.minX); m.maxX = Math.max(m.maxX, b.maxX);
          m.minY = Math.min(m.minY, b.minY); m.maxY = Math.max(m.maxY, b.maxY);
          m.size += b.size;
          found = true;
          break;
        }
      }
      if (!found) merged.push({ ...b });
    }

    const blobs = merged.filter(b => b.size >= 150).sort((a, b) => a.minX - b.minX);

    // If 3 blobs, try to split the widest one (likely two overlapping hands)
    if (blobs.length === 3) {
      var bWidths = [blobs[0].maxX - blobs[0].minX + 1, blobs[1].maxX - blobs[1].minX + 1, blobs[2].maxX - blobs[2].minX + 1];
      var bAvg = (bWidths[0] + bWidths[1] + bWidths[2]) / 3;
      var bMax = bWidths[0] > bWidths[1] ? (bWidths[0] > bWidths[2] ? bWidths[0] : bWidths[2]) : (bWidths[1] > bWidths[2] ? bWidths[1] : bWidths[2]);
      var bIdx = bWidths[0] === bMax ? 0 : (bWidths[1] === bMax ? 1 : 2);
      if (bMax > bAvg * 1.4) {
        var splits = trySplitBlob(blobs[bIdx], w, data);
        if (splits.length === 2) {
          var result = [];
          for (var ri = 0; ri < blobs.length; ri++) {
            if (ri === bIdx) { result.push(splits[0]); result.push(splits[1]); }
            else result.push(blobs[ri]);
          }
          result.sort(function(a, b) { return a.minX - b.minX; });
          if (result.length === 4) {
            console.log("Blob split applied at megaIdx " + bIdx);
            return result;
          }
        }
      }
    }

    return blobs;
  }

  // Split a mega-blob at its valley column (min bright-pixel density in middle 30-70%)
  function trySplitBlob(blob, w, data) {
    var blobW = blob.maxX - blob.minX + 1;
    var startCol = Math.floor(blob.minX + blobW * 0.3);
    var endCol = Math.floor(blob.minX + blobW * 0.7);

    // Find column with fewest bright pixels in middle 30-70% range
    var minDensity = 999999;
    var splitX = Math.floor((blob.minX + blob.maxX) / 2);
    for (var x = startCol; x <= endCol; x++) {
      var count = 0;
      for (var y = blob.minY; y <= blob.maxY; y++) {
        var idx = (y * w + x) * 4;
        if ((data[idx] + data[idx + 1] + data[idx + 2]) / 3 > 30) count++;
      }
      if (count < minDensity) { minDensity = count; splitX = x; }
    }

    // Build two sub-blobs with tightened Y bounds
    var result = [];
    var halvesDefs = [
      { minX: blob.minX, maxX: splitX - 1 },
      { minX: splitX, maxX: blob.maxX }
    ];
    for (var h = 0; h < halvesDefs.length; h++) {
      var half = halvesDefs[h];
      var minY = 999999, maxY = -1, size = 0;
      for (var hy = blob.minY; hy <= blob.maxY; hy++) {
        for (var hx = half.minX; hx <= half.maxX; hx++) {
          var hidx = (hy * w + hx) * 4;
          if ((data[hidx] + data[hidx + 1] + data[hidx + 2]) / 3 > 30) {
            if (hy < minY) minY = hy;
            if (hy > maxY) maxY = hy;
            size++;
          }
        }
      }
      if (size >= 150 && maxY >= 0) {
        result.push({ minX: half.minX, maxX: half.maxX, minY: minY, maxY: maxY, size: size });
      }
    }
    return result;
  }

  // Crop a blob's bounding box and resize to 40x40, return binary string
  function getBlobPixelMap(ctx, blob) {
    const cropW = blob.maxX - blob.minX + 1;
    const cropH = blob.maxY - blob.minY + 1;
    const cropData = ctx.getImageData(blob.minX, blob.minY, cropW, cropH);
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = cropW; srcCanvas.height = cropH;
    srcCanvas.getContext('2d').putImageData(cropData, 0, 0);
    // Find centroid of bright pixels for alignment
    const data = cropData.data;
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const i = (y * cropW + x) * 4;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (gray > 30) {
          const w = gray / 255;
          sumX += x * w; sumY += y * w; count += w;
        }
      }
    }
    const cx = count > 0 ? sumX / count : cropW / 2;
    const cy = count > 0 ? sumY / count : cropH / 2;
    // Draw centered: offset so centroid lands at (20,20) in the 40x40 canvas
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 40; normCanvas.height = 40;
    const normCtx = normCanvas.getContext('2d', { willReadFrequently: true });
    normCtx.drawImage(srcCanvas, 20 - cx * (40 / cropW), 20 - cy * (40 / cropH), 40, 40);
    const d = normCtx.getImageData(0, 0, 40, 40).data;
    let map = "";
    for (let i = 0; i < d.length; i += 4) map += (d[i] + d[i + 1] + d[i + 2]) / 3 > 30 ? "1" : "0";
    return map;
  }

  // --- NEAREST-NEIGHBOR CLASSIFIER ---
  // handDb format: { "0_abc12": "010101...", "1_def34": "101010...", ... }
  // Each entry is a 40x40 (1600-char) binary string for one training sample

  function trainDigit(digit, pixelMap) {
    const existing = Object.keys(handDb).filter(k => k.startsWith(digit + "_"));
    if (existing.length >= MAX_SAMPLES_PER_DIGIT) {
      // Random eviction: replace a random existing sample so the DB stays fresh over time
      const evict = existing[Math.floor(Math.random() * existing.length)];
      delete handDb[evict];
    }
    const key = digit + "_" + Math.random().toString(36).substring(2, 7);
    handDb[key] = pixelMap;
  }

  function classifyDigit(pixelMap) {
    // Count samples per digit to require minimum training before guessing
    const digitCounts = {};
    for (const key of Object.keys(handDb)) {
      const d = key.split("_")[0];
      if (VALID_DIGITS.has(d)) digitCounts[d] = (digitCounts[d] || 0) + 1;
    }

    let bestDigit = "?";
    let bestScore = 0;
    let secondScore = 0;

    for (const [key, saved] of Object.entries(handDb)) {
      const digit = key.split("_")[0];
      if (!VALID_DIGITS.has(digit) || (digitCounts[digit] || 0) < 3) continue;
      if (saved.length !== pixelMap.length) continue;
      const compareLen = Math.floor(pixelMap.length * 0.8); // ignore bottom 20% (wrist region)
      let intersection = 0, union = 0;
      for (let j = 0; j < compareLen; j++) {
        const a = pixelMap[j] === "1";
        const b = saved[j] === "1";
        if (a && b) intersection++;
        if (a || b) union++;
      }
      const score = union === 0 ? 0 : intersection / union;
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestDigit = digit;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }

    const confidence = bestScore - secondScore;
    return { digit: bestDigit, score: bestScore, confidence };
  }

  // --- BACKGROUND SOLVER ---
  async function backgroundSolver() {
    if (userIsTyping) return;
    const elements = getCaptchaElements();

    // RESUME LOGIC: Captcha is gone - either manually solved or auto-submitted correctly
    // Triggers on: waitingForResume (manual/old flow) OR captchaSubmitted (Captcha_Submit flow)
    if (!elements && (waitingForResume || captchaSubmitted)) {
      console.log("Captcha cleared. Resyncing and Resuming...");
      waitingForResume = false;

      captchaSubmitted = false;
      localAttempts = 0;

      // Train DB with confirmed correct answer
      if (pendingDbTraining) {
        console.log("Answer confirmed correct - training DB with", pendingDbTraining.length, "digits");
        for (const sample of pendingDbTraining) {
          trainDigit(sample.digit, sample.pixels);
          console.log("Trained digit:", sample.digit, "pixels length:", sample.pixels.length);
        }
        localStorage.setItem(DB_KEY, JSON.stringify(handDb));
        console.log("DB saved to localStorage. Total samples:", getDbTotalSamples(handDb));
        pendingDbTraining = null;
        clearPendingTraining();
      }

      // Human Delay before continuing
      document.getElementById('msg').textContent = "Human Delay (Resume)...";
      const delay = Math.floor(Math.random() * 8000) + 7000; // 7-15 seconds

      setTimeout(() => {
        // Check if we're in attack mode - resume attack sequence instead of trainer
        if (isInAttackMode()) {
          // Reset timer NOW since captcha just solved = attack just happened
          const currentUrl = window.location.href;
          if (linkDb[currentUrl]) {
            linkDb[currentUrl].timerStart = Date.now();
            localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
          }
          continueAttackSequence();
        } else if (trainingMode === "SEWER") {
          sewerLoop();
        } else if (trainingMode === "PSYCHO") {
          psychoLoop();
        } else if (trainingMode === "AFK") {
          afkLoop();
        } else {
          trainerLoop();
        }
      }, delay);
      return;
    }

    if (!elements || !elements.input) return;

    // Detect wrong answer: captcha reappeared after submission
    if (captchaSubmitted) {
      console.log("Wrong answer detected - captcha reappeared");
      // Discard pending DB training - don't learn from wrong answers
      pendingDbTraining = null;
      clearPendingTraining();
      captchaSubmitted = false;
      // Reset autofilled so solver runs again on this captcha
      elements.input.dataset.autofilled = "false";
      elements.input.value = "";
    }

    // Mark that we're waiting for a captcha solve
    if (!waitingForResume) {
      waitingForResume = true;
    }

    const { img, input, submit } = elements;

    if (!input.dataset.monitoredInput) {
      input.dataset.monitoredInput = "true";
      input.addEventListener('focus', () => {
        userIsTyping = true;
        document.getElementById('msg').textContent = "Manual Override";
      });
      input.addEventListener('input', () => {
        // User is typing their own answer - stop autofill interference
        userIsTyping = true;
        input.dataset.autofilled = "false";
        document.getElementById('msg').textContent = "Manual Override";
      });
    }

    // Only process if: input is empty AND we haven't filled yet AND user isn't typing
    if (input.value === "" && input.dataset.autofilled !== "true" && !userIsTyping) {
      // Generate blob-based local guess
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      eraseHorizontalLines(ctx, img.naturalWidth, img.naturalHeight);
      const blobs = getHandBlobs(ctx, img.naturalWidth, img.naturalHeight);
      let guess = "";
      const pixelMaps = [];
      if (blobs.length === 4) {
        sessionStorage.removeItem('PQ_BLOB_REFRESH');
        for (let i = 0; i < 4; i++) {
          const pixels = getBlobPixelMap(ctx, blobs[i]);
          pixelMaps.push(pixels);
          const result = classifyDigit(pixels);
          if (result.digit === "?" || result.confidence < 0.001) {
            guess += "?";
          } else {
            guess += result.digit;
          }
          console.log(`Digit ${i}: predict="${result.digit}" confidence=${result.confidence.toFixed(3)} score=${result.score.toFixed(3)}`);
        }
        if (guess.includes("?")) {
          const confRefresh = parseInt(sessionStorage.getItem('PQ_CONF_REFRESH') || '0');
          if (confRefresh < 2) {
            sessionStorage.setItem('PQ_CONF_REFRESH', confRefresh + 1);
            console.log('Low confidence guess "' + guess + '", reloading for new captcha (attempt ' + (confRefresh + 1) + '/2)');
            document.getElementById('msg').textContent = 'Low confidence, retrying...';
            setTimeout(function() { location.reload(); }, 500);
            return;
          } else {
            sessionStorage.removeItem('PQ_CONF_REFRESH');
            console.log('Low confidence refresh limit reached, proceeding with best guess');
          }
        } else {
          sessionStorage.removeItem('PQ_CONF_REFRESH');
        }
      } else {
        // Any non-4 blob count: try refresh first (new captcha may be guessable)
        const refreshCount = parseInt(sessionStorage.getItem('PQ_BLOB_REFRESH') || '0');
        if (refreshCount < 2) {
          sessionStorage.setItem('PQ_BLOB_REFRESH', refreshCount + 1);
          console.log(blobs.length + ' blobs detected, reloading for new captcha (attempt ' + (refreshCount + 1) + '/2)');
          document.getElementById('msg').textContent = 'Bad captcha, retrying...';
          setTimeout(function() { location.reload(); }, 500);
          return;
        } else {
          sessionStorage.removeItem('PQ_BLOB_REFRESH');
          console.log(blobs.length + ' blobs detected, refresh limit reached, proceeding with best guess');
        }
        console.log(`Blob detection: found ${blobs.length} blobs (expected 4), skipping local guess`);
        guess = "????";
      }
      input.dataset.originalGuess = guess;

      // Helper: auto-submit a solution via Captcha_Submit
      const autoSubmitSolution = async (answer, source) => {
        input.value = answer;
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 1000));
        if (!userIsTyping && submit) {
          captchaSubmitted = true;
          const onclickAttr = submit.getAttribute("onclick") || "";
          const csMatch = onclickAttr.match(/Captcha_Submit\('([^']+)'\s*,\s*'([^']+)'\)/);
          if (csMatch && typeof Captcha_Submit === "function") {
            console.log(`${source}: calling Captcha_Submit directly:`, csMatch[1], csMatch[2]);
            waitingForResume = false;
            try {
              Captcha_Submit(csMatch[1], csMatch[2]);
            } catch (e) {
              console.log(`${source}: Captcha_Submit threw (${e.message}), refreshing...`);
              document.getElementById('msg').textContent = 'Submit error, refreshing...';
              captchaSubmitted = false;
              clearPendingTraining();
              setTimeout(function() { location.reload(); }, 1500);
            }
          } else {
            console.log(`${source}: no Captcha_Submit found, trying click`);
            waitingForResume = false;
            submit.click();
          }
        }
      };

      // --- LOCAL SOLVER (primary) ---
      // Submit local guess if confident (no ? digits) and haven't already tried for this captcha
      if (localAttempts < 2 && !guess.includes("?")) {
        localAttempts++;
        // Store pending training with local answer - applied if captcha clears (confirms correct)
        if (pixelMaps.length === 4) {
          let newBatch = [];
          for (let i = 0; i < 4; i++) {
            newBatch.push({ digit: guess[i], pixels: pixelMaps[i] });
            localStorage.setItem(PENDING_TRAINING_KEY + "_D" + i, guess[i]);
            localStorage.setItem(PENDING_TRAINING_KEY + "_P" + i, pixelMaps[i]);
          }
          pendingDbTraining = newBatch;
          localStorage.setItem(PENDING_TRAINING_KEY, "4");
        }
        document.getElementById('msg').textContent = "Local: " + guess;
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 1500)); // 1.5-2.5s pre-type delay
        await autoSubmitSolution(guess, "Local");
        return;
      }

      // Local failed or low confidence — reload for a fresh captcha
      document.getElementById('msg').textContent = 'Local failed - reloading...';
      setTimeout(function() { location.reload(); }, 500);
      return;
    }

  }

  // --- AFK MODE ---
  function rollAfkMs() {
    const minMs = (settings.afk_minHours || 1) * 3600000;
    const maxMs = Math.max(minMs, (settings.afk_maxHours || 5) * 3600000);
    return Math.random() * (maxMs - minMs) + minMs;
  }

  // Called at the top of each sub-mode loop. Returns true if AFK run time expired
  // and the loop should stop (cooldown started and afkLoop scheduled).
  function checkAfkExpiry() {
    let afkState;
    try { afkState = JSON.parse(localStorage.getItem(AFK_STATE_KEY) || "null"); } catch(e) { return false; }
    if (!afkState || afkState.phase !== "run") return false;
    if (Date.now() < afkState.endTime) return false;

    // Run phase expired - transition to cooldown
    const coolMs = rollAfkMs();
    const newState = { phase: "cooldown", endTime: Date.now() + coolMs, subMode: afkState.subMode };
    localStorage.setItem(AFK_STATE_KEY, JSON.stringify(newState));
    localStorage.removeItem(AFK_NO_SNUFF_KEY);
    trainingMode = "AFK";
    localStorage.setItem("PQ_BOT_MODE", "AFK");
    updateHUD();
    if (settingsDiv.style.display !== "none") renderSettingsPanel();
    const mins = Math.round(coolMs / 60000);
    document.getElementById('msg').textContent = `AFK: Run done! Cooling ${mins}m`;
    setTimeout(afkLoop, 2000);
    return true;
  }

  async function afkLoop() {
    if (!trainingActive) return;
    if (trainingMode !== "AFK") return;

    let afkState;
    try { afkState = JSON.parse(localStorage.getItem(AFK_STATE_KEY) || "null"); } catch(e) { afkState = null; }
    const now = Date.now();

    // No state or idle - start a fresh run
    if (!afkState || afkState.phase === "idle") {
      const subMode = settings.afk_subMode || "SNUFF";
      const runMs = rollAfkMs();
      const newState = { phase: "run", endTime: now + runMs, subMode };
      localStorage.setItem(AFK_STATE_KEY, JSON.stringify(newState));
      const mins = Math.round(runMs / 60000);
      document.getElementById('msg').textContent = `AFK: Starting ${subMode} for ${mins}m`;
      trainingMode = subMode;
      localStorage.setItem("PQ_BOT_MODE", subMode);
      updateHUD();
      if (settingsDiv.style.display !== "none") renderSettingsPanel();
      await sleep(3000, 5000);
      if (subMode === "SEWER") sewerLoop();
      else if (subMode === "PSYCHO") psychoLoop();
      else trainerLoop();
      return;
    }

    // Run phase active - delegate to sub-mode (trainingMode should already be subMode)
    if (afkState.phase === "run") {
      if (now >= afkState.endTime) {
        // Expired before loop could catch it - transition now
        const coolMs = rollAfkMs();
        const coolState = { phase: "cooldown", endTime: now + coolMs, subMode: afkState.subMode };
        localStorage.setItem(AFK_STATE_KEY, JSON.stringify(coolState));
        localStorage.removeItem(AFK_NO_SNUFF_KEY);
        const mins = Math.round(coolMs / 60000);
        document.getElementById('msg').textContent = `AFK: Run done! Cooling ${mins}m`;
        setTimeout(afkLoop, 2000);
        return;
      }
      trainingMode = afkState.subMode;
      localStorage.setItem("PQ_BOT_MODE", afkState.subMode);
      updateHUD();
      await sleep(1000, 2000);
      if (afkState.subMode === "SEWER") sewerLoop();
      else if (afkState.subMode === "PSYCHO") psychoLoop();
      else trainerLoop();
      return;
    }

    // Cooldown phase
    if (afkState.phase === "cooldown") {
      if (now >= afkState.endTime) {
        // Cooldown done - start new run
        const subMode = settings.afk_subMode || afkState.subMode;
        const runMs = rollAfkMs();
        const newState = { phase: "run", endTime: now + runMs, subMode };
        localStorage.setItem(AFK_STATE_KEY, JSON.stringify(newState));
        localStorage.removeItem(AFK_NEXT_REFRESH_KEY);
        const mins = Math.round(runMs / 60000);
        document.getElementById('msg').textContent = `AFK: Running ${subMode} ${mins}m`;
        trainingMode = subMode;
        localStorage.setItem("PQ_BOT_MODE", subMode);
        updateHUD();
        if (settingsDiv.style.display !== "none") renderSettingsPanel();
        await sleep(3000, 5000);
        if (subMode === "SEWER") sewerLoop();
        else if (subMode === "PSYCHO") psychoLoop();
        else trainerLoop();
        return;
      }

      // Navigate to training page for safe cooldown waiting
      if (!window.location.href.includes("on=train")) {
        document.getElementById('msg').textContent = "AFK: Cooldown - going to train...";
        window.location.href = TRAINING_URL;
        return;
      }

      const remaining = afkState.endTime - now;
      const remainMins = Math.round(remaining / 60000);
      document.getElementById('msg').textContent = `AFK: Cooldown (${remainMins}m left)`;

      // Anti-logout: refresh every 8-10 minutes
      let nextRefreshTs = parseInt(localStorage.getItem(AFK_NEXT_REFRESH_KEY) || "0");
      if (!nextRefreshTs) {
        nextRefreshTs = now + Math.random() * 2 * 60000 + 8 * 60000;
        localStorage.setItem(AFK_NEXT_REFRESH_KEY, nextRefreshTs.toString());
      }
      if (now >= nextRefreshTs) {
        localStorage.removeItem(AFK_NEXT_REFRESH_KEY);
        document.getElementById('msg').textContent = `AFK: Cooldown - refreshing...`;
        setTimeout(() => location.reload(), 1000);
        return;
      }

      // Schedule next check at whichever comes first: cooldown end, refresh, or 30s poll
      const msUntilRefresh = nextRefreshTs - now;
      const waitMs = Math.min(remaining, msUntilRefresh, 30000);
      setTimeout(afkLoop, waitMs);
    }
  }

  // --- TRAINER LOOP ---
  async function trainerLoop() {
    if (!trainingActive) return;

    // If in attack mode, don't run trainer
    if (isInAttackMode()) return;

    // If in SEWER mode, run sewer loop instead
    if (trainingMode === "SEWER") {
      sewerLoop();
      return;
    }

    // If in PSYCHO mode, run psycho loop instead
    if (trainingMode === "PSYCHO") {
      psychoLoop();
      return;
    }

    // If AFK mode somehow ends up here, redirect
    if (trainingMode === "AFK") {
      afkLoop();
      return;
    }

    // Check if AFK run timer has expired (sub-mode was SNUFF/PASSIVE/ATTACK)
    if (checkAfkExpiry()) return;

    // Make sure we're on the training page
    if (!window.location.href.includes("on=train")) {
      console.log("Not on training page, redirecting...");
      document.getElementById('msg').textContent = "Redirecting to Training...";
      await sleep(2000, 4000);
      window.location.href = TRAINING_URL;
      return;
    }

    if (isHospitalized()) {
      document.getElementById('msg').textContent = "Injured: Paused";
      return;
    }

    if (getCaptchaElements()) return;

    // Check hitlist for ready targets before training (ATTACK mode only)
    // Only attack when 4 targets are ready (each attack = 25% energy, snuff = 100%)
    if (trainingMode === "ATTACK") {
      const readyTargets = getReadyTargets();
      if (readyTargets.length >= settings.attack_targetsNeeded) {
        document.getElementById('msg').textContent = `${readyTargets.length} targets ready! Attacking...`;
        await sleep(2000, 3000);
        startAttackSequence(readyTargets.slice(0, settings.attack_targetsNeeded));
        return;
      }
    }

    // Post-refresh handling
    if (localStorage.getItem("PQ_REFRESHED_TRAIN") === "true") {
      localStorage.removeItem("PQ_REFRESHED_TRAIN");
      document.getElementById('msg').textContent = "Human Delay...";
      await sleep(9000, 16000);
      if (currentStat === "even") { if (typeof split_points === "function") split_points(); }
      else { if (typeof use_all === "function") use_all(currentStat); }
      await sleep(2000, 3500);
      if (typeof train === "function") train();
      await sleep(7000, 10000);
    }

    const bar = document.getElementById("prog-bar-energy");
    const pct = bar ? parseInt(bar.style.width) || 0 : 0;
    document.getElementById("energy-pct").textContent = pct + "%";

    // Skip training if stat is "none" (just watch hitlist in ATTACK mode)
    if (currentStat === "none") {
      document.getElementById('msg').textContent = "Watching Hitlist...";
      // Still continue the loop to check for ready targets
    }
    // Energy-based reload for Passive mode
    else if (trainingMode === "PASSIVE" && pct >= settings.passive_energyThreshold) {
      await sleep(settings.passive_reloadDelayMin, settings.passive_reloadDelayMax);
      localStorage.setItem("PQ_REFRESHED_TRAIN", "true");
      location.reload();
      return;
    }
    else if (trainingMode === "SNUFF" || trainingMode === "ATTACK") {
      // Order: Snuff (energy) → Assign stats → Train → Loop
      const tDMin = trainingMode === "ATTACK" ? settings.attack_trainDelayMin : settings.snuff_trainDelayMin;
      const tDMax = trainingMode === "ATTACK" ? settings.attack_trainDelayMax : settings.snuff_trainDelayMax;

      // 1. Use snuff to fill energy
      if (useSnuff()) {
        localStorage.removeItem(AFK_NO_SNUFF_KEY); // reset no-snuff counter on success
        await sleep(settings.snuff_snuffDelayMin, settings.snuff_snuffDelayMax);
      } else {
        // Track consecutive no-snuff ticks for AFK auto-switch to PASSIVE
        let afkRunState;
        try { afkRunState = JSON.parse(localStorage.getItem(AFK_STATE_KEY) || "null"); } catch(e) { afkRunState = null; }
        if (afkRunState && afkRunState.phase === "run") {
          const noSnuffCount = parseInt(localStorage.getItem(AFK_NO_SNUFF_KEY) || "0") + 1;
          localStorage.setItem(AFK_NO_SNUFF_KEY, noSnuffCount.toString());
          if (noSnuffCount >= 3) {
            // No snuff available - switch AFK sub-mode to PASSIVE
            afkRunState.subMode = "PASSIVE";
            localStorage.setItem(AFK_STATE_KEY, JSON.stringify(afkRunState));
            localStorage.removeItem(AFK_NO_SNUFF_KEY);
            document.getElementById('msg').textContent = "AFK: No snuff! Switching to PASSIVE...";
            trainingMode = "PASSIVE";
            localStorage.setItem("PQ_BOT_MODE", "PASSIVE");
            updateHUD();
            await sleep(2000, 3000);
            window.location.href = TRAINING_URL;
            return;
          }
        }
      }

      // 2. Assign stat points
      if (currentStat === "even") { if (typeof split_points === "function") split_points(); }
      else { if (typeof use_all === "function") use_all(currentStat); }
      await sleep(settings.snuff_assignDelayMin, settings.snuff_assignDelayMax);

      // 3. Train
      if (typeof train === "function") train();
      setTimeout(updateStatsIfTracking, 3000); // update stats HUD after AJAX settles
      await sleep(tDMin, tDMax);
    }

    setTimeout(trainerLoop, settings.snuff_loopInterval);
  }

  // --- SHARED HELPERS ---
  function isHospitalized() {
    const hospTimer = document.getElementById('timeUpdateInner_hospital');
    return hospTimer && hospTimer.textContent.trim() !== "";
  }

  function checkCaptchaWait(msg) {
    if (waitingForResume || getCaptchaElements()) {
      document.getElementById('msg').textContent = msg;
      waitingForResume = true;
      return true;
    }
    return false;
  }

  function useSnuff() {
    const itemBox = document.getElementById("itemID");
    if (itemBox && [...itemBox.options].some(o => o.text.includes("Snuff"))) {
      if (typeof UseItem === "function") UseItem("max");
      return true;
    }
    return false;
  }

  // --- SEWER HELPERS ---
  function getHpPercent() {
    const bar = document.getElementById("prog-bar-hp");
    return bar ? parseInt(bar.style.width) || 0 : 100;
  }

  function getEnergyPercent() {
    const bar = document.getElementById("prog-bar-energy");
    return bar ? parseInt(bar.style.width) || 0 : 0;
  }

  function getGold() {
    // Gold element: <a id="coinsupd">$16,340</a>
    const el = document.getElementById("coinsupd");
    if (!el) return 0;
    // Strip $ and commas, parse as integer
    const text = el.textContent.replace(/[$,]/g, "");
    return parseInt(text) || 0;
  }

  // --- SEWER LOOP ---
  async function sewerLoop() {
    if (!trainingActive) return;
    if (trainingMode !== "SEWER") return;
    if (checkAfkExpiry()) return;

    // If in hitlist attack mode, don't run sewer
    if (isInAttackMode()) return;

    const currentUrl = window.location.href;
    const onSewerPage = currentUrl.includes("on=attacknpc");
    const onTrainPage = currentUrl.includes("on=train");
    const onBankPage = currentUrl.includes("on=myprofile");
    const onMarketPage = currentUrl.includes("on=item_market");

    // Handle snuff buying flow - we're on item_market to buy snuff
    if (onMarketPage && localStorage.getItem(SEWER_BUY_SNUFF_KEY) === "true") {
      console.log("On market page for sewer snuff purchase");
      document.getElementById('msg').textContent = "Buying Snuff...";

      await sleep(2000, 3000);

      // Select edibles category (category 3)
      if (typeof upItemMarket === "function") {
        upItemMarket("category=3");
        await sleep(2000, 3000);
      }

      // Find snuff in the market table
      const table = document.querySelector('table.dark_utable');
      let snuffRow = null;
      if (table) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const itemCell = row.querySelector('td.dcol1');
          if (itemCell) {
            const itemLink = itemCell.querySelector('a.item_view');
            if (itemLink && itemLink.textContent.trim() === "Snuff") {
              snuffRow = row;
              break;
            }
          }
        }
      }

      if (snuffRow) {
        // Get price and buy action
        const priceCell = snuffRow.querySelector('td.dcol2, td.dcol2a');
        const buyButton = snuffRow.querySelector('td.dcol4 a[href*="action=buy"]');

        if (priceCell && buyButton) {
          const price = parseInt(priceCell.textContent.replace(/[$,]/g, '')) || 0;
          const buyHref = buyButton.getAttribute('href');
          const match = buyHref.match(/upItemMarket\('([^']+)'\)/);
          const gold = getGold();

          if (match && price > 0 && gold >= price) {
            const maxQty = Math.floor(gold / price);
            console.log("Snuff found: $" + price + " x " + maxQty);
            document.getElementById('msg').textContent = `Buying ${maxQty} Snuff @ $${price}...`;

            // Open buy dialog
            if (typeof upItemMarket === "function") {
              upItemMarket(match[1]);
              await sleep(2000, 3000);

              // Set quantity and click buy
              try {
                const qtyInput = document.getElementById('quantity');
                if (qtyInput) {
                  qtyInput.value = maxQty;
                  await sleep(1000, 2000);
                  const buyBtn = document.getElementById('buy');
                  if (buyBtn) {
                    buyBtn.click();
                    console.log("Snuff purchase submitted: " + maxQty + " units");
                    await sleep(2000, 3000);
                  }
                }
              } catch (e) {
                console.error("Snuff buy error:", e);
              }
            }
          } else {
            console.log("Cannot afford snuff or no buy action");
          }
        } else {
          console.log("Snuff row found but missing price/buy button");
        }
      } else {
        console.log("No snuff available on market");
      }

      // Set cooldown regardless of success (don't spam the market)
      localStorage.setItem(SEWER_SNUFF_COOLDOWN_KEY, (Date.now() + settings.sewer_snuffCooldown * 60 * 1000).toString());
      localStorage.removeItem(SEWER_BUY_SNUFF_KEY);
      document.getElementById('msg').textContent = "Back to Sewer...";
      await sleep(2000, 4000);
      window.location.href = SEWER_URL;
      return;
    }

    // Handle deposit flow - we're on myprofile to deposit gold
    if (onBankPage && localStorage.getItem(SEWER_DEPOSIT_KEY) === "true") {
      console.log("On bank page for sewer gold deposit");
      document.getElementById('msg').textContent = "Depositing Gold...";

      await sleep(2000, 4000);

      // Find deposit input and set to max, then click deposit
      const depositInput = document.getElementById("deposit");
      if (depositInput) {
        // Get current gold amount and deposit all
        const gold = getGold();
        depositInput.value = gold.toString();
        await sleep(1000, 2000);

        // Click deposit button - uses upBank('deposit', value, false)
        if (typeof upBank === "function") {
          upBank('deposit', depositInput.value, false);
        }
        await sleep(2000, 4000);
      }

      // Clear flag and return to sewer
      localStorage.removeItem(SEWER_DEPOSIT_KEY);
      document.getElementById('msg').textContent = "Deposit Done - Back to Sewer...";
      await sleep(2000, 4000);
      window.location.href = SEWER_URL;
      return;
    }

    // Check if we came from sewer to refill energy
    if (onTrainPage && localStorage.getItem(SEWER_REFILL_KEY) === "true") {
      console.log("On train page for sewer energy refill");
      document.getElementById('msg').textContent = "Refilling Energy...";

      if (isHospitalized()) {
        document.getElementById('msg').textContent = "Injured: Paused";
        setTimeout(sewerLoop, 5000);
        return;
      }

      if (checkCaptchaWait("Refill Captcha - Waiting for you...")) return;
      await sleep(3000, 5000);
      if (checkCaptchaWait("Refill Captcha - Waiting for you...")) return;

      if (useSnuff()) {
        localStorage.removeItem(SEWER_NO_SNUFF_KEY);
        await sleep(3000, 5000);
      } else {
        const noSnuffCount = parseInt(localStorage.getItem(SEWER_NO_SNUFF_KEY) || "0") + 1;
        localStorage.setItem(SEWER_NO_SNUFF_KEY, noSnuffCount.toString());
        console.log("Sewer: No snuff in inventory, refill attempt " + noSnuffCount + "/3");
        if (noSnuffCount >= 3) {
          localStorage.removeItem(SEWER_NO_SNUFF_KEY);
          localStorage.removeItem(SEWER_REFILL_KEY);
          let afkRunState;
          try { afkRunState = JSON.parse(localStorage.getItem(AFK_STATE_KEY) || "null"); } catch(e) { afkRunState = null; }
          if (afkRunState && afkRunState.phase === "run") {
            afkRunState.subMode = "PASSIVE";
            localStorage.setItem(AFK_STATE_KEY, JSON.stringify(afkRunState));
            document.getElementById('msg').textContent = "Sewer: No snuff! AFK → PASSIVE";
            trainingMode = "PASSIVE";
            localStorage.setItem("PQ_BOT_MODE", "PASSIVE");
            updateHUD();
          } else {
            document.getElementById('msg').textContent = "Sewer: No snuff! Bot paused.";
            trainingActive = false;
            localStorage.setItem("PQ_BOT_RUNNING", "false");
            updateHUD();
          }
          return;
        }
      }

      // Clear flag and return to sewer
      localStorage.removeItem(SEWER_REFILL_KEY);
      document.getElementById('msg').textContent = "Returning to Sewer...";
      await sleep(2000, 4000);
      window.location.href = SEWER_URL;
      return;
    }

    // If not on sewer page, redirect there
    if (!onSewerPage) {
      console.log("Not on sewer page, redirecting...");
      document.getElementById('msg').textContent = "Going to Sewer...";
      await sleep(2000, 4000);
      window.location.href = SEWER_URL;
      return;
    }

    if (isHospitalized()) {
      document.getElementById('msg').textContent = "Injured: Paused";
      setTimeout(sewerLoop, 5000);
      return;
    }

    if (checkCaptchaWait("Sewer Captcha - Waiting for you...")) return;

    // Check HP - if below 40%, wait for regen
    const hp = getHpPercent();
    if (hp < settings.sewer_hpThreshold) {
      document.getElementById('msg').textContent = `HP Low (${hp}%) - Waiting...`;
      setTimeout(sewerLoop, 10000); // Check again in 10 seconds
      return;
    }

    // Check energy - if below 5%, go refill
    const energy = getEnergyPercent();
    if (energy < settings.sewer_energyThreshold) {
      console.log("Energy too low, going to train for refill");
      document.getElementById('msg').textContent = "Energy Low - Refilling...";
      localStorage.setItem(SEWER_REFILL_KEY, "true");
      await sleep(2000, 4000);
      window.location.href = TRAINING_URL;
      return;
    }

    // Check gold - try to buy snuff first, then deposit
    const gold = getGold();

    // Buy snuff if gold is above snuff threshold and cooldown expired
    if (gold >= settings.sewer_snuffBuyThreshold) {
      const snuffCooldown = parseInt(localStorage.getItem(SEWER_SNUFF_COOLDOWN_KEY) || "0");
      if (Date.now() >= snuffCooldown) {
        console.log("Gold", gold, "- going to market for snuff");
        document.getElementById('msg').textContent = `Gold $${gold.toLocaleString()} - Buying Snuff...`;
        localStorage.setItem(SEWER_BUY_SNUFF_KEY, "true");
        await sleep(2000, 4000);
        window.location.href = MARKET_URL;
        return;
      }
    }

    // Deposit if over deposit threshold (snuff either on cooldown or gold exceeded deposit limit)
    if (gold > settings.sewer_goldThreshold) {
      console.log("Gold over threshold:", gold, "- going to bank");
      document.getElementById('msg').textContent = `Gold $${gold.toLocaleString()} - Depositing...`;
      localStorage.setItem(SEWER_DEPOSIT_KEY, "true");
      await sleep(2000, 4000);
      window.location.href = BANK_URL;
      return;
    }

    // All good - attack happened on page load, wait then reload for next fight
    document.getElementById('msg').textContent = `Sewer: HP ${hp}% | E ${energy}%`;
    await sleep(settings.sewer_fightDelayMin, settings.sewer_fightDelayMax);

    // Reload to attack again
    window.location.href = SEWER_URL;
  }

  // --- PSYCHO MODE ---
  function getPlayerIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/(?:id|user)=(\d+)/);
    return match ? match[1] : null;
  }

  function resetHitlistTimerForPlayer(playerId) {
    if (!playerId) return false;
    for (let url in linkDb) {
      const urlId = getPlayerIdFromUrl(url);
      if (urlId === playerId) {
        linkDb[url].timerStart = Date.now();
        localStorage.setItem(LINK_KEY, JSON.stringify(linkDb));
        renderLinks();
        return true;
      }
    }
    return false;
  }

  function getSearchUrl(page) {
    return PSYCHO_SEARCH_BASE + "&p=" + page;
  }

  function scrapeTargets() {
    const table = document.getElementById("fp");
    if (!table) return [];
    const rows = table.querySelectorAll("tr:not(.heading)");
    const targets = [];
    rows.forEach(row => {
      const levelCell = row.querySelector(".dcol2");
      const attackLink = row.querySelector('.dcol5 a[href*="on=attack"]');
      const nameLink = row.querySelector(".dcol1 a:last-of-type");
      if (!levelCell || !attackLink) return;
      const level = parseInt(levelCell.textContent) || 0;
      const href = attackLink.getAttribute("href");
      const url = href.startsWith("http") ? href : "https://www.piratequest.org/" + href;
      const name = nameLink ? nameLink.textContent.trim() : "Unknown";
      targets.push({ level, url, name });
    });
    return targets;
  }

  async function psychoLoop() {
    if (!trainingActive) return;
    if (trainingMode !== "PSYCHO") return;
    if (checkAfkExpiry()) return;
    if (isInAttackMode()) return;

    const currentUrl = window.location.href;
    const onSearchPage = currentUrl.includes("on=search");
    const onAttackPage = currentUrl.includes("on=attack") && !currentUrl.includes("on=attacknpc");
    const onTrainPage = currentUrl.includes("on=train");

    // --- SUPPORT TAB: Training page handles snuff refills ---
    if (onTrainPage) {
      psychoSupportLoop();
      return;
    }

    // --- ATTACK TAB: Search page ---
    if (onSearchPage) {
      if (checkCaptchaWait("PSYCHO Captcha - Waiting...")) return;

      // Check if we need snuff and are waiting for support tab (runs before cooldown AND search attacks)
      if (localStorage.getItem(PSYCHO_NEED_SNUFF_KEY) === "true") {
        if (localStorage.getItem(PSYCHO_SNUFF_DONE_KEY) === "true") {
          // Snuff is done, clear flags and continue
          localStorage.removeItem(PSYCHO_NEED_SNUFF_KEY);
          localStorage.removeItem(PSYCHO_SNUFF_DONE_KEY);
          localStorage.setItem(PSYCHO_ATTACKS_KEY, "0");
          document.getElementById('msg').textContent = "PSYCHO: Energy Refilled!";
          await sleep(2000, 3000);
        } else {
          // Still waiting for snuff
          document.getElementById('msg').textContent = "PSYCHO: Waiting for Snuff...";
          setTimeout(psychoLoop, 3000);
          return;
        }
      }

      // Check snuff needed before any attacks (every 4 attacks - covers both cooldown hitlist and search)
      const attacks = parseInt(localStorage.getItem(PSYCHO_ATTACKS_KEY) || "0");
      if (attacks >= settings.psycho_snuffEvery) {
        document.getElementById('msg').textContent = "PSYCHO: Need Snuff - Signaling...";
        localStorage.setItem(PSYCHO_NEED_SNUFF_KEY, "true");
        localStorage.removeItem(PSYCHO_SNUFF_DONE_KEY);
        setTimeout(psychoLoop, 3000);
        return;
      }

      // Check cooldown - if cycle is done, attack hitlist targets or wait
      if (localStorage.getItem(PSYCHO_CYCLE_DONE_KEY) === "true") {
        const firstAttack = parseInt(localStorage.getItem(PSYCHO_FIRST_ATTACK_KEY) || "0");
        const elapsed = Date.now() - firstAttack;
        const remaining = (settings.psycho_cooldownMin * 60 * 1000) - elapsed;

        if (remaining > 0) {
          // During cooldown, check hitlist for ready targets (one at a time, snuff managed above)
          const readyTargets = getReadyTargets();
          if (readyTargets.length > 0) {
            document.getElementById('msg').textContent = `PSYCHO Cooldown: Hitting ${readyTargets.length} hitlist target(s)...`;
            await sleep(2000, 4000);
            window.location.href = readyTargets[0];
            return;
          }

          const mins = Math.floor(remaining / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          document.getElementById('msg').textContent = `PSYCHO Cooldown: ${mins}:${secs.toString().padStart(2, "0")} | No hitlist ready`;
          setTimeout(psychoLoop, 10000);
          return;
        }

        // Cooldown over - start new cycle
        localStorage.removeItem(PSYCHO_CYCLE_DONE_KEY);
        localStorage.removeItem(PSYCHO_FIRST_ATTACK_KEY);
        localStorage.setItem(PSYCHO_PAGE_KEY, "1");
        localStorage.setItem(PSYCHO_INDEX_KEY, "0");
        localStorage.setItem(PSYCHO_ATTACKS_KEY, "0");
      }

      // Scrape targets from table
      const targets = scrapeTargets();
      const page = parseInt(localStorage.getItem(PSYCHO_PAGE_KEY) || "1");
      const index = parseInt(localStorage.getItem(PSYCHO_INDEX_KEY) || "0");

      document.getElementById('msg').textContent = `PSYCHO: Page ${page} | Target ${index + 1}/${targets.length}`;

      if (targets.length === 0) {
        // No targets on this page, might be empty or error
        document.getElementById('msg').textContent = "PSYCHO: No targets found";
        setTimeout(psychoLoop, 5000);
        return;
      }

      // Check if we've finished this page
      if (index >= targets.length) {
        // Move to next page
        const nextPage = page + 1;
        localStorage.setItem(PSYCHO_PAGE_KEY, nextPage.toString());
        localStorage.setItem(PSYCHO_INDEX_KEY, "0");
        document.getElementById('msg').textContent = `PSYCHO: Moving to page ${nextPage}...`;
        await sleep(3000, 5000);
        window.location.href = getSearchUrl(nextPage);
        return;
      }

      const target = targets[index];

      // Check if target level exceeds max - cycle complete
      if (target.level > settings.psycho_maxLevel) {
        console.log("PSYCHO: Level", target.level, "exceeds max", settings.psycho_maxLevel, "- cycle complete");
        // Only set first attack time if not already set (preserve from cycle start)
        if (!localStorage.getItem(PSYCHO_FIRST_ATTACK_KEY)) {
          localStorage.setItem(PSYCHO_FIRST_ATTACK_KEY, Date.now().toString());
        }
        localStorage.setItem(PSYCHO_CYCLE_DONE_KEY, "true");
        localStorage.setItem(PSYCHO_PAGE_KEY, "1");
        localStorage.setItem(PSYCHO_INDEX_KEY, "0");
        document.getElementById('msg').textContent = "PSYCHO: Cycle Done - Cooldown Starting...";
        await sleep(3000, 5000);
        window.location.href = getSearchUrl(1);
        return;
      }

      // Record first attack time for cooldown tracking
      if (!localStorage.getItem(PSYCHO_FIRST_ATTACK_KEY)) {
        localStorage.setItem(PSYCHO_FIRST_ATTACK_KEY, Date.now().toString());
      }

      // Increment index for next return to search page
      localStorage.setItem(PSYCHO_INDEX_KEY, (index + 1).toString());

      // Navigate to attack target
      document.getElementById('msg').textContent = `PSYCHO: Attacking ${target.name} (Lv${target.level})...`;
      await sleep(2000, 4000);
      window.location.href = target.url;
      return;
    }

    // --- ATTACK TAB: Attack result page ---
    if (onAttackPage) {
      if (checkCaptchaWait("PSYCHO Captcha - Waiting...")) return;

      // Increment attack counter
      const attacks = parseInt(localStorage.getItem(PSYCHO_ATTACKS_KEY) || "0");
      localStorage.setItem(PSYCHO_ATTACKS_KEY, (attacks + 1).toString());

      // Check if attacked player is on hitlist - reset their timer
      const attackedId = getPlayerIdFromUrl(currentUrl);
      if (attackedId && resetHitlistTimerForPlayer(attackedId)) {
        console.log("PSYCHO: Reset hitlist timer for player", attackedId);
      }

      const page = localStorage.getItem(PSYCHO_PAGE_KEY) || "1";
      const index = localStorage.getItem(PSYCHO_INDEX_KEY) || "0";
      document.getElementById('msg').textContent = `PSYCHO: Kill Done (${attacks + 1}/${settings.psycho_snuffEvery}) - Returning...`;

      // Wait 5-8 seconds (game enforces min 5s between attacks)
      await sleep(settings.psycho_attackDelayMin, settings.psycho_attackDelayMax);

      // Navigate back to search page
      window.location.href = getSearchUrl(parseInt(page));
      return;
    }

    // Not on a recognized PSYCHO page - redirect to search
    if (!onSearchPage && !onAttackPage && !onTrainPage) {
      document.getElementById('msg').textContent = "PSYCHO: Going to Search...";
      const page = localStorage.getItem(PSYCHO_PAGE_KEY) || "1";
      await sleep(2000, 4000);
      window.location.href = getSearchUrl(parseInt(page));
    }
  }

  // --- PSYCHO SUPPORT LOOP (runs on training page) ---
  async function psychoSupportLoop() {
    if (!trainingActive) return;
    if (trainingMode !== "PSYCHO") return;

    if (checkCaptchaWait("PSYCHO Support: Captcha - Waiting...")) return;

    // Check if attack tab needs snuff
    if (localStorage.getItem(PSYCHO_NEED_SNUFF_KEY) === "true" && localStorage.getItem(PSYCHO_SNUFF_DONE_KEY) !== "true") {
      document.getElementById('msg').textContent = "PSYCHO Support: Using Snuff...";
      await sleep(2000, 3000);
      if (useSnuff()) await sleep(3000, 5000);

      localStorage.setItem(PSYCHO_SNUFF_DONE_KEY, "true");
      document.getElementById('msg').textContent = "PSYCHO Support: Snuff Done!";
      setTimeout(psychoSupportLoop, 3000);
      return;
    }

    // Idle - waiting for signal
    const attacks = localStorage.getItem(PSYCHO_ATTACKS_KEY) || "0";
    const cycleDone = localStorage.getItem(PSYCHO_CYCLE_DONE_KEY) === "true";
    document.getElementById('msg').textContent = cycleDone
      ? "PSYCHO Support: Cooldown..."
      : `PSYCHO Support: Standby (${attacks}/${settings.psycho_snuffEvery})`;

    // Refresh train page every 60s to prevent website timeout
    const lastRefresh = parseInt(localStorage.getItem(PSYCHO_SUPPORT_REFRESH_KEY) || "0");
    if (Date.now() - lastRefresh > 60000) {
      localStorage.setItem(PSYCHO_SUPPORT_REFRESH_KEY, Date.now().toString());
      location.reload();
      return;
    }

    setTimeout(psychoSupportLoop, 3000);
  }

  // --- KEYBOARD SHORTCUTS ---
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !e.shiftKey) return;

    const key = e.key.toLowerCase();
    if (e.shiftKey && key === "m") {
      // Clear AFK state on any manual mode switch
      localStorage.removeItem(AFK_STATE_KEY);
      localStorage.removeItem(AFK_NEXT_REFRESH_KEY);
      localStorage.removeItem(AFK_NO_SNUFF_KEY);
      // Cycle through modes: SNUFF -> PASSIVE -> ATTACK -> SEWER -> PSYCHO -> AFK -> SNUFF
      if (trainingMode === "SNUFF") trainingMode = "PASSIVE";
      else if (trainingMode === "PASSIVE") trainingMode = "ATTACK";
      else if (trainingMode === "ATTACK") trainingMode = "SEWER";
      else if (trainingMode === "SEWER") trainingMode = "PSYCHO";
      else if (trainingMode === "PSYCHO") trainingMode = "AFK";
      else trainingMode = "SNUFF";
      localStorage.setItem("PQ_BOT_MODE", trainingMode);
      updateHUD();
      if (settingsDiv.style.display !== "none") renderSettingsPanel();
    }

    const stats = { s: "str", d: "def", f: "spd", e: "even", n: "none" };
    if (e.shiftKey && stats[key]) {
      currentStat = stats[key];
      localStorage.setItem("PQ_BOT_STAT", currentStat);
      updateHUD();
      const statSel = document.getElementById("cfg-stat-select");
      if (statSel) statSel.value = currentStat;
    }
  });

  // --- INIT ---
  // tools-btn handler is registered inline during renderToolsPanel()
  document.getElementById("start-stop-btn").onclick = () => {
    trainingActive = !trainingActive;
    localStorage.setItem("PQ_BOT_RUNNING", trainingActive);
    updateHUD();
    if (trainingActive) {
      if (trainingMode === "SEWER") sewerLoop();
      else if (trainingMode === "PSYCHO") psychoLoop();
      else if (trainingMode === "AFK") afkLoop();
      else trainerLoop();
    }
  };

  setInterval(backgroundSolver, 2000);
  setInterval(updateHUD, 2000); // Update HUD every 2 seconds for energy/HP
  updateHUD();
  injectTopBar();

  // Run equipment calculator on inventory page
  if (window.location.href.includes("on=inventory")) { runEquipmentCalc(); runInventoryCalc(); }

  // --- AUTO SELL FLOW ---
  (function () {
    const active = localStorage.getItem("PQ_AUTOSELL_ACTIVE") === "true";
    const sold = localStorage.getItem("PQ_AUTOSELL_SOLD") === "true";
    if (!active && !sold) return;

    const _aCount = parseInt(localStorage.getItem("PQ_AUTOSELL_COUNT") || "0");
    const queue = [];
    for (let i = 0; i < _aCount; i++) { const v = localStorage.getItem("PQ_AUTOSELL_" + i); if (v) queue.push(v); }

    if (sold) {
      localStorage.removeItem("PQ_AUTOSELL_SOLD");
      queue.shift();
      const nextDelay = Math.floor(Math.random() * 1500) + 1000; // 1-2.5s between items
      if (queue.length > 0) {
        for (let i = 0; i < queue.length; i++) localStorage.setItem("PQ_AUTOSELL_" + i, queue[i]);
        localStorage.setItem("PQ_AUTOSELL_COUNT", queue.length.toString());
        setTimeout(() => { window.location.href = queue[0]; }, nextDelay);
      } else {
        for (let i = 0; i < _aCount; i++) localStorage.removeItem("PQ_AUTOSELL_" + i);
        localStorage.removeItem("PQ_AUTOSELL_COUNT");
        localStorage.removeItem("PQ_AUTOSELL_ACTIVE");
        setTimeout(() => { window.location.href = "https://www.piratequest.org/index.php?on=inventory"; }, nextDelay);
      }
      return;
    }

    // On a sell page — wait for page to fully load then click sell button
    if (active && window.location.href.includes("action=sell")) {
      const delay = Math.floor(Math.random() * 1500) + 1500; // 1.5-3s
      setTimeout(() => {
        const sellBtn = document.querySelector('input[type="submit"][name="sell"]');
        if (sellBtn) {
          window.confirm = () => true;
          localStorage.setItem("PQ_AUTOSELL_SOLD", "true");
          sellBtn.click();
        }
      }, delay);
    }
  })();

  // Inject inline stats panel on training page + hook manual train button
  if (window.location.href.includes("on=train")) {
    injectInlineStatsPanel();
    const trainBtn = document.getElementById("train_btn");
    if (trainBtn) trainBtn.addEventListener("click", () => setTimeout(updateStatsIfTracking, 3000));
  }

  // Check if we're in attack mode (continuing attack sequence)
  const inAttackMode = handleAttackModeOnLoad();

  // Start appropriate loop based on mode
  if (!inAttackMode) {
    if (trainingMode === "SEWER") {
      sewerLoop();
    } else if (trainingMode === "PSYCHO") {
      psychoLoop();
    } else if (trainingMode === "AFK") {
      afkLoop();
    } else {
      trainerLoop();
    }
  }
})();
