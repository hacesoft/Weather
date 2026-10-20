<?php

declare(strict_types=1);

namespace OCA\HcWeather\Controller;

use OCA\HcWeather\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

class PageController extends Controller {
    public function __construct(
        IRequest $request,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        $contract = json_decode((string)file_get_contents(__DIR__ . '/../../appinfo/hc_shared_app_core.json'), true, 512, JSON_THROW_ON_ERROR);
        $requiredCoreVersion = (string)($contract['requiredVersion'] ?? '0.18.8');
        $requiredCoreApiVersion = (int)($contract['requiredApiVersion'] ?? 1);
        $coreDownloadUrl = (string)($contract['downloadUrl'] ?? 'https://github.com/hacesoft/core/tree/HEAD/release');

        $response = new TemplateResponse(Application::APP_ID, 'main', [
            'version' => Application::VERSION,
            'requiredCoreVersion' => $requiredCoreVersion,
            'requiredCoreApiVersion' => $requiredCoreApiVersion,
            'coreDownloadUrl' => $coreDownloadUrl,
        ]);
        return $response;
    }
}
