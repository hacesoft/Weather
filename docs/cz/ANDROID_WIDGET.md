**Česky** | [English](../en/ANDROID_WIDGET.md)

# Počasí na ploše Androidu

Verze 1.0.0 předává do widgetu aplikace Nextcloud přehled Počasí. Číslo verze serverové aplikace, která poskytuje data, je v prvním datovém řádku vedle aktuální teploty. Samostatnou aplikaci pro Android nepotřebujete.

## Zobrazení

Widget zobrazuje aktuální teplotu, verzi a místo, až čtyři následující hodiny a stručné řádky pro dnešek a zítřek s nejvyšší a nejnižší teplotou. Každý řádek má symbol počasí přímo v textu; obrázková ikona je také předávána Androidu. Na některých telefonech klient Nextcloud místo obrázků položek zobrazuje výchozí šedé siluety. Na zkušebním telefonu se navíc jedna načtená ikona zobrazila u nesprávného řádku, proto je rozhodující symbol v textu. Klepnutí na položku otevře aplikaci Počasí na přehledu. Kolik řádků se vejde na plochu, závisí na velikosti widgetu v telefonu; menší widget lze posouvat. Výšku a pozadí widgetu určuje Android a aplikace Nextcloud; zmenšením widgetu na ploše zmizí prázdná spodní část.

Server může předat další položky a více hodnot v textu a podtextu. Jejich rozmístění, velikost písma a vlastní šablonu pro Android ale nepřijímá: mobilní widget vykresluje aplikace Nextcloud svým pevným rozložením. Vlastní grafická karta vyžaduje samostatný Android widget, který by četl data z Počasí.

Pro polohu nastavenou ručně používá widget dané místo. V režimu polohy zařízení nedostává serverové rozhraní Dashboardu GPS polohu telefonu; použije proto administrátorskou výchozí polohu a označí ji jako výchozí. V prohlížeči zůstává dosavadní určování polohy zařízení.

## Jak vyzkoušet

1. Nainstalujte Počasí 1.0.0 na Nextcloud se zapnutou aplikací Dashboard.
2. Na telefonu se přihlaste k téže instanci v aplikaci Nextcloud.
3. Podržte prst na volném místě plochy, otevřete Widgety, zvolte widget aplikace Nextcloud a v jeho nastavení vyberte Počasí.
4. Zvětšete widget, chcete-li vidět i další hodiny. Klepnutí na řádek otevře úplnou aplikaci.

Aktualizaci dat řídí mobilní aplikace a Android. Předpověď na serveru má mezipaměť přibližně deset minut. Widget není nepřetržitě přehrávaný radar.

## Mapa v telefonu

V mapě se časová osa otevře tlačítkem ⋯ vedle malého tlačítka ▶. Souhrn větru nebo bouřek se otevře zvláštním plovoucím tlačítkem 💨/⛈️ nad mapou. Křížení se zobrazením mapy je pouze dočasné: panel lze stejným tlačítkem zavřít. Podrobné hodinové řádky lze rozbalit uvnitř panelu.

V mapě Počasí je dostupná i vrstva ALADIN pro předpověď srážek a teploty; podrobnosti jsou v [návodu k vrstvě ALADIN](ALADIN.md). Widget na ploše dál zobrazuje jen přehled počasí.
