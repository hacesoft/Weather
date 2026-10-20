**Česky** | [English](../en/CORE_AND_UPDATES.md)

# Core a kontrola verzí

**[Shared App Core 0.18.8 nebo novější](https://github.com/hacesoft/core) je povinný.** Závislost určuje manifest `src/appinfo/hc_shared_app_core.json`. Nejprve nainstalujte Core. Chybějící nebo nekompatibilní Core se oznámí při spuštění; aktualizace aplikace Core automaticky neaktualizuje.

V části O aplikaci se přes serverové API Core ověřuje aplikace i Core samostatně. Aplikace používá repozitář `hacesoft/Weather`, Core používá `hacesoft/core`. Stejná verze znamená aktuální instalaci, nižší místní verze dostupnou aktualizaci a vyšší místní verze instalaci novější než GitHub.

Core nejprve požádá o `https://api.github.com/repos/hacesoft/Weather/contents/src/appinfo/info.xml` ve výchozí větvi repozitáře. Dekóduje XML, ověří `<id>` proti ID aplikace a přečte `<version>`. Verzi neodvozuje z tagu, názvu GitHub Release ani `releases/latest`.

Pokud soubor s verzí není dostupný, Core zkontroluje **adresář `release/` v repozitáři** přes GitHub contents API a vybere nejvyšší porovnatelnou verzi z názvů archivů. Například 1.0.1 má přednost před 0.9.13-dev.2. Soubor určený jiné aplikaci se odmítne, místo aby se tiše použil náhradní údaj.

Úspěšná kontrola se ukládá do mezipaměti na šest hodin, neúspěšná na pět minut. Otevření části O aplikaci spustí kontrolu, která může použít mezipaměť. **Zkontrolovat aktualizace** vyžádá nové ověření. Neprobíhá pravidelné skenování GitHubu na pozadí ani automatické stahování nebo instalace. Při výpadku může Core zobrazit poslední platný výsledek jako zastaralý; bez použitelného výsledku je kontrola nedostupná.

## Jazyky rozhraní

čeština (`cs`), angličtina (`en`), němčina (`de`), španělština (`es`), francouzština (`fr`), italština (`it`), nizozemština (`nl`), polština (`pl`), portugalština (`pt`), slovenština (`sk`) a ukrajinština (`uk`). Anglické zdrojové texty slouží jako výchozí pro nepodporované jazyky a chybějící překlady. V `src/l10n/` jsou shodné JSON a JavaScript katalogy. `python3 scripts/check-languages.py` ověřuje klíče, zástupné hodnoty a registraci v Nextcloudu. Dokumentace je pouze CZ/EN. Dialogy sdílených služeb patří do Core a používají jeho vlastní překlady.
