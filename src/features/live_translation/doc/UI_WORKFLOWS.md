# Gränssnittsarbetsflöden för Live Translation

## 1. Talare (Broadcaster)
1. Välj ljudingång i rullgardinsmenyn (t.ex. "NDI Webcam Input" eller mikrofon).
2. Välj målspråk i det regionala språkbiblioteket (t.ex. Swahili, Spanska, Engelska).
3. Klicka på "Starta tolkning" för att initiera ljudström och tolkbryggor.
4. Status övergår från `connecting` till `active`.
5. Vid minut 14 sker automatisk rotation (`rotating`) utan ljudavbrott.
6. Klicka på "Avsluta tolkning" för ordinarie avslut.

## 2. Lyssnare (Listener)
1. Välj önskat målspråk från den globala språklistan.
2. Klienten mutar automatiskt alla andra språkkanaler och spelar endast upp valt spår.

## 3. Panik-tystning (Panic Mute)
1. Vid oönskad utmatning klickar användaren på "Panik-tystning".
2. Alla aktiva ljudspår och buffrar rensas omedelbart för alla kanaler.
3. Tillståndet återställs till `idle`.

## 4. Gränssnittsestetik (Variation 3)
- Redaktionell estetik inspirerad av Cormorant Garamond, Space Mono och djupt bläck.
- Understrukna minimalistiska valrutor för enhets- och språkval.
- 4px hårfin volymmätare och accentuerad statusindikator (`#5e6ef2`).
