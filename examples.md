# Natural Language Search Examples

This document shows examples of natural language queries and how they get translated by the Scryfall MCP Server.

## Basic Creature Searches

| Natural Language | Translated Query | Description |
|------------------|------------------|-------------|
| "red creatures with flying" | `c:r t:creature o:flying` | Red creatures that have flying |
| "big green creatures" | `c:g t:creature and (pow>=4 or tou>=4)` | Green creatures with power or toughness 4+ |
| "cheap blue creatures" | `c:u t:creature cmc<=2` | Blue creatures with mana cost 2 or less |
| "legendary angels" | `t:legendary t:angel` | Legendary angel creatures |

## Ability-Based Searches

| Natural Language | Translated Query | Description |
|------------------|------------------|-------------|
| "creatures that enter the battlefield" | `t:creature (o:"enters the battlefield" or o:"enters tapped" or o:"when ~ enters")` | Creatures with ETB effects |
| "sacrifice outlets" | `o:"sacrifice" or o:"sac a" or o:"sac an"` | Cards that can sacrifice other permanents |
| "cards that draw cards" | `o:"draw" and (o:"card" or o:"cards")` | Cards with card draw effects |
| "counterspells" | `o:"counter" and o:"spell"` | Spells that counter other spells |
| "token generators" | `o:"create" and o:"token"` | Cards that create token creatures |

## Format and Price Searches

| Natural Language | Translated Query | Description |
|------------------|------------------|-------------|
| "modern legal dragons" | `legal:modern t:dragon` | Dragons legal in Modern format |
| "budget standard cards" | `legal:standard usd<=5` | Standard-legal cards under $5 |
| "expensive vintage cards" | `legal:vintage usd>=50` | Vintage-legal cards $50 or more |
| "banned in standard" | `banned:standard` | Cards banned in Standard |

## Complex Combination Searches

| Natural Language | Translated Query | Description |
|------------------|------------------|-------------|
| "cheap white removal spells" | `c:w (o:"destroy" or o:"exile") cmc<=3` | White removal spells 3 mana or less |
| "blue card draw instants" | `c:u t:instant (o:"draw" and o:"card")` | Blue instant spells that draw cards |
| "red aggressive creatures" | `c:r t:creature (o:"haste" or o:"trample" or pow>=3)` | Red creatures with aggressive abilities |
| "multicolor commanders" | `c:m legal:commander t:legendary t:creature` | Multicolored legendary creatures |

## Guild and Color Combinations

| Natural Language | Translated Query | Description |
|------------------|------------------|-------------|
| "azorius cards" | `c:wu` | White-blue (Azorius) cards |
| "golgari creatures" | `c:bg t:creature` | Black-green (Golgari) creatures |
| "boros spells" | `c:rw (t:instant or t:sorcery)` | Red-white (Boros) instant/sorcery spells |

## Usage Tips

1. **Use the `scryfall_natural_search` tool** for the best natural language experience
2. **Set `show_translation: true`** to see how your query was translated
3. **Combine multiple terms** for more specific results
4. **Use the `scryfall_translation_help` tool** to learn available mappings
5. **Regular search tools have automatic fallback** to natural language if exact syntax fails

## Common Natural Language Terms Supported

### Combat Abilities
- flying, trample, first strike, double strike, deathtouch, lifelink, vigilance, haste, reach, defender, menace

### Protection Abilities  
- hexproof, shroud, ward, indestructible, protection

### Keywords
- enters the battlefield, leaves the battlefield, dies, sacrifice, destroy, exile, draw cards, discard, mill

### Creature Types
- angels, demons, dragons, elves, goblins, humans, zombies, vampires, spirits, beasts

### Card Types
- creatures, instants, sorceries, artifacts, enchantments, planeswalkers, lands, equipment, auras

### Colors & Guilds
- All basic colors, all guild names (azorius, dimir, rakdos, etc.), multicolor combinations

### Formats
- All major formats with "legal", "banned", "restricted" modifiers

### Cost Terms
- cheap, expensive, budget, free, specific mana costs (one mana, two mana, etc.)
