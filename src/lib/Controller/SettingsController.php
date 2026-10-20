<?php

declare(strict_types=1);

namespace OCA\HcWeather\Controller;

use OCA\HcWeather\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IUserSession;

class SettingsController extends Controller {
    public function __construct(
        IRequest $request,
        private IConfig $config,
        private IUserSession $userSession,
        private IGroupManager $groupManager,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    private function uid(): string {
        return $this->userSession->getUser()?->getUID() ?? '';
    }

    private function isAdmin(): bool {
        $uid = $this->uid();
        return $uid !== '' && $this->groupManager->isAdmin($uid);
    }

    private function requireAdmin(): ?DataResponse {
        if ($this->isAdmin()) {
            return null;
        }
        return new DataResponse(['error' => 'Administrator privileges are required.'], 403);
    }

    private function app(string $key, string $default): string {
        return (string)$this->config->getAppValue(Application::APP_ID, $key, $default);
    }

    #[NoAdminRequired]
    public function get(): DataResponse {
        $uid = $this->uid();
        return new DataResponse([
            'locationMode' => $this->config->getUserValue($uid, Application::APP_ID, 'location_mode', 'admin'),
            'locationName' => $this->config->getUserValue($uid, Application::APP_ID, 'location_name', ''),
            'latitude' => $this->config->getUserValue($uid, Application::APP_ID, 'latitude', ''),
            'longitude' => $this->config->getUserValue($uid, Application::APP_ID, 'longitude', ''),
            'timezone' => $this->config->getUserValue($uid, Application::APP_ID, 'timezone', 'auto'),
            'savedLocations' => json_decode($this->config->getUserValue($uid, Application::APP_ID, 'saved_locations', '[]'), true) ?: [],
            'widgetFields' => json_decode($this->config->getUserValue($uid, Application::APP_ID, 'widget_fields', '["condition","temperature","nearTerm","sun"]'), true) ?: [],
            'adminDefault' => [
                'name' => $this->app('default_location_name', 'Praha'),
                'latitude' => (float)$this->app('default_latitude', '50.0755'),
                'longitude' => (float)$this->app('default_longitude', '14.4378'),
                'timezone' => $this->app('default_timezone', 'Europe/Prague'),
            ],
            'mapyApiConfigured' => false,
            'userMapyApiConfigured' => false,
            'adminMapyApiConfigured' => false,
        ]);
    }

    #[NoAdminRequired]
    public function save(
        string $locationMode = 'admin',
        string $locationName = '',
        string $latitude = '',
        string $longitude = '',
        string $timezone = 'auto',
        array $savedLocations = [],
        array $widgetFields = [],
        string $mapyApiKey = '',
        bool $clearMapyApiKey = false,
    ): DataResponse {
        if (!in_array($locationMode, ['admin', 'manual', 'device'], true)) {
            $locationMode = 'admin';
        }
        $uid = $this->uid();
        $this->config->setUserValue($uid, Application::APP_ID, 'location_mode', $locationMode);
        $this->config->setUserValue($uid, Application::APP_ID, 'location_name', trim($locationName));
        $this->config->setUserValue($uid, Application::APP_ID, 'latitude', trim($latitude));
        $this->config->setUserValue($uid, Application::APP_ID, 'longitude', trim($longitude));
        $this->config->setUserValue($uid, Application::APP_ID, 'timezone', trim($timezone) ?: 'auto');
        $this->config->setUserValue($uid, Application::APP_ID, 'saved_locations', json_encode(array_slice($savedLocations, 0, 20), JSON_UNESCAPED_UNICODE));
        $allowed = ['condition','temperature','nearTerm','sun','wind','precipitation'];
        $widgetFields = array_values(array_intersect($allowed, $widgetFields));
        $this->config->setUserValue($uid, Application::APP_ID, 'widget_fields', json_encode($widgetFields));
        // Map provider keys are owned by HC Shared App Core. Weather no longer stores them.
        if ($clearMapyApiKey) {
            $this->config->deleteUserValue($uid, Application::APP_ID, 'mapy_api_key');
        }
        return new DataResponse(['ok' => true]);
    }

    public function getAdmin(): DataResponse {
        if (($response = $this->requireAdmin()) !== null) {
            return $response;
        }
        return new DataResponse([
            'name' => $this->app('default_location_name', 'Praha'),
            'latitude' => (float)$this->app('default_latitude', '50.0755'),
            'longitude' => (float)$this->app('default_longitude', '14.4378'),
            'timezone' => $this->app('default_timezone', 'Europe/Prague'),
            'mapyApiConfigured' => false,
            'userMapyApiConfigured' => false,
            'adminMapyApiConfigured' => false,
        ]);
    }

    public function saveAdmin(string $name, float $latitude, float $longitude, string $timezone = 'auto', string $mapyApiKey = '', bool $clearMapyApiKey = false): DataResponse {
        if (($response = $this->requireAdmin()) !== null) {
            return $response;
        }
        $this->config->setAppValue(Application::APP_ID, 'default_location_name', trim($name) ?: 'Default location');
        $this->config->setAppValue(Application::APP_ID, 'default_latitude', (string)$latitude);
        $this->config->setAppValue(Application::APP_ID, 'default_longitude', (string)$longitude);
        $this->config->setAppValue(Application::APP_ID, 'default_timezone', trim($timezone) ?: 'auto');
        // Map provider keys are owned by HC Shared App Core. Weather only deletes legacy copies.
        if ($clearMapyApiKey) {
            $this->config->deleteAppValue(Application::APP_ID, 'mapy_api_key');
        }
        return new DataResponse(['ok' => true, 'mapyApiConfigured' => false]);
    }
}
