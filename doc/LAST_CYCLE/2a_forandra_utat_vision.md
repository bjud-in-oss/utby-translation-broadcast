# Steg 2a: Förändra utåt (Vision & Gränssnitt) - TCK-017

## 1. Yttre gränssnittsförändring och användarupplevelse
För användaren innebär integrationen av `live_translation` en responsiv kontrollpanel och widget (`LiveTranslationWidget`) för realtidsöversättning:
- **Tydlig sessionsstatus:** Visar aktuell status (`idle`, `connecting`, `active`, `rotating`, `error`).
- **Språkval:** Möjlighet att konfigurera käll- och målspråk (t.ex. Engelska till Svenska, Spanska, Tyska, Franska) med BCP-47 koder.
- **Tolkning och ljudindikator:** Visuell realtidsmätare för inkommande ljud och översatt ljudström.
- **Säkerhetsindikator & Resiliens:** Statusindikator för sessionsrotation ("Hot-swap aktiv: sömlös överlämning") samt noll-avbrottsgaranti för åhörare.
- **Snabb-stopp / Panik-tystning:** Direkt avbrytningsknapp som omedelbart tömmer ljudkön och tystar alla aktiva Web Audio-källor.

## 2. Visuell och funktionell design
- **Färgpalett & Ytor:** Varm, minimalistisk neutral bas med `bg-stone-50`, `border-stone-200`, `text-stone-900` och accentfärger i `emerald` för aktiv tolkning samt `amber` vid sessionsrotation.
- **Typografi & Skalning:** Klart hierarkiskt upplägg med `text-lg font-medium` för modultitel och `text-xs text-stone-500` för teknisk metadata.
- **Interaktionsmönster:**
  - Starta tolkning / Stoppa tolkning (`data-testid="toggle-translation-btn"`).
  - Välj målspråk (`data-testid="target-language-select"`).
  - Ljudmätare och live-transkription (`data-testid="audio-level-meter"`, `data-testid="transcript-display"`).
