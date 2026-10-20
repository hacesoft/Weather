<?php

declare(strict_types=1);

namespace OCA\HcWeather\Dashboard;

use OCA\HcWeather\AppInfo\Application;
use OCA\HcWeather\Service\WeatherService;
use OCP\Dashboard\IAPIWidget;
use OCP\Dashboard\IIconWidget;
use OCP\Dashboard\Model\WidgetItem;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\Util;

class WeatherWidget implements IAPIWidget, IIconWidget {
    public function __construct(
        private IL10N $l10n,
        private IConfig $config,
        private IURLGenerator $url,
        private WeatherService $weather,
    ) {}

    public function getId(): string { return Application::APP_ID; }
    public function getTitle(): string { return $this->l10n->t('Weather'); }
    public function getOrder(): int { return 20; }
    public function getIconClass(): string { return 'icon-weather-clear'; }
    public function getIconUrl(): string { return $this->imageUrl('partly'); }
    public function getUrl(): ?string { return $this->url->linkToRouteAbsolute('hc_weather.page.index'); }

    public function load(): void {
        // Preserve the graphical widget in Nextcloud's browser Dashboard.
        Util::addScript('hc_shared_app_core', 'hc_shared_app_core');
        Util::addScript(Application::APP_ID, 'dashboard-1.0.0');
        Util::addStyle(Application::APP_ID, 'style-1.0.0');
    }

    /** @return WidgetItem[] */
    public function getItems(string $userId, ?string $since = null, int $limit = 7): array {
        if ($userId === '' || $limit <= 0) {
            return [];
        }

        // Weather is a snapshot: always send the full small list, even after a reload.
        $location = $this->locationFor($userId);
        $link = $this->getUrl() ?? '';

        try {
            $forecast = $this->weather->forecast($location['lat'], $location['lon'], $location['timezone']);
        } catch (\Throwable) {
            return [new WidgetItem(
                '🌡️ ' . $this->l10n->t('Weather could not be loaded.'),
                $location['name'],
                $link,
                $this->imageUrl('unknown'),
            )];
        }

        $current = $forecast['current'] ?? [];
        if (!is_array($current) || !is_numeric($current['temperature_2m'] ?? null)) {
            return [];
        }

        $code = (int)($current['weather_code'] ?? -1);
        $temperature = (int)round((float)$current['temperature_2m']);
        $place = trim(explode(',', $location['name'], 2)[0]);
        $subtitle = $this->condition($code);
        if ($location['fallback']) {
            $subtitle .= ' · ' . $this->l10n->t('Default');
        }
        if (is_numeric($current['apparent_temperature'] ?? null)) {
            $subtitle .= ' · ' . $this->l10n->t('Feels like') . ' ' .
                (int)round((float)$current['apparent_temperature']) . ' °C';
        }
        if (is_numeric($current['wind_speed_10m'] ?? null)) {
            $subtitle .= ' · ' . $this->l10n->t('Wind') . ' ' .
                (int)round((float)$current['wind_speed_10m']) . ' km/h';
        }

        $items = [new WidgetItem(
            $this->conditionSymbol($code, (int)($current['is_day'] ?? 1)) . ' ' .
                $temperature . ' °C · v' . Application::VERSION . ' · ' .
                ($place !== '' ? $place : $location['name']),
            $subtitle,
            $link,
            $this->conditionIcon($code, (int)($current['is_day'] ?? 1)),
        )];

        $hourly = $forecast['hourly'] ?? [];
        $daily = is_array($forecast['daily'] ?? null) ? $forecast['daily'] : [];
        $times = is_array($hourly['time'] ?? null) ? $hourly['time'] : [];
        $now = (string)($current['time'] ?? '');
        $first = 0;
        if ($now !== '') {
            foreach ($times as $index => $time) {
                if ((string)$time > $now) {
                    $first = $index;
                    break;
                }
            }
        }

        for ($index = $first; $index < min($first + 4, count($times)) && count($items) < $limit; $index++) {
            $hourTemperature = $hourly['temperature_2m'][$index] ?? null;
            if (!is_numeric($hourTemperature)) {
                continue;
            }
            $hourCode = (int)($hourly['weather_code'][$index] ?? -1);
            $probability = $hourly['precipitation_probability'][$index] ?? null;
            $hourSubtitle = $this->condition($hourCode);
            if (is_numeric($probability)) {
                $hourSubtitle .= ' · ' . $this->l10n->t('Precipitation') . ' ' .
                    (int)round((float)$probability) . ' %';
            }
            $time = (string)$times[$index];
            $items[] = new WidgetItem(
                $this->conditionSymbol($hourCode, $this->daylightAt($time, $daily)) .
                    ' ' . substr($time, 11, 5) . ' · ' . (int)round((float)$hourTemperature) . ' °C',
                $hourSubtitle,
                $link,
                $this->conditionIcon($hourCode, $this->daylightAt($time, $daily)),
            );
        }

        // The Android client renders one fixed row per item. Add two short
        // daily summaries when there is room; compact widgets simply scroll.
        $days = is_array($daily['time'] ?? null) ? $daily['time'] : [];
        $today = substr($now, 0, 10);
        $firstDay = array_search($today, $days, true);
        if ($firstDay !== false) {
            for ($offset = 0; $offset < 2 && count($items) < $limit; $offset++) {
                $index = $firstDay + $offset;
                $max = $daily['temperature_2m_max'][$index] ?? null;
                $min = $daily['temperature_2m_min'][$index] ?? null;
                if (!is_numeric($max) || !is_numeric($min)) {
                    continue;
                }
                $dayCode = (int)($daily['weather_code'][$index] ?? -1);
                $dayLabel = $this->l10n->t($offset === 0 ? 'Today' : 'Tomorrow');
                $daySubtitle = $this->condition($dayCode);
                $probability = $daily['precipitation_probability_max'][$index] ?? null;
                if (is_numeric($probability)) {
                    $daySubtitle .= ' · ' . $this->l10n->t('Precipitation') . ' ' .
                        (int)round((float)$probability) . ' %';
                }
                $items[] = new WidgetItem(
                    $this->conditionSymbol($dayCode, 1) . ' ' . $dayLabel . ' · ↑' .
                        (int)round((float)$max) . ' °C ↓' . (int)round((float)$min) . ' °C',
                    $daySubtitle,
                    $link,
                    $this->conditionIcon($dayCode, 1),
                );
            }
        }

        return array_slice($items, 0, $limit);
    }

    /** @return array{name: string, lat: float, lon: float, timezone: string, fallback: bool} */
    private function locationFor(string $userId): array {
        $appId = Application::APP_ID;
        $adminName = $this->config->getAppValue($appId, 'default_location_name', 'Praha');
        $adminLat = $this->config->getAppValue($appId, 'default_latitude', '50.0755');
        $adminLon = $this->config->getAppValue($appId, 'default_longitude', '14.4378');
        $adminTimezone = $this->config->getAppValue($appId, 'default_timezone', 'Europe/Prague');
        $mode = $this->config->getUserValue($userId, $appId, 'location_mode', 'admin');

        $lat = $this->config->getUserValue($userId, $appId, 'latitude', '');
        $lon = $this->config->getUserValue($userId, $appId, 'longitude', '');
        $validManual = $mode === 'manual' && is_numeric($lat) && is_numeric($lon)
            && (float)$lat >= -90 && (float)$lat <= 90
            && (float)$lon >= -180 && (float)$lon <= 180;

        if ($validManual) {
            return [
                'name' => trim($this->config->getUserValue($userId, $appId, 'location_name', '')) ?: $this->l10n->t('My location'),
                'lat' => (float)$lat,
                'lon' => (float)$lon,
                'timezone' => $this->config->getUserValue($userId, $appId, 'timezone', 'auto') ?: 'auto',
                'fallback' => false,
            ];
        }

        // The server API cannot read the Android phone's GPS. In device mode
        // explicitly mark that the administrator's default place was used.
        return [
            'name' => trim((string)$adminName) ?: $this->l10n->t('Weather'),
            'lat' => is_numeric($adminLat) ? (float)$adminLat : 50.0755,
            'lon' => is_numeric($adminLon) ? (float)$adminLon : 14.4378,
            'timezone' => trim((string)$adminTimezone) ?: 'auto',
            'fallback' => $mode === 'device',
        ];
    }

    private function daylightAt(string $time, array $daily): int {
        $date = substr($time, 0, 10);
        foreach (($daily['time'] ?? []) as $index => $day) {
            if ((string)$day !== $date) {
                continue;
            }
            $sunrise = (string)($daily['sunrise'][$index] ?? '');
            $sunset = (string)($daily['sunset'][$index] ?? '');
            return $sunrise !== '' && $sunset !== '' && ($time < $sunrise || $time >= $sunset) ? 0 : 1;
        }
        return 1;
    }

    private function condition(int $code): string {
        $labels = [
            0 => 'Clear sky', 1 => 'Mainly clear', 2 => 'Partly cloudy', 3 => 'Overcast',
            45 => 'Fog', 48 => 'Rime fog', 51 => 'Light drizzle', 53 => 'Drizzle',
            55 => 'Heavy drizzle', 56 => 'Light freezing drizzle', 57 => 'Freezing drizzle',
            61 => 'Light rain', 63 => 'Rain', 65 => 'Heavy rain',
            66 => 'Light freezing rain', 67 => 'Heavy freezing rain',
            71 => 'Light snow', 73 => 'Snow', 75 => 'Heavy snow', 77 => 'Snow grains',
            80 => 'Light showers', 81 => 'Showers', 82 => 'Heavy showers',
            85 => 'Snow showers', 86 => 'Heavy snow showers',
            95 => 'Thunderstorm', 96 => 'Thunderstorm with hail', 99 => 'Severe thunderstorm with hail',
        ];
        return $this->l10n->t($labels[$code] ?? 'Unknown weather');
    }

    private function conditionIcon(int $code, int $isDay): string {
        return $this->imageUrl($this->conditionType($code, $isDay));
    }

    private function conditionSymbol(int $code, int $isDay): string {
        return match ($this->conditionType($code, $isDay)) {
            'clear' => '☀️',
            'night' => '🌙',
            'partly' => '🌤️',
            'cloudy' => '☁️',
            'fog' => '🌫️',
            'rain' => '🌧️',
            'snow' => '❄️',
            'storm' => '⛈️',
            default => '🌡️',
        };
    }

    private function conditionType(int $code, int $isDay): string {
        return match (true) {
            $code === 0 => $isDay === 1 ? 'clear' : 'night',
            $code === 1, $code === 2 => $isDay === 1 ? 'partly' : 'night',
            $code === 3 => 'cloudy',
            $code === 45, $code === 48 => 'fog',
            $code >= 51 && $code <= 67, $code >= 80 && $code <= 82 => 'rain',
            $code >= 71 && $code <= 77, $code === 85, $code === 86 => 'snow',
            $code >= 95 && $code <= 99 => 'storm',
            default => 'unknown',
        };
    }

    private function imageUrl(string $type): string {
        return $this->url->getAbsoluteURL($this->url->imagePath(Application::APP_ID, 'widget-' . $type . '.png'));
    }
}
