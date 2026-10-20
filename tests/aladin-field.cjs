// Run with: node tests/aladin-field.cjs
// Exercises the actual browser bundle's ALADIN loading and canvas path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const events = {draws: 0, calls: []};
function classList() {
    const values = new Set();
    return {
        add: x => values.add(x), remove: x => values.delete(x),
        contains: x => values.has(x),
        toggle: (x, yes) => { if (yes) values.add(x); else values.delete(x); },
    };
}
function element(extra = {}) { return {classList: classList(), setAttribute() {}, ...extra}; }
const canvasContext = {
    setTransform() {}, clearRect() {},
    createImageData(w, h) { return {data: new Uint8ClampedArray(w * h * 4)}; },
    putImageData(pixels) { events.lastPixels = pixels.data; },
    drawImage() { events.draws++; },
};
const canvas = element({width: 0, height: 0, hidden: false,
    getBoundingClientRect: () => ({width: 450, height: 340}),
    getContext: () => canvasContext});
const map = element({clientWidth: 450, clientHeight: 340});
const nodes = {
    'wp-weather-map': map, 'wp-aladin-canvas': canvas,
    'wp-aladin-slider': element({value: '0', max: '0'}),
    'wp-aladin-status': element({textContent: ''}),
    'wp-aladin-time': element({textContent: ''}),
    'wp-aladin-detail-title': element({textContent: ''}),
    'wp-aladin-scale': element({textContent: ''}),
    'wp-aladin-colorbar': element(),
    'wp-aladin-detail-source': element({textContent: ''}),
    'wp-aladin-play': element({dataset: {}, innerHTML: ''}),
};
const document = {
    readyState: 'loading', addEventListener() {},
    getElementById: id => nodes[id] || null,
    querySelectorAll: () => [],
    createElement: tag => tag === 'canvas' ? {width: 0, height: 0, getContext: () => canvasContext} : element(),
};
const window = {devicePixelRatio: 1, addEventListener() {}};
let test;
const fetch = async url => {
    events.calls.push(url);
    if (test.state.mapViews.weather.lat === 41) return {
        ok: false, statusText: 'Unavailable', text: async () => JSON.stringify({error: 'Provider outage'}),
    };
    if (test.state.mapViews.weather.lat < 40) return {
        ok: true, text: async () => JSON.stringify({available: false, reason: 'no-data', times: [], points: []}),
    };
    const req = test.aladinFieldRequest();
    const times = Array.from({length: 3}, (_, i) => new Date(Date.now() + (i + 1) * 3600000).toISOString().slice(0, 16));
    const points = [];
    for (let y = -4; y <= 4; y++) for (let x = -5; x <= 5; x++) points.push({
        lat: req.lat + y * req.radius / 111 / 4,
        lon: req.lon + x * req.radius / 111 / 5,
        precipitation: [1, 0, 4], temperature: [16, 17, 18],
    });
    return {ok: true, text: async () => JSON.stringify({times, points, sampleSpacingKm: req.radius / 4})};
};
const context = vm.createContext({window, document, fetch, console, setTimeout, clearTimeout,
    setInterval, clearInterval, Date, Math, URL, Uint8ClampedArray,
    OC: {generateUrl: input => input, requestToken: 'test'}});
const bundle = fs.readFileSync(path.join(__dirname, '../src/js/app-1.0.0.js'), 'utf8');
const code = bundle.replace(/\}\)\(\);\s*$/, 'window.__aladinTest={state,aladinFieldRequest,ensureAladinMap,renderAladinMapFrame,setAladinMetric,stopAladinPlay};\n})();');
assert.notEqual(code, bundle, 'test hook inserted');
vm.runInContext(code, context);
test = window.__aladinTest;
test.state.activeTab = 'map';
test.state.activeMapLayer = 'aladin';
test.state.layerVisible.aladin = true;
test.state.mapViews.weather = {lat: 49.1, lon: 16.2, zoom: 9};

(async () => {
    const wide = test.aladinFieldRequest();
    test.state.mapViews.weather.zoom = 10;
    const close = test.aladinFieldRequest();
    assert.ok(close.radius < wide.radius, 'zooming requests finer spatial samples');
    test.state.mapViews.weather.zoom = 9;

    const field = await test.ensureAladinMap();
    assert.ok(field);
    assert.equal(events.calls.length, 1);
    assert.match(events.calls[0], /\/api\/aladin-field\?/);
    assert.ok(events.draws > 0, 'the sampled precipitation is painted');
    assert.ok([...events.lastPixels].some((v, i) => i % 4 === 3 && v > 0));
    assert.equal(nodes['wp-aladin-slider'].max, 2);

    const draws = events.draws;
    test.setAladinMetric('temperature');
    assert.ok(events.draws > draws);
    assert.match(nodes['wp-aladin-detail-title'].textContent, /temperature/);
    assert.ok(nodes['wp-aladin-colorbar'].classList.contains('is-temperature'));

    test.state.mapViews.weather.lat = 20;
    assert.equal(await test.ensureAladinMap(), null);
    assert.match(nodes['wp-aladin-status'].textContent, /no data/);
    assert.equal(nodes['wp-aladin-status'].classList.contains('is-error'), false);
    assert.equal(events.calls.length, 2);
    assert.equal(await test.ensureAladinMap(), null);
    assert.equal(events.calls.length, 2, 'no-data is cached');

    test.state.mapViews.weather.lat = 41;
    assert.equal(await test.ensureAladinMap(), null);
    assert.match(nodes['wp-aladin-status'].textContent, /temporarily unavailable/);
    assert.equal(nodes['wp-aladin-status'].classList.contains('is-error'), true);
    assert.equal(await test.ensureAladinMap(), null);
    assert.equal(events.calls.length, 3, 'provider outage is backed off');

    test.state.mapViews.weather.lat = 49.1;
    assert.ok(await test.ensureAladinMap(), 'returning to the model domain restores the cached forecast');
    assert.equal(nodes['wp-aladin-status'].classList.contains('is-error'), false);
    test.stopAladinPlay();
    console.log('ALADIN browser flow OK');
})().catch(error => {console.error(error);process.exitCode = 1;});
