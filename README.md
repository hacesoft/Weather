[Česky](README_CZ.md) | **English**


# Weather for Nextcloud

Version **1.0.1** · Nextcloud **35** · PHP **8.3 or newer**

Current conditions, hourly and weekly forecasts, sunrise and sunset, saved locations and a map with radar, wind, storm potential and CHMI ALADIN precipitation/temperature forecasts. Layers can be combined and animated. Mobile controls open in compact floating panels. The Nextcloud Dashboard widget provides a compact overview and opens the application when selected.

Part of the Hacesoft application family. **[Hacesoft Shared App Core](https://github.com/hacesoft/core) 0.18.8 or newer is a required dependency.** Install and enable Core before this application. Core provides the shared layout, map providers, cache and location services.

## Installation

Extract this full source archive into its own directory on the NAS. It includes `install.sh`, `uninstall.sh`, the ready-to-use application in `src/`, and documentation.

```sh
sudo sh ./install.sh
```

The installer updates the application in the existing Nextcloud installation and reports the old/new version and installed size. It does not restart containers. For removal, read and run `sudo sh ./uninstall.sh`.

[Installation guide](docs/en/INSTALLATION.md) · [Core and update checks](docs/en/CORE_AND_UPDATES.md)

## Languages

Czech (`cs`), English (`en`), German (`de`), Spanish (`es`), French (`fr`), Italian (`it`), Dutch (`nl`), Polish (`pl`), Portuguese (`pt`), Slovak (`sk`) and Ukrainian (`uk`). The interface follows the Nextcloud user's language. Unsupported languages and missing translations fall back to English. Documentation is maintained only in Czech and English.

## Repository and packaging

[Source repository](https://github.com/hacesoft/Weather) · [Issues](https://github.com/hacesoft/Weather/issues) · [Shared App Core](https://github.com/hacesoft/core)

For GitHub, copy the **contents** of this source directory to the repository root, with `README.md`, `README_CZ.md`, `src/`, installation scripts and documentation at the top level. `src/appinfo/info.xml` declares version 1.0.1. `release/` is reserved for generated archives. Run `sh build-release.sh` to check the language catalogs and generate current runtime and full source archives. Maintainers need Python 3, Node.js, zip and standard shell tools; these build tools are not needed on the Nextcloud server to install the supplied package.

Licensed under **AGPL-3.0-or-later**; see [LICENSE](LICENSE).

[ALADIN](docs/en/ALADIN.md) · [Dashboard and Android widget](docs/en/ANDROID_WIDGET.md) · [Mobile layout](docs/en/MOBILE_LAYOUT.md)

Storm potential is a model estimate. The warnings view is prepared for a separate provider and does not constitute an operational warning service.
