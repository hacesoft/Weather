[Česky](../cz/MOBILNI_LAYOUT.md) | **English**

# Weather: mobile layout

Version: 1.0.0. The app uses the Shared App Core Layout API on Nextcloud 35.

Overview and warnings use the Core scroll area. On phones, the floating menu at the right side of the header provides Overview, Map, Warnings, location selection and settings. Radar / Wind / Storm / ALADIN layer buttons live on the map; playback sits at its bottom edge and more tools open from the map settings button. Open the ALADIN timeline and precipitation/temperature choice with ⋯ and its legend with 🌦️. The menu closes after a selection. The selected-point card has a close button. One finger pans, two fingers zoom. Wind vectors are smoothly interpolated between model grid points. Weather now serves radar PNGs from the Nextcloud origin; background map tiles still use the Core proxy/cache. Provider failures appear next to the timeline.

## Check on a phone

Pinch the overview outside the map, then pan vertically and horizontally; test map gestures and settings separately.
