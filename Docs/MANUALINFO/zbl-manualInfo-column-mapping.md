# ZBL Variable to Column Mapping

This document maps the dynamic variables in `ZBL_DYNAMIC_0.5.zpl` to their corresponding columns in the manual/spreadsheet.

## Data Variables

| Variable Name | Column Letter | Description | Character Limits | Font Size Range |
|---------------|---------------|-------------|------------------|-----------------|
| `{BRAND_NAME}` |F| Brand name | Max ~80-100 chars | 25-50pt (adaptive) |
| `{MODEL_TYPE}` |G| Model/Type description | Max 130 chars (2-line wrap) | 18-50pt (adaptive) |
| `{YEAR}` |H| Year | - | 40pt (fixed) |
| `{FORK_SPRING}` |I| Fork spring specification | - | 28pt (fixed) |
| `{SHOCK_SPRING}` |Q| Shock spring specification | - | 28pt (fixed) |
| `{FORKCODE}` |C| Fork kit code (defaults to "NONE") | - | Part of kit info line |
| `{SHOCKCODE}` |D| Shock kit code (defaults to "NONE") | - | Part of kit info line |
| `{COMBICODE}` |C| Combo kit code (defaults to "NONE") | - | Part of kit info line |
| `{NOTES}` |P|,|V| Combined notes field | Max ~220-250 chars (2-line) | 16-26pt (adaptive) |
| `{OIL_TYPE}` |J| Oil type specification | - | 22pt (fixed) |
| `{OIL_LEVEL}` |K| Oil level measurement | - | 22pt (fixed) |
| `{FORK_PRELOAD}` |L| Fork spring preload | - | 22pt (fixed) |
| `{SHOCK_PRELOAD}` | | Shock spring preload | - | 22pt (fixed) |
| `{FORK_SAG}` |M| Fork static sag | - | 22pt (fixed) |
| `{SHOCK_SAG}` |S| Shock static sag | - | 22pt (fixed) |
| `{FORK_COMPRESSION}` |N| Fork compression setting | - | 22pt (fixed) |
| `{SHOCK_COMPRESSION}` |T| Shock compression setting | - | 22pt (fixed) |

## Special Kit Info Field Logic

The kit information line combines three separate codes into a single formatted string:
- `{FORKCODE}`: Fork kit code
- `{SHOCKCODE}`: Shock kit code
- `{COMBICODE}`: Combo kit code

**Format:**
```
FORKKIT: {FORKCODE} --- SHOCKKIT: {SHOCKCODE} --- COMBIKIT: {COMBICODE}
```

**Default values:**
- Each code defaults to "NONE" when NULL in source data
- Character limits: Up to 120+ chars total
- Font sizing: 28pt (≤40 chars) | 26pt (40-60) | 24pt (60-80) | 22pt (80-100) | 20pt (100-120) | 18pt (120+)

## Special Notes Field Logic

The `{NOTES}` field combines data from two source columns:
- **Column P**: FORK EXTRA INFO
- **Column V**: REAR EXTRA INFO

**Combination logic:**
- If only P has data: `"F: {P_value}"`
- If only V has data: `"R: {V_value}"`
- If both have data: `"F: {P_value} / R: {V_value}"`

## Font Size Variables (Auto-calculated)

These variables are calculated dynamically based on character count and do not map to columns:
- `{BRAND_FONT_SIZE}`: Based on `{BRAND_NAME}` length
- `{MODEL_FONT_SIZE}`: Based on `{MODEL_TYPE}` length
- `{KIT_FONT_SIZE}`: Based on combined kit info line length (FORKKIT + SHOCKKIT + COMBIKIT)
- `{NOTES_FONT_SIZE}`: Based on `{NOTES}` length

## Footer Legend (Static Text)

The footer contains static abbreviations:
- **mm** = millimeter
- **T** = Turns (CCW - Counter-Clockwise)
- **K** = Klicks (CCW - Counter-Clockwise)
- **P** = Position
- **R** = Rings (Visible)
