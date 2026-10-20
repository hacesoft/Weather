<?php
return [
    'routes' => [
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
        ['name' => 'weather#forecast', 'url' => '/api/weather', 'verb' => 'GET'],
        ['name' => 'weather#geocode', 'url' => '/api/geocode', 'verb' => 'GET'],
        ['name' => 'weather#radar', 'url' => '/api/radar', 'verb' => 'GET'],
        ['name' => 'weather#radarTile', 'url' => '/api/radar/tile/{time}/{z}/{x}/{y}', 'verb' => 'GET'],
        ['name' => 'weather#mapField', 'url' => '/api/map-field', 'verb' => 'GET'],
        ['name' => 'weather#aladinField', 'url' => '/api/aladin-field', 'verb' => 'GET'],
        ['name' => 'weather#reverse', 'url' => '/api/reverse', 'verb' => 'GET'],        ['name' => 'settings#get', 'url' => '/api/settings', 'verb' => 'GET'],
        ['name' => 'settings#save', 'url' => '/api/settings', 'verb' => 'PUT'],
        ['name' => 'settings#getAdmin', 'url' => '/api/admin/settings', 'verb' => 'GET'],
        ['name' => 'settings#saveAdmin', 'url' => '/api/admin/settings', 'verb' => 'PUT'],
    ],
];
