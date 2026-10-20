**Česky** | [English](../en/INSTALLATION.md)

# Instalace

Vyžaduje Nextcloud 35, PHP 8.3 nebo novější a [Shared App Core 0.18.1 nebo novější](https://github.com/hacesoft/core). Zdrojový archiv obsahuje hotové soubory pro prohlížeč; na NASu se nespouští npm sestavení.

1. Nainstalujte a zapněte Core.
2. Rozbalte archiv aplikace do samostatného pracovního adresáře na NASu.
3. V tomto adresáři spusťte `sudo sh ./install.sh`.
4. Otevřete aplikaci, ověřte zobrazenou verzi, uložte nastavení a znovu načtěte stránku. V části O aplikaci zkontrolujte verzi aplikace i Core.

Instalátor vyhledá kontejnery Nextcloudu, připraví aplikaci, před nahrazením živého kódu zkontroluje PHP a vypíše původní/novou verzi a velikost instalace. Nerestartuje kontejnery. Příliš staré Core může vyvolat varování, po kterém instalace dokončí práci; před otevřením aplikace aktualizujte Core. Před instalací mějte běžnou zálohu databáze a dat Nextcloudu.

`uninstall.sh` odstraňuje aplikaci podle dodaného odinstalačního postupu. Před potvrzením odstranění si přečtěte jeho výzvy; sdílené služby Core mají vlastní správu.

## Sestavení

Ve zdrojovém adresáři spusťte `sh build-release.sh`. Zkontroluje katalogy 11 jazyků a vytvoří runtime ZIP/tar.gz i úplný zdrojový ZIP. Zdrojový ZIP obsahuje instalaci, odinstalaci, oba kořenové README, dokumentaci a zdroj aplikace. Neobsahuje dočasné soubory, předchozí archivy ani závislosti typu node_modules.
