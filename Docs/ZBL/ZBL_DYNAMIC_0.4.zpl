^XA
^CI28
^FX --- DIMENSIONS: 124mm x 70mm @ 300DPI ---
^FX --- VERSION 0.4: Improved spacing for constrained fields ---
^FX --- CHANGES: NOTES now 2-line capable, sections rebalanced ---
^PW1465
^LL827
^LS0

^FX --- MAIN OUTER BORDER ---
^FO10,10^GB1445,807,4^FS

^FX ============================================================
^FX SECTION 1: HEADER (BRAND/TYPE/YEAR) - Y: 10-260 (250 dots)
^FX ============================================================
^FX BRAND_NAME: Max ~80-100 chars, adaptive font size (25-50pt range)
^FX MODEL_TYPE: Max 130 chars, 2-line wrap, adaptive font size (18-50pt range)
^FX YEAR: Fixed position, standard font

^FX Header Boxes
^FO10,10^GB1445,70,3^FS
^FO10,80^GB1445,110,3^FS
^FO10,190^GB1445,70,3^FS
^FO450,10^GB3,250,3^FS

^FX Header Text - Labels
^CF0,28
^FO30,35^FDbrand:^FS
^FO30,120^FDTYPE:^FS
^FO30,215^FDYEAR:^FS

^FX Header Text - Brand Value (DYNAMIC - CHARACTER COUNT ADAPTIVE)
^FX Font sizing: 50pt (<=25 chars) | 40pt (25-40) | 35pt (40-60) | 30pt (60-80) | 25pt (80+)
^CF0,{BRAND_FONT_SIZE}
^FO450,30^FB1015,1,0,C^FD{BRAND_NAME}\&^FS

^FX Header Text - Model Type (DYNAMIC - CHARACTER COUNT ADAPTIVE)
^FX Font sizing: 50pt (<=25) | 40pt (25-40) | 32pt (40-60) | 26pt (60-80) | 22pt (80-100) | 20pt (100-130) | 18pt (130+)
^FX Constraint: 1015 dots width, 2-line wrap, max 130 chars
^CF0,{MODEL_FONT_SIZE}
^FO450,100^FB1015,2,0,C^FD{MODEL_TYPE}\&^FS

^FX Header Text - Year Value
^CF0,40
^FO450,205^FB1015,1,0,C^FD{YEAR}\&^FS

^FX ============================================================
^FX SECTION 2: FRONT / REAR HEADERS - Y: 260-320 (60 dots)
^FX ============================================================
^FO10,260^GB722,60,3^FS
^FO732,260^GB723,60,3^FS
^CF0,45
^FO10,270^FB722,1,0,C^FDFRONT:\&^FS
^FO732,270^FB723,1,0,C^FDREAR:\&^FS

^FX ============================================================
^FX SECTION 3: SPRINGS - Y: 320-380 (60 dots)
^FX ============================================================
^FO10,320^GB722,60,3^FS
^FO732,320^GB723,60,3^FS
^FO350,320^GB3,60,3^FS
^FO1050,320^GB3,60,3^FS

^CF0,28
^FO25,340^FDForkspring:^FS
^FO350,340^FB372,1,0,C^FD{FORK_SPRING}\&^FS
^FO747,340^FDShockspring:^FS
^FO1050,340^FB395,1,0,C^FD{SHOCK_SPRING}\&^FS

^FX ============================================================
^FX SECTION 4: KIT INFO - Y: 380-430 (50 dots) - REDUCED from 55
^FX ============================================================
^FO10,380^GB1445,50,3^FS

^FX Kit Information (DYNAMIC - CHARACTER COUNT ADAPTIVE)
^FX Font sizing: 28pt (<=40 chars) | 26pt (40-60) | 24pt (60-80) | 22pt (80-100) | 20pt (100-120) | 18pt (120+)
^CF0,{KIT_FONT_SIZE}
^FO10,392^FB1445,1,0,C^FD{KIT_INFO}\&^FS

^FX ============================================================
^FX SECTION 5: NOTES FIELD - Y: 430-515 (85 dots) - INCREASED from 55
^FX ============================================================
^FX ** MAJOR CHANGE: Now supports 2-line wrap for longer content **
^FO10,430^GB1445,85,3^FS

^FX Notes Field (DYNAMIC - CHARACTER COUNT ADAPTIVE)
^FX ** NOW 2-LINE CAPABLE ** - changed from ^FB1445,1 to ^FB1445,2
^FX Field width: 1445 dots (full label width)
^FX Data sources: Column P (FORK EXTRA INFO) + Column V (REAR EXTRA INFO)
^FX Combination logic: "F: {P_value}" | "R: {V_value}" | "F: {P_value} / R: {V_value}"
^FX Font sizing: 26pt (<=80) | 24pt (80-120) | 22pt (120-160) | 20pt (160-200) | 18pt (200-250) | 16pt (250+)
^FX Max capacity: ~220-250 chars with 2 lines (vs ~120 single line)
^FX For extreme cases (>250 chars): Truncation still required
^CF0,{NOTES_FONT_SIZE}
^FO10,445^FB1445,2,0,C^FD{NOTES}\&^FS

^FX ============================================================
^FX SECTION 6: ADJUSTMENT HEADERS - Y: 515-560 (45 dots) - REDUCED from 55
^FX ============================================================
^FO10,515^GB722,45,3^FS
^FO732,515^GB723,45,3^FS
^CF0,32
^FO10,525^FB722,1,0,C^FDFork Adjustments:\&^FS
^FO732,525^FB723,1,0,C^FDShock Adjustments:\&^FS

^FX ============================================================
^FX SECTION 6: DATA TABLE - Y: 560-770 (210 dots) - REDUCED from 225
^FX Row height: 42 dots (was 45)
^FX ============================================================
^FO10,560^GB380,210,3^FS
^FO390,560^GB342,210,3^FS
^FO732,560^GB380,210,3^FS
^FO1112,560^GB343,210,3^FS

^FX Horizontal Grid Lines (42-dot row spacing)
^FO10,602^GB1445,3,3^FS
^FO10,644^GB1445,3,3^FS
^FO10,686^GB1445,3,3^FS
^FO10,728^GB1445,3,3^FS

^FX Data Content - Row 1: Oil Type (y=560-602)
^CF0,22
^FO10,573^FB380,1,0,C^FDHYPERPRO OIL\&^FS
^FO390,573^FB342,1,0,C^FD{OIL_TYPE}\&^FS

^FX Data Content - Row 2: Oil Level (y=602-644)
^FO10,615^FB380,1,0,C^FDOIL LEVEL\&^FS
^FO390,615^FB342,1,0,C^FD{OIL_LEVEL}\&^FS

^FX Data Content - Row 3: Spring Preload (y=644-686)
^FO10,657^FB380,1,0,C^FDSPRING PRELOAD\&^FS
^FO390,657^FB342,1,0,C^FD{FORK_PRELOAD}\&^FS
^FO732,657^FB380,1,0,C^FDSPRING PRELOAD\&^FS
^FO1112,657^FB343,1,0,C^FD{SHOCK_PRELOAD}\&^FS

^FX Data Content - Row 4: Static Sag (y=686-728)
^FO10,699^FB380,1,0,C^FDSTATIC SAG\&^FS
^FO390,699^FB342,1,0,C^FD{FORK_SAG}\&^FS
^FO732,699^FB380,1,0,C^FDSTATIC SAG\&^FS
^FO1112,699^FB343,1,0,C^FD{SHOCK_SAG}\&^FS

^FX Data Content - Row 5: Compression (y=728-770)
^FO10,741^FB380,1,0,C^FDCOMPRESSION\&^FS
^FO390,741^FB342,1,0,C^FD{FORK_COMPRESSION}\&^FS
^FO732,741^FB380,1,0,C^FDCOMPRESSION\&^FS
^FO1112,741^FB343,1,0,C^FD{SHOCK_COMPRESSION}\&^FS

^FX ============================================================
^FX SECTION 7: FOOTER LEGEND - Y: 770-817 (47 dots)
^FX ============================================================
^FO10,770^GB1445,47,3^FS
^CF0,20
^FO10,785^FB1445,1,0,C^FDmm=millimeter, T=complete Turns(anti-clockwise), K=Klicks(anti-clockwise), P=Position, R=Rings(Visible)\&FS

^XZ
