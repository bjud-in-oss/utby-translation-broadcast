name: admin-quota-guard
description: Spårar förbrukning av Cloudflare Calls spårminuter i realtid för arrangören.
instructions: |
  - Beräkna spårminuter med formeln: $Sp\text{\aa}rminuter = (1 + Tolksp\text{\aa}r) \times Lyssnare \times Minuter$[cite: 7].
  - Persistera ackumulerade minuter för innevarande kalendermånad i localStorage[cite: 19].
  - Visa enbart i arrangörsgränssnittet en statusindikator[cite: 13, 16].
  - Utlös varning vid 8 000 spårminuter (gul) och 9 500 spårminuter (röd) med alternativ att stänga av inaktiva språkspår[cite: 2, 10, 17].