<?php

declare(strict_types=1);

/** @var array $_ */
use OCP\Util;

Util::addStyle('hc_shared_app_core', 'workspace');
Util::addStyle('hc_weather', 'style-' . $_['version']);
Util::addScript('hc_shared_app_core', 'hc_shared_app_core');
Util::addScript('hc_weather', 'app-' . $_['version']);
?>
<div
    id="wp-app"
    data-app-name="<?php p($l->t('Weather')); ?>"
    data-app-version="<?php p($_['version']); ?>"
    data-required-core-version="<?php p($_['requiredCoreVersion']); ?>"
    data-required-core-api-version="<?php p($_['requiredCoreApiVersion']); ?>"
    data-core-download-url="<?php p($_['coreDownloadUrl']); ?>"
><p role="status"><?php p($l->t('Starting application…')); ?></p><noscript><?php p($l->t('Enable JavaScript to use Weather.')); ?></noscript></div>

<template id="wp-app-template">
    <header class="wp-header hc-shared-app-core-layout__header">
        <div class="wp-brand">
            <img src="<?php p(image_path('hc_weather', 'app.svg')); ?>" alt="" class="wp-app-icon">
            <div>
                <div class="wp-brand-title"><h2><?php p($l->t('Weather')); ?></h2><span class="wp-version-badge">v<?php p($_['version']); ?></span></div>
                <p id="wp-location-subtitle"><?php p($l->t('Loading location…')); ?></p>
            </div>
        </div>

        <nav class="wp-tabs hc-shared-app-core-layout__toolbar" aria-label="<?php p($l->t('Weather views')); ?>">
        <button type="button" class="active" data-tab="overview" title="<?php p($l->t('Show weather overview')); ?>" aria-label="<?php p($l->t('Show weather overview')); ?>"><?php p($l->t('Overview')); ?></button>
        <button type="button" data-tab="map" title="<?php p($l->t('Show weather map')); ?>" aria-label="<?php p($l->t('Show weather map')); ?>"><?php p($l->t('Map')); ?></button>
        <button type="button" data-tab="warnings" title="<?php p($l->t('Show warnings')); ?>" aria-label="<?php p($l->t('Show warnings')); ?>"><?php p($l->t('Warnings')); ?></button>
    </nav>
        <div class="wp-header-actions">
            <button id="wp-location-button" type="button" title="<?php p($l->t('Choose or change location')); ?>" aria-label="<?php p($l->t('Choose or change location')); ?>">📍 <?php p($l->t('Location')); ?></button>
            <button id="wp-settings-button" type="button" title="<?php p($l->t('Open weather settings')); ?>" aria-label="<?php p($l->t('Open weather settings')); ?>">⚙ <?php p($l->t('Settings')); ?></button>
        </div>
    </header>


    <main class="wp-main hc-shared-app-core-layout__content">
        <div id="wp-loading" class="wp-state-card"><?php p($l->t('Loading weather…')); ?></div>
        <div id="wp-error" class="wp-state-card wp-error" hidden></div>

        <section id="wp-tab-overview" class="wp-view hc-shared-app-core-view hc-shared-app-core-scroll-area" data-view="overview" hidden>
            <article class="wp-hero">
                <div class="wp-hero-main">
                    <div id="wp-current-icon" class="wp-weather-icon wp-weather-icon-hero" aria-hidden="true">☀️</div>
                    <div class="wp-current-text">
                        <div class="wp-current-top"><strong id="wp-current-temp">--°</strong><span id="wp-current-condition">--</span></div>
                        <div id="wp-current-feels" class="wp-muted"></div>
                    </div>
                </div>
                <div class="wp-hero-side">
                    <div id="wp-current-meta" class="wp-current-meta"></div>
                    <div class="wp-hero-extras">
                        <div class="wp-hero-extra"><strong><?php p($l->t('Right now')); ?></strong><div id="wp-now-details" class="wp-detail-grid"></div></div>
                        <div class="wp-hero-extra"><div class="wp-hero-sun-head"><strong><?php p($l->t('Sun')); ?></strong><span id="wp-daylight-label"></span></div><div class="wp-sun-line wp-sun-line-compact"><span>🌅</span><div class="wp-sun-track"><i id="wp-sun-position"></i></div><span>🌇</span></div><div id="wp-sun-details" class="wp-detail-grid"></div></div>
                    </div>
                </div>
            </article>

            <section class="wp-section wp-forecast-board hc-shared-app-core-surface">
                <div class="wp-section-title"><h3><?php p($l->t('Short-term and weekly forecast')); ?></h3><span><?php p($l->t('Compact overview')); ?></span></div>
                <div class="wp-temperature-trend-wrap">
                    <div class="wp-trend-head"><strong><?php p($l->t('Temperature')); ?></strong><span id="wp-trend-range" class="wp-muted"></span></div>
                    <svg id="wp-temperature-trend" class="wp-temperature-trend" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-label="<?php p($l->t('Temperature trend')); ?>"></svg>
                </div>
                <div id="wp-hourly-compact" class="wp-forecast-strip wp-hourly-compact" tabindex="0" aria-label="<?php p($l->t('Hourly forecast')); ?>"></div>
                <div class="wp-strip-divider"></div>
                <div id="wp-daily-compact" class="wp-forecast-strip wp-daily-compact" tabindex="0" aria-label="<?php p($l->t('Weekly forecast')); ?>"></div>
            </section>

        </section>

        <section id="wp-tab-weather-map" class="wp-view hc-shared-app-core-view" data-view="weather-map" hidden>
            <div class="wp-section wp-map-section wp-weather-map-section hc-shared-app-core-surface">
                <div class="wp-section-title wp-section-title-actions wp-map-headline">
                    <h3 id="wp-weather-map-title">🗺️ <?php p($l->t('Weather map')); ?></h3>
                    <div class="wp-map-headline-controls">
                        <div class="wp-map-layer-switch" aria-label="<?php p($l->t('Weather map layer')); ?>">
                            <button type="button" class="active" data-weather-layer="radar" title="<?php p($l->t('Show precipitation radar')); ?>">🌧️ <?php p($l->t('Radar')); ?></button>
                            <button type="button" data-weather-layer="wind" title="<?php p($l->t('Show wind map')); ?>">💨 <?php p($l->t('Wind')); ?></button>
                            <button type="button" data-weather-layer="storms" title="<?php p($l->t('Show storm activity')); ?>">⛈️ <?php p($l->t('Storm potential')); ?></button>
                            <button type="button" data-weather-layer="aladin" title="<?php p($l->t('Show ALADIN forecast')); ?>">🌦️ ALADIN</button>
                        </div>

                        <div class="wp-layer-controls" data-layer-controls="radar">
                            <button id="wp-radar-play" type="button" class="wp-title-play" title="<?php p($l->t('Play or pause radar animation')); ?>" aria-label="<?php p($l->t('Play or pause radar animation')); ?>">▶ <?php p($l->t('Play')); ?></button>
                            <div class="wp-map-timeline"><input id="wp-radar-slider" type="range" min="0" max="0" value="0" aria-label="<?php p($l->t('Radar time')); ?>"><span id="wp-radar-status" class="wp-muted"></span></div>
                            <span id="wp-radar-time" class="wp-map-time"></span>
                        </div>

                        <div class="wp-layer-controls" data-layer-controls="wind" hidden>
                            <button id="wp-wind-play" type="button" class="wp-title-play" title="<?php p($l->t('Play or pause wind forecast')); ?>" aria-label="<?php p($l->t('Play or pause wind forecast')); ?>">▶ <?php p($l->t('Play')); ?></button>
                            <div class="wp-map-timeline"><input id="wp-wind-slider" type="range" min="0" max="0" value="0" aria-label="<?php p($l->t('Wind forecast time')); ?>"><span id="wp-wind-status" class="wp-muted"><?php p($l->t('Wind')); ?> · Open‑Meteo</span></div>
                            <div class="wp-wind-levels" aria-label="<?php p($l->t('Wind altitude')); ?>"><span class="wp-wind-levels-label"><?php p($l->t('Altitude')); ?>:</span><button type="button" class="active" data-wind-level="10m"><i style="--level-color:#29b6f6"></i>10 m</button><button type="button" data-wind-level="80m"><i style="--level-color:#66bb6a"></i>80 m</button><button type="button" data-wind-level="120m"><i style="--level-color:#ffb74d"></i>120 m</button><button type="button" data-wind-level="180m"><i style="--level-color:#ef5350"></i>180 m</button><button type="button" data-wind-level="all">🌈 <?php p($l->t('All levels')); ?></button></div>
                            <span id="wp-wind-time" class="wp-map-time"><?php p($l->t('Current state and development')); ?></span>
                        </div>

                        <div class="wp-layer-controls" data-layer-controls="storms" hidden>
                            <button id="wp-storm-play" type="button" class="wp-title-play" title="<?php p($l->t('Play or pause storm forecast')); ?>" aria-label="<?php p($l->t('Play or pause storm forecast')); ?>">▶ <?php p($l->t('Play')); ?></button>
                            <div class="wp-map-timeline"><input id="wp-storm-slider" type="range" min="0" max="0" value="0" aria-label="<?php p($l->t('Storm forecast time')); ?>"><span id="wp-storm-status" class="wp-muted">CAPE + <?php p($l->t('precipitation')); ?> + <?php p($l->t('gusts')); ?></span></div>
                            <span id="wp-storm-time" class="wp-map-time"><?php p($l->t('Model overview')); ?></span>
                        </div>

                        <div class="wp-layer-controls" data-layer-controls="aladin" hidden>
                            <button id="wp-aladin-play" type="button" class="wp-title-play" title="<?php p($l->t('Play or pause ALADIN forecast')); ?>" aria-label="<?php p($l->t('Play or pause ALADIN forecast')); ?>">▶ <?php p($l->t('Play')); ?></button>
                            <div class="wp-map-timeline"><input id="wp-aladin-slider" type="range" min="0" max="0" value="0" aria-label="<?php p($l->t('ALADIN forecast time')); ?>"><span id="wp-aladin-status" class="wp-muted">ČHMÚ ALADIN · Open‑Meteo</span></div>
                            <span id="wp-aladin-time" class="wp-map-time"></span>
                            <div class="wp-aladin-metrics" role="group" aria-label="<?php p($l->t('ALADIN variable')); ?>"><button type="button" data-aladin-metric="precipitation" class="active" aria-pressed="true"><?php p($l->t('Precipitation')); ?></button><button type="button" data-aladin-metric="temperature" aria-pressed="false"><?php p($l->t('Temperature')); ?></button></div>
                        </div>

                        <div class="wp-map-tools wp-provider-tools" aria-label="<?php p($l->t('Map tools')); ?>"><button id="wp-map-follow" type="button" class="wp-map-follow" title="<?php p($l->t('Follow my location')); ?>" aria-label="<?php p($l->t('Follow my location')); ?>">◎ <?php p($l->t('My location')); ?></button><select data-map-style="weather" title="<?php p($l->t('Choose map background')); ?>" aria-label="<?php p($l->t('Map style')); ?>"><option value="osm"><?php p($l->t('OSM standard')); ?></option><option value="osm-light"><?php p($l->t('OSM light')); ?></option><option value="osm-dark"><?php p($l->t('OSM dark')); ?></option><option value="mapy-basic" data-requires-mapy><?php p($l->t('Mapy.com basic')); ?></option><option value="mapy-outdoor" data-requires-mapy><?php p($l->t('Mapy.com tourist')); ?></option><option value="mapy-aerial" data-requires-mapy><?php p($l->t('Mapy.com aerial')); ?></option><option value="mapy-names-overlay" data-requires-mapy><?php p($l->t('Mapy.com names overlay')); ?></option><option value="mapy-winter" data-requires-mapy><?php p($l->t('Mapy.com winter')); ?></option></select><a class="wp-map-external" data-external-map="mapy" data-map-kind="weather" href="#" target="_blank" rel="noopener noreferrer" title="<?php p($l->t('Open current map position in Mapy.com')); ?>">Mapy.com ↗</a></div>
                    </div>
                </div>

                <div id="wp-weather-map" class="wp-weather-map wp-unified-weather-map hc-shared-app-core-surface" data-map-kind="weather"><div id="wp-weather-base-layer" class="wp-map-layer"></div><div id="wp-radar-layer" class="wp-map-layer wp-radar-layer" data-weather-overlay="radar"></div><canvas id="wp-aladin-canvas" class="wp-map-canvas wp-aladin-canvas" data-weather-overlay="aladin" aria-label="<?php p($l->t('ALADIN forecast map')); ?>" hidden></canvas><canvas id="wp-wind-canvas" class="wp-map-canvas wp-wind-canvas" data-weather-overlay="wind" aria-label="<?php p($l->t('Animated wind flow')); ?>" hidden></canvas><canvas id="wp-storm-canvas" class="wp-map-canvas wp-storm-canvas" data-weather-overlay="storms" hidden></canvas><div id="wp-weather-marker" class="wp-location-marker" title="<?php p($l->t('Selected location')); ?>">●</div><div id="wp-wind-legend" class="wp-map-legend wp-wind-legend" data-layer-detail="wind" hidden><strong><?php p($l->t('Wind')); ?> 10 m</strong><small><?php p($l->t('Wind speed controls particle movement speed.')); ?></small></div><div class="wp-map-legend wp-storm-legend" data-layer-detail="storms" hidden><strong id="wp-storm-map-activity"><?php p($l->t('Evaluating area…')); ?></strong><small>⚡ <?php p($l->t('elevated/high storm potential')); ?></small></div></div>

                <div class="wp-map-layer-detail" data-layer-detail="wind" hidden><div class="wp-map-detail-heading"><strong><?php p($l->t('Selected location')); ?></strong><button type="button" class="wp-detail-toggle" data-detail-toggle="wind" aria-expanded="false" aria-controls="wp-wind-hours"><?php p($l->t('Hourly detail')); ?> <span aria-hidden="true">⌄</span></button></div><div id="wp-wind-current" class="wp-wind-current"></div><div id="wp-wind-hours" class="wp-wind-hours" tabindex="0"></div></div>
                <div class="wp-map-layer-detail" data-layer-detail="storms" hidden><div class="wp-map-detail-heading"><strong><?php p($l->t('Selected location')); ?></strong><button type="button" class="wp-detail-toggle" data-detail-toggle="storms" aria-expanded="false" aria-controls="wp-storm-hours"><?php p($l->t('24-hour model estimate')); ?> <span aria-hidden="true">⌄</span></button></div><div id="wp-storm-summary" class="wp-storm-summary"></div><div id="wp-storm-hours" class="wp-storm-hours" tabindex="0"></div></div>
                <div class="wp-map-layer-detail wp-aladin-detail" data-layer-detail="aladin" hidden><strong id="wp-aladin-detail-title"><?php p($l->t('ALADIN precipitation forecast')); ?></strong><div id="wp-aladin-colorbar" class="wp-aladin-colorbar"></div><small id="wp-aladin-scale"><?php p($l->t('Precipitation per hour (mm)')); ?></small><small id="wp-aladin-detail-source"><?php p($l->t('CHMI ALADIN data via Open-Meteo; sampled map field.')); ?></small></div>
            </div>
        </section>

        <section id="wp-tab-warnings" class="wp-view hc-shared-app-core-view hc-shared-app-core-scroll-area" data-view="warnings" hidden><div class="wp-section"><div class="wp-section-title"><h3>⚠️ <?php p($l->t('Warnings')); ?></h3></div><div class="wp-warning-info"><strong><?php p($l->t('The warning provider is prepared as a separate module.')); ?></strong><p><?php p($l->t('For the Czech Republic it will use public CHMI CAP data directly. Other regions will use a separate European or global provider.')); ?></p></div></div></section>
    </main>

    <div id="wp-settings-overlay" class="wp-overlay" hidden aria-hidden="true">
        <div class="wp-modal" role="dialog" aria-modal="true" aria-labelledby="wp-settings-title" tabindex="-1">
            <div class="wp-modal-title"><div><strong id="wp-settings-title"><?php p($l->t('Weather settings')); ?> <span class="wp-version-inline">v<?php p($_['version']); ?></span></strong><small><?php p($l->t('Your settings override the administrator default without changing it.')); ?></small></div><button id="wp-settings-x" type="button" aria-label="<?php p($l->t('Close')); ?>">×</button></div>
            <nav class="wp-settings-tabs" aria-label="<?php p($l->t('Settings sections')); ?>"><button type="button" class="active" data-settings-tab="location">📍 <?php p($l->t('Location')); ?></button><button type="button" data-settings-tab="widget">▦ <?php p($l->t('Widget')); ?></button><button id="wp-settings-admin-tab" type="button" data-settings-tab="admin" hidden>⚙ <?php p($l->t('Administration')); ?></button><button type="button" data-settings-tab="mapcache">🗺️ <?php p($l->t('Map cache')); ?></button><button type="button" data-settings-tab="about">ℹ <?php p($l->t('About')); ?></button></nav>
            <div class="wp-settings-body">
                <section class="wp-settings-pane" data-settings-pane="location">
                    <div class="wp-active-location-card"><small><?php p($l->t('My active default location')); ?></small><strong id="wp-user-default-summary">--</strong><span id="wp-user-default-detail" class="wp-muted"></span><div class="wp-active-location-card-actions"><button id="wp-open-admin-location" type="button" class="wp-admin-jump" hidden><?php p($l->t('Edit administrator default location')); ?></button></div></div>
                    <div class="wp-settings-section wp-settings-section-first"><h3><?php p($l->t('Default location')); ?></h3><label class="wp-radio"><input type="radio" name="location-mode" value="admin"><span><?php p($l->t('Use administrator default')); ?> <small id="wp-admin-default-label"></small></span></label><label class="wp-radio"><input type="radio" name="location-mode" value="device"><span><?php p($l->t('Use current device location')); ?><small><?php p($l->t('The browser asks for location permission.')); ?></small></span></label><label class="wp-radio"><input type="radio" name="location-mode" value="manual"><span><?php p($l->t('Use my own location')); ?></span></label><div id="wp-manual-location" class="wp-location-search-box"><input id="wp-location-search" type="search" placeholder="<?php p($l->t('Search city or place')); ?>"><div id="wp-location-results" class="wp-location-results"></div><div id="wp-selected-location" class="wp-selected-location"></div></div></div>
                    <div class="wp-settings-section"><h3><?php p($l->t('Saved locations')); ?></h3><div id="wp-saved-locations" class="wp-saved-locations"></div><button id="wp-save-current-location" type="button"><?php p($l->t('Save current place')); ?></button></div><div class="wp-settings-section wp-user-mapy"><h3><?php p($l->t('Shared map services')); ?></h3><p id="wp-user-mapy-key-status" class="wp-muted"></p><button type="button" data-open-core-map-cache><?php p($l->t('Map cache and statistics')); ?></button><small><?php p($l->t('Map tiles, provider keys and cache are managed globally by Shared App Core.')); ?></small></div>
                </section>
                <section class="wp-settings-pane" data-settings-pane="widget" hidden><div class="wp-settings-section wp-settings-section-first"><h3><?php p($l->t('Dashboard widget')); ?></h3><div class="wp-checkbox-grid"><label><input type="checkbox" value="condition" data-widget-field> <?php p($l->t('Condition')); ?></label><label><input type="checkbox" value="temperature" data-widget-field> <?php p($l->t('Temperature')); ?></label><label><input type="checkbox" value="nearTerm" data-widget-field> <?php p($l->t('Next 3 hours')); ?></label><label><input type="checkbox" value="sun" data-widget-field> <?php p($l->t('Sunrise and sunset')); ?></label><label><input type="checkbox" value="wind" data-widget-field> <?php p($l->t('Wind')); ?></label><label><input type="checkbox" value="precipitation" data-widget-field> <?php p($l->t('Precipitation')); ?></label></div></div></section>
                <section id="wp-admin-section" class="wp-settings-pane" data-settings-pane="admin" hidden><div class="wp-admin-warning"><strong><?php p($l->t('Administrator default settings')); ?></strong><span><?php p($l->t('Used only for users without their own settings. Regular users can use this location but cannot change it.')); ?></span></div><div class="wp-settings-section wp-settings-section-first"><div class="wp-admin-current"><strong><?php p($l->t('Quick setup')); ?></strong><span id="wp-admin-current-location" class="wp-muted"><?php p($l->t('Current location is not loaded.')); ?></span><button id="wp-admin-use-current" type="button">📍 <?php p($l->t('Use the active location as default for everyone')); ?></button></div><div class="wp-admin-search"><label><span><?php p($l->t('Search administrator default location')); ?></span><input id="wp-admin-location-search" type="search" placeholder="<?php p($l->t('Search city or place')); ?>"></label><div id="wp-admin-location-results" class="wp-location-results"></div></div><div class="wp-admin-grid"><label><span><?php p($l->t('Name')); ?></span><input id="wp-admin-name" type="text"></label><label><span><?php p($l->t('Latitude')); ?></span><input id="wp-admin-lat" type="number" step="0.000001"></label><label><span><?php p($l->t('Longitude')); ?></span><input id="wp-admin-lon" type="number" step="0.000001"></label><label><span><?php p($l->t('Timezone')); ?></span><input id="wp-admin-timezone" type="text"></label></div><div class="wp-admin-mapy"><h3><?php p($l->t('Mapy.com maps')); ?></h3><p id="wp-mapy-key-status" class="wp-muted"></p><label><span><?php p($l->t('Mapy.com API key')); ?></span><input id="wp-admin-mapy-key" type="password" autocomplete="new-password" placeholder="<?php p($l->t('Leave empty to keep the current key')); ?>"></label><label class="wp-checkbox"><input id="wp-admin-mapy-clear" type="checkbox"> <span><?php p($l->t('Remove legacy Weather copy of Mapy.com API key')); ?></span></label><small><?php p($l->t('The key is offered to Shared App Core. Core validates it and stores the active provider key; Weather does not store the key locally.')); ?></small></div><div class="wp-admin-mapy wp-admin-shared-map-services"><h3><?php p($l->t('Shared map services')); ?></h3><p class="wp-muted"><?php p($l->t('Map backgrounds, the shared cache and provider keys are managed by HC Shared App Core.')); ?></p><button type="button" class="primary" data-open-core-map-cache><?php p($l->t('Map cache and statistics')); ?></button><small><?php p($l->t('This opens the Core dialog. Weather does not duplicate cache settings or statistics.')); ?></small></div></div></section>
                <section class="wp-settings-pane" data-settings-pane="mapcache" hidden>
                    <div class="wp-settings-section wp-settings-section-first wp-core-map-cache-entry">
                        <h3><?php p($l->t('Map cache and statistics')); ?></h3>
                        <p class="wp-muted"><?php p($l->t('Map tile cache is managed by Shared App Core and is shared by all applications.')); ?></p>
                        <button type="button" data-open-core-map-cache class="primary" title="<?php p($l->t('Open Shared App Core map cache settings and statistics')); ?>" aria-label="<?php p($l->t('Open Shared App Core map cache settings and statistics')); ?>">🗺️ <?php p($l->t('Open map cache and statistics')); ?></button>
                        <small><?php p($l->t('Weather only opens the Core dialog. Cache size, TTL, statistics and cleanup are handled globally by Shared App Core.')); ?></small>
                    </div>
                </section>
                <section class="wp-settings-pane" data-settings-pane="about" hidden><div id="wp-settings-about-core" class="wp-settings-about-core"></div></section>
            </div>
            <div class="wp-modal-footer"><span class="wp-about"><strong>Weather</strong> · v<?php p($_['version']); ?> · Open-Meteo</span><button id="wp-save-settings" type="button" class="primary"><?php p($l->t('Save settings')); ?></button></div>
        </div>
    </div>
    <div id="wp-location-popover" class="wp-popover" hidden aria-hidden="true"></div>
    <div id="wp-floating-location-results" class="wp-floating-location-results" hidden aria-hidden="true"></div>
</template>
