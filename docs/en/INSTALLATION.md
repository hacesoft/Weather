[Česky](../cz/INSTALLATION.md) | **English**

# Installation

Requires Nextcloud 35, PHP 8.3 or newer and [Shared App Core 0.18.1 or newer](https://github.com/hacesoft/core). The supplied full source archive contains prebuilt browser assets; there is no npm build step on the NAS.

1. Install and enable Core.
2. Extract the application archive into a separate working directory on the NAS.
3. In that directory run `sudo sh ./install.sh`.
4. Open the application, check its displayed version, save a setting and reload the page. Check the About view for both application and Core versions.

The installer identifies Nextcloud containers, stages the application, checks PHP before replacing live code and reports the old/new version and installed size. It does not restart containers. If Core is too old, a warning may allow installation to finish; update Core before opening the application. Keep a normal Nextcloud database/data backup before deployment.

`uninstall.sh` removes the application through the supplied uninstall workflow. Read its prompts before confirming removal; shared Core services have their own lifecycle.

## Building

Run `sh build-release.sh` in the source directory. It verifies the 11 language catalogs and creates runtime ZIP/tar.gz and a full source ZIP. The full source ZIP includes installation and uninstall scripts, both root READMEs, documentation and runtime source. It excludes temporary files, previous archives and dependencies such as node_modules.
