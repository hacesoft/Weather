<?php
declare(strict_types=1);

namespace OCA\HcWeather\Http;

use OCP\AppFramework\Http\Response;

final class RadarTileResponse extends Response {
    public function __construct(private string $png) {
        parent::__construct();
        $this->addHeader('Content-Type', 'image/png');
        $this->addHeader('Content-Length', (string)strlen($png));
        $this->addHeader('Cache-Control', 'private, max-age=1800');
        $this->addHeader('X-Content-Type-Options', 'nosniff');
    }

    public function render(): string { return $this->png; }
}
