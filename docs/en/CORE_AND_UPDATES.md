[Česky](../cz/CORE_AND_UPDATES.md) | **English**

# Core and version checks

**[Shared App Core 0.18.8 or newer](https://github.com/hacesoft/core) is required.** The manifest `src/appinfo/hc_shared_app_core.json` declares this dependency. Install Core first. A missing or incompatible Core is reported at startup; updating this application does not update Core automatically.

The About view checks this application and Core separately through Core's server API. This application uses `hacesoft/Weather`; Core uses `hacesoft/core`. The installed version is compared with the repository version. Equal means current; a lower local version means an update is available; a higher local version means the installed build is ahead of GitHub.

Core first requests `https://api.github.com/repos/hacesoft/Weather/contents/src/appinfo/info.xml` on the repository's default branch. It decodes the XML file and reads `<version>`, after validating `<id>` against the application ID. It does not infer the version from a tag, GitHub Release title, or `releases/latest`.

If the version file is unavailable, Core checks the repository's **`release/` directory** using GitHub's contents API and selects the highest comparable version from archive filenames. For example, 1.0.1 outranks 0.9.13-dev.2. A version file for the wrong application is rejected rather than silently substituted.

Successful results are cached for six hours; failed checks are cached for five minutes. Opening About starts a check, which may reuse the cache. **Check for updates** requests a fresh check. There is no periodic background scan of GitHub and no automatic download or installation. During an outage, Core may display the last valid result as stale; without a usable result, the check is unavailable.

## Interface languages

Czech (`cs`), English (`en`), German (`de`), Spanish (`es`), French (`fr`), Italian (`it`), Dutch (`nl`), Polish (`pl`), Portuguese (`pt`), Slovak (`sk`) and Ukrainian (`uk`). English source strings provide the fallback for unsupported languages or missing entries. `src/l10n/` contains matching JSON and JavaScript catalogs. `python3 scripts/check-languages.py` checks their key coverage, placeholders and Nextcloud registration. Documentation is CZ/EN only. Shared service dialogs belong to Core and use Core's own translations.
