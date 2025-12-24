# Kit Codes ZBL Template Analysis v1

## Overview

Analysis of columns C, D, and E (FORKCODE, SHOCKCODE, COMBICODE) from the MANUALINFO CSV against ZBL_DYNAMIC_0.5.zpl template limitations.

## Data Summary

| Metric | Value |
|--------|-------|
| Total Records | 4,151 |
| Max FORKCODE Length | 22 chars |
| Max SHOCKCODE Length | 17 chars |
| Max COMBICODE Length | 17 chars |
| Max Combined Kit Line | 90 chars |

## ZBL Template Specification (Section 4: Kit Info)

From `ZBL_DYNAMIC_0.5.zpl` lines 70-80:

```zpl
^FX Kit Information (DYNAMIC - CHARACTER COUNT ADAPTIVE)
^FX Format: "FORKKIT: {FORKCODE} --- SHOCKKIT: {SHOCKCODE} --- COMBIKIT: {COMBICODE}"
^FX Default value for each code: "NONE" (when NULL in source data)
^FX Font sizing: 28pt (<=40 chars) | 26pt (40-60) | 24pt (60-80) | 22pt (80-100) | 20pt (100-120) | 18pt (120+)
^CF0,{KIT_FONT_SIZE}
^FO10,392^FB1445,1,0,C^FD...\&^FS
```

**Template Constraints:**
- Field width: 1445 dots
- Single line (FB1445,**1**,0,C)
- Font range: 28pt down to 18pt
- Height: 50 dots available

## Compatibility Analysis

### Current Data vs Template Limits

| Combined Length Range | Records | Font Size | Status |
|----------------------|---------|-----------|--------|
| <= 40 chars | 0 | 28pt | N/A |
| 41-60 chars | 0 | 26pt | N/A |
| 61-80 chars | 2,775 | 24pt | OK |
| 81-100 chars | 1,376 | 22pt | OK |
| 101-120 chars | 0 | 20pt | N/A |
| 121+ chars | 0 | 18pt | N/A |

### Longest Combined Kit Info Line

```
FORKKIT: SP-HD14-SSA001REV --- SHOCKKIT: SP-HD14-SSD001REV --- COMBIKIT: SP-HD14-SSE001REV
```
**Length: 90 characters**

Source record:
- Brand: HARLEY DAVIDSON
- Model: FXDX SUPER GLIDE SPORT
- Year: 00-05

### Findings

**NO LIMITATIONS DETECTED**

All current data fits within the ZBL template design parameters:

1. **Maximum combined length is 90 chars** - well within the 120+ char capacity (18pt font minimum)
2. **Majority (67%) of records are 61-80 chars** - fitting comfortably at 24pt
3. **Remaining 33% are 81-100 chars** - still using readable 22pt font

### Code Pattern Analysis

| FORKCODE Length | Count | Percentage |
|-----------------|-------|------------|
| 0 (empty) | 1,453 | 35% |
| 14 chars | 2,620 | 63% |
| 15-22 chars | 78 | 2% |

Standard format: `SP-XX##-SSA###` (14 chars)
Extended format: `SP-XX##-SSA###XX` (16-22 chars, includes suffixes like `UD`, `REV`)

## Edge Cases

### Longest Individual Codes

| Type | Code | Length |
|------|------|--------|
| FORKCODE | `SP-HD14-SSA001REV` | 22 chars |
| SHOCKCODE | `SP-HD14-SSD001REV` | 17 chars |
| COMBICODE | `SP-HD14-SSE001REV` | 17 chars |

### Empty Code Handling

- 35% of records have empty FORKCODE
- Template correctly defaults to "NONE" (4 chars) when empty
- Minimum possible line: `FORKKIT: NONE --- SHOCKKIT: NONE --- COMBIKIT: NONE` = 54 chars

## Recommendations

### Current Template is Sufficient

The ZBL_DYNAMIC_0.5 template handles all existing kit code combinations without issues.

### Future-Proofing Considerations

If kit codes ever exceed current maximums:

1. **At 22pt font (current max usage)**, approximately 100-105 chars fit on 1445 dots
2. **At 18pt font**, approximately 130-140 chars would fit
3. **For 2-line capability**, would need to change `^FB1445,1` to `^FB1445,2` and increase section height

### Monitoring Threshold

Consider adding a data validation warning if:
- Any individual code exceeds 25 characters
- Combined line exceeds 110 characters

## Conclusion

**The ZBL_DYNAMIC_0.5.zpl template is fully compatible with all current kit code data.** The adaptive font sizing (22pt for longest entries) ensures legibility while fitting all content within the allocated space.

---

*Analysis Date: 2025-12-24*
*Source Data: MANUALINFO FOR IMPORTERS 2025-10.xlsx*
*Template Version: ZBL_DYNAMIC_0.5.zpl*
