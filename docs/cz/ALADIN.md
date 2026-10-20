**Česky** | [English](../en/ALADIN.md)

# Vrstva ALADIN (Počasí 1.0.1)

Na mapě zapněte **ALADIN**. Časová osa ukazuje předpověď na následujících 48 hodin. Tlačítky **Srážky** a **Teplota** volíte vykreslenou veličinu; ▶ spustí animaci. Vrstvu můžete zapnout současně s radarem, větrem i bouřkovým potenciálem. Při současném zapnutí se barvy překrývají, proto si při porovnávání někdy vypněte ostatní vrstvy.

Na telefonu je přehrávání malé plovoucí tlačítko. Tlačítko ⋯ zobrazí časovou osu a volbu veličiny. Ikona 🌦️ otevře legendu nad mapou. Předpověď srážek značí úhrn za hodinu v mm, teplota se udává ve °C. Radar zachycuje minulá měření, ALADIN odhaduje budoucí vývoj. Čas je zobrazen v místním časovém pásmu telefonu nebo prohlížeče.

Zdroj: [otevřená data modelu ALADIN ČHMÚ](https://opendata.chmi.cz/meteorology/weather/nwp_aladin/) zpracovaná přes [modelové API Open‑Meteo](https://open-meteo.com/en/docs/chmi-api). Používá se `models=chmi_aladin_seamless`: česká doména 1 km, případně středoevropská doména 2,3 km. API je vyžádáno jen pro 48 hodin, aby se do vrstvy nedostala jiná modelová předpověď za horizontem ALADINu. Úspěšné pole se na serveru drží 20 minut; oblast bez dat pět minut. Při skutečné chybě služby opakuje klient pokus nejdříve za minutu.

**Rozlišení zobrazení:** vykreslení vzniká interpolací pravidelných 99 vzorků pro aktuální výřez mapy. Popisek legendy uvádí přibližný rozestup vzorků. Není to původní raster modelu 1 km. Přiblížení zmenšuje rozestup; při posunu se oblast načte znovu. Na velkém výřezu jsou detaily předpovědi zjednodušené. Pokud API pro oblast nebo čas neposkytne hodnoty, aplikace nemíchá do vrstvy údaje jiného modelu a zobrazí hlášení.

Pro kontrolu otevřete mapu nad ČR, zapněte ALADIN, posuňte čas, přepněte veličinu, přibližte, posuňte mapu a zkuste kombinaci s radarem. Při posunu mapy mimo oblast modelu se zobrazí „Model ALADIN nemá pro tuto oblast data“, aniž vznikne chybový záznam. Po návratu nad ČR se zobrazí předpověď. Jen při hlášení o dočasně nedostupné službě zkontrolujte síťový přístup serveru Nextcloud k `api.open-meteo.com` a zkuste to po minutě.
