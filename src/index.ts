#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { MTGKnowledgeBase, MTGKnowledgeResult } from "./mtg-knowledge.js";

// Scryfall API base URL
const SCRYFALL_API_BASE = "https://api.scryfall.com";

// Types for Scryfall API responses
interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors: string[];
  color_identity: string[];
  legalities: Record<string, string>;
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  prices: {
    usd?: string;
    usd_foil?: string;
    usd_etched?: string;
    eur?: string;
    eur_foil?: string;
    eur_etched?: string;
    tix?: string;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    colors: string[];
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
}

interface ScryfallSearchResponse {
  object: string;
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

interface ScryfallError {
  object: string;
  code: string;
  status: number;
  details: string;
}

interface TCGPlayerPrices {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
  subTypeName: string;
}

interface TCGPlayerPriceData {
  url: string;
  updatedAt: string;
  prices: {
    [key: string]: TCGPlayerPrices;
  };
}

interface CardKingdomPrices {
  retail?: number;
  foil?: number;
  retail_plus?: number;
  foil_plus?: number;
}

interface CardKingdomPriceData {
  url: string;
  updatedAt: string;
  prices: {
    [key: string]: CardKingdomPrices;
  };
}

// Natural Language Mapping System
class NaturalLanguageMappings {
  private readonly textMappings = {
    // Enters the battlefield variations
    'enters the battlefield': 'o:"enters the battlefield" or o:"enters tapped" or o:"when ~ enters"',
    'etb': 'o:"enters the battlefield" or o:"when ~ enters"',
    'comes into play': 'o:"enters the battlefield"',
    'enters tapped': 'o:"enters tapped"',
    
    // Leaves the battlefield variations  
    'leaves the battlefield': 'o:"leaves the battlefield" or o:"when ~ leaves" or o:"dies"',
    'ltb': 'o:"leaves the battlefield" or o:"when ~ leaves"',
    'dies': 'o:"dies" or o:"when ~ dies"',
    'is put into a graveyard': 'o:"is put into a graveyard"',
    
    // Sacrifice variations
    'sacrifice': 'o:"sacrifice" or o:"sac a" or o:"sac an"',
    'sac': 'o:"sacrifice" or o:"sac"',
    'sacrificial': 'o:"sacrifice"',
    
    // Destroy variations
    'destroy': 'o:"destroy" or o:"destroys"',
    'removal': 'o:"destroy" or o:"exile" or o:"return" or o:"bounce"',
    
    // Exile variations
    'exile': 'o:"exile" or o:"exiled"',
    'remove from the game': 'o:"exile"',
    'banish': 'o:"exile"',
    
    // Draw variations
    'draw cards': 'o:"draw" and (o:"card" or o:"cards")',
    'card draw': 'o:"draw" and (o:"card" or o:"cards")',
    'draw a card': 'o:"draw a card"',
    'draws cards': 'o:"draw" and o:"card"',
    
    // Discard variations
    'discard': 'o:"discard"',
    'discards': 'o:"discard"',
    'mill': 'o:"mill" or o:"put" and o:"library" and o:"graveyard"',
    
    // Combat variations
    'can\'t be blocked': 'o:"can\'t be blocked" or o:"unblockable"',
    'unblockable': 'o:"can\'t be blocked" or o:"unblockable"',
    'menace': 'o:"menace"',
    'trample': 'o:"trample"',
    'flying': 'o:"flying"',
    'first strike': 'o:"first strike"',
    'double strike': 'o:"double strike"',
    'deathtouch': 'o:"deathtouch"',
    'lifelink': 'o:"lifelink"',
    'vigilance': 'o:"vigilance"',
    'haste': 'o:"haste"',
    'reach': 'o:"reach"',
    'defender': 'o:"defender"',
    
    // Protection variations
    'protection': 'o:"protection"',
    'hexproof': 'o:"hexproof"',
    'shroud': 'o:"shroud"',
    'ward': 'o:"ward"',
    'indestructible': 'o:"indestructible"',
    
    // Mana variations
    'mana dork': 't:creature and (o:"add" and o:"mana")',
    'ramp': 'o:"search" and o:"land" or (o:"add" and o:"mana")',
    'mana acceleration': 'o:"add" and o:"mana"',
    'fixes mana': 'o:"add" and o:"any color"',
    
    // Counter variations
    'counters': 'o:"counter" and (o:"spell" or o:"ability")',
    'counterspell': 'o:"counter" and o:"spell"',
    'negate': 'o:"counter" and (o:"noncreature" or o:"instant" or o:"sorcery")',
    
    // +1/+1 counter variations
    '+1/+1 counters': 'o:"+1/+1 counter"',
    'plus one counters': 'o:"+1/+1 counter"',
    'growth counters': 'o:"+1/+1 counter"',
    
    // Token variations
    'makes tokens': 'o:"create" and o:"token"',
    'token generation': 'o:"create" and o:"token"',
    'creates tokens': 'o:"create" and o:"token"',
    
    // Graveyard interactions
    'graveyard': 'o:"graveyard"',
    'from your graveyard': 'o:"from your graveyard"',
    'reanimation': 'o:"return" and o:"graveyard" and (o:"battlefield" or o:"hand")',
    'recursion': 'o:"return" and o:"graveyard"',
    
    // Cost reduction
    'cost reduction': 'o:"cost" and (o:"less" or o:"reduced")',
    'costs less': 'o:"costs" and o:"less"',
    'free spell': 'o:"without paying" and o:"mana cost"',
    
    // Tutoring/Search
    'tutor': 'o:"search" and o:"library"',
    'search': 'o:"search" and o:"library"',
    'find a card': 'o:"search" and o:"library"',
    
    // Generic creature abilities
    'big creatures': 't:creature and (pow>=4 or tou>=4)',
    'small creatures': 't:creature and pow<=2 and tou<=2',
    'efficient creatures': 't:creature',
    'aggressive creatures': 't:creature and (o:"haste" or o:"trample" or pow>=3)',
    
    // Planeswalker abilities
    'plus ability': 't:planeswalker and o:"+"',
    'minus ability': 't:planeswalker and o:"-"',
    'ultimate': 't:planeswalker and (o:"ultimate" or o:"-" and loyalty>=6)',
    
    // Artifact interactions
    'artifact synergy': 'o:"artifact" and not t:artifact',
    'artifact matters': 'o:"artifact" and not t:artifact',
    'equipment': 't:equipment',
    'vehicles': 't:vehicle',
    
    // Land interactions
    'land destruction': 'o:"destroy" and o:"land"',
    'landfall': 'o:"landfall"',
    'land ramp': 'o:"search" and o:"land" and o:"battlefield"',
    'fetch lands': 't:land and o:"search" and o:"library"',
    
    // Win conditions
    'alternate win': 'o:"you win the game"',
    'win condition': 'o:"you win the game" or o:"loses the game"',
    'combo piece': 'o:"infinite" or o:"win the game"',
  };

  private readonly colorMappings = {
    'white': 'c:w',
    'blue': 'c:u', 
    'black': 'c:b',
    'red': 'c:r',
    'green': 'c:g',
    'colorless': 'c:c',
    'multicolor': 'c:m',
    'monocolor': 'c=1',
    'two color': 'c=2',
    'three color': 'c=3',
    'four color': 'c=4',
    'five color': 'c=5',
    'azorius': 'c:wu',
    'dimir': 'c:ub',
    'rakdos': 'c:br', 
    'gruul': 'c:rg',
    'selesnya': 'c:gw',
    'orzhov': 'c:wb',
    'izzet': 'c:ur',
    'golgari': 'c:bg',
    'boros': 'c:rw',
    'simic': 'c:gu',
  };

  private readonly typeMappings = {
    'creatures': 't:creature',
    'instants': 't:instant',
    'sorceries': 't:sorcery',
    'artifacts': 't:artifact',
    'enchantments': 't:enchantment',
    'planeswalkers': 't:planeswalker',
    'lands': 't:land',
    'legendary': 't:legendary',
    'basic lands': 't:"basic land"',
    'nonbasic lands': 't:land -t:basic',
    'spells': 't:instant or t:sorcery',
    'permanents': 'not t:instant and not t:sorcery',
    'angels': 't:angel',
    'demons': 't:demon',
    'dragons': 't:dragon',
    'elves': 't:elf',
    'goblins': 't:goblin',
    'humans': 't:human',
    'zombies': 't:zombie',
    'vampires': 't:vampire',
    'spirits': 't:spirit',
    'beasts': 't:beast',
    'equipment': 't:equipment',
    'auras': 't:aura',
    'vehicles': 't:vehicle',
  };

  private readonly formatMappings = {
    'standard legal': 'legal:standard',
    'modern legal': 'legal:modern', 
    'legacy legal': 'legal:legacy',
    'vintage legal': 'legal:vintage',
    'commander legal': 'legal:commander',
    'pioneer legal': 'legal:pioneer',
    'pauper legal': 'legal:pauper',
    'historic legal': 'legal:historic',
    'banned in standard': 'banned:standard',
    'banned in modern': 'banned:modern',
    'restricted in vintage': 'restricted:vintage',
  };

  private readonly costMappings = {
    'cheap': 'cmc<=2',
    'low cost': 'cmc<=3',
    'expensive': 'cmc>=6',
    'high cost': 'cmc>=5',
    'free': 'cmc=0',
    'one mana': 'cmc=1',
    'two mana': 'cmc=2',
    'three mana': 'cmc=3',
    'four mana': 'cmc=4',
    'five mana': 'cmc=5',
    'six mana': 'cmc=6',
    'seven mana': 'cmc=7',
    'budget': 'usd<=5',
    'budget friendly': 'usd<=10',
    'expensive cards': 'usd>=50',
    'under a dollar': 'usd<1',
  };

  public translateQuery(naturalQuery: string): string {
    let translatedQuery = naturalQuery.toLowerCase();
    
    // Apply text mappings
    for (const [natural, scryfall] of Object.entries(this.textMappings)) {
      const regex = new RegExp(`\\b${natural.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      translatedQuery = translatedQuery.replace(regex, scryfall);
    }
    
    // Apply color mappings
    for (const [natural, scryfall] of Object.entries(this.colorMappings)) {
      const regex = new RegExp(`\\b${natural}\\b`, 'gi');
      translatedQuery = translatedQuery.replace(regex, scryfall);
    }
    
    // Apply type mappings
    for (const [natural, scryfall] of Object.entries(this.typeMappings)) {
      const regex = new RegExp(`\\b${natural}\\b`, 'gi');
      translatedQuery = translatedQuery.replace(regex, scryfall);
    }
    
    // Apply format mappings
    for (const [natural, scryfall] of Object.entries(this.formatMappings)) {
      const regex = new RegExp(`\\b${natural}\\b`, 'gi');
      translatedQuery = translatedQuery.replace(regex, scryfall);
    }
    
    // Apply cost mappings
    for (const [natural, scryfall] of Object.entries(this.costMappings)) {
      const regex = new RegExp(`\\b${natural}\\b`, 'gi');
      translatedQuery = translatedQuery.replace(regex, scryfall);
    }
    
    return translatedQuery;
  }

  public translateQueryWithKnowledge(naturalQuery: string, mtgKnowledge: MTGKnowledgeBase): string {
    // First apply standard translations
    let translatedQuery = this.translateQuery(naturalQuery);
    
    // Then enhance with MTG knowledge base
    const words = naturalQuery.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      const knowledge = mtgKnowledge.getKnowledge(word);
      if (knowledge.found) {
        knowledge.categories.forEach(category => {
          if (category.category === 'Keyword Ability' && !translatedQuery.includes(`o:"${word}"`)) {
            translatedQuery = translatedQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), `o:"${word}"`);
          } else if (category.category === 'Card Type' && !translatedQuery.includes(`t:${word}`)) {
            translatedQuery = translatedQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), `t:${word}`);
          }
        });
      }
    });
    
    return translatedQuery;
  }

  public suggestMappings(query: string): string[] {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Check for potential mappings
    for (const [natural, scryfall] of Object.entries({
      ...this.textMappings,
      ...this.colorMappings,
      ...this.typeMappings,
      ...this.formatMappings,
      ...this.costMappings,
    })) {
      if (lowerQuery.includes(natural.toLowerCase()) || natural.toLowerCase().includes(lowerQuery)) {
        suggestions.push(`"${natural}" → ${scryfall}`);
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }
}

class ScryfallMCPServer {
  private server: Server;
  private nlMappings: NaturalLanguageMappings;
  private mtgKnowledge: MTGKnowledgeBase;

  constructor() {
    this.server = new Server(
      {
        name: "scryfall-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.nlMappings = new NaturalLanguageMappings();
    this.mtgKnowledge = new MTGKnowledgeBase();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "scryfall_natural_search",
            description: "Search for Magic cards using natural language. Automatically translates terms like 'leaves the battlefield', 'sacrifice', 'big creatures', etc. into proper Scryfall syntax.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Natural language search query (e.g., 'red creatures that sacrifice', 'cheap blue counterspells', 'angels with flying')",
                },
                show_translation: {
                  type: "boolean",
                  description: "Whether to show how the natural language was translated to Scryfall syntax (default: false)",
                  default: false,
                },
                unique: {
                  type: "string",
                  enum: ["cards", "art", "prints"],
                  description: "Strategy for omitting similar cards (default: cards)",
                  default: "cards",
                },
                order: {
                  type: "string",
                  enum: ["name", "set", "released", "rarity", "color", "usd", "tix", "eur", "cmc", "power", "toughness", "edhrec", "penny", "artist", "review"],
                  description: "The method to sort returned cards (default: name)",
                  default: "name",
                },
                limit: {
                  type: "integer",
                  description: "Maximum number of results to return (default: 25, max: 100)",
                  default: 25,
                  minimum: 1,
                  maximum: 100,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "scryfall_search_cards",
            description: "Search for Magic: The Gathering cards using Scryfall's search syntax. Supports complex queries with operators like color, type, set, etc. Use scryfall_natural_search for easier natural language queries.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query using Scryfall search syntax (e.g., 'c:blue type:creature', 'Lightning Bolt', 't:instant cmc<=3')",
                },
                try_natural_language: {
                  type: "boolean",
                  description: "Whether to attempt natural language translation if the exact query fails (default: true)",
                  default: true,
                },
                unique: {
                  type: "string",
                  enum: ["cards", "art", "prints"],
                  description: "Strategy for omitting similar cards (default: cards)",
                  default: "cards",
                },
                order: {
                  type: "string",
                  enum: ["name", "set", "released", "rarity", "color", "usd", "tix", "eur", "cmc", "power", "toughness", "edhrec", "penny", "artist", "review"],
                  description: "The method to sort returned cards (default: name)",
                  default: "name",
                },
                dir: {
                  type: "string",
                  enum: ["auto", "asc", "desc"],
                  description: "The direction to sort cards (default: auto)",
                  default: "auto",
                },
                page: {
                  type: "integer",
                  description: "The page of results to return (default: 1)",
                  default: 1,
                  minimum: 1,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "scryfall_get_card_named",
            description: "Get a specific card by exact or fuzzy name match",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The card name to search for",
                },
                fuzzy: {
                  type: "boolean",
                  description: "Whether to use fuzzy name matching (default: false for exact match)",
                  default: false,
                },
                set: {
                  type: "string",
                  description: "Optional: The set code to search within (e.g., 'khm', 'znr')",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "scryfall_get_random_card",
            description: "Get a random card, optionally filtered by a search query",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Optional search query to filter random results (uses same syntax as search)",
                },
              },
              required: [],
            },
          },
          {
            name: "scryfall_get_card_by_id",
            description: "Get a specific card by its Scryfall ID",
            inputSchema: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "The Scryfall ID of the card",
                },
              },
              required: ["id"],
            },
          },
          {
            name: "scryfall_autocomplete",
            description: "Get autocomplete suggestions for card names",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Partial card name to get suggestions for",
                },
                include_extras: {
                  type: "boolean",
                  description: "Whether to include extra cards like tokens (default: false)",
                  default: false,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "scryfall_search_help",
            description: "Get comprehensive documentation about Scryfall search syntax, keywords, and operators",
            inputSchema: {
              type: "object",
              properties: {
                topic: {
                  type: "string",
                  enum: ["all", "basics", "keywords", "operators", "colors", "types", "sets", "formats", "prices", "advanced", "examples"],
                  description: "Specific help topic to get information about (default: all)",
                  default: "all",
                },
              },
              required: [],
            },
          },
          {
            name: "scryfall_translation_help",
            description: "Get help with translating natural language terms to Scryfall search syntax. Shows available mappings and suggestions.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Natural language term to get translation help for (optional - if not provided, shows common mappings)",
                },
                category: {
                  type: "string",
                  enum: ["all", "text", "colors", "types", "formats", "costs"],
                  description: "Category of mappings to show (default: all)",
                  default: "all",
                },
              },
              required: [],
            },
          },
          {
            name: "mtg_knowledge_lookup",
            description: "Get comprehensive information about Magic: The Gathering terms, concepts, rules, and terminology. Covers card types, keywords, colors, formats, deck archetypes, and more.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "MTG term or concept to look up (e.g., 'flying', 'azorius', 'modern', 'aggro', 'commander')",
                },
                search_similar: {
                  type: "boolean",
                  description: "Whether to search for similar terms if exact match not found (default: true)",
                  default: true,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "scryfall_get_tcgplayer_prices",
            description: "Get detailed TCGPlayer pricing information for a specific card",
            inputSchema: {
              type: "object",
              properties: {
                card_id: {
                  type: "string",
                  description: "The Scryfall ID of the card to get TCGPlayer prices for",
                },
              },
              required: ["card_id"],
            },
          },
          {
            name: "scryfall_card_with_tcg_prices",
            description: "Get card information along with detailed TCGPlayer pricing in one call",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The card name to search for",
                },
                fuzzy: {
                  type: "boolean",
                  description: "Whether to use fuzzy name matching (default: false for exact match)",
                  default: false,
                },
                set: {
                  type: "string",
                  description: "Optional: The set code to search within (e.g., 'khm', 'znr')",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "scryfall_get_cardkingdom_prices",
            description: "Get detailed Card Kingdom pricing information for a specific card",
            inputSchema: {
              type: "object",
              properties: {
                card_id: {
                  type: "string",
                  description: "The Scryfall ID of the card to get Card Kingdom prices for",
                },
              },
              required: ["card_id"],
            },
          },
          {
            name: "scryfall_card_with_all_prices",
            description: "Get card information with pricing from both TCGPlayer and Card Kingdom",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The card name to search for",
                },
                fuzzy: {
                  type: "boolean",
                  description: "Whether to use fuzzy name matching (default: false for exact match)",
                  default: false,
                },
                set: {
                  type: "string",
                  description: "Optional: The set code to search within (e.g., 'khm', 'znr')",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "scryfall_get_all_cards_in_set",
            description: "Get all cards from a specific Magic set",
            inputSchema: {
              type: "object",
              properties: {
                set_code: {
                  type: "string",
                  description: "The 3-letter set code (e.g., 'sld', 'ltr', 'khm', 'neo')",
                },
                order: {
                  type: "string",
                  enum: ["name", "set", "released", "rarity", "color", "usd", "tix", "eur", "cmc", "power", "toughness", "collector_number"],
                  description: "How to sort the results (default: collector_number)",
                  default: "collector_number",
                },
                include_variations: {
                  type: "boolean",
                  description: "Whether to include card variations like alternate arts (default: false)",
                  default: false,
                },
              },
              required: ["set_code"],
            },
          },
          {
            name: "scryfall_get_cards_by_type",
            description: "Get all cards matching a specific type or subtype",
            inputSchema: {
              type: "object",
              properties: {
                type_query: {
                  type: "string",
                  description: "Type or subtype to search for (e.g., 'creature', 'goblin', 'enchantment', 'legendary creature', 'artifact creature')",
                },
                additional_filters: {
                  type: "string",
                  description: "Optional additional Scryfall search filters (e.g., 'legal:modern', 'c:red', 'cmc<=3')",
                },
                limit: {
                  type: "integer",
                  description: "Maximum number of results to return (default: 50, max: 175)",
                  default: 50,
                  minimum: 1,
                  maximum: 175,
                },
                order: {
                  type: "string",
                  enum: ["name", "set", "released", "rarity", "color", "usd", "tix", "eur", "cmc", "power", "toughness", "edhrec"],
                  description: "How to sort the results (default: name)",
                  default: "name",
                },
              },
              required: ["type_query"],
            },
          },
          {
            name: "scryfall_get_cards_with_text",
            description: "Get cards containing specific text in their name or oracle text",
            inputSchema: {
              type: "object",
              properties: {
                search_text: {
                  type: "string",
                  description: "Text to search for (e.g., 'storm', 'enters the battlefield', 'flying', 'draw a card')",
                },
                search_in: {
                  type: "string",
                  enum: ["name", "oracle", "both"],
                  description: "Where to search for the text (default: oracle)",
                  default: "oracle",
                },
                additional_filters: {
                  type: "string",
                  description: "Optional additional Scryfall search filters (e.g., 'legal:standard', 'c:blue', 't:creature')",
                },
                limit: {
                  type: "integer",
                  description: "Maximum number of results to return (default: 50, max: 175)",
                  default: 50,
                  minimum: 1,
                  maximum: 175,
                },
                order: {
                  type: "string",
                  enum: ["name", "set", "released", "rarity", "color", "usd", "tix", "eur", "cmc", "power", "toughness", "edhrec"],
                  description: "How to sort the results (default: name)",
                  default: "name",
                },
              },
              required: ["search_text"],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "scryfall_natural_search":
            return await this.naturalLanguageSearch(args as any);
          case "scryfall_search_cards":
            return await this.searchCards(args as any);
          case "scryfall_get_card_named":
            return await this.getCardNamed(args as any);
          case "scryfall_get_random_card":
            return await this.getRandomCard(args as any);
          case "scryfall_get_card_by_id":
            return await this.getCardById(args as any);
          case "scryfall_autocomplete":
            return await this.autocomplete(args as any);
          case "scryfall_search_help":
            return await this.getSearchHelp(args as any);
          case "scryfall_translation_help":
            return await this.getTranslationHelp(args as any);
          case "mtg_knowledge_lookup":
            return await this.getMTGKnowledge(args as any);
          case "scryfall_get_tcgplayer_prices":
            return await this.getTCGPlayerPrices(args as any);
          case "scryfall_card_with_tcg_prices":
            return await this.getCardWithTCGPrices(args as any);
          case "scryfall_get_cardkingdom_prices":
            return await this.getCardKingdomPrices(args as any);
          case "scryfall_card_with_all_prices":
            return await this.getCardWithAllPrices(args as any);
          case "scryfall_get_all_cards_in_set":
            return await this.getAllCardsInSet(args as any);
          case "scryfall_get_cards_by_type":
            return await this.getCardsByType(args as any);
          case "scryfall_get_cards_with_text":
            return await this.getCardsWithText(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${SCRYFALL_API_BASE}${endpoint}`, {
      headers: {
        'User-Agent': 'Scryfall MCP Server/1.0.0',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ScryfallError;
      throw new Error(`Scryfall API Error (${error.status}): ${error.details}`);
    }

    return data;
  }

  private formatCard(card: ScryfallCard): string {
    let result = `**${card.name}**`;
    
    if (card.mana_cost) {
      result += ` ${card.mana_cost}`;
    }
    
    result += `\n*${card.type_line}*`;
    
    if (card.oracle_text) {
      result += `\n\n${card.oracle_text}`;
    }
    
    if (card.power && card.toughness) {
      result += `\n\n**Power/Toughness:** ${card.power}/${card.toughness}`;
    }
    
    result += `\n**Set:** ${card.set_name} (${card.set.toUpperCase()})`;
    result += `\n**Rarity:** ${card.rarity}`;
    
    if (card.colors && card.colors.length > 0) {
      result += `\n**Colors:** ${card.colors.join(', ')}`;
    }
    
    // Add pricing information if available
    const prices = [];
    if (card.prices.usd) prices.push(`USD: $${card.prices.usd}`);
    if (card.prices.usd_foil) prices.push(`USD Foil: $${card.prices.usd_foil}`);
    if (card.prices.usd_etched) prices.push(`USD Etched: $${card.prices.usd_etched}`);
    if (card.prices.eur) prices.push(`EUR: €${card.prices.eur}`);
    if (card.prices.eur_foil) prices.push(`EUR Foil: €${card.prices.eur_foil}`);
    if (card.prices.eur_etched) prices.push(`EUR Etched: €${card.prices.eur_etched}`);
    if (card.prices.tix) prices.push(`MTGO: ${card.prices.tix} tix`);
    
    if (prices.length > 0) {
      result += `\n**Prices:** ${prices.join(', ')}`;
    }
    
    // Add purchase links if available
    if (card.purchase_uris) {
      const purchaseLinks = [];
      if (card.purchase_uris.tcgplayer) purchaseLinks.push(`[TCGPlayer](${card.purchase_uris.tcgplayer})`);
      if (card.purchase_uris.cardmarket) purchaseLinks.push(`[Cardmarket](${card.purchase_uris.cardmarket})`);
      if (card.purchase_uris.cardhoarder) purchaseLinks.push(`[Cardhoarder](${card.purchase_uris.cardhoarder})`);
      
      if (purchaseLinks.length > 0) {
        result += `\n**Purchase:** ${purchaseLinks.join(' • ')}`;
      }
    }
    
    // Handle double-faced cards
    if (card.card_faces && card.card_faces.length > 1) {
      result += '\n\n**Card Faces:**';
      card.card_faces.forEach((face, index) => {
        result += `\n\n*Face ${index + 1}: ${face.name}*`;
        if (face.mana_cost) result += ` ${face.mana_cost}`;
        result += `\n${face.type_line}`;
        if (face.oracle_text) result += `\n${face.oracle_text}`;
        if (face.power && face.toughness) {
          result += `\nPower/Toughness: ${face.power}/${face.toughness}`;
        }
      });
    }
    
    result += `\n**Scryfall ID:** ${card.id}`;
    
    return result;
  }

  private async naturalLanguageSearch(args: {
    query: string;
    show_translation?: boolean;
    unique?: string;
    order?: string;
    limit?: number;
  }) {
    const originalQuery = args.query;
    const translatedQuery = this.nlMappings.translateQueryWithKnowledge(originalQuery, this.mtgKnowledge);
    const limit = Math.min(args.limit || 25, 100);
    
    // If the query didn't change much, try to provide suggestions
    const suggestions = this.nlMappings.suggestMappings(originalQuery);
    const mtgSearchResults = this.mtgKnowledge.searchTerms(originalQuery);
    
    let result = `**Natural Language Search Results**\n`;
    if (args.show_translation) {
      result += `**Original Query:** "${originalQuery}"\n`;
      result += `**Translated Query:** "${translatedQuery}"\n\n`;
    }
    
    if (suggestions.length > 0 && translatedQuery.toLowerCase() === originalQuery.toLowerCase()) {
      result += `**Suggested mappings for your query:**\n`;
      suggestions.forEach(suggestion => {
        result += `• ${suggestion}\n`;
      });
      result += '\n';
    }
    
    if (mtgSearchResults.length > 0) {
      result += `**MTG terms found in your query:**\n`;
      mtgSearchResults.slice(0, 3).forEach(searchResult => {
        result += `• **${searchResult.term}** (${searchResult.category})\n`;
      });
      result += '\n';
    }

    try {
      const totalPages = Math.ceil(limit / 175); // Scryfall returns max 175 per page
      let allCards: any[] = [];
      
      for (let page = 1; page <= totalPages && allCards.length < limit; page++) {
        const params = new URLSearchParams({
          q: translatedQuery,
          unique: args.unique || 'cards',
          order: args.order || 'name',
          dir: 'auto',
          page: String(page),
        });

        try {
          const data = await this.makeRequest(`/cards/search?${params}`) as ScryfallSearchResponse;
          allCards.push(...data.data.slice(0, limit - allCards.length));
          
          if (!data.has_more) break;
        } catch (error) {
          break; // No more results
        }
      }
      
      if (allCards.length === 0) {
        result += `**No cards found matching your query.**\n\n`;
        if (suggestions.length > 0) {
          result += `Try using more specific terms, or use one of the suggested mappings above.`;
        } else if (mtgSearchResults.length > 0) {
          result += `Try using the \`mtg_knowledge_lookup\` tool to learn more about the MTG terms found in your query.`;
        } else {
          result += `Try using more specific terms or different keywords.`;
        }
      } else {
        result += `Found ${allCards.length} cards (showing up to ${limit})\n\n`;
        
        allCards.forEach((card, index) => {
          result += `${index + 1}. ${this.formatCard(card)}\n\n---\n\n`;
        });
        
        if (allCards.length === limit) {
          result += `*Limited to ${limit} results. Use the regular search for more comprehensive results.*`;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result += `**Search Error:** ${errorMessage}\n\n`;
      
      if (suggestions.length > 0) {
        result += `**Try these suggested mappings:**\n`;
        suggestions.forEach(suggestion => {
          result += `• ${suggestion}\n`;
        });
      } else if (mtgSearchResults.length > 0) {
        result += `**Learn more about these MTG terms:**\n`;
        mtgSearchResults.slice(0, 3).forEach(searchResult => {
          result += `• Use \`mtg_knowledge_lookup\` with "${searchResult.term}"\n`;
        });
      } else {
        result += `Try rephrasing your query or using the regular \`scryfall_search_cards\` tool with exact Scryfall syntax.`;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private async searchCards(args: {
    query: string;
    try_natural_language?: boolean;
    unique?: string;
    order?: string;
    dir?: string;
    page?: number;
  }) {
    const params = new URLSearchParams({
      q: args.query,
      unique: args.unique || 'cards',
      order: args.order || 'name',
      dir: args.dir || 'auto',
      page: String(args.page || 1),
    });

    try {
      const data = await this.makeRequest(`/cards/search?${params}`) as ScryfallSearchResponse;
      
      let result = `**Search Results for "${args.query}"**\n`;
      result += `Found ${data.total_cards} total cards`;
      
      if (data.has_more) {
        result += ` (showing page ${args.page || 1})`;
      }
      
      result += '\n\n';
      
      data.data.forEach((card, index) => {
        result += `${index + 1}. ${this.formatCard(card)}\n\n---\n\n`;
      });
      
      if (data.has_more) {
        result += `*There are more results. Use page ${(args.page || 1) + 1} to see more.*`;
      }

      return {
        content: [
          {
            type: "text",
            text: result.trim(),
          },
        ],
      };
    } catch (error) {
      // If the search fails and natural language translation is enabled, try that
      if (args.try_natural_language !== false) {
        const translatedQuery = this.nlMappings.translateQuery(args.query);
        
        if (translatedQuery.toLowerCase() !== args.query.toLowerCase()) {
          // The query was translated, try the search again
          const translatedParams = new URLSearchParams({
            q: translatedQuery,
            unique: args.unique || 'cards',
            order: args.order || 'name',
            dir: args.dir || 'auto',
            page: String(args.page || 1),
          });

          try {
            const data = await this.makeRequest(`/cards/search?${translatedParams}`) as ScryfallSearchResponse;
            
            let result = `**Search Results for "${args.query}"**\n`;
            result += `*Your query was automatically translated to: "${translatedQuery}"*\n\n`;
            result += `Found ${data.total_cards} total cards`;
            
            if (data.has_more) {
              result += ` (showing page ${args.page || 1})`;
            }
            
            result += '\n\n';
            
            data.data.forEach((card, index) => {
              result += `${index + 1}. ${this.formatCard(card)}\n\n---\n\n`;
            });
            
            if (data.has_more) {
              result += `*There are more results. Use page ${(args.page || 1) + 1} to see more.*`;
            }

            return {
              content: [
                {
                  type: "text",
                  text: result.trim(),
                },
              ],
            };
          } catch (translationError) {
            // Both searches failed
            const suggestions = this.nlMappings.suggestMappings(args.query);
            let errorResult = `**Search failed for "${args.query}"**\n\n`;
            errorResult += `Original error: ${error instanceof Error ? error.message : String(error)}\n`;
            errorResult += `Translation attempt also failed: ${translationError instanceof Error ? translationError.message : String(translationError)}\n\n`;
            
            if (suggestions.length > 0) {
              errorResult += `**Suggested mappings:**\n`;
              suggestions.forEach(suggestion => {
                errorResult += `• ${suggestion}\n`;
              });
              errorResult += '\nTry using the `scryfall_natural_search` tool for better natural language support.';
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: errorResult,
                },
              ],
              isError: true,
            };
          }
        }
      }
      
      // Original search failed and no translation was attempted or possible
      throw error;
    }
  }

  private async getCardNamed(args: {
    name: string;
    fuzzy?: boolean;
    set?: string;
  }) {
    const endpoint = args.fuzzy ? '/cards/named' : '/cards/named';
    const params = new URLSearchParams();
    
    if (args.fuzzy) {
      params.append('fuzzy', args.name);
    } else {
      params.append('exact', args.name);
    }
    
    if (args.set) {
      params.append('set', args.set);
    }

    const card = await this.makeRequest(`${endpoint}?${params}`) as ScryfallCard;
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCard(card),
        },
      ],
    };
  }

  private async getRandomCard(args: { query?: string }) {
    let endpoint = '/cards/random';
    
    if (args.query) {
      endpoint += `?q=${encodeURIComponent(args.query)}`;
    }

    const card = await this.makeRequest(endpoint) as ScryfallCard;
    
    return {
      content: [
        {
          type: "text",
          text: `**Random Card:**\n\n${this.formatCard(card)}`,
        },
      ],
    };
  }

  private async getCardById(args: { id: string }) {
    const card = await this.makeRequest(`/cards/${args.id}`) as ScryfallCard;
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCard(card),
        },
      ],
    };
  }

  private async autocomplete(args: { query: string; include_extras?: boolean }) {
    const params = new URLSearchParams({
      q: args.query,
    });
    
    if (args.include_extras) {
      params.append('include_extras', 'true');
    }

    const data = await this.makeRequest(`/cards/autocomplete?${params}`) as { data: string[] };
    
    return {
      content: [
        {
          type: "text",
          text: `**Autocomplete suggestions for "${args.query}":**\n\n${data.data.map((name, index) => `${index + 1}. ${name}`).join('\n')}`,
        },
      ],
    };
  }

  private async getSearchHelp(args: { topic?: string }) {
    const topic = args.topic || 'all';
    
    const helpContent = this.getSearchHelpContent(topic);
    
    return {
      content: [
        {
          type: "text",
          text: helpContent,
        },
      ],
    };
  }

  private async getTranslationHelp(args: { query?: string; category?: string }) {
    const category = args.category || 'all';
    
    let result = `# Natural Language Translation Help\n\n`;
    
    if (args.query) {
      // Provide specific help for the query
      const translatedQuery = this.nlMappings.translateQuery(args.query);
      const suggestions = this.nlMappings.suggestMappings(args.query);
      
      result += `**Your Query:** "${args.query}"\n`;
      result += `**Translated To:** "${translatedQuery}"\n\n`;
      
      if (suggestions.length > 0) {
        result += `**Related Mappings:**\n`;
        suggestions.forEach(suggestion => {
          result += `• ${suggestion}\n`;
        });
        result += '\n';
      }
    }
    
    // Show category-specific mappings
    const mappingCategories = {
      text: {
        title: "Text & Ability Mappings",
        mappings: {
          'enters the battlefield': 'o:"enters the battlefield" or o:"enters tapped" or o:"when ~ enters"',
          'leaves the battlefield': 'o:"leaves the battlefield" or o:"when ~ leaves" or o:"dies"',
          'sacrifice': 'o:"sacrifice" or o:"sac a" or o:"sac an"',
          'destroy': 'o:"destroy" or o:"destroys"',
          'draw cards': 'o:"draw" and (o:"card" or o:"cards")',
          'flying': 'o:"flying"',
          'trample': 'o:"trample"',
          'deathtouch': 'o:"deathtouch"',
          'lifelink': 'o:"lifelink"',
          'counterspell': 'o:"counter" and o:"spell"',
          'token generation': 'o:"create" and o:"token"',
        }
      },
      colors: {
        title: "Color Mappings", 
        mappings: {
          'white': 'c:w',
          'blue': 'c:u',
          'black': 'c:b', 
          'red': 'c:r',
          'green': 'c:g',
          'multicolor': 'c:m',
          'azorius': 'c:wu',
          'dimir': 'c:ub',
          'rakdos': 'c:br',
          'gruul': 'c:rg',
          'selesnya': 'c:gw',
        }
      },
      types: {
        title: "Type Mappings",
        mappings: {
          'creatures': 't:creature',
          'instants': 't:instant',
          'sorceries': 't:sorcery',
          'artifacts': 't:artifact',
          'enchantments': 't:enchantment',
          'planeswalkers': 't:planeswalker',
          'angels': 't:angel',
          'demons': 't:demon',
          'dragons': 't:dragon',
          'elves': 't:elf',
          'equipment': 't:equipment',
        }
      },
      formats: {
        title: "Format Mappings",
        mappings: {
          'standard legal': 'legal:standard',
          'modern legal': 'legal:modern',
          'legacy legal': 'legal:legacy',
          'commander legal': 'legal:commander',
          'banned in standard': 'banned:standard',
          'banned in modern': 'banned:modern',
        }
      },
      costs: {
        title: "Cost & Price Mappings",
        mappings: {
          'cheap': 'cmc<=2',
          'expensive': 'cmc>=6',
          'budget': 'usd<=5',
          'expensive cards': 'usd>=50',
          'under a dollar': 'usd<1',
          'one mana': 'cmc=1',
          'three mana': 'cmc=3',
        }
      }
    };
    
    if (category === 'all') {
      for (const [key, categoryData] of Object.entries(mappingCategories)) {
        result += `## ${categoryData.title}\n\n`;
        for (const [natural, scryfall] of Object.entries(categoryData.mappings)) {
          result += `• **"${natural}"** → \`${scryfall}\`\n`;
        }
        result += '\n';
      }
    } else if (mappingCategories[category as keyof typeof mappingCategories]) {
      const categoryData = mappingCategories[category as keyof typeof mappingCategories];
      result += `## ${categoryData.title}\n\n`;
      for (const [natural, scryfall] of Object.entries(categoryData.mappings)) {
        result += `• **"${natural}"** → \`${scryfall}\`\n`;
      }
      result += '\n';
    }
    
    result += `---\n\n`;
    result += `**Tips:**\n`;
    result += `• Use \`scryfall_natural_search\` for automatic translation\n`;
    result += `• Combine terms: "red creatures with flying" → \`c:r t:creature o:flying\`\n`;
    result += `• Use \`show_translation: true\` to see how your query was translated\n`;
    result += `• The regular \`scryfall_search_cards\` tool has natural language fallback enabled by default\n`;
    
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private async getMTGKnowledge(args: { query: string; search_similar?: boolean }) {
    const knowledgeResult = this.mtgKnowledge.getKnowledge(args.query);
    
    let result = `# MTG Knowledge: "${args.query}"\n\n`;
    
    if (knowledgeResult.found) {
      knowledgeResult.categories.forEach(category => {
        result += `## ${category.category}\n\n`;
        result += `${category.information}\n\n`;
        
        if (category.examples.length > 0) {
          result += `**Examples:** ${category.examples.join(', ')}\n\n`;
        }
      });
      
      // Add related Scryfall search suggestions
      result += `---\n\n**Related Scryfall Searches:**\n`;
      const translatedQuery = this.nlMappings.translateQuery(args.query);
      if (translatedQuery.toLowerCase() !== args.query.toLowerCase()) {
        result += `• **Natural Language:** "${args.query}" → \`${translatedQuery}\`\n`;
      }
      
      // Suggest some specific searches based on the knowledge type
      if (knowledgeResult.categories.some(cat => cat.category === 'Keyword Ability')) {
        result += `• **Cards with this ability:** \`o:"${args.query}"\`\n`;
      }
      if (knowledgeResult.categories.some(cat => cat.category === 'Card Type')) {
        result += `• **All ${args.query}s:** \`t:${args.query}\`\n`;
      }
      if (knowledgeResult.categories.some(cat => cat.category === 'Color Identity')) {
        const colorCode = this.getColorCode(args.query);
        if (colorCode) {
          result += `• **${args.query} cards:** \`c:${colorCode}\`\n`;
        }
      }
      
    } else {
      result += `**No direct match found for "${args.query}"**\n\n`;
      
      if (args.search_similar !== false) {
        const searchResults = this.mtgKnowledge.searchTerms(args.query);
        
        if (searchResults.length > 0) {
          result += `**Similar terms found:**\n\n`;
          searchResults.forEach(searchResult => {
            result += `• **${searchResult.term}** (${searchResult.category})\n`;
          });
          result += '\n';
          
          result += `Try using one of these terms with the \`mtg_knowledge_lookup\` tool.\n\n`;
        }
      }
      
      if (knowledgeResult.suggestions.length > 0) {
        result += `**Did you mean:**\n`;
        knowledgeResult.suggestions.forEach(suggestion => {
          result += `• ${suggestion}\n`;
        });
        result += '\n';
      }
      
      result += `**Available categories:**\n`;
      this.mtgKnowledge.getAvailableCategories().forEach(category => {
        result += `• ${category}\n`;
      });
    }
    
    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  }

  private getColorCode(colorName: string): string | null {
    const colorCodes: Record<string, string> = {
      'white': 'w', 'blue': 'u', 'black': 'b', 'red': 'r', 'green': 'g',
      'azorius': 'wu', 'dimir': 'ub', 'rakdos': 'br', 'gruul': 'rg', 'selesnya': 'gw',
      'orzhov': 'wb', 'izzet': 'ur', 'golgari': 'bg', 'boros': 'rw', 'simic': 'gu',
      'bant': 'gwu', 'esper': 'wub', 'grixis': 'ubr', 'jund': 'brg', 'naya': 'rgw',
      'abzan': 'wbg', 'jeskai': 'urw', 'sultai': 'bgu', 'mardu': 'rwb', 'temur': 'gur'
    };
    return colorCodes[colorName.toLowerCase()] || null;
  }

  private async getTCGPlayerPrices(args: { card_id: string }) {
    const data = await this.makeRequest(`/cards/${args.card_id}/tcgplayer`) as TCGPlayerPriceData;
    
    let result = `**TCGPlayer Prices**\n`;
    result += `**Last Updated:** ${new Date(data.updatedAt).toLocaleString()}\n`;
    result += `**TCGPlayer URL:** ${data.url}\n\n`;
    
    // Sort price categories for consistent display
    const sortedPrices = Object.entries(data.prices).sort(([a], [b]) => {
      const order = ['normal', 'foil', 'etched'];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    sortedPrices.forEach(([priceType, prices]) => {
      result += `**${priceType.charAt(0).toUpperCase() + priceType.slice(1)} (${prices.subTypeName})**\n`;
      
      if (prices.market !== undefined) {
        result += `  • Market Price: $${prices.market.toFixed(2)}\n`;
      }
      if (prices.low !== undefined) {
        result += `  • Low: $${prices.low.toFixed(2)}\n`;
      }
      if (prices.mid !== undefined) {
        result += `  • Mid: $${prices.mid.toFixed(2)}\n`;
      }
      if (prices.high !== undefined) {
        result += `  • High: $${prices.high.toFixed(2)}\n`;
      }
      if (prices.directLow !== undefined) {
        result += `  • Direct Low: $${prices.directLow.toFixed(2)}\n`;
      }
      
      result += '\n';
    });
    
    if (sortedPrices.length === 0) {
      result += '*No TCGPlayer pricing data available for this card.*\n';
    }
    
    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private async getCardWithTCGPrices(args: {
    name: string;
    fuzzy?: boolean;
    set?: string;
  }) {
    // First get the card
    const endpoint = '/cards/named';
    const params = new URLSearchParams();
    
    if (args.fuzzy) {
      params.append('fuzzy', args.name);
    } else {
      params.append('exact', args.name);
    }
    
    if (args.set) {
      params.append('set', args.set);
    }

    const card = await this.makeRequest(`${endpoint}?${params}`) as ScryfallCard;
    
    // Then get TCGPlayer prices
    let tcgPriceContent = '';
    try {
      const priceData = await this.makeRequest(`/cards/${card.id}/tcgplayer`) as TCGPlayerPriceData;
      
      tcgPriceContent += '\n\n---\n\n**TCGPlayer Pricing Details**\n';
      tcgPriceContent += `**Last Updated:** ${new Date(priceData.updatedAt).toLocaleString()}\n\n`;
      
      const sortedPrices = Object.entries(priceData.prices).sort(([a], [b]) => {
        const order = ['normal', 'foil', 'etched'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      sortedPrices.forEach(([priceType, prices]) => {
        tcgPriceContent += `**${priceType.charAt(0).toUpperCase() + priceType.slice(1)} (${prices.subTypeName})**\n`;
        
        if (prices.market !== undefined) {
          tcgPriceContent += `  • Market Price: $${prices.market.toFixed(2)}\n`;
        }
        if (prices.low !== undefined) {
          tcgPriceContent += `  • Low: $${prices.low.toFixed(2)}\n`;
        }
        if (prices.mid !== undefined) {
          tcgPriceContent += `  • Mid: $${prices.mid.toFixed(2)}\n`;
        }
        if (prices.high !== undefined) {
          tcgPriceContent += `  • High: $${prices.high.toFixed(2)}\n`;
        }
        if (prices.directLow !== undefined) {
          tcgPriceContent += `  • Direct Low: $${prices.directLow.toFixed(2)}\n`;
        }
        
        tcgPriceContent += '\n';
      });
      
    } catch (error) {
      tcgPriceContent += '\n\n*TCGPlayer pricing data not available for this card.*\n';
    }
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCard(card) + tcgPriceContent,
        },
      ],
    };
  }

  private async getCardKingdomPrices(args: { card_id: string }) {
    const data = await this.makeRequest(`/cards/${args.card_id}/cardkingdom`) as CardKingdomPriceData;
    
    let result = `**Card Kingdom Prices**\n`;
    result += `**Last Updated:** ${new Date(data.updatedAt).toLocaleString()}\n`;
    result += `**Card Kingdom URL:** ${data.url}\n\n`;
    
    // Sort price categories for consistent display
    const sortedPrices = Object.entries(data.prices).sort(([a], [b]) => {
      const order = ['normal', 'foil', 'etched'];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    sortedPrices.forEach(([priceType, prices]) => {
      result += `**${priceType.charAt(0).toUpperCase() + priceType.slice(1)}**\n`;
      
      if (prices.retail !== undefined) {
        result += `  • Retail: $${prices.retail.toFixed(2)}\n`;
      }
      if (prices.foil !== undefined) {
        result += `  • Foil: $${prices.foil.toFixed(2)}\n`;
      }
      if (prices.retail_plus !== undefined) {
        result += `  • Retail Plus: $${prices.retail_plus.toFixed(2)}\n`;
      }
      if (prices.foil_plus !== undefined) {
        result += `  • Foil Plus: $${prices.foil_plus.toFixed(2)}\n`;
      }
      
      result += '\n';
    });
    
    if (sortedPrices.length === 0) {
      result += '*No Card Kingdom pricing data available for this card.*\n';
    }
    
    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private async getCardWithAllPrices(args: {
    name: string;
    fuzzy?: boolean;
    set?: string;
  }) {
    // First get the card
    const endpoint = '/cards/named';
    const params = new URLSearchParams();
    
    if (args.fuzzy) {
      params.append('fuzzy', args.name);
    } else {
      params.append('exact', args.name);
    }
    
    if (args.set) {
      params.append('set', args.set);
    }

    const card = await this.makeRequest(`${endpoint}?${params}`) as ScryfallCard;
    
    let allPriceContent = '';
    
    // Get TCGPlayer prices
    try {
      const tcgData = await this.makeRequest(`/cards/${card.id}/tcgplayer`) as TCGPlayerPriceData;
      
      allPriceContent += '\n\n---\n\n**TCGPlayer Pricing**\n';
      allPriceContent += `**Last Updated:** ${new Date(tcgData.updatedAt).toLocaleString()}\n\n`;
      
      const sortedTCGPrices = Object.entries(tcgData.prices).sort(([a], [b]) => {
        const order = ['normal', 'foil', 'etched'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      sortedTCGPrices.forEach(([priceType, prices]) => {
        allPriceContent += `**${priceType.charAt(0).toUpperCase() + priceType.slice(1)} (${prices.subTypeName})**\n`;
        
        if (prices.market !== undefined) {
          allPriceContent += `  • Market: $${prices.market.toFixed(2)}\n`;
        }
        if (prices.low !== undefined) {
          allPriceContent += `  • Low: $${prices.low.toFixed(2)}\n`;
        }
        if (prices.mid !== undefined) {
          allPriceContent += `  • Mid: $${prices.mid.toFixed(2)}\n`;
        }
        if (prices.high !== undefined) {
          allPriceContent += `  • High: $${prices.high.toFixed(2)}\n`;
        }
        
        allPriceContent += '\n';
      });
      
    } catch (error) {
      allPriceContent += '\n\n---\n\n*TCGPlayer pricing data not available.*\n';
    }
    
    // Get Card Kingdom prices
    try {
      const ckData = await this.makeRequest(`/cards/${card.id}/cardkingdom`) as CardKingdomPriceData;
      
      allPriceContent += '\n**Card Kingdom Pricing**\n';
      allPriceContent += `**Last Updated:** ${new Date(ckData.updatedAt).toLocaleString()}\n\n`;
      
      const sortedCKPrices = Object.entries(ckData.prices).sort(([a], [b]) => {
        const order = ['normal', 'foil', 'etched'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      sortedCKPrices.forEach(([priceType, prices]) => {
        allPriceContent += `**${priceType.charAt(0).toUpperCase() + priceType.slice(1)}**\n`;
        
        if (prices.retail !== undefined) {
          allPriceContent += `  • Retail: $${prices.retail.toFixed(2)}\n`;
        }
        if (prices.foil !== undefined) {
          allPriceContent += `  • Foil: $${prices.foil.toFixed(2)}\n`;
        }
        if (prices.retail_plus !== undefined) {
          allPriceContent += `  • Retail Plus: $${prices.retail_plus.toFixed(2)}\n`;
        }
        if (prices.foil_plus !== undefined) {
          allPriceContent += `  • Foil Plus: $${prices.foil_plus.toFixed(2)}\n`;
        }
        
        allPriceContent += '\n';
      });
      
    } catch (error) {
      allPriceContent += '\n**Card Kingdom Pricing**\n*Card Kingdom pricing data not available.*\n';
    }
    
    return {
      content: [
        {
          type: "text",
          text: this.formatCard(card) + allPriceContent,
        },
      ],
    };
  }

  private async getAllCardsInSet(args: {
    set_code: string;
    order?: string;
    include_variations?: boolean;
  }) {
    let query = `s:${args.set_code}`;
    
    if (!args.include_variations) {
      query += ' -is:variation';
    }
    
    const params = new URLSearchParams({
      q: query,
      order: args.order || 'collector_number',
      dir: 'asc',
    });

    const data = await this.makeRequest(`/cards/search?${params}`) as ScryfallSearchResponse;
    
    let result = `**All Cards in Set "${args.set_code.toUpperCase()}"**\n`;
    result += `Found ${data.total_cards} total cards\n\n`;
    
    data.data.forEach((card, index) => {
      result += `${index + 1}. **${card.name}** ${card.mana_cost || ''}\n`;
      result += `   *${card.type_line}* • ${card.rarity} • #${card.set}`;
      
      if (card.prices.usd) {
        result += ` • $${card.prices.usd}`;
      }
      
      result += '\n\n';
    });
    
    if (data.has_more) {
      result += `*Note: This set has more cards. This shows the first ${data.data.length} results.*`;
    }

    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private async getCardsByType(args: {
    type_query: string;
    additional_filters?: string;
    limit?: number;
    order?: string;
  }) {
    let query = `t:${args.type_query}`;
    
    if (args.additional_filters) {
      query += ` ${args.additional_filters}`;
    }
    
    const limit = Math.min(args.limit || 50, 175);
    const totalPages = Math.ceil(limit / 175); // Scryfall returns max 175 per page
    
    let allCards: any[] = [];
    
    for (let page = 1; page <= totalPages && allCards.length < limit; page++) {
      const params = new URLSearchParams({
        q: query,
        order: args.order || 'name',
        dir: 'asc',
        page: String(page),
      });

      try {
        const data = await this.makeRequest(`/cards/search?${params}`) as ScryfallSearchResponse;
        allCards.push(...data.data.slice(0, limit - allCards.length));
        
        if (!data.has_more) break;
      } catch (error) {
        break; // No more results
      }
    }
    
    let result = `**Cards with Type "${args.type_query}"**\n`;
    if (args.additional_filters) {
      result += `**Additional Filters:** ${args.additional_filters}\n`;
    }
    result += `Found ${allCards.length} cards (showing up to ${limit})\n\n`;
    
    allCards.forEach((card, index) => {
      result += `${index + 1}. **${card.name}** ${card.mana_cost || ''}\n`;
      result += `   *${card.type_line}* • ${card.set_name} • ${card.rarity}`;
      
      if (card.power && card.toughness) {
        result += ` • ${card.power}/${card.toughness}`;
      }
      
      if (card.prices.usd) {
        result += ` • $${card.prices.usd}`;
      }
      
      result += '\n\n';
    });

    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private async getCardsWithText(args: {
    search_text: string;
    search_in?: string;
    additional_filters?: string;
    limit?: number;
    order?: string;
  }) {
    let query = '';
    
    switch (args.search_in) {
      case 'name':
        query = `name:"${args.search_text}"`;
        break;
      case 'both':
        query = `(name:"${args.search_text}" or o:"${args.search_text}")`;
        break;
      case 'oracle':
      default:
        query = `o:"${args.search_text}"`;
        break;
    }
    
    if (args.additional_filters) {
      query += ` ${args.additional_filters}`;
    }
    
    const limit = Math.min(args.limit || 50, 175);
    const totalPages = Math.ceil(limit / 175);
    
    let allCards: any[] = [];
    
    for (let page = 1; page <= totalPages && allCards.length < limit; page++) {
      const params = new URLSearchParams({
        q: query,
        order: args.order || 'name',
        dir: 'asc',
        page: String(page),
      });

      try {
        const data = await this.makeRequest(`/cards/search?${params}`) as ScryfallSearchResponse;
        allCards.push(...data.data.slice(0, limit - allCards.length));
        
        if (!data.has_more) break;
      } catch (error) {
        break; // No more results
      }
    }
    
    let result = `**Cards with "${args.search_text}" in ${args.search_in || 'oracle text'}**\n`;
    if (args.additional_filters) {
      result += `**Additional Filters:** ${args.additional_filters}\n`;
    }
    result += `Found ${allCards.length} cards (showing up to ${limit})\n\n`;
    
    allCards.forEach((card, index) => {
      result += `${index + 1}. **${card.name}** ${card.mana_cost || ''}\n`;
      result += `   *${card.type_line}* • ${card.set_name} • ${card.rarity}`;
      
      if (card.power && card.toughness) {
        result += ` • ${card.power}/${card.toughness}`;
      }
      
      if (card.prices.usd) {
        result += ` • $${card.prices.usd}`;
      }
      
      // Show a snippet of relevant text
      if (args.search_in === 'name' && card.name.toLowerCase().includes(args.search_text.toLowerCase())) {
        // Name search - already highlighted in the title
      } else if (card.oracle_text && card.oracle_text.toLowerCase().includes(args.search_text.toLowerCase())) {
        const textSnippet = this.getTextSnippet(card.oracle_text, args.search_text);
        result += `\n   📝 "${textSnippet}"`;
      }
      
      result += '\n\n';
    });

    return {
      content: [
        {
          type: "text",
          text: result.trim(),
        },
      ],
    };
  }

  private getTextSnippet(text: string, searchTerm: string, contextLength: number = 60): string {
    const lowerText = text.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearchTerm);
    
    if (index === -1) return text.substring(0, contextLength) + '...';
    
    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(text.length, index + searchTerm.length + contextLength / 2);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }

  private getSearchHelpContent(topic: string): string {
    const sections = {
      basics: `# Scryfall Search Basics

## Basic Syntax
- Search for exact card names: \`Lightning Bolt\`
- Use quotes for phrases: \`"Serra Angel"\`
- Use wildcards: \`Bolt*\` (matches "Bolt", "Bolt of Lightning", etc.)
- Case insensitive by default

## Boolean Operators
- **AND** (default): \`red creature\` (both red AND creature)
- **OR**: \`red or blue\` (red OR blue cards)
- **NOT** / **-**: \`-red\` or \`not red\` (exclude red cards)
- Parentheses for grouping: \`(red or blue) creature\``,

      keywords: `# Search Keywords & Operators

## Card Properties
- **name** or **n**: \`name:bolt\` or \`n:bolt\`
- **oracle** or **o**: \`o:flying\` (oracle text contains "flying")
- **type** or **t**: \`t:creature\` or \`type:legendary\`
- **mana** or **m**: \`m:2WU\` (exact mana cost)
- **cmc**: \`cmc:3\` (converted mana cost equals 3)
- **power** or **pow**: \`pow:3\`, \`pow>=4\`
- **toughness** or **tou**: \`tou:5\`, \`tou<=2\`
- **loyalty**: \`loyalty:4\` (planeswalker loyalty)

## Comparisons
- **=** (equals): \`cmc=3\`  
- **<** (less than): \`cmc<3\`
- **<=** (less than or equal): \`cmc<=3\`
- **>** (greater than): \`cmc>3\`
- **>=** (greater than or equal): \`cmc>=3\`
- **!=** (not equal): \`cmc!=3\``,

      colors: `# Color Search

## Color Keywords
- **c** or **color**: \`c:red\` or \`c:r\`
- Color combinations: \`c:wr\` (white and red), \`c:wubrg\` (all colors)
- **id** or **identity**: \`id:wu\` (white-blue color identity)

## Color Operators
- **Exactly**: \`c:wu\` (exactly white and blue)
- **Including**: \`c>=wu\` (white, blue, and possibly others)
- **At most**: \`c<=wu\` (white and/or blue, no others)
- **Colorless**: \`c:c\` or \`c:colorless\`
- **Multicolored**: \`c:m\` or \`c>1\`
- **Monocolored**: \`c=1\`

## Color Names & Abbreviations
- **White**: \`w\`, \`white\`
- **Blue**: \`u\`, \`blue\`  
- **Black**: \`b\`, \`black\`
- **Red**: \`r\`, \`red\`
- **Green**: \`g\`, \`green\``,

      types: `# Type & Subtype Search

## Type Keywords
- **type** or **t**: Search card types
- **subtype**: Search subtypes specifically

## Common Types
- **Creature**: \`t:creature\`
- **Instant**: \`t:instant\`
- **Sorcery**: \`t:sorcery\`
- **Artifact**: \`t:artifact\`
- **Enchantment**: \`t:enchantment\`
- **Planeswalker**: \`t:planeswalker\`
- **Land**: \`t:land\`

## Supertypes & Subtypes
- **Legendary**: \`t:legendary\`
- **Basic**: \`t:basic\`
- **Tribal**: \`t:tribal\`
- **Angel**: \`t:angel\`
- **Dragon**: \`t:dragon\`
- **Human**: \`t:human\`
- **Equipment**: \`t:equipment\`

## Type Combinations
- Multiple types: \`t:"legendary creature"\`
- Any of several: \`t:instant or t:sorcery\``,

      sets: `# Set & Release Search

## Set Keywords
- **set** or **s** or **e**: \`s:khm\` (Kaldheim)
- **block**: \`block:zendikar\`
- **cn** or **number**: \`cn:100\` (collector number)

## Release Date
- **year**: \`year:2023\`, \`year>=2020\`
- **date**: \`date:2023-01-01\`, \`date>=2020\`

## Set Types
- **expansion**: \`is:expansion\`
- **core**: \`is:core\`
- **masters**: \`is:masters\`
- **reprint**: \`is:reprint\`
- **supplement**: \`is:supplement\`

## Common Set Codes
- **Standard Sets**: \`s:mid\` (Midnight Hunt), \`s:neo\` (Neon Dynasty)
- **Masters**: \`s:2x2\` (Double Masters 2022)
- **Commander**: \`s:c22\` (Commander 2022)`,

      formats: `# Format Legality

## Format Keywords
- **legal**: \`legal:standard\`, \`legal:modern\`
- **banned**: \`banned:legacy\`
- **restricted**: \`restricted:vintage\`

## Format Names
- **Standard**: \`legal:standard\`
- **Pioneer**: \`legal:pioneer\`
- **Modern**: \`legal:modern\`
- **Legacy**: \`legal:legacy\`
- **Vintage**: \`legal:vintage\`
- **Commander/EDH**: \`legal:commander\`
- **Pauper**: \`legal:pauper\`
- **Historic**: \`legal:historic\`
- **Explorer**: \`legal:explorer\`
- **Alchemy**: \`legal:alchemy\``,

      prices: `# Price Search

## Price Keywords
- **usd**: \`usd:5\`, \`usd>=10\`, \`usd<1\`
- **eur**: \`eur:3\`, \`eur<=5\`
- **tix**: \`tix:0.5\` (MTGO tickets)

## Price Comparisons
- **Exact**: \`usd:10.50\`
- **Range**: \`usd>=5 usd<=20\`
- **Less than**: \`usd<5\`
- **Greater than**: \`usd>50\`
- **Missing price**: \`usd=0\` or \`-usd\`

## Price Examples
- Budget cards: \`usd<1\`
- Expensive cards: \`usd>=100\`
- MTGO playables: \`tix>=1\``,

      advanced: `# Advanced Search Features

## Card Properties
- **rarity** or **r**: \`r:mythic\`, \`r:rare\`, \`r:uncommon\`, \`r:common\`
- **artist** or **a**: \`a:"Rebecca Guay"\`
- **flavor**: \`flavor:victory\` (flavor text contains "victory")
- **watermark**: \`watermark:mirran\`
- **frame**: \`frame:2015\`, \`frame:old\`
- **border**: \`border:black\`, \`border:white\`, \`border:silver\`

## Card Features
- **is:split**: Split cards
- **is:flip**: Flip cards  
- **is:transform**: Transform cards
- **is:meld**: Meld cards
- **is:leveler**: Level up creatures
- **is:spell**: Non-land cards
- **is:permanent**: Permanent cards
- **is:vanilla**: Creatures with no abilities
- **is:funny**: Un-set cards

## Print Properties
- **is:foil**: Available in foil
- **is:nonfoil**: Available in non-foil
- **is:promo**: Promotional printings
- **is:reprint**: Not first printing
- **is:firstprint**: First printing only`,

      examples: `# Search Examples

## Basic Searches
- \`Lightning Bolt\` - Find Lightning Bolt
- \`c:red t:creature\` - Red creatures
- \`cmc<=3 legal:standard\` - Standard-legal cards with CMC 3 or less

## Complex Searches  
- \`(t:instant or t:sorcery) c:blue cmc<=2\` - Blue instants/sorceries, CMC ≤2
- \`t:creature pow>=4 tou>=4 cmc<=4\` - Efficient big creatures
- \`o:flying c:white r:uncommon\` - White uncommons with flying

## Format & Price
- \`legal:modern usd<5\` - Modern-legal cards under $5
- \`legal:commander id:wubrg\` - 5-color commanders
- \`banned:standard\` - Cards banned in Standard

## Set & Time
- \`s:khm r:mythic\` - Mythics from Kaldheim  
- \`year>=2020 t:planeswalker\` - Recent planeswalkers
- \`block:innistrad t:vampire\` - Vampires from Innistrad block

## Advanced Features
- \`is:commander o:whenever\` - Commanders with "whenever" abilities
- \`t:artifact cmc=0 legal:vintage\` - Free artifacts in Vintage
- \`a:"John Avon" t:land\` - Lands illustrated by John Avon`
    };

    if (topic === 'all') {
      return `# Complete Scryfall Search Reference

${sections.basics}

${sections.keywords}

${sections.colors}

${sections.types}

${sections.sets}

${sections.formats}

${sections.prices}

${sections.advanced}

${sections.examples}

---

**Tip**: Combine multiple search terms for precise results. Use parentheses for complex logic, and remember that searches are case-insensitive by default.`;
    }

    return sections[topic as keyof typeof sections] || `**Error**: Unknown help topic "${topic}". Available topics: ${Object.keys(sections).join(', ')}, all`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Scryfall MCP Server running on stdio");
  }
}

const server = new ScryfallMCPServer();
server.run().catch(console.error);
