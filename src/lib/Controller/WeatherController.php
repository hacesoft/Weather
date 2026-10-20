<?php

declare(strict_types=1);

namespace OCA\HcWeather\Controller;

use OCA\HcWeather\AppInfo\Application;
use OCA\HcWeather\Service\WeatherService;
use OCA\HcWeather\Http\RadarTileResponse;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use Psr\Log\LoggerInterface;

class WeatherController extends Controller {
    public function __construct(IRequest $request, private WeatherService $weather, private LoggerInterface $logger) {
        parent::__construct(Application::APP_ID, $request);
    }

    #[NoAdminRequired]
    public function forecast(float $lat, float $lon, string $timezone = 'auto'): DataResponse {
        try {
            return new DataResponse($this->weather->forecast($lat, $lon, $timezone));
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 502);
        }
    }

    #[NoAdminRequired]
    public function radar(): DataResponse {
        try {
            return new DataResponse($this->weather->radarFrames());
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 502);
        }
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function radarTile(int $time, int $z, int $x, int $y): RadarTileResponse|DataResponse {
        try { return new RadarTileResponse($this->weather->radarTile($time, $z, $x, $y)); }
        catch (\InvalidArgumentException $e) { return new DataResponse(['error' => $e->getMessage()], 400); }
        catch (\RuntimeException $e) {
            if ($e->getCode() === 429) {
                $response = new DataResponse(['error' => $e->getMessage()], 429);
                $response->addHeader('Retry-After', '180');
                return $response;
            }
            $this->logger->warning('Weather radar tile could not be loaded.', ['exception' => $e, 'z' => $z, 'x' => $x, 'y' => $y]);
            return new DataResponse(['error' => 'Radar tile is temporarily unavailable'], 502);
        }
        catch (\Throwable $e) {
            $this->logger->warning('Weather radar tile could not be loaded.', ['exception' => $e, 'z' => $z, 'x' => $x, 'y' => $y]);
            return new DataResponse(['error' => 'Radar tile is temporarily unavailable'], 502);
        }
    }

    #[NoAdminRequired]
    public function mapField(float $lat = 49.0, float $lon = 15.0, int $radius = 200): DataResponse {
        try {
            return new DataResponse($this->weather->mapField($lat, $lon, $radius));
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 502);
        }
    }

    #[NoAdminRequired]
    public function aladinField(float $lat = 49.0, float $lon = 15.0, int $radius = 80): DataResponse {
        try {
            return new DataResponse($this->weather->aladinField($lat, $lon, $radius));
        } catch (\InvalidArgumentException $e) {
            return new DataResponse(['error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $this->logger->warning('ALADIN forecast field could not be loaded.', ['exception' => $e]);
            return new DataResponse(['error' => 'ALADIN forecast is temporarily unavailable for this area.'], 503);
        }
    }

    #[NoAdminRequired]
    public function geocode(string $q = '', string $lang = 'en'): DataResponse {
        try {
            return new DataResponse(['results' => $this->weather->geocode($q, 8, $lang)]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 502);
        }
    }

    #[NoAdminRequired]
    public function reverse(float $lat, float $lon): DataResponse {
        try { return new DataResponse($this->weather->reverseGeocode($lat, $lon)); }
        catch (\Throwable $e) { return new DataResponse(['error' => $e->getMessage()], 502); }
    }
}
