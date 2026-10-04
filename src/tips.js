'use strict';
const games = {
  "idle": {
    "name": "Ready to play",
    "color": "#56d9ff",
    "tips": [
      "Drag me anywhere. Double-click to talk.",
      "Use borderless windowed mode to keep me visible.",
      "Ctrl+Shift+M mutes me. Ctrl+Shift+H hides me."
    ]
  },
  "lol": {
    "name": "League of Legends",
    "color": "#c89b3c",
    "tips": [
      "Check the minimap between last hits. Information wins games too.",
      "Before contesting an objective, check vision, waves and teammates.",
      "A timely retreat preserves gold and pressure.",
      "In a difficult lane, prioritize experience and safe farming.",
      "Communicate your plan with clear, brief pings."
    ]
  },
  "valorant": {
    "name": "VALORANT",
    "color": "#ff4655",
    "tips": [
      "Keep your crosshair at head height.",
      "Agree on the buy with your team before spending.",
      "Use utility to support a teammate entering a site.",
      "After revealing your position, consider another angle."
    ]
  },
  "cs2": {
    "name": "Counter-Strike 2",
    "color": "#f5a623",
    "tips": [
      "Stop moving before shooting to improve accuracy.",
      "Throw grenades with a purpose.",
      "Coordinate economy and purchases with your team.",
      "Avoid peeking one by one when you could trade together."
    ]
  },
  "fortnite": {
    "name": "Fortnite",
    "color": "#9d4dbb",
    "tips": [
      "Check the next zone before starting a long fight.",
      "Keep a mobility option to escape trouble when available.",
      "Find cover before healing.",
      "Keep your inventory organized consistently."
    ]
  },
  "minecraft": {
    "name": "Minecraft",
    "color": "#5fbf3f",
    "tips": [
      "Bring food, torches and blocks before exploring.",
      "Write down your base coordinates.",
      "Store valuables before an expedition.",
      "Light up the area around your shelter."
    ]
  },
  "cuphead": {
    "name": "Cuphead",
    "color": "#70d9ff",
    "tips": [
      "Use a few attempts to observe attacks before chasing damage.",
      "Tell me the boss and the attack giving you trouble for a focused tip.",
      "Try a different loadout if your current approach keeps failing.",
      "Take a short break after repeated attempts."
    ]
  },
  "roblox": {
    "name": "Roblox",
    "color": "#00a2ff",
    "tips": [
      "Check the controls and objectives of each experience.",
      "Never share your password or account codes.",
      "Explore the tutorial before spending resources.",
      "Find a safe spot before taking a break."
    ]
  },
  "steam": {
    "name": "Steam",
    "color": "#66c0f4",
    "tips": [
      "Adjust sensitivity until movement feels comfortable.",
      "Check controls and accessibility settings.",
      "After several attempts, a break can reveal another solution.",
      "If manual saves are available, save before trying something risky."
    ]
  }
};
class TipBag {
  constructor(random = Math.random) { this.random = random; this.bags = new Map(); this.last = new Map(); }
  next(key) {
    key = games[key] ? key : 'steam';
    let bag = this.bags.get(key);
    if (!bag?.length) {
      bag = [...games[key].tips];
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag.at(-1) === this.last.get(key)) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      this.bags.set(key, bag);
    }
    const tip = bag.pop(); this.last.set(key, tip); return tip;
  }
}
module.exports = { games, TipBag };
