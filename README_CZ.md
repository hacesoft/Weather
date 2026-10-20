**Česky** | [English](README.md)

# Počasí pro Nextcloud

Verze **1.0.0** · Nextcloud **35** · PHP **8.3 nebo novější**

Aktuální počasí, hodinová a týdenní předpověď, východ a západ slunce, uložené polohy a mapa s radarem, větrem, bouřkovým potenciálem a předpovědí srážek/teploty CHMI ALADIN. Vrstvy lze kombinovat a přehrávat. Na mobilu se ovládání otevírá v malých plovoucích panelech. Widget přehledu Nextcloudu nabízí stručné informace a po kliknutí otevře aplikaci.

Součást rodiny aplikací Hacesoft. **[Hacesoft Shared App Core](https://github.com/hacesoft/core) 0.18.1 nebo novější je povinná závislost.** Nejprve nainstalujte a zapněte Core. Poskytuje společný layout, mapové poskytovatele, mezipaměť a služby polohy.

## Instalace

Rozbalte tento úplný zdrojový archiv do samostatného adresáře na NASu. Obsahuje `install.sh`, `uninstall.sh`, hotovou aplikaci v `src/` a dokumentaci.

```sh
sudo sh ./install.sh
```

Instalátor aktualizuje aplikaci ve stávajícím Nextcloudu a vypíše původní/novou verzi a velikost instalace. Nerestartuje kontejnery. Pro odstranění prostudujte a spusťte `sudo sh ./uninstall.sh`.

[Návod k instalaci](docs/cz/INSTALLATION.md) · [Core a kontrola verzí](docs/cz/CORE_AND_UPDATES.md)

## Jazyky

čeština (`cs`), angličtina (`en`), němčina (`de`), španělština (`es`), francouzština (`fr`), italština (`it`), nizozemština (`nl`), polština (`pl`), portugalština (`pt`), slovenština (`sk`) a ukrajinština (`uk`). Rozhraní se řídí jazykem uživatele Nextcloudu. Pro nepodporovaný jazyk nebo chybějící překlad se použije angličtina. Dokumentace je pouze v češtině a angličtině.

## Repozitář a balíčky

[Zdrojový repozitář](https://github.com/hacesoft/Weather) · [Hlášení chyb](https://github.com/hacesoft/Weather/issues) · [Shared App Core](https://github.com/hacesoft/core)

Na GitHub zkopírujte **obsah** tohoto zdrojového adresáře přímo do kořene repozitáře, aby tam byly `README.md`, `README_CZ.md`, `src/`, instalační skripty a dokumentace. Verzi 1.0.0 určuje `src/appinfo/info.xml`. Adresář `release/` slouží pro vytvořené archivy. Příkaz `sh build-release.sh` zkontroluje jazyky a vytvoří aktuální runtime i úplný zdrojový archiv. Pro sestavení jsou potřeba Python 3, Node.js, zip a běžné shellové nástroje; při instalaci dodaného balíčku na server Nextcloudu tyto sestavovací nástroje nepotřebujete.

Licence **AGPL-3.0-or-later**; viz [LICENSE](LICENSE).

[ALADIN](docs/cz/ALADIN.md) · [Widget přehledu a Androidu](docs/cz/ANDROID_WIDGET.md) · [Mobilní rozložení](docs/cz/MOBILNI_LAYOUT.md)

Bouřkový potenciál je odhad modelu. Zobrazení výstrah je připravené pro samostatného poskytovatele, zatím nejde o funkční výstražnou službu.
