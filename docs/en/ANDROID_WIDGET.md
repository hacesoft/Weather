[Česky](../cz/ANDROID_WIDGET.md) | **English**


# Weather on the Android home screen

Version 1.0.1 supplies an overview to the existing Dashboard widget in the Nextcloud Android app. The first data row, beside the current temperature, includes the server Weather app version that supplies the data. It does not require a separate Android app.

## Appearance

The widget shows current conditions, the app version, up to four hourly forecast items, and short summaries for today and tomorrow with high and low temperatures. Each item includes a weather symbol in its text and also supplies an image icon to Android. On some phones the Nextcloud client displays generic grey silhouettes instead of item images. On one test phone, an image also appeared alongside the wrong forecast row, so the text symbol is the reliable condition cue. Tapping an item opens Weather on its overview. How many rows are visible depends on the widget's size; smaller widgets can scroll. Android and the Nextcloud client control the widget background and height; reducing its height on the home screen removes the empty lower area.

The server can supply more items and values in each title and subtitle. The Android client does not accept a custom layout template through this API; a fully custom graphical card requires a separate Android widget that reads Weather data.

A manually configured place is used directly. When Weather is set to device location, the server Dashboard API cannot access the phone's GPS; the widget uses the administrator default and marks it as the default. The browser weather view still obtains device location as before.

## Try it

1. Install Weather 1.0.1 on Nextcloud with the Dashboard app enabled.
2. Sign in to the same instance with the Nextcloud Android app.
3. Long press the home screen, choose Widgets, add the Nextcloud Dashboard widget, and select Weather in its configuration.
4. Resize the widget to show more hours. Tapping a row opens the full Weather app.

The Android app and operating system determine refresh timing. The server forecast is cached for roughly ten minutes. This widget is not a continuous radar animation.

## Phone map

Tap ⋯ next to the small ▶ button to expand the map timeline. Tap the floating 💨/⛈️ button to open wind or storm details above the map; tap it again to close the panel. Hourly detail can be expanded inside the panel.

The Weather map also offers an ALADIN precipitation and temperature forecast; see the [ALADIN layer guide](ALADIN.md). The home-screen widget continues to show only the overview.
