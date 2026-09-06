# Gränssnittsarbetsflöden för Live Translation

## 1. Talare (Broadcaster)
1. Välj målspråk i rullgardinsmenyn (t.ex. Svenska, Spanska, Engelska).
2. Klicka på "Starta tolkning" för att initiera mikrofon och Gemini-ström.
3. Status övergår från `connecting` till `active`.
4. Vid minut 14 sker automatisk rotation (`rotating`) utan ljudavbrott.
5. Klicka på "Avsluta tolkning" för ordinarie avslut.

## 2. Panik-tystning (Panic Mute)
1. Vid oönskad utmatning klickar användaren på "Snabb-tystning".
2. Alla aktiva ljudspår och buffrar rensas omedelbart.
3. Tillståndet återställs till `idle`.
