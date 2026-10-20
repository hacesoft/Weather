<?php

declare(strict_types=1);

namespace OCA\HcWeather\Service;

use OCA\HcWeather\AppInfo\Application;
use OCP\Http\Client\IClientService;
use OCP\ICache;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\IUserSession;
use RuntimeException;

class WeatherService {
    private ICache $cache;

    public function __construct(
        private IClientService $clientService,
        ICacheFactory $cacheFactory,
        private IConfig $config,
        private IUserSession $userSession,
    ) {
        $this->cache = $cacheFactory->createDistributed(Application::APP_ID);
    }

    public function forecast(float $lat, float $lon, string $timezone = 'auto'): array {
        $lat = max(-90.0, min(90.0, $lat));
        $lon = max(-180.0, min(180.0, $lon));
        $timezone = trim($timezone) !== '' ? trim($timezone) : 'auto';
        $key = 'forecast:' . sha1(sprintf('%.4f|%.4f|%s', $lat, $lon, $timezone));
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) {
                $decoded['_cache'] = 'hit';
                return $decoded;
            }
        }

        $query = http_build_query([
            'latitude' => $lat,
            'longitude' => $lon,
            'timezone' => $timezone,
            'forecast_days' => 10,
            'current' => implode(',', [
                'temperature_2m','apparent_temperature','relative_humidity_2m','precipitation',
                'rain','weather_code','cloud_cover','surface_pressure','wind_speed_10m',
                'wind_direction_10m','wind_gusts_10m','is_day',
            ]),
            'hourly' => implode(',', [
                'temperature_2m','apparent_temperature','precipitation_probability','precipitation',
                'rain','weather_code','cloud_cover','visibility','wind_speed_10m','wind_direction_10m',
                'wind_gusts_10m','surface_pressure','uv_index','cape',
            ]),
            'daily' => implode(',', [
                'weather_code','temperature_2m_max','temperature_2m_min','apparent_temperature_max',
                'apparent_temperature_min','sunrise','sunset','daylight_duration','sunshine_duration',
                'uv_index_max','precipitation_sum','precipitation_probability_max','wind_speed_10m_max',
                'wind_gusts_10m_max',
            ]),
        ]);

        $url = 'https://api.open-meteo.com/v1/forecast?' . $query;
        $client = $this->clientService->newClient();
        try {
            $response = $client->get($url, [
                'timeout' => 12,
                'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION],
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Weather provider is currently unavailable: ' . $e->getMessage(), 0, $e);
        }
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            throw new RuntimeException('Weather provider returned HTTP ' . $response->getStatusCode());
        }
        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data) || !isset($data['current'], $data['hourly'], $data['daily'])) {
            throw new RuntimeException('Weather provider returned an invalid response.');
        }

        $data['_provider'] = 'Open-Meteo';
        $data['_cache'] = 'miss';
        $this->cache->set($key, json_encode($data, JSON_UNESCAPED_SLASHES), 600);
        return $data;
    }

    public function radarFrames(): array {
        $key = 'radar:frames';
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) { return $decoded; }
        }
        $client = $this->clientService->newClient();
        try {
            $response = $client->get('https://api.rainviewer.com/public/weather-maps.json', [
                'timeout' => 10,
                'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION],
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Radar provider is currently unavailable: ' . $e->getMessage(), 0, $e);
        }
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            throw new RuntimeException('Radar provider returned HTTP ' . $response->getStatusCode());
        }
        $data = json_decode((string)$response->getBody(), true);
        $host = (string)($data['host'] ?? '');
        $parsedHost = parse_url($host);
        $hostname = strtolower((string)($parsedHost['host'] ?? ''));
        if (!is_array($parsedHost) || ($parsedHost['scheme'] ?? '') !== 'https'
            || ($hostname !== 'rainviewer.com' && !str_ends_with($hostname, '.rainviewer.com'))
            || isset($parsedHost['user']) || isset($parsedHost['pass']) || isset($parsedHost['port'])
            || isset($parsedHost['path']) || isset($parsedHost['query']) || isset($parsedHost['fragment'])) {
            throw new RuntimeException('Radar provider returned an invalid tile host.');
        }
        $frames = [];
        foreach (($data['radar']['past'] ?? []) as $frame) {
            if (!isset($frame['time'], $frame['path'])) { continue; }
            $path = (string)$frame['path'];
            if (!preg_match('~^/[a-zA-Z0-9/_-]+$~D', $path)) continue;
            $frames[] = ['time' => (int)$frame['time'], 'path' => $path];
        }
        if ($host === '' || $frames === []) {
            throw new RuntimeException('Radar provider returned no usable frames.');
        }
        $out = ['host' => $host, 'frames' => $frames, 'generated' => (int)($data['generated'] ?? time()), 'provider' => 'RainViewer'];
        $this->cache->set($key, json_encode($out, JSON_UNESCAPED_SLASHES), 240);
        return $out;
    }

    /** Keep radar images on our origin; browser CSP need not trust a changing tile host. */
    public function radarTile(int $time, int $z, int $x, int $y): string {
        if ($z < 1 || $z > 7 || $x < 0 || $y < 0 || $x >= 2 ** $z || $y >= 2 ** $z) {
            throw new \InvalidArgumentException('Invalid radar tile coordinates');
        }
        $metadata = $this->radarFrames(); // Validates the HTTPS host and frame paths.
        $path = null;
        foreach ($metadata['frames'] as $frame) {
            if ($frame['time'] === $time) { $path = $frame['path']; break; }
        }
        if ($path === null) throw new \InvalidArgumentException('Radar frame is no longer available');
        $key = 'radar:tile:' . sha1($path . '|' . $z . '|' . $x . '|' . $y);
        $cached = $this->cache->get($key);
        if (is_string($cached) && str_starts_with($cached, "\x89PNG\r\n\x1a\n")) return $cached;
        if ((int)$this->cache->get('radar:provider-backoff') > time()) {
            throw new RuntimeException('Radar provider is temporarily rate limiting requests.', 429);
        }
        // Shared per NAS; cached tiles never count against the upstream request budget.
        $budgetKey = 'radar:request-budget';
        $budget = json_decode((string)$this->cache->get($budgetKey), true);
        if (!is_array($budget) || !isset($budget['start'], $budget['used']) || time() - (int)$budget['start'] >= 60) {
            $budget = ['start' => time(), 'used' => 0];
        }
        // Allow ordinary pan/zoom and a short timeline without hitting our own cap.
        // RainViewer currently permits 100 requests per IP per minute; retain headroom.
        if ((int)$budget['used'] >= 72) throw new RuntimeException('Radar request budget is temporarily exhausted.', 429);
        $budget['used']++;
        $this->cache->set($budgetKey, json_encode($budget), 75);
        $url = $metadata['host'] . $path . '/256/' . $z . '/' . $x . '/' . $y . '/2/1_1.png';
        try {
            $response = $this->clientService->newClient()->get($url, ['timeout' => 8, 'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION]]);
        } catch (\Throwable $e) {
            if ((int)$e->getCode() === 429) {
                $this->cache->set('radar:provider-backoff', (string)(time() + 180), 180);
                throw new RuntimeException('Radar provider is temporarily rate limiting requests.', 429, $e);
            }
            throw $e;
        }
        if ($response->getStatusCode() === 429) {
            $this->cache->set('radar:provider-backoff', (string)(time() + 180), 180);
            throw new RuntimeException('Radar provider is temporarily rate limiting requests.', 429);
        }
        $content = (string)$response->getBody();
        if ($response->getStatusCode() !== 200 || strlen($content) > 1048576 || !str_starts_with($content, "\x89PNG\r\n\x1a\n")) {
            throw new RuntimeException('Radar provider did not return a valid PNG tile');
        }
        $this->cache->set($key, $content, 7200);
        return $content;
    }

    public function mapField(float $lat, float $lon, int $radiusKm = 200): array {
        $lat = max(-80.0, min(80.0, $lat));
        $lon = max(-180.0, min(180.0, $lon));
        $radiusKm = max(100, min(5000, $radiusKm));

        // The field is always centred on the user's active position. This makes the same
        // controls useful in Czechia, the USA, Australia, or anywhere else instead of
        // hard-coding a European overview. 63 points keep one multi-location API request.
        $latSpan = min(45.0, $radiusKm / 111.0);
        $cosLat = max(0.20, cos(deg2rad($lat)));
        $lonSpan = min(100.0, $radiusKm / (111.0 * $cosLat));
        $points = [];
        for ($iy = -3; $iy <= 3; $iy++) {
            for ($ix = -4; $ix <= 4; $ix++) {
                $plat = max(-80.0, min(80.0, $lat + ($iy / 3.0) * $latSpan));
                $plon = $lon + ($ix / 4.0) * $lonSpan;
                while ($plon > 180.0) { $plon -= 360.0; }
                while ($plon < -180.0) { $plon += 360.0; }
                $points[] = ['lat' => round($plat, 3), 'lon' => round($plon, 3)];
            }
        }
        $zoom = $radiusKm <= 250 ? 7 : ($radiusKm <= 800 ? 6 : ($radiusKm <= 2500 ? 5 : 4));
        $centerLat = $lat;
        $centerLon = $lon;

        $key = 'map-field-v4:' . sha1(sprintf('%.1f|%.1f|%d', $lat, $lon, $radiusKm));
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) { return $decoded; }
        }

        $latitudes = implode(',', array_map(static fn(array $p): string => (string)$p['lat'], $points));
        $longitudes = implode(',', array_map(static fn(array $p): string => (string)$p['lon'], $points));
        $query = http_build_query([
            'latitude' => $latitudes,
            'longitude' => $longitudes,
            'timezone' => 'UTC',
            'forecast_hours' => 30,
            'hourly' => implode(',', [
                'wind_speed_10m','wind_direction_10m','wind_speed_80m','wind_direction_80m',
                'wind_speed_120m','wind_direction_120m','wind_speed_180m','wind_direction_180m','wind_gusts_10m',
                'cape','precipitation_probability','precipitation','weather_code',
            ]),
        ]);
        // http_build_query escapes commas. Open-Meteo accepts them either way, but an unescaped
        // list keeps the request substantially shorter for the 63-point European grid.
        $query = str_replace('%2C', ',', $query);
        $url = 'https://api.open-meteo.com/v1/forecast?' . $query;

        $client = $this->clientService->newClient();
        try {
            $response = $client->get($url, [
                'timeout' => 18,
                'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION],
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Map weather field is currently unavailable: ' . $e->getMessage(), 0, $e);
        }
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            throw new RuntimeException('Map weather provider returned HTTP ' . $response->getStatusCode());
        }
        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data)) {
            throw new RuntimeException('Map weather provider returned an invalid response.');
        }
        // A single location is an object, multiple locations are a list. We always request multiple.
        $rows = array_is_list($data) ? $data : [$data];
        $outPoints = [];
        $times = [];
        foreach ($rows as $i => $row) {
            if (!is_array($row) || !isset($row['hourly'])) { continue; }
            $h = $row['hourly'];
            if ($times === [] && isset($h['time']) && is_array($h['time'])) { $times = $h['time']; }
            $fallback = $points[$i] ?? ['lat' => 0.0, 'lon' => 0.0];
            $outPoints[] = [
                'lat' => (float)($row['latitude'] ?? $fallback['lat']),
                'lon' => (float)($row['longitude'] ?? $fallback['lon']),
                'wind' => $h['wind_speed_10m'] ?? [],
                'direction' => $h['wind_direction_10m'] ?? [],
                'wind10' => $h['wind_speed_10m'] ?? [],
                'direction10' => $h['wind_direction_10m'] ?? [],
                'wind80' => $h['wind_speed_80m'] ?? [],
                'direction80' => $h['wind_direction_80m'] ?? [],
                'wind120' => $h['wind_speed_120m'] ?? [],
                'direction120' => $h['wind_direction_120m'] ?? [],
                'wind180' => $h['wind_speed_180m'] ?? [],
                'direction180' => $h['wind_direction_180m'] ?? [],
                'gust' => $h['wind_gusts_10m'] ?? [],
                'cape' => $h['cape'] ?? [],
                'probability' => $h['precipitation_probability'] ?? [],
                'precipitation' => $h['precipitation'] ?? [],
                'code' => $h['weather_code'] ?? [],
            ];
        }
        if ($outPoints === [] || $times === []) {
            throw new RuntimeException('Map weather provider returned no usable grid data.');
        }

        $out = [
            'radiusKm' => $radiusKm,
            'center' => ['lat' => $centerLat, 'lon' => $centerLon, 'zoom' => $zoom],
            'times' => $times,
            'points' => $outPoints,
            'provider' => 'Open-Meteo',
        ];
        $this->cache->set($key, json_encode($out, JSON_UNESCAPED_SLASHES), 900);
        return $out;
    }

    /** Open-Meteo uses an HTTP 400 for coordinates outside the ALADIN model domain. */
    private function isAladinNoDataResponse(object $response): bool {
        if ($response->getStatusCode() !== 400) { return false; }
        $body = json_decode((string)$response->getBody(), true);
        return is_array($body)
            && ($body['error'] ?? null) === true
            && ($body['reason'] ?? null) === 'No data is available for this location';
    }

    private function cacheAladinNoData(string $key): array {
        $result = [
            'available' => false,
            'reason' => 'no-data',
            'times' => [],
            'points' => [],
            'provider' => 'CHMI ALADIN via Open-Meteo',
            'model' => 'chmi_aladin_seamless',
        ];
        $this->cache->set($key, json_encode($result, JSON_UNESCAPED_SLASHES), 300);
        return $result;
    }

    /** Sample the CHMI ALADIN run through Open-Meteo's model-specific API.
     * The response is a sampled field, not a native 1 km raster. Never substitute
     * the generic best-match forecast: that could quietly show a different model.
     */
    public function aladinField(float $lat, float $lon, int $radiusKm): array {
        if (!is_finite($lat) || !is_finite($lon) || abs($lat) > 80 || abs($lon) > 180
            || !in_array($radiusKm, [20, 40, 80, 160, 320, 640], true)) {
            throw new \InvalidArgumentException('Invalid ALADIN map area.');
        }
        $key = 'aladin-field-v1:' . sha1(sprintf('%.4f|%.4f|%d', $lat, $lon, $radiusKm));
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) { return $decoded; }
        }

        $latSpan = min(30.0, $radiusKm / 111.0);
        $lonSpan = min(65.0, $radiusKm / (111.0 * max(.25, cos(deg2rad($lat)))));
        $points = [];
        for ($y = -4; $y <= 4; $y++) {
            for ($x = -5; $x <= 5; $x++) {
                $pointLat = max(-80.0, min(80.0, $lat + $y * $latSpan / 4));
                $pointLon = $lon + $x * $lonSpan / 5;
                while ($pointLon > 180.0) { $pointLon -= 360.0; }
                while ($pointLon < -180.0) { $pointLon += 360.0; }
                $points[] = ['lat' => round($pointLat, 4), 'lon' => round($pointLon, 4)];
            }
        }
        $query = http_build_query([
            'latitude' => implode(',', array_column($points, 'lat')),
            'longitude' => implode(',', array_column($points, 'lon')),
            'hourly' => 'precipitation,temperature_2m',
            'models' => 'chmi_aladin_seamless',
            'timezone' => 'UTC',
            'forecast_hours' => 48,
        ]);
        $url = 'https://api.open-meteo.com/v1/forecast?' . str_replace('%2C', ',', $query);
        try {
            $response = $this->clientService->newClient()->get($url, [
                'timeout' => 20,
                'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION],
            ]);
        } catch (\Throwable $e) {
            if (method_exists($e, 'getResponse')) {
                $failedResponse = $e->getResponse();
                if (is_object($failedResponse) && $this->isAladinNoDataResponse($failedResponse)) {
                    return $this->cacheAladinNoData($key);
                }
            }
            throw new RuntimeException('ALADIN provider could not be reached.', 0, $e);
        }
        if ($this->isAladinNoDataResponse($response)) {
            return $this->cacheAladinNoData($key);
        }
        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException('ALADIN provider returned HTTP ' . $response->getStatusCode());
        }
        $data = json_decode((string)$response->getBody(), true);
        $rows = is_array($data) ? (array_is_list($data) ? $data : [$data]) : [];
        if (count($rows) !== count($points)) {
            throw new RuntimeException('ALADIN provider returned an incomplete field.');
        }
        $times = [];
        $sampled = [];
        $nonNull = 0;
        foreach ($rows as $i => $row) {
            $hourly = is_array($row) ? ($row['hourly'] ?? null) : null;
            if (!is_array($hourly) || !is_array($hourly['time'] ?? null)) { continue; }
            if ($times === []) { $times = $hourly['time']; }
            if ($hourly['time'] !== $times) { continue; }
            $rain = is_array($hourly['precipitation'] ?? null) ? $hourly['precipitation'] : [];
            $temp = is_array($hourly['temperature_2m'] ?? null) ? $hourly['temperature_2m'] : [];
            if (count($rain) !== count($times) || count($temp) !== count($times)) { continue; }
            foreach ($rain as $value) { if (is_numeric($value) && is_finite((float)$value)) { $nonNull++; break; } }
            $sampled[] = [
                // Requested positions remain a regular grid; returned model coordinates may be snapped.
                'lat' => $points[$i]['lat'],
                'lon' => $points[$i]['lon'],
                'precipitation' => $rain,
                'temperature' => $temp,
            ];
        }
        if ($times === [] || $nonNull === 0) {
            return $this->cacheAladinNoData($key);
        }
        $out = [
            'times' => $times,
            'points' => $sampled,
            'sampleSpacingKm' => round($radiusKm / 4, 1),
            'provider' => 'CHMI ALADIN via Open-Meteo',
            'model' => 'chmi_aladin_seamless',
        ];
        $this->cache->set($key, json_encode($out, JSON_UNESCAPED_SLASHES), 1200);
        return $out;
    }

    public function geocode(string $query, int $count = 8, string $language = 'en'): array {
        $query = trim($query);
        if (mb_strlen($query) < 2) {
            return [];
        }
        $count = max(1, min(10, $count));
        $language = strtolower(substr(trim($language), 0, 2));
        $language = in_array($language, ['en','cs','sk','de','pl','fr','es','it','nl'], true) ? $language : 'en';
        $key = 'geocode:' . sha1(mb_strtolower($query) . '|' . $count . '|' . $language);
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        $url = 'https://geocoding-api.open-meteo.com/v1/search?' . http_build_query([
            'name' => $query,
            'count' => $count,
            'language' => $language,
            'format' => 'json',
        ]);
        $client = $this->clientService->newClient();
        try {
            $response = $client->get($url, [
                'timeout' => 10,
                'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION],
            ]);
        } catch (\Throwable $e) {
            throw new RuntimeException('Location search is currently unavailable: ' . $e->getMessage(), 0, $e);
        }
        $data = json_decode((string)$response->getBody(), true);
        $results = [];
        foreach (($data['results'] ?? []) as $row) {
            if (!isset($row['latitude'], $row['longitude'])) {
                continue;
            }
            $parts = array_values(array_filter([
                $row['name'] ?? '', $row['admin1'] ?? '', $row['country'] ?? '',
            ], static fn($v) => trim((string)$v) !== ''));
            $results[] = [
                'id' => (string)($row['id'] ?? sha1(json_encode($row))),
                'name' => (string)($row['name'] ?? $query),
                'label' => implode(', ', array_unique($parts)),
                'latitude' => (float)$row['latitude'],
                'longitude' => (float)$row['longitude'],
                'timezone' => (string)($row['timezone'] ?? 'auto'),
                'countryCode' => (string)($row['country_code'] ?? ''),
            ];
        }
        $this->cache->set($key, json_encode($results, JSON_UNESCAPED_UNICODE), 86400);
        return $results;
    }

    public function reverseGeocode(float $lat, float $lon): array {
        $lat = max(-90.0, min(90.0, $lat));
        $lon = max(-180.0, min(180.0, $lon));
        $key = 'reverse:' . sha1(sprintf('%.5f|%.5f', $lat, $lon));
        $cached = $this->cache->get($key);
        if (is_string($cached) && $cached !== '') {
            $decoded = json_decode($cached, true);
            if (is_array($decoded)) { return $decoded; }
        }
        $url = 'https://nominatim.openstreetmap.org/reverse?' . http_build_query([
            'format' => 'jsonv2', 'lat' => $lat, 'lon' => $lon, 'zoom' => 12, 'addressdetails' => 1,
        ]);
        $client = $this->clientService->newClient();
        $response = $client->get($url, [
            'timeout' => 10,
            'headers' => ['User-Agent' => 'Nextcloud-WeatherPlus/' . Application::VERSION . ' (reverse-geocode)'],
        ]);
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) { return []; }
        $data = json_decode((string)$response->getBody(), true);
        if (!is_array($data)) { return []; }
        $address = is_array($data['address'] ?? null) ? $data['address'] : [];
        $name = (string)($address['city'] ?? $address['town'] ?? $address['village'] ?? $address['municipality'] ?? $data['name'] ?? '');
        $label = (string)($data['display_name'] ?? $name);
        $out = ['name' => $name, 'label' => $label, 'latitude' => $lat, 'longitude' => $lon];
        $this->cache->set($key, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), 86400);
        return $out;
    }
}
