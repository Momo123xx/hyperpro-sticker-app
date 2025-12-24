# ZBL Template Coding Guide: MODEL_TYPE and NOTES Fields

## Overview

This guide provides analysis and coding recommendations for handling Columns G, P, and V from the MANUALINFO dataset when populating ZBL label templates.

---

## Column Analysis Summary

| Column | Field ID | ZPL Variable | Max Length Found | Avg Length | ZPL Constraint |
|--------|----------|--------------|------------------|------------|----------------|
| G | TYPE | {MODEL_TYPE} | 132 chars | ~30-40 chars | 1015 dots, 2 lines max |
| P | FORK EXTRA INFO | {NOTES} (part 1) | 184 chars | ~60 chars | Combined with V |
| V | REAR EXTRA INFO | {NOTES} (part 2) | 144 chars | ~50 chars | Combined with P |

---

## Column G: MODEL_TYPE Analysis

### Longest Strings Found

| Length | Example |
|--------|---------|
| 132 | `R50-60-75/5 '69-'73 R60-75-90/6 R90/S '73-76 R60-75/7 '76-77 R100/7/S '76-78 R100 '80-'84 R80/7 '77-'84 R100/T '78-'80 KONI SCHOCK'S` |
| 131 | `R50-60-75/5 '69-'73 R60-75-90/6 R90/S '73-'76 R60-75/7 '76-'77 R80/7 '77-'84 R100/7/S '76-'78 R100/T '78-'80 R100 '80-'84 + FAIRING` |
| 118 | `R50-60-75/5 '69-'73 R60-75-90/6 R90/S '73-76 R60-75/7 '76-77 R100/7/S '76-78 R100 '80-'84 R80/7 '77-'84 R100/T '78-'80` |
| 71 | `Mongrel 125 series Akita/Fat Sabbath/FSR/GT/Hilts/RS Super (735mm fork)` |

### ZPL Template Constraint for MODEL_TYPE

```zpl
^CF0,{MODEL_FONT_SIZE}
^FO450,100^FB1015,2,0,C^FD{MODEL_TYPE}\&^FS
```

- **Field Width**: 1015 dots (~85mm at 300 DPI)
- **Max Lines**: 2 (allows word wrap)
- **Font Size**: Dynamic via `{MODEL_FONT_SIZE}`

### Character Limits by Font Size (Approximate)

| Font Size | Chars/Line | Max Chars (2 lines) | Fits 132-char Max? |
|-----------|------------|---------------------|-------------------|
| 40 | ~35-40 | ~70-80 | NO |
| 35 | ~40-45 | ~80-90 | NO |
| 30 | ~45-50 | ~90-100 | NO |
| 25 | ~55-60 | ~110-120 | MARGINAL |
| 22 | ~60-65 | ~120-130 | MARGINAL |
| 20 | ~70-75 | ~140-150 | YES |
| 18 | ~80-85 | ~160-170 | YES |

### Recommendation for MODEL_TYPE

```python
def calculate_model_font_size(model_type: str) -> int:
    """Calculate font size for MODEL_TYPE field."""
    length = len(model_type)

    if length <= 25:
        return 50  # Large, very readable
    elif length <= 40:
        return 40  # Standard
    elif length <= 60:
        return 32  # Reduced
    elif length <= 80:
        return 26  # Small but readable
    elif length <= 100:
        return 22  # Minimum comfortable
    elif length <= 130:
        return 20  # Minimum for extreme cases
    else:
        return 18  # Absolute minimum (may still overflow)
```

---

## Columns P & V: Combined {NOTES} Field

### Critical Constraint

The `{NOTES}` field has a **SINGLE LINE ONLY** constraint:

```zpl
^CF0,{NOTES_FONT_SIZE}
^FO10,450^FB1445,1,0,C^FD{NOTES}\&^FS
```

- **Field Width**: 1445 dots (~121mm at 300 DPI - full width)
- **Max Lines**: 1 (NO WRAPPING)
- **Font Size**: Dynamic via `{NOTES_FONT_SIZE}`

### Longest Strings Found

**Column P (FORK EXTRA INFO):**
| Length | Example |
|--------|---------|
| 184 | `YES THE HYPERPRO SPRING SHOULD BE 40MM SHORTER THE OEM. Left fork needs Tool HP-T65...` |
| 162 | `Mount the fork 10MM through the triple clamp. Right fork needs tool HP-T85...` |
| 161 | `MOUNT FORK 10 MM THROUGH TRIPLE CLAMP (pump cartridge and outer tube...` |

**Column V (REAR EXTRA INFO):**
| Length | Example |
|--------|---------|
| 144 | `(*) MEASURE PRELOAD 8MM AFTER MOUNTING THE SPRING ON THE SHOCK...` |
| 133 | `MOUNT NUT ON SHOCK 10 MM FROM THE END. (SPACERS ARE TO BE PUT...` |
| 103 | `for max lowering remove the 3mm spacer part 13S-222243 from the Frame...` |

### NOTES Combination Logic

The `{NOTES}` field can contain 0, 1, or 2 descriptions:

| Scenario | P (Fork) | V (Rear) | Combined NOTES |
|----------|----------|----------|----------------|
| 0 notes | Empty | Empty | `""` (blank) |
| 1 note (Fork only) | Has value | Empty | `"F: {P_value}"` |
| 1 note (Rear only) | Empty | Has value | `"R: {V_value}"` |
| 2 notes | Has value | Has value | `"F: {P_value} / R: {V_value}"` |

### Worst Case Scenario

If both columns have maximum length content:
- P: 184 chars
- V: 144 chars
- Separator: ` / ` (3 chars)
- Prefixes: `F: ` + `R: ` (6 chars)
- **Total: 337 chars** (FAR exceeds single-line capacity)

### Character Limits by Font Size for NOTES (1445 dots width)

| Font Size | Max Chars (single line) | Fits 184-char Max? | Fits 337-char Combined? |
|-----------|------------------------|-------------------|------------------------|
| 28 | ~85-95 | NO | NO |
| 24 | ~100-110 | NO | NO |
| 20 | ~120-130 | NO | NO |
| 18 | ~135-145 | NO | NO |
| 16 | ~150-160 | NO | NO |
| 14 | ~175-185 | MARGINAL | NO |
| 12 | ~200-220 | YES | NO |

---

## Coding Recommendations

### 1. NOTES Field Construction Function

```python
def construct_notes(fork_info: str, rear_info: str, max_length: int = 120) -> tuple[str, int]:
    """
    Construct NOTES field from Fork and Rear info.

    Returns:
        tuple: (notes_string, font_size)
    """
    fork_info = (fork_info or "").strip()
    rear_info = (rear_info or "").strip()

    # Scenario 0: Both empty
    if not fork_info and not rear_info:
        return ("", 24)  # Default size for empty

    # Scenario 1a: Fork only
    if fork_info and not rear_info:
        notes = f"F: {fork_info}"

    # Scenario 1b: Rear only
    elif rear_info and not fork_info:
        notes = f"R: {rear_info}"

    # Scenario 2: Both present
    else:
        notes = f"F: {fork_info} / R: {rear_info}"

    # Calculate font size based on length
    font_size = calculate_notes_font_size(len(notes))

    # Truncate if still too long
    if len(notes) > max_length:
        notes = notes[:max_length-3] + "..."

    return (notes, font_size)


def calculate_notes_font_size(length: int) -> int:
    """Calculate font size for NOTES field (single line constraint)."""
    if length <= 60:
        return 24  # Comfortable reading
    elif length <= 80:
        return 22
    elif length <= 100:
        return 20
    elif length <= 120:
        return 18
    elif length <= 140:
        return 16
    elif length <= 170:
        return 14
    else:
        return 12  # Minimum readable size
```

### 2. Truncation Strategy

For extremely long combined notes, implement intelligent truncation:

```python
def smart_truncate_notes(fork_info: str, rear_info: str, max_total: int = 120) -> str:
    """
    Intelligently truncate when combined length exceeds max.
    Strategy: Allocate space proportionally, prioritize essential info.
    """
    fork_info = (fork_info or "").strip()
    rear_info = (rear_info or "").strip()

    if not fork_info and not rear_info:
        return ""

    if not rear_info:
        if len(fork_info) <= max_total - 3:  # "F: " prefix
            return f"F: {fork_info}"
        return f"F: {fork_info[:max_total-6]}..."

    if not fork_info:
        if len(rear_info) <= max_total - 3:  # "R: " prefix
            return f"R: {rear_info}"
        return f"R: {rear_info[:max_total-6]}..."

    # Both present - allocate space proportionally
    overhead = 10  # "F: " + " / R: "
    available = max_total - overhead

    total_len = len(fork_info) + len(rear_info)

    if total_len <= available:
        return f"F: {fork_info} / R: {rear_info}"

    # Proportional allocation
    fork_alloc = int(available * (len(fork_info) / total_len))
    rear_alloc = available - fork_alloc

    fork_truncated = fork_info[:fork_alloc-3] + "..." if len(fork_info) > fork_alloc else fork_info
    rear_truncated = rear_info[:rear_alloc-3] + "..." if len(rear_info) > rear_alloc else rear_info

    return f"F: {fork_truncated} / R: {rear_truncated}"
```

### 3. Alternative: Priority-Based Display

When both notes are too long, show only the most critical one:

```python
def priority_notes(fork_info: str, rear_info: str, max_length: int = 120) -> str:
    """
    When combined is too long, show only one (prioritize fork for suspension focus).
    """
    fork_info = (fork_info or "").strip()
    rear_info = (rear_info or "").strip()

    # Check if combined fits
    combined = construct_notes(fork_info, rear_info)[0]
    if len(combined) <= max_length:
        return combined

    # Prioritize fork info (typically more critical for suspension)
    if fork_info:
        if len(fork_info) <= max_length - 3:
            return f"F: {fork_info}"
        return f"F: {fork_info[:max_length-6]}..."

    # Fall back to rear
    if len(rear_info) <= max_length - 3:
        return f"R: {rear_info}"
    return f"R: {rear_info[:max_length-6]}..."
```

---

## Data Quality Issues Identified

1. **Inconsistent casing**: Mix of UPPERCASE and lowercase text
2. **Special characters**: Quotation marks in some entries (e.g., `19"`)
3. **Non-English text**: Some Dutch entries (e.g., `VERWIJDER DE 2 ORIGINELE VEREN...`)
4. **Abbreviations**: Heavy use of abbreviations (MM, K., T., POS, etc.)

---

## Summary Constraints

| Field | Max Safe Length | Font Size Range | Overflow Strategy |
|-------|-----------------|-----------------|-------------------|
| MODEL_TYPE | ~130 chars | 18-50 | Dynamic sizing, 2-line wrap |
| NOTES | ~120 chars | 12-24 | Truncation required for combined |

### Critical Warning

The current ZPL template's single-line constraint for `{NOTES}` is insufficient for the actual data. Consider:

1. **Modifying the ZPL template** to allow 2 lines for NOTES
2. **Implementing mandatory truncation** at ~120 characters
3. **Splitting into separate FRONT_NOTES and REAR_NOTES fields**
