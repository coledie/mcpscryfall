# MTG Knowledge System Usage Examples

This document demonstrates how to use the integrated MTG Knowledge Base in the Scryfall MCP Server.

## Using the MTG Knowledge Lookup Tool

### Basic Keyword Lookup
```
Tool: mtg_knowledge_lookup
Query: "flying"

Result:
# MTG Knowledge: "flying"

## Keyword Ability

This creature can only be blocked by creatures with flying or reach.

**Examples:** Serra Angel, Delver of Secrets, Dragon Hatchling

---

**Related Scryfall Searches:**
• **Cards with this ability:** `o:"flying"`
```

### Color Combination Lookup
```
Tool: mtg_knowledge_lookup  
Query: "azorius"

Result:
# MTG Knowledge: "azorius"

## Color Identity

White-blue guild focused on control, law enforcement, and bureaucracy.

**Examples:** Teferi, Time Raveler, Supreme Will, Dovin Baan

---

**Related Scryfall Searches:**
• **azorius cards:** `c:wu`
```

### Format Information
```
Tool: mtg_knowledge_lookup
Query: "commander"

Result:
# MTG Knowledge: "commander"

## Format

100-card singleton multiplayer format with a legendary commander.

**Examples:** 100 cards, Singleton, Multiplayer focused

---

**Related Scryfall Searches:**
• **Natural Language:** "commander" → `legal:commander`
```

## Enhanced Natural Language Search

The natural language search now automatically recognizes MTG terms and provides better context:

### Example 1: Keyword Recognition
```
Tool: scryfall_natural_search
Query: "cheap blue creatures with flying"
Show Translation: true

Result:
**Natural Language Search Results**
**Original Query:** "cheap blue creatures with flying"
**Translated Query:** "c:u t:creature o:"flying" cmc<=2"

**MTG terms found in your query:**
• **flying** (Keyword Ability)
• **blue** (Color Identity)  
• **creatures** (Card Type)

Found 23 cards (showing up to 25)

1. **Delver of Secrets** // **Insectile Aberration** {U}
   *Human Wizard // Human Insect*
   ...
```

### Example 2: Complex Query with Guild Recognition
```
Tool: scryfall_natural_search
Query: "azorius cards that counter spells"

Result:
**Natural Language Search Results**

**MTG terms found in your query:**
• **azorius** (Color Identity)

Found 31 cards (showing up to 25)

1. **Counterspell** {UU}
   *Instant*
   Counter target spell.
   ...
```

## Knowledge-Enhanced Search Features

### 1. Automatic Term Recognition
The system now automatically identifies MTG terms in your queries and provides context:
- **Keyword abilities** → Suggests oracle text searches
- **Card types** → Suggests type searches  
- **Color names/guilds** → Suggests color searches
- **Formats** → Suggests legality searches

### 2. Educational Suggestions
When searches fail, the system suggests learning about relevant MTG concepts:

```
**Search Error:** No cards found

**Learn more about these MTG terms:**
• Use `mtg_knowledge_lookup` with "menace"
• Use `mtg_knowledge_lookup` with "rakdos"
```

### 3. Related Search Suggestions
The knowledge lookup provides contextual Scryfall search suggestions:

- **For keywords:** `o:"keyword"`
- **For types:** `t:type`  
- **For colors:** `c:colorcode`
- **For formats:** `legal:format`

## Available Knowledge Categories

The MTG Knowledge Base covers:

### Card Types & Supertypes
- Basic types: creature, instant, sorcery, artifact, enchantment, planeswalker, land
- Supertypes: legendary, basic, snow
- Subtypes: equipment, aura, human, elf, etc.

### Keyword Abilities
- **Evergreen:** flying, trample, deathtouch, lifelink, haste, etc.
- **Non-evergreen:** flashback, scry, convoke, delve, cycling, etc.

### Color Combinations  
- **Single colors:** white, blue, black, red, green
- **Guilds:** azorius, dimir, rakdos, gruul, selesnya, etc.
- **Shards:** bant, esper, grixis, jund, naya
- **Wedges:** abzan, jeskai, sultai, mardu, temur

### Formats
- **Constructed:** standard, modern, legacy, vintage, commander, pioneer
- **Limited:** draft, sealed
- **Casual:** brawl, oathbreaker

### Deck Archetypes
- **Strategy types:** aggro, control, midrange, combo, tempo
- **Specific archetypes:** burn, mill, ramp, tribal, storm

## Tips for Best Results

1. **Use specific MTG terminology** - The system recognizes hundreds of Magic terms
2. **Combine concepts** - "aggressive red creatures" works better than just "aggressive"
3. **Ask about unfamiliar terms** - Use `mtg_knowledge_lookup` to learn about new concepts
4. **Check translations** - Use `show_translation: true` to see how your query was interpreted
5. **Explore related searches** - The knowledge system suggests relevant Scryfall queries

## Integration with Existing Tools

The MTG Knowledge Base enhances all existing tools:

- **Natural Language Search**: Better term recognition and translation
- **Regular Search**: Smarter fallback suggestions when searches fail
- **Translation Help**: More comprehensive mapping suggestions
- **Error Handling**: Educational suggestions when queries don't work

This creates a more intelligent and educational Magic: The Gathering search experience!
