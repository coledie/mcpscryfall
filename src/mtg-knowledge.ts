/**
 * Magic: The Gathering Knowledge Base for MCP Server
 * This class provides comprehensive MTG terminology, rules, and concepts
 */

export class MTGKnowledgeBase {
  private readonly cardTypes = {
    basic: ['creature', 'instant', 'sorcery', 'artifact', 'enchantment', 'planeswalker', 'land', 'tribal'],
    supertypes: ['basic', 'legendary', 'snow', 'world'],
    subtypes: {
      artifact: ['equipment', 'vehicle', 'fortification', 'contraption'],
      creature: [
        // Races
        'human', 'elf', 'goblin', 'angel', 'demon', 'dragon', 'zombie', 'vampire', 
        'spirit', 'beast', 'dwarf', 'orc', 'troll', 'giant', 'elemental', 'construct',
        'golem', 'horror', 'illusion', 'merfolk', 'faerie', 'kithkin', 'kor', 'vedalken',
        
        // Classes  
        'warrior', 'wizard', 'knight', 'soldier', 'shaman', 'rogue', 'cleric', 'archer',
        'berserker', 'druid', 'monk', 'ninja', 'pirate', 'pilot', 'assassin', 'advisor',
        'artificer', 'barbarian', 'bard', 'scout', 'spellshaper', 'minion'
      ],
      land: ['plains', 'island', 'swamp', 'mountain', 'forest', 'desert', 'gate', 'locus'],
      enchantment: ['aura', 'cartouche', 'curse', 'saga', 'shrine'],
      instant: ['adventure', 'arcane', 'trap'],
      sorcery: ['adventure', 'arcane', 'lesson']
    }
  };

  private readonly keywordAbilities = {
    evergreen: [
      'flying', 'first strike', 'double strike', 'deathtouch', 'haste', 'hexproof',
      'indestructible', 'lifelink', 'menace', 'reach', 'trample', 'vigilance', 'ward'
    ],
    nonEvergreen: [
      'flashback', 'scry', 'convoke', 'delve', 'cycling', 'kicker', 'morph', 'suspend',
      'echo', 'buyback', 'madness', 'threshold', 'storm', 'affinity', 'dredge',
      'bloodthirst', 'unleash', 'evolve', 'cipher', 'bestow', 'prowess', 'dash',
      'exploit', 'megamorph', 'awaken', 'surge', 'skulk', 'emerge', 'escalate',
      'crew', 'fabricate', 'energy', 'revolt', 'improvise', 'aftermath', 'embalm',
      'eternalize', 'afflict', 'ascend', 'jump-start', 'mentor', 'undergrowth',
      'surveil', 'spectacle', 'riot', 'addendum', 'afterlife', 'amass', 'escape',
      'companion', 'mutate', 'cycling', 'kicker', 'landfall', 'party', 'foretell',
      'boast', 'disturb', 'cleave', 'training', 'decayed', 'daybound', 'nightbound'
    ]
  };

  private readonly gameZones = [
    'battlefield', 'graveyard', 'hand', 'library', 'exile', 'stack', 'command'
  ];

  private readonly gameActions = [
    'cast', 'play', 'activate', 'attack', 'block', 'tap', 'untap', 'destroy', 
    'exile', 'return', 'search', 'sacrifice', 'discard', 'draw', 'mill',
    'scry', 'surveil', 'explore', 'adapt', 'monstrosity'
  ];

  private readonly colorIdentities = {
    single: {
      'white': 'w', 'blue': 'u', 'black': 'b', 'red': 'r', 'green': 'g'
    },
    guilds: {
      'azorius': 'wu', 'dimir': 'ub', 'rakdos': 'br', 'gruul': 'rg', 'selesnya': 'gw',
      'orzhov': 'wb', 'izzet': 'ur', 'golgari': 'bg', 'boros': 'rw', 'simic': 'gu'
    },
    shards: {
      'bant': 'gwu', 'esper': 'wub', 'grixis': 'ubr', 'jund': 'brg', 'naya': 'rgw'  
    },
    wedges: {
      'abzan': 'wbg', 'jeskai': 'urw', 'sultai': 'bgu', 'mardu': 'rwb', 'temur': 'gur'
    }
  };

  private readonly formatLegality = {
    constructed: ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper', 'historic'],
    limited: ['draft', 'sealed'],
    casual: ['commander', 'edh', 'brawl', 'oathbreaker', '60-card-casual']
  };

  private readonly commonTerms = {
    deckTypes: [
      'aggro', 'control', 'midrange', 'combo', 'tempo', 'ramp', 'mill', 'burn',
      'tribal', 'toolbox', 'prison', 'stax', 'storm', 'dredge', 'reanimator',
      'delver', 'voltron', 'group hug', 'pillowfort', 'aristocrats'
    ],
    cardAdvantage: [
      'card advantage', 'tempo', 'value', '2-for-1', 'cantrip', 'card selection',
      'card quality', 'virtual card advantage', 'board presence'
    ],
    slang: [
      'etb', 'ltb', 'eot', 'eob', 'gy', 'cmc', 'p/t', 'rtfc', 'bolt', 'doom blade',
      'wrath', 'tutor', 'ramp', 'dork', 'lord', 'hate bear', 'french vanilla'
    ]
  };

  /**
   * Get comprehensive knowledge about a specific MTG concept
   */
  public getKnowledge(query: string): MTGKnowledgeResult {
    const lowerQuery = query.toLowerCase();
    const results: MTGKnowledgeResult = {
      found: false,
      categories: [],
      suggestions: []
    };

    // Check card types
    if (this.cardTypes.basic.includes(lowerQuery)) {
      results.found = true;
      results.categories.push({
        category: 'Card Type',
        information: this.getCardTypeInfo(lowerQuery),
        examples: this.getCardTypeExamples(lowerQuery)
      });
    }

    // Check keyword abilities  
    const allKeywords = [...this.keywordAbilities.evergreen, ...this.keywordAbilities.nonEvergreen];
    if (allKeywords.includes(lowerQuery)) {
      results.found = true;
      results.categories.push({
        category: 'Keyword Ability',
        information: this.getKeywordInfo(lowerQuery),
        examples: this.getKeywordExamples(lowerQuery)
      });
    }

    // Check color combinations
    const allColors = {
      ...this.colorIdentities.single,
      ...this.colorIdentities.guilds,
      ...this.colorIdentities.shards,
      ...this.colorIdentities.wedges
    };
    if (allColors[lowerQuery as keyof typeof allColors]) {
      results.found = true;
      results.categories.push({
        category: 'Color Identity', 
        information: this.getColorInfo(lowerQuery),
        examples: this.getColorExamples(lowerQuery)
      });
    }

    // Check formats
    const allFormats = [...this.formatLegality.constructed, ...this.formatLegality.limited, ...this.formatLegality.casual];
    if (allFormats.includes(lowerQuery)) {
      results.found = true;
      results.categories.push({
        category: 'Format',
        information: this.getFormatInfo(lowerQuery),
        examples: this.getFormatExamples(lowerQuery)
      });
    }

    // Check deck archetypes
    if (this.commonTerms.deckTypes.includes(lowerQuery)) {
      results.found = true;
      results.categories.push({
        category: 'Deck Archetype',
        information: this.getDeckTypeInfo(lowerQuery),
        examples: this.getDeckTypeExamples(lowerQuery)
      });
    }

    // Generate suggestions if nothing found
    if (!results.found) {
      results.suggestions = this.generateSuggestions(lowerQuery);
    }

    return results;
  }

  /**
   * Get all available categories of MTG knowledge
   */
  public getAvailableCategories(): string[] {
    return [
      'Card Types', 'Keyword Abilities', 'Color Identities', 'Formats',
      'Deck Archetypes', 'Game Zones', 'Game Actions', 'Common Terms'
    ];
  }

  /**
   * Search for MTG terms that match a pattern
   */
  public searchTerms(pattern: string): MTGSearchResult[] {
    const results: MTGSearchResult[] = [];
    const lowerPattern = pattern.toLowerCase();

    // Search card types
    this.cardTypes.basic.forEach(type => {
      if (type.includes(lowerPattern)) {
        results.push({ term: type, category: 'Card Type', relevance: this.calculateRelevance(type, lowerPattern) });
      }
    });

    // Search keywords
    [...this.keywordAbilities.evergreen, ...this.keywordAbilities.nonEvergreen].forEach(keyword => {
      if (keyword.includes(lowerPattern)) {
        results.push({ term: keyword, category: 'Keyword Ability', relevance: this.calculateRelevance(keyword, lowerPattern) });
      }
    });

    // Search colors
    Object.keys({...this.colorIdentities.single, ...this.colorIdentities.guilds}).forEach(color => {
      if (color.includes(lowerPattern)) {
        results.push({ term: color, category: 'Color Identity', relevance: this.calculateRelevance(color, lowerPattern) });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }

  private getCardTypeInfo(type: string): string {
    const typeInfo: Record<string, string> = {
      'creature': 'Permanents that can attack and block. They have power and toughness.',
      'instant': 'Spells that can be cast at any time you have priority, including during combat and on opponents\' turns.',
      'sorcery': 'Spells that can only be cast during your main phases when the stack is empty.',
      'artifact': 'Permanents representing magical items. Many have activated abilities.',
      'enchantment': 'Permanents representing ongoing magical effects.',
      'planeswalker': 'Permanents representing powerful allies with loyalty abilities.',
      'land': 'Permanents that produce mana and enable casting other spells.',
      'tribal': 'Cards that have creature types but aren\'t necessarily creatures themselves.'
    };
    return typeInfo[type] || 'No information available.';
  }

  private getCardTypeExamples(type: string): string[] {
    const examples: Record<string, string[]> = {
      'creature': ['Lightning Bolt', 'Tarmogoyf', 'Snapcaster Mage'],
      'instant': ['Lightning Bolt', 'Counterspell', 'Path to Exile'],
      'sorcery': ['Wrath of God', 'Demonic Tutor', 'Time Walk'],
      'artifact': ['Sol Ring', 'Sword of Fire and Ice', 'Mox Ruby'],
      'enchantment': ['Rhystic Study', 'Smothering Tithe', 'Necropotence'],
      'planeswalker': ['Jace, the Mind Sculptor', 'Liliana of the Veil', 'Chandra, Torch of Defiance'],
      'land': ['Lightning Bolt', 'Fetch Lands', 'Shock Lands']
    };
    return examples[type] || [];
  }

  private getKeywordInfo(keyword: string): string {
    const keywordInfo: Record<string, string> = {
      'flying': 'This creature can only be blocked by creatures with flying or reach.',
      'trample': 'Excess combat damage is dealt to the defending player.',
      'deathtouch': 'Any amount of damage this deals to a creature destroys it.',
      'lifelink': 'Damage dealt by this source also causes you to gain that much life.',
      'haste': 'This creature can attack and use tap abilities the turn it enters.',
      'vigilance': 'This creature doesn\'t tap when attacking.',  
      'first strike': 'This creature deals combat damage before creatures without first strike.',
      'double strike': 'This creature deals first strike and regular combat damage.',
      'hexproof': 'This permanent can\'t be targeted by opponents\' spells or abilities.',
      'indestructible': 'This permanent can\'t be destroyed by damage or effects that say "destroy".',
      'menace': 'This creature can\'t be blocked except by two or more creatures.',
      'reach': 'This creature can block creatures with flying.',
      'ward': 'Whenever this becomes the target of a spell or ability an opponent controls, counter it unless they pay the ward cost.'
    };
    return keywordInfo[keyword] || 'Keyword ability with specific rules interactions.';
  }

  private getKeywordExamples(keyword: string): string[] {
    const examples: Record<string, string[]> = {
      'flying': ['Serra Angel', 'Delver of Secrets', 'Dragon Hatchling'],
      'trample': ['Tarmogoyf', 'Craterhoof Behemoth', 'Ghalta, Primal Hunger'],
      'deathtouch': ['Vampire Nighthawk', 'Deadly Recluse', 'Thornweald Archer'],
      'lifelink': ['Vampire Nighthawk', 'Baneslayer Angel', 'Rhox Faithmender'],
      'haste': ['Lightning Bolt', 'Goblin Guide', 'Dragon Hatchling']
    };
    return examples[keyword] || [];
  }

  private getColorInfo(color: string): string {
    const colorInfo: Record<string, string> = {
      'white': 'The color of order, peace, law, and structure. Focuses on small efficient creatures, lifegain, and removal.',
      'blue': 'The color of knowledge, logic, and control. Specializes in card draw, counterspells, and tempo.',
      'black': 'The color of power, ambition, and sacrifice. Uses life as a resource and excels at removal and recursion.',
      'red': 'The color of freedom, emotion, and chaos. Aggressive with direct damage and hasty creatures.',
      'green': 'The color of nature, growth, and instinct. Has the biggest creatures and mana acceleration.',
      'azorius': 'White-blue guild focused on control, law enforcement, and bureaucracy.',
      'dimir': 'Blue-black guild specializing in information, secrets, and manipulation.',
      'rakdos': 'Black-red guild of entertainment, chaos, and violent spectacle.',
      'gruul': 'Red-green guild embracing wild nature and anti-civilization sentiment.',
      'selesnya': 'Green-white guild promoting community, growth, and harmony.'
    };
    return colorInfo[color] || 'Color combination with specific mechanical identity.';
  }

  private getColorExamples(color: string): string[] {
    const examples: Record<string, string[]> = {
      'white': ['Wrath of God', 'Swords to Plowshares', 'Serra Angel'],
      'blue': ['Counterspell', 'Ancestral Recall', 'Jace, the Mind Sculptor'],
      'black': ['Dark Ritual', 'Necropotence', 'Liliana of the Veil'],
      'red': ['Lightning Bolt', 'Goblin Guide', 'Chandra, Torch of Defiance'],
      'green': ['Birds of Paradise', 'Tarmogoyf', 'Green Sun\'s Zenith']
    };
    return examples[color] || [];
  }

  private getFormatInfo(format: string): string {
    const formatInfo: Record<string, string> = {
      'standard': 'Rotating format using approximately the last 2 years of sets.',
      'modern': 'Non-rotating format using sets from 8th Edition/Mirrodin forward.',
      'legacy': 'Eternal format allowing all cards except those on the banned list.',
      'vintage': 'Eternal format allowing all cards, with some restricted to 1 copy.',
      'commander': '100-card singleton multiplayer format with a legendary commander.',
      'pauper': 'Format using only cards printed at common rarity.',
      'pioneer': 'Non-rotating format using sets from Return to Ravnica forward.'
    };
    return formatInfo[format] || 'Magic: The Gathering competitive format.';
  }

  private getFormatExamples(format: string): string[] {
    const examples: Record<string, string[]> = {
      'standard': ['Currently rotating sets', 'Balanced power level', 'FNM format'],
      'modern': ['Lightning Bolt legal', 'High power level', 'Large card pool'],
      'legacy': ['Force of Will legal', 'Very high power', 'Eternal format'],
      'commander': ['100 cards', 'Singleton', 'Multiplayer focused']
    };
    return examples[format] || [];
  }

  private getDeckTypeInfo(deckType: string): string {
    const deckInfo: Record<string, string> = {
      'aggro': 'Fast, aggressive strategy aiming to win quickly with efficient threats.',
      'control': 'Reactive strategy using counterspells and removal to win late game.',
      'midrange': 'Balanced approach with efficient threats and answers.',
      'combo': 'Deck built around specific card interactions to win instantly.',
      'tempo': 'Strategy focused on efficient plays that maintain pressure.',
      'ramp': 'Accelerates mana to cast expensive spells ahead of curve.',
      'mill': 'Wins by emptying opponent\'s library rather than dealing damage.',
      'burn': 'Direct damage strategy aiming to deal exactly 20 damage.'
    };
    return deckInfo[deckType] || 'Magic: The Gathering deck archetype.';
  }

  private getDeckTypeExamples(deckType: string): string[] {
    const examples: Record<string, string[]> = {
      'aggro': ['Red Deck Wins', 'White Weenie', 'Affinity'],
      'control': ['Blue-White Control', 'Esper Control', 'Counter-Top'],
      'combo': ['Storm', 'Dredge', 'Reanimator'],
      'midrange': ['Jund', 'Abzan', 'Sultai']
    };
    return examples[deckType] || [];
  }

  private generateSuggestions(query: string): string[] {
    const allTerms = [
      ...this.cardTypes.basic,
      ...this.keywordAbilities.evergreen,
      ...this.keywordAbilities.nonEvergreen.slice(0, 10), // Limit for performance
      ...Object.keys(this.colorIdentities.single),
      ...Object.keys(this.colorIdentities.guilds),
      ...this.commonTerms.deckTypes.slice(0, 10)
    ];

    return allTerms
      .filter(term => term.includes(query) || query.includes(term))
      .slice(0, 5);
  }

  private calculateRelevance(term: string, pattern: string): number {
    if (term === pattern) return 100;
    if (term.startsWith(pattern)) return 80;
    if (term.includes(pattern)) return 60;
    return 0;
  }
}

export interface MTGKnowledgeResult {
  found: boolean;
  categories: {
    category: string;
    information: string;
    examples: string[];
  }[];
  suggestions: string[];
}

export interface MTGSearchResult {
  term: string;
  category: string;
  relevance: number;
}
