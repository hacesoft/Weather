[Česky](../cz/ALADIN.md) | **English**

# ALADIN layer (Weather 1.0.1)

Enable **ALADIN** on the map. The timeline shows the next 48 hours of forecast. Select **Precipitation** or **Temperature**, and use ▶ to play the animation. The layer can overlap radar, wind, and storm potential. When comparing colors, hide the other layers if they obscure ALADIN.

On a phone, playback is a small floating button. The ⋯ button opens the timeline and variable controls; 🌦️ opens the map legend. Precipitation is the forecast hourly amount in mm; temperature is in °C. Radar describes recent observations, whereas ALADIN predicts future conditions. Times are shown in the browser or phone's local time zone.

Source: [CHMI ALADIN open data](https://opendata.chmi.cz/meteorology/weather/nwp_aladin/) accessed through the [Open-Meteo model API](https://open-meteo.com/en/docs/chmi-api). The request specifies `models=chmi_aladin_seamless`, combining the Czech 1 km domain with the Central Europe 2.3 km domain. The 48-hour request stays inside ALADIN's forecast horizon, avoiding another model's longer-range forecast. Nextcloud caches a successful field for 20 minutes and a region with no data for five minutes; the client backs off for one minute after an actual provider error.

**Display resolution:** this overlay interpolates 99 regularly spaced samples covering the current viewport. The legend shows the approximate sample spacing. It is not the model's native 1 km raster. Zooming in requests a finer sample grid, and panning refreshes the sampled area. Fine forecast features are simplified at wide zoom levels. Missing model values are reported instead of silently switching weather models.

To check the layer, open the map over the Czech Republic, turn on ALADIN, move the time slider, change variable, zoom and pan, and try overlapping the radar. Outside the model domain the layer says it has no data without logging a service failure; panning back to the Czech Republic restores the forecast. Only if the service is reported temporarily unavailable, check that Nextcloud can access `api.open-meteo.com` and retry after a minute.
