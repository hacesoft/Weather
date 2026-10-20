(() => {
'use strict';

const APP='hc_weather';
const BUILD='1.0.0';
const WEATHER_APP_INFO=Object.freeze({
    id:'hc_weather',
    name:document.getElementById('wp-app')?.dataset.appName||'Weather',
    version:'1.0.0',
    repository:'https://github.com/hacesoft/Weather',
    releaseNotes:'https://github.com/hacesoft/Weather/tree/HEAD/release',
    documentation:'https://github.com/hacesoft/Weather#readme'
});
let Core=null;
let fnStartupCleanup=null;
const $=id=>document.getElementById(id);

function getAppRoot(){return document.getElementById('wp-app');}
function requiredCoreVersion(){return getAppRoot()?.dataset.requiredCoreVersion||'0.18.1';}
function requiredCoreApiVersion(){return Number(getAppRoot()?.dataset.requiredCoreApiVersion||1);}
function showStartupError(oRoot,sTitle,sDetail){
    if(!oRoot)return;
    oRoot.className='hc-app-startup-error';
    oRoot.replaceChildren();
    const oHeading=document.createElement('h2');
    oHeading.textContent=sTitle;
    const oMessage=document.createElement('p');
    oMessage.textContent=sDetail;
    const sDownload=oRoot.dataset.coreDownloadUrl||'https://github.com/hacesoft/core/tree/HEAD/release';
    const oActions=document.createElement('p');
    const oLink=document.createElement('a');
    oLink.href=sDownload;
    oLink.target='_blank';
    oLink.rel='noopener noreferrer';
    oLink.textContent=tr('Download Shared App Core');
    oActions.append(oLink);
    oRoot.append(oHeading,oMessage,oActions);
}
function registerCoreAbout(){
    if(!Core?.about?.register)return;
    try{Core.about.register(WEATHER_APP_INFO);}catch(oError){console.warn('[Weather] Core about registration failed:',oError);}
}

function prepareWeatherMarkup(){
    const oRoot=getAppRoot();
    const oTemplate=document.getElementById('wp-app-template');
    if(!oRoot)throw new Error(tr('Weather application root was not found.'));
    if(!oTemplate)throw new Error(tr('Weather application template was not found.'));
    if(oRoot.querySelector('.wp-header'))return;
    const oFragment=oTemplate.content?oTemplate.content.cloneNode(true):document.createRange().createContextualFragment(oTemplate.innerHTML);
    oRoot.replaceChildren(oFragment);
}

const tr=s=>typeof t==='function'?t(APP,s):s;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const api=async(path,options={})=>{const r=await fetch(OC.generateUrl('/apps/'+APP+path),{cache:'no-store',...options,headers:{requesttoken:OC.requestToken,'Content-Type':'application/json',...(options.headers||{})}});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){data={}}if(!r.ok)throw new Error(data.error||r.statusText||('HTTP '+r.status));return data;};
const state={core:null,coreStatus:null,settings:null,weather:null,currentLocation:null,savedLocations:[],selectedManual:null,activeTab:'overview',activeMapLayer:'radar',layerVisible:{radar:true,wind:false,storms:false,aladin:false},radar:null,radarIndex:0,radarTimer:null,radarFetchedAt:0,radarBlockedUntil:0,radarRetryTimer:null,radarTileQueue:[],radarTileActive:0,radarTileFailures:0,radarTileRetryAt:new Map(),settingsTab:'location',mapFields:{},mapRanges:{radar:200,wind:200,storms:200,aladin:200},mapViews:{weather:null,radar:null,wind:null,storms:null,aladin:null},mapStyles:{weather:'osm',radar:'osm',wind:'osm',storms:'osm',aladin:'osm'},mapPicks:{radar:null,wind:null,storms:null,aladin:null},mapInfoMode:{radar:'active',wind:'active',storms:'active',aladin:'active'},mapDrag:null,windIndex:0,windTimer:null,windRaf:null,windParticles:{},windLevel:'10m',stormIndex:0,stormTimer:null,aladinFields:{},aladinRequests:{},aladinFailedUntil:{},aladinIndex:null,aladinTime:null,aladinTimer:null,aladinLoadTimer:null,aladinMetric:'precipitation',layoutController:null,layoutViewControllers:[],layoutResizeTimer:null,coreMapMounting:false,mapRenderRaf:null,mapDataTimer:null,mapDataRequests:{},radarRequest:null,locationAutoStarted:false,coreMapControllers:{},coreMapDrivers:{},coreMapRotations:{radar:0,wind:0,storms:0,aladin:0},floatingLocationAnchor:null,mapBaseTileKey:'',coreWeatherLayersRegistered:false,coreTileLoader:null,coreTileAbortController:null,coreTileObjectUrls:[],locationTracker:null,locationFollow:null,locationAbortController:null,deviceLocationSample:null,locationTrackingError:null};
const codes={0:['Clear sky','☀️','🌙'],1:['Mainly clear','🌤️','🌙'],2:['Partly cloudy','⛅','☁️'],3:['Overcast','☁️','☁️'],45:['Fog','🌫️','🌫️'],48:['Rime fog','🌫️','🌫️'],51:['Light drizzle','🌦️','🌦️'],53:['Drizzle','🌦️','🌦️'],55:['Heavy drizzle','🌧️','🌧️'],56:['Light freezing drizzle','🌨️','🌨️'],57:['Freezing drizzle','🌨️','🌨️'],61:['Light rain','🌦️','🌧️'],63:['Rain','🌧️','🌧️'],65:['Heavy rain','🌧️','🌧️'],66:['Light freezing rain','🌨️','🌨️'],67:['Heavy freezing rain','🌨️','🌨️'],71:['Light snow','🌨️','🌨️'],73:['Snow','🌨️','🌨️'],75:['Heavy snow','❄️','❄️'],77:['Snow grains','❄️','❄️'],80:['Light showers','🌦️','🌧️'],81:['Showers','🌧️','🌧️'],82:['Heavy showers','🌧️','🌧️'],85:['Snow showers','🌨️','🌨️'],86:['Heavy snow showers','❄️','❄️'],95:['Thunderstorm','⛈️','⛈️'],96:['Thunderstorm with hail','⛈️','⛈️'],99:['Severe thunderstorm with hail','⛈️','⛈️']};
const desc=(code)=>(codes[code]||['Unknown weather','🌡️','🌡️']);
const icon=(code,isDay=1)=>desc(Number(code))[Number(isDay)?1:2];
const text=(code)=>tr(desc(Number(code))[0]);
const round=(v,d=0)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'--';
const fmtTime=s=>{if(!s)return'--:--';const d=new Date(s);return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});};
const fmtDay=s=>new Date(s+'T12:00:00').toLocaleDateString([], {weekday:'short',day:'numeric',month:'numeric'});
const duration=sec=>{const m=Math.round(Number(sec||0)/60);return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min';};
const windDir=deg=>[tr('N'),tr('NE'),tr('E'),tr('SE'),tr('S'),tr('SW'),tr('W'),tr('NW')][Math.round((Number(deg)||0)/45)%8];
function setLoading(on){$('wp-loading').hidden=!on;if(on)$('wp-error').hidden=true;}
function showError(e){setLoading(false);$('wp-error').textContent=e.message||String(e);$('wp-error').hidden=false;}
const focusableSelector='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let settingsReturnFocus=null;
function viewportBox(){const vv=window.visualViewport;return vv?{left:vv.offsetLeft,top:vv.offsetTop,width:vv.width,height:vv.height}:{left:0,top:0,width:window.innerWidth,height:window.innerHeight};}
function updateViewportVars(){const app=$('wp-app');if(!app)return;const vp=viewportBox();app.style.setProperty('--wp-vv-height',vp.height+'px');app.style.setProperty('--wp-vv-width',vp.width+'px');app.style.setProperty('--wp-vv-top',vp.top+'px');app.style.setProperty('--wp-vv-left',vp.left+'px');if(!$('wp-location-popover')?.hidden)positionLocationPopover();if(!$('wp-floating-location-results')?.hidden)positionFloatingLocationResults();}
function coreLayoutApi(){return Core?.layout||null;}
function coreLayoutClasses(){const api=coreLayoutApi();return Object.assign({appLayout:'hc-shared-app-core-layout',header:'hc-shared-app-core-layout__header',toolbar:'hc-shared-app-core-layout__toolbar',content:'hc-shared-app-core-layout__content',view:'hc-shared-app-core-view',panel:'hc-shared-app-core-panel',surface:'hc-shared-app-core-surface',scrollArea:'hc-shared-app-core-scroll-area'},api?.classes||{});}
function addClass(el,cls){if(el&&cls)String(cls).split(/\s+/).filter(Boolean).forEach(c=>el.classList.add(c));}
function applyCoreLayoutPrimitives(){
    const c=coreLayoutClasses();
    addClass($('wp-app'),c.appLayout);
    addClass(document.querySelector('.wp-header'),c.header);
    addClass(document.querySelector('.wp-tabs'),c.toolbar);
    addClass(document.querySelector('.wp-main'),c.content);
    document.querySelectorAll('.wp-view').forEach(v=>addClass(v,c.view));
    ['wp-tab-overview','wp-tab-warnings'].forEach(id=>addClass($(id),c.scrollArea));
    document.querySelectorAll('.wp-section,.wp-card,.wp-hero,.wp-forecast-board,.wp-map-section,.wp-weather-map').forEach(el=>addClass(el,c.surface));
}
function isWeatherMapTab(sTab){return sTab==='map';}
function activeMapKind(){return state.activeTab==='map'?state.activeMapLayer:null;}
function renderActiveAfterCoreLayout(reason='resize'){
    updateViewportVars();
    if(activeMapKind())scheduleMapRender(true);
}
function refreshActiveLayout(reason='manual'){
    updateViewportVars();
    try{state.layoutController?.refresh?.(reason);}catch(_){try{state.layoutController?.refresh?.();}catch(__){}}
    for(const controller of state.layoutViewControllers){try{controller?.refresh?.(reason);}catch(_){try{controller?.refresh?.();}catch(__){}}}
    renderActiveAfterCoreLayout(reason);
}
function scheduleCoreLayoutRefresh(reason='resize'){
    clearTimeout(state.layoutResizeTimer);
    state.layoutResizeTimer=setTimeout(()=>renderActiveAfterCoreLayout(reason),80);
}
function initCoreLayout(){
    applyCoreLayoutPrimitives();
    const api=coreLayoutApi();
    if(!api?.observe)throw new Error(tr('Shared App Core layout API is not available.'));
    const app=$('wp-app');
    if(!app)return;
    try{state.layoutController?.destroy?.();}catch(_){}
    state.layoutViewControllers.forEach(c=>{try{c?.destroy?.();}catch(_){}});
    state.layoutViewControllers=[];
    const onResize=metrics=>{if(metrics?.mode)app.dataset.weatherLayoutMode=metrics.mode;scheduleCoreLayoutRefresh('core-layout');};
    state.layoutController=api.observe(app,{topOffset:50,onResize});
    document.querySelectorAll('.wp-view').forEach(view=>{
        try{state.layoutViewControllers.push(api.observe(view,{heightMode:'container',topOffset:0,onResize:()=>scheduleCoreLayoutRefresh('core-view')}));}
        catch(e){console.warn('[Weather] Core view layout observe failed:',e);}
    });
    refreshActiveLayout('core-init');
}

function setWeatherMobileNav(open){const panel=$('wp-mobile-nav'),button=$('wp-mobile-menu'),backdrop=$('wp-mobile-nav-backdrop');if(!panel||!button||!backdrop)return;panel.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));backdrop.hidden=!open;}
function prepareWeatherControls(){
    const header=document.querySelector('.wp-header'),tabs=header?.querySelector('.wp-tabs'),actions=header?.querySelector('.wp-header-actions');
    if(header&&tabs&&actions){
        const button=document.createElement('button');button.type='button';button.id='wp-mobile-menu';button.textContent='☰';button.setAttribute('aria-label',tr('Open menu'));button.setAttribute('aria-controls','wp-mobile-nav');button.setAttribute('aria-expanded','false');
        const panel=document.createElement('div');panel.id='wp-mobile-nav';panel.append(tabs,actions);header.append(button,panel);
        const backdrop=document.createElement('button');backdrop.type='button';backdrop.id='wp-mobile-nav-backdrop';backdrop.tabIndex=-1;backdrop.hidden=true;backdrop.setAttribute('aria-label',tr('Close'));$('wp-app').append(backdrop);
        button.onclick=()=>setWeatherMobileNav(!panel.classList.contains('is-open'));
        backdrop.onclick=()=>setWeatherMobileNav(false);
        document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){setWeatherMobileNav(false);button.focus()}});
    }
    const map=$('wp-weather-map'),controls=document.querySelector('.wp-map-headline-controls');
    if(map&&controls){
        map.prepend(controls.querySelector('.wp-map-layer-switch'));
        controls.querySelectorAll('.wp-layer-controls').forEach(element=>{
            const button=document.createElement('button');
            button.type='button';button.className='wp-compact-tools-toggle';button.textContent='⋯';
            button.setAttribute('aria-label',tr('Show timeline and levels'));
            button.setAttribute('title',tr('Show timeline and levels'));
            button.setAttribute('aria-expanded','false');
            button.addEventListener('click',()=>{
                const open=!element.classList.contains('is-expanded');
                element.classList.toggle('is-expanded',open);
                button.setAttribute('aria-expanded',String(open));
                button.setAttribute('aria-label',tr(open?'Hide timeline and levels':'Show timeline and levels'));
                button.title=tr(open?'Hide timeline and levels':'Show timeline and levels');
            });
            element.append(button);
            map.append(element);
        });
        const provider=controls.querySelector('.wp-provider-tools');
        if(provider){provider.id='wp-map-options';map.append(provider)}
        const button=document.createElement('button');button.type='button';button.id='wp-map-options-toggle';button.textContent='⚙';button.setAttribute('aria-label',tr('Map tools'));button.setAttribute('aria-controls','wp-map-options');button.setAttribute('aria-expanded','false');map.append(button);
        button.onclick=()=>{const open=!provider.classList.contains('is-open');provider.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open))};
        const tendency=document.createElement('button');
        tendency.type='button';tendency.id='wp-map-tendency-toggle';tendency.hidden=true;
        tendency.setAttribute('aria-expanded','false');
        map.append(tendency);
        tendency.addEventListener('click',()=>{
            const detail=map.closest('.wp-weather-map-section')?.querySelector('.wp-map-layer-detail:not([hidden])');
            if(!detail)return;
            const open=!detail.classList.contains('is-floating-open');
            detail.classList.toggle('is-floating-open',open);
            tendency.setAttribute('aria-expanded',String(open));
            tendency.setAttribute('aria-label',tr(open?'Hide tendency':'Show tendency'));
        });
        syncMobileMapDetails();
    }
}
function isCompactWeatherMap(){
    return window.matchMedia('(max-width:760px), (orientation:landscape) and (max-height:620px) and (max-width:980px)').matches;
}
function syncMobileMapDetails(){
    const map=$('wp-weather-map'),section=map?.closest('.wp-weather-map-section');
    if(!map||!section)return;
    section.querySelectorAll('.wp-map-layer-detail').forEach(detail=>{
        if(!detail.id)detail.id='wp-tendency-'+detail.dataset.layerDetail;
        if(!isCompactWeatherMap())detail.classList.remove('is-floating-open');
    });
    const tendency=$('wp-map-tendency-toggle');
    if(tendency){
        const kind=state.activeMapLayer;
        const visible=isCompactWeatherMap()&&state.activeTab==='map'&&state.layerVisible[kind]&&(kind==='wind'||kind==='storms'||kind==='aladin');
        tendency.hidden=!visible;
        tendency.textContent=kind==='wind'?'💨':kind==='storms'?'⛈️':'🌦️';
        if(visible)tendency.setAttribute('aria-controls','wp-tendency-'+kind);
        const label=kind==='wind'?'Wind tendency':kind==='storms'?'Storm tendency':'ALADIN legend';
        tendency.setAttribute('aria-label',tr(label));
        tendency.setAttribute('title',tr(label));
        if(!visible)tendency.setAttribute('aria-expanded','false');
    }
}
async function init(){document.querySelectorAll('.wp-version-badge,.wp-version-inline').forEach(el=>el.textContent='v'+BUILD);prepareWeatherControls();updateViewportVars();bind();initCoreLayout();try{state.settings=await api('/api/settings');await refreshCoreMapProviderState();state.savedLocations=state.settings.savedLocations||[];renderSettings();await resolveLocationAndLoad();loadAdminSettings();}catch(e){showError(e);}}
function bind(){
    document.querySelectorAll('.wp-tabs button').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.tab)));
    $('wp-settings-button')?.addEventListener('click',openSettings); $('wp-settings-x')?.addEventListener('click',closeSettings); $('wp-open-admin-location')?.addEventListener('click',()=>openSettingsTab('admin')); document.querySelectorAll('[data-open-core-map-cache]').forEach(oButton=>oButton.addEventListener('click',openCoreMapCacheSettings)); initSettingsDialogDrag();
    const overlay=$('wp-settings-overlay'),modal=overlay?.querySelector('.wp-modal');
    overlay?.addEventListener('click',e=>{if(e.target===overlay)closeSettings();});
    overlay?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeSettings();return;}if(e.key!=='Tab'||!modal)return;const items=[...modal.querySelectorAll(focusableSelector)].filter(el=>el.offsetParent!==null);if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
    $('wp-save-settings')?.addEventListener('click',saveActiveSettings);
    $('wp-location-button')?.addEventListener('click',toggleLocationPopover); $('wp-location-search')?.addEventListener('input',debounce(searchLocations,250));
    $('wp-save-current-location')?.addEventListener('click',saveCurrentLocation); $('wp-admin-use-current')?.addEventListener('click',saveAdminFromCurrent); $('wp-admin-location-search')?.addEventListener('input',debounce(searchAdminLocations,250));
    $('wp-radar-play')?.addEventListener('click',toggleRadarPlay); $('wp-radar-slider')?.addEventListener('input',e=>{stopRadar();showRadarFrame(Number(e.target.value));});
    $('wp-wind-play')?.addEventListener('click',toggleWindPlay); $('wp-wind-slider')?.addEventListener('input',e=>{stopWindPlay();state.windIndex=Number(e.target.value);renderWindMap(false);renderWind();});
    document.querySelectorAll('[data-wind-level]').forEach(b=>b.addEventListener('click',()=>setWindLevel(b.dataset.windLevel)));
    $('wp-storm-play')?.addEventListener('click',toggleStormPlay); $('wp-storm-slider')?.addEventListener('input',e=>{stopStormPlay();state.stormIndex=Number(e.target.value);renderStormMapFrame();renderStorms();});
    $('wp-aladin-play')?.addEventListener('click',toggleAladinPlay); $('wp-aladin-slider')?.addEventListener('input',e=>{stopAladinPlay();state.aladinIndex=Number(e.target.value);renderAladinMapFrame();});
    document.querySelectorAll('[data-aladin-metric]').forEach(b=>b.addEventListener('click',()=>setAladinMetric(b.dataset.aladinMetric)));
    document.querySelectorAll('[data-detail-toggle]').forEach(button=>button.addEventListener('click',()=>{const detail=button.closest('.wp-map-layer-detail'),open=!detail.classList.contains('is-expanded');detail.classList.toggle('is-expanded',open);button.setAttribute('aria-expanded',String(open));refreshActiveLayout('detail-toggle');}));
    document.querySelectorAll('[data-map-zoom-in]').forEach(b=>b.addEventListener('click',()=>changeMapZoom(b.dataset.mapZoomIn,1)));
    document.querySelectorAll('[data-map-zoom-out]').forEach(b=>b.addEventListener('click',()=>changeMapZoom(b.dataset.mapZoomOut,-1)));
    document.querySelectorAll('[data-map-reset]').forEach(b=>b.addEventListener('click',()=>resetMapView(b.dataset.mapReset,true)));
    document.querySelectorAll('[data-map-style]').forEach(sel=>sel.addEventListener('change',()=>{const sKind=sel.dataset.mapStyle||'weather';state.mapStyles[sKind]=sel.value;if(sKind==='weather'){state.mapStyles.radar=sel.value;state.mapStyles.wind=sel.value;state.mapStyles.storms=sel.value;state.mapStyles.aladin=sel.value;renderActiveWeatherLayer(true);}else{renderMapKind(sKind,true);}}));
    document.querySelectorAll('[data-external-map]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openMapProvider(a.dataset.externalMap,a.dataset.mapKind);}));
    bindUnifiedMapInteractions();
    document.querySelectorAll('input[name="location-mode"]').forEach(r=>r.addEventListener('change',()=>{toggleManual();updateUserDefaultSummary();}));
    document.querySelectorAll('[data-settings-tab]').forEach(b=>b.addEventListener('click',()=>openSettingsTab(b.dataset.settingsTab)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){const p=$('wp-location-popover');if(p&&!p.hidden){hideLocationPopover(true);}document.querySelectorAll('.wp-map-layer-detail.is-floating-open').forEach(detail=>detail.classList.remove('is-floating-open'));$('wp-map-tendency-toggle')?.setAttribute('aria-expanded','false');}});
    document.addEventListener('click',e=>{const p=$('wp-location-popover');if(p&&!p.hidden&&!p.contains(e.target)&&e.target!==$('wp-location-button'))hideLocationPopover(false);const f=$('wp-floating-location-results');if(f&&!f.hidden&&!f.contains(e.target)&&state.floatingLocationAnchor!==e.target)hideFloatingLocationResults();});
    const onViewport=debounce(()=>{syncMobileMapDetails();refreshActiveLayout('window');},120);
    window.addEventListener('resize',onViewport);window.visualViewport?.addEventListener('resize',onViewport);window.visualViewport?.addEventListener('scroll',()=>scheduleCoreLayoutRefresh('viewport-scroll'));
}
function centerActiveTabButton(button){
    const tabs=button?.closest?.('.wp-tabs');
    if(!button||!tabs)return;
    try{
        const left=button.offsetLeft-(tabs.clientWidth-button.offsetWidth)/2;
        tabs.scrollTo({left:Math.max(0,left),behavior:'smooth'});
    }catch(_){
        try{tabs.scrollLeft=Math.max(0,button.offsetLeft-(tabs.clientWidth-button.offsetWidth)/2);}catch(__){}
    }
}
function openTab(tab){
    state.activeTab=tab;
    setWeatherMobileNav(false);
    document.querySelectorAll('.wp-tabs button').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);if(active)centerActiveTabButton(b);});
    const sView=tab==='map'?'weather-map':tab;
    document.querySelectorAll('.wp-view').forEach(v=>v.hidden=v.dataset.view!==sView);
    const app=$('wp-app');
    if(app&&window.matchMedia('(max-width:760px), (orientation:landscape) and (max-height:620px)').matches)app.scrollTop=0;
    refreshActiveLayout('tab-before-load');
    if(tab==='map'){
        const layer=state.activeMapLayer||'radar';
        setWeatherMapLayer(layer,false);
        for(const kind of ['radar','wind','storms','aladin'])if(state.layerVisible[kind])ensureActiveMapLayerData(kind);
        renderMapKind(layer,true);
        // The first Map click authorizes the browser location prompt. A denied
        // or unavailable location leaves the selected/default map usable.
        if(!state.locationAutoStarted){state.locationAutoStarted=true;startLocationTracking(true);}
    }else{
        stopRadar();stopWindPlay();stopStormPlay();stopAladinPlay();stopWindAnimation();
        clearTimeout(state.mapDataTimer);clearTimeout(state.aladinLoadTimer);
    }
    requestAnimationFrame(()=>refreshActiveLayout('tab-after-load'));
}
function sharedMapKey(kind){return ['weather','map','radar','wind','storms','aladin'].includes(kind)?'weather':kind;}
function sharedMapLayer(kind){return ['radar','wind','storms','aladin'].includes(kind)?kind:(state.activeMapLayer||'radar');}
function mapElement(kind){return $('wp-weather-map')||$(`wp-${kind==='storms'?'storm':kind}-map`);}
function mapBaseElement(kind){return $('wp-weather-base-layer')||$(`wp-${kind==='storms'?'storm':kind}-base`)||$('wp-osm-layer');}
function mapMarkerElement(kind){return $('wp-weather-marker')||$(`wp-${kind==='storms'?'storm':kind}-marker`);}
function renderActiveWeatherLayer(reset=false){const sLayer=activeMapKind()||state.activeMapLayer||'radar';renderMapKind(sLayer,reset);}
function layerIsVisible(kind){return state.activeTab==='map'&&Boolean(state.layerVisible[kind]);}
function ensureActiveMapLayerData(layer){
    if(layer==='radar')ensureRadar();
    else if(layer==='wind')ensureWindMap();
    else if(layer==='storms')ensureStormMap();
    else if(layer==='aladin')ensureAladinMap();
}
function setWeatherMapLayer(kind,render=true){
    const sLayer=['radar','wind','storms','aladin'].includes(kind)?kind:'radar';
    const previous=state.activeMapLayer;
    if(render&&(!state.layerVisible[sLayer]||previous===sLayer))state.layerVisible[sLayer]=!state.layerVisible[sLayer];
    if(state.layerVisible[sLayer])state.activeMapLayer=sLayer;
    else if(previous===sLayer)state.activeMapLayer=['radar','wind','storms','aladin'].find(layer=>state.layerVisible[layer])||sLayer;
    const selected=state.layerVisible[state.activeMapLayer]?state.activeMapLayer:null;
    document.querySelectorAll('[data-weather-layer]').forEach(oButton=>{const enabled=Boolean(state.layerVisible[oButton.dataset.weatherLayer]);oButton.classList.toggle('active',enabled);oButton.classList.toggle('selected',enabled&&oButton.dataset.weatherLayer===selected);oButton.setAttribute('aria-pressed',String(enabled));});
    document.querySelectorAll('[data-layer-controls]').forEach(oPanel=>{oPanel.hidden=oPanel.dataset.layerControls!==selected;});
    document.querySelectorAll('[data-layer-detail]').forEach(oPanel=>{oPanel.hidden=oPanel.dataset.layerDetail!==selected;oPanel.classList.remove('is-floating-open');});
    document.querySelectorAll('.wp-compact-tools-toggle').forEach(oButton=>{
        const panel=oButton.closest('.wp-layer-controls');
        if(panel?.dataset.layerControls!==selected){panel?.classList.remove('is-expanded');oButton.setAttribute('aria-expanded','false');}
    });
    $('wp-map-tendency-toggle')?.setAttribute('aria-expanded','false');
    syncMobileMapDetails();
    const oRadarLayer=$('wp-radar-layer'),oWindCanvas=$('wp-wind-canvas'),oStormCanvas=$('wp-storm-canvas'),oAladinCanvas=$('wp-aladin-canvas');
    if(oRadarLayer)oRadarLayer.hidden=!state.layerVisible.radar;
    if(oWindCanvas)oWindCanvas.hidden=!state.layerVisible.wind;
    if(oStormCanvas)oStormCanvas.hidden=!state.layerVisible.storms;
    if(oAladinCanvas)oAladinCanvas.hidden=!state.layerVisible.aladin;
    if(!state.layerVisible.radar)stopRadar();
    if(!state.layerVisible.wind){stopWindPlay();stopWindAnimation();}
    if(!state.layerVisible.storms)stopStormPlay();
    if(!state.layerVisible.aladin){stopAladinPlay();clearTimeout(state.aladinLoadTimer);}
    refreshMapProviderOptions();
    if(state.activeTab==='map'){
        setupCoreMap(state.activeMapLayer);
        if(render&&state.layerVisible[sLayer])ensureActiveMapLayerData(sLayer);
        if(render)renderMapKind(state.activeMapLayer,false);
    }
    updateLocationFollowUi();
}
function bindUnifiedMapInteractions(){
    const oMap=mapElement('weather');
    if(!oMap||oMap.dataset.weatherUnifiedBound==='1')return;
    oMap.dataset.weatherUnifiedBound='1';
    let oDrag=null,nRaf=0;
    const pointers=new Map();let pinch=null;
    // Two-finger map zoom is isolated to the map; page gestures stay native.
    oMap.addEventListener('pointerdown',event=>{
        if(event.pointerType!=='touch'||event.target.closest('button,a,input,select,textarea'))return;
        pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:getMapSpec(activeMapKind()||'radar').zoom};oDrag=null;}
    });
    oMap.addEventListener('pointermove',event=>{
        if(!pointers.has(event.pointerId))return;
        pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(pointers.size!==2||!pinch||!pinch.distance)return;
        const [a,b]=[...pointers.values()],kind=activeMapKind()||'radar';
        const target=Math.round(pinch.zoom+Math.log2(Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));
        const delta=target-getMapSpec(kind).zoom;if(delta)zoomMapAt(kind,delta,(a.x+b.x)/2,(a.y+b.y)/2);
    });
    const endTouch=event=>{pointers.delete(event.pointerId);if(pinch){pinch=null;oDrag=null;}};
    oMap.addEventListener('pointerup',endTouch);oMap.addEventListener('pointercancel',endTouch);
    oMap.addEventListener('pointerdown',oEvent=>{if(pointers.size>1||oEvent.button!==0||oEvent.target.closest('button,a,input,select,textarea'))return;const sLayer=activeMapKind()||'radar',oSpec={...getMapSpec(sLayer)},oTile=tileXY(oSpec.lat,oSpec.lon,oSpec.zoom);oDrag={id:oEvent.pointerId,x:oEvent.clientX,y:oEvent.clientY,t:oTile,z:oSpec.zoom,moved:false,manualNotified:false,layer:sLayer};oMap.setPointerCapture?.(oEvent.pointerId);oMap.classList.add('wp-dragging');});
    oMap.addEventListener('pointermove',oEvent=>{if(!oDrag||oDrag.id!==oEvent.pointerId)return;const nDx=oEvent.clientX-oDrag.x,nDy=oEvent.clientY-oDrag.y;if(Math.hypot(nDx,nDy)>6){oDrag.moved=true;if(!oDrag.manualNotified){oDrag.manualNotified=true;notifyManualMapPan(oDrag.layer||activeMapKind()||'radar');}}const oCenter=tileLonLat(oDrag.t.x-nDx/256,oDrag.t.y-nDy/256,oDrag.z);state.mapViews.weather={lat:oCenter.lat,lon:oCenter.lon,zoom:oDrag.z};if(!nRaf)nRaf=requestAnimationFrame(()=>{nRaf=0;renderActiveWeatherLayer(true);});});
    const fnStop=oEvent=>{if(!oDrag)return;const bMoved=oDrag.moved,nClickX=oEvent?.clientX,nClickY=oEvent?.clientY,sLayer=oDrag.layer||activeMapKind()||'radar';oDrag=null;oMap.classList.remove('wp-dragging');if(!bMoved&&Number.isFinite(nClickX)&&Number.isFinite(nClickY))selectMapPoint(sLayer,oMap,nClickX,nClickY);else if(bMoved)emitWeatherMapDriver(sLayer,'moveend');};
    oMap.addEventListener('pointerup',fnStop);
    oMap.addEventListener('pointercancel',()=>{oDrag=null;oMap.classList.remove('wp-dragging');});
    oMap.addEventListener('wheel',oEvent=>{oEvent.preventDefault();zoomMapAt(activeMapKind()||'radar',oEvent.deltaY<0?1:-1,oEvent.clientX,oEvent.clientY,true,true);},{passive:false});
    document.querySelectorAll('[data-weather-layer]').forEach(oButton=>oButton.addEventListener('click',()=>setWeatherMapLayer(oButton.dataset.weatherLayer)));
    $('wp-map-follow')?.addEventListener('click',()=>startLocationTracking(true));
}


function openCoreMapCacheSettings(){
    const oCore=Core||window.HcSharedAppCore;
    try{oCore?.assertCompatible?.(requiredCoreVersion());}catch(oError){const sMessage=oError?.message||String(oError);if(oCore?.notifications?.error)oCore.notifications.error(sMessage);else alert(sMessage);return;}
    const oCacheApi=oCore?.maps?.cache;
    if(!oCacheApi?.openSettings){
        const sMessage=tr('Shared App Core map cache settings are not available.');
        if(oCore?.notifications?.warning)oCore.notifications.warning(sMessage);else alert(sMessage);
        return;
    }
    try{oCacheApi.openSettings();}
    catch(oError){const sMessage=oError?.message||String(oError);if(oCore?.notifications?.error)oCore.notifications.error(sMessage);else alert(sMessage);}
}
async function offerMapyKeyToCore(sMapyApiKey,bActivate=true){
    const sKey=String(sMapyApiKey||'').trim();
    if(!sKey)return null;
    const oProvidersApi=Core?.maps?.providers;
    if(!oProvidersApi?.offerKey)throw new Error(tr('Shared App Core provider key API is not available.'));
    return await oProvidersApi.offerKey({provider:'mapy',sourceApp:APP,key:sKey,activate:bActivate});
}
async function refreshCoreMapProviderState(){
    const oProvidersApi=Core?.maps?.providers;
    if(!oProvidersApi?.list)return;
    try{
        const aProviders=await oProvidersApi.list();
        const oMapy=Array.isArray(aProviders)?aProviders.find(oItem=>oItem?.id==='mapy'):null;
        if(!state.settings)state.settings={};
        state.settings.coreMapProviders=Array.isArray(aProviders)?aProviders:[];
        state.settings.coreMapyProvider=oMapy||null;
        state.settings.coreMapyApiConfigured=Boolean(oMapy?.enabled!==false&&oMapy?.configured);
        state.settings.coreMapyEnabled=Boolean(oMapy&&oMapy.enabled!==false);
    }catch(oError){console.warn('[Weather] Core map provider status failed:',oError);}
}

function coreMapProviderConfigured(){
    return Boolean(state.settings?.coreMapyApiConfigured);
}

function openAbout(){
    if(!Core?.about?.mount){
        const message=tr('Shared App Core About module is not available.');
        if(Core?.notifications?.warning)Core.notifications.warning(message);else alert(message);
        return;
    }
    const host=document.createElement('div');
    host.className='wp-core-about-host';
    let controller=null;
    const endpoint=OC?.generateUrl?OC.generateUrl('/apps/hc_shared_app_core/api/v1/release'):undefined;
    if(Core.dialogs?.open){
        const dialog=Core.dialogs.open({
            title:tr('About Weather'),
            content:host,
            size:'large',
            closeLabel:tr('Close'),
            closeOnBackdrop:true,
            closeOnEscape:true,
            actions:[{label:tr('Check for updates'),onClick:()=>controller?.refresh?.()},{label:tr('Close'),variant:'primary',close:true}],
            onClose:()=>{try{controller?.destroy?.();}catch(_){}}
        });
        try{controller=Core.about.mount(host,{app:WEATHER_APP_INFO,endpoint,heading:tr('About application'),checkUpdates:true});}
        catch(e){host.textContent=e?.message||String(e);}
        dialog?.element?.querySelector?.('.hc-shared-app-core-dialog__panel,.app-core-dialog__panel')?.classList?.add?.('wp-about-dialog');
        return;
    }
    const overlay=document.createElement('div');
    overlay.className='wp-overlay wp-about-overlay';
    overlay.innerHTML=`<div class="wp-modal" role="dialog" aria-modal="true"><div class="wp-modal-title"><strong>${esc(tr('About Weather'))}</strong><button type="button" aria-label="${esc(tr('Close'))}">×</button></div><div class="wp-settings-body"></div></div>`;
    overlay.querySelector('.wp-settings-body').append(host);const refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.textContent=tr('Check for updates');refreshButton.onclick=()=>controller?.refresh?.();overlay.querySelector('.wp-settings-body').append(refreshButton);
    const close=()=>{try{controller?.destroy?.();}catch(_){} overlay.remove();};
    overlay.querySelector('button')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.body.append(overlay);
    try{controller=Core.about.mount(host,{app:WEATHER_APP_INFO,endpoint,heading:tr('About application'),checkUpdates:true});}
    catch(e){host.textContent=e?.message||String(e);}
}
function openSettings(){setWeatherMobileNav(false);hideLocationPopover(false);hideFloatingLocationResults();const overlay=$('wp-settings-overlay'),modal=overlay?.querySelector('.wp-modal');if(!overlay)return;settingsReturnFocus=$('wp-settings-button');resetSettingsDialogPosition();overlay.hidden=false;overlay.setAttribute('aria-hidden','false');$('wp-app')?.classList.add('wp-modal-open');renderSettings();loadAdminSettings();openSettingsTab('location');updateViewportVars();requestAnimationFrame(()=>modal?.querySelector(focusableSelector)?.focus());}
function closeSettings(){hideFloatingLocationResults();const overlay=$('wp-settings-overlay');if(!overlay||overlay.hidden)return;overlay.hidden=true;overlay.setAttribute('aria-hidden','true');$('wp-app')?.classList.remove('wp-modal-open');settingsReturnFocus?.focus?.();settingsReturnFocus=null;}
function mountAboutInSettings(){const host=$('wp-settings-about-core');if(!host||host.dataset.mounted==='1')return;if(!Core?.about?.mount){host.textContent=tr('Shared App Core About module is not available.');return;}host.dataset.mounted='1';host.textContent='';try{const controller=Core.about.mount(host,{app:WEATHER_APP_INFO,endpoint:OC?.generateUrl?OC.generateUrl('/apps/hc_shared_app_core/api/v1/release'):undefined,heading:tr('About application'),checkUpdates:true});const button=document.createElement('button');button.type='button';button.textContent=tr('Check for updates');button.onclick=async()=>{button.disabled=true;try{await controller.refresh()}finally{button.disabled=false}};host.after(button);}catch(e){host.textContent=e?.message||String(e);}}
function updateSettingsFooter(tab){const save=$('wp-save-settings');const note=document.querySelector('#wp-settings-overlay .wp-modal-footer .wp-about');const bReadOnlyTab=tab==='about'||tab==='mapcache';if(save){save.hidden=bReadOnlyTab;save.textContent=tr('Save settings');}if(note)note.hidden=bReadOnlyTab;}

function resetSettingsDialogPosition(){const modal=document.querySelector('#wp-settings-overlay .wp-modal');if(!modal)return;modal.style.position='';modal.style.left='';modal.style.top='';modal.style.margin='';modal.style.transform='';modal.dataset.dragged='0';}
function initSettingsDialogDrag(){const overlay=$('wp-settings-overlay'),modal=overlay?.querySelector('.wp-modal'),handle=modal?.querySelector('.wp-modal-title');if(!overlay||!modal||!handle||handle.dataset.dragBound==='1')return;handle.dataset.dragBound='1';let drag=null;const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(e.target.closest('button,a,input,select,textarea'))return;if(window.matchMedia('(max-width: 760px)').matches)return;const r=modal.getBoundingClientRect(),vp=viewportBox();drag={dx:e.clientX-r.left,dy:e.clientY-r.top,width:r.width,height:r.height,vp};modal.style.position='fixed';modal.style.width=r.width+'px';modal.style.left=r.left+'px';modal.style.top=r.top+'px';modal.style.margin='0';modal.dataset.dragged='1';handle.setPointerCapture?.(e.pointerId);e.preventDefault();});handle.addEventListener('pointermove',e=>{if(!drag)return;const vp=viewportBox(),margin=8;const left=clamp(e.clientX-drag.dx,vp.left+margin,vp.left+vp.width-drag.width-margin);const top=clamp(e.clientY-drag.dy,vp.top+margin,vp.top+vp.height-80);modal.style.left=left+'px';modal.style.top=top+'px';});handle.addEventListener('pointerup',e=>{drag=null;try{handle.releasePointerCapture?.(e.pointerId);}catch(_){}});handle.addEventListener('pointercancel',()=>{drag=null;});}
function openSettingsTab(tab){state.settingsTab=tab;document.querySelectorAll('[data-settings-tab]').forEach(b=>b.classList.toggle('active',b.dataset.settingsTab===tab));document.querySelectorAll('[data-settings-pane]').forEach(p=>p.hidden=p.dataset.settingsPane!==tab);updateSettingsFooter(tab);if(tab==='admin')loadAdminSettings();if(tab==='about')mountAboutInSettings();}
function updateUserDefaultSummary(){const s=state.settings||{},mode=document.querySelector('input[name="location-mode"]:checked')?.value||s.locationMode||'admin';let name='--',detail='';if(mode==='manual'){const x=state.selectedManual||{};name=x.label||x.name||s.locationName||tr('My location');detail=(x.latitude!==undefined&&x.longitude!==undefined)?`${round(x.latitude,4)}, ${round(x.longitude,4)}`:'';}else if(mode==='device'){name=tr('Current device location');detail=tr('The location is obtained from the browser when weather is loaded.');}else{name=s.adminDefault?.name||tr('Administrator default location');detail=tr('Administrator fallback location');}if($('wp-user-default-summary'))$('wp-user-default-summary').textContent=name;if($('wp-user-default-detail'))$('wp-user-default-detail').textContent=detail;}
function toggleManual(){const mode=document.querySelector('input[name="location-mode"]:checked')?.value||'admin';$('wp-manual-location').classList.toggle('disabled',mode!=='manual');}
function renderSettings(){const s=state.settings||{};document.querySelector(`input[name="location-mode"][value="${s.locationMode||'admin'}"]`)?.click();$('wp-admin-default-label').textContent=s.adminDefault?'('+s.adminDefault.name+')':'';state.selectedManual=s.locationName&&s.latitude!==''?{name:s.locationName,label:s.locationName,latitude:Number(s.latitude),longitude:Number(s.longitude),timezone:s.timezone||'auto'}:state.selectedManual;renderSelectedManual();document.querySelectorAll('[data-widget-field]').forEach(c=>c.checked=(s.widgetFields||[]).includes(c.value));renderSavedLocations();renderUserMapySettings();toggleManual();updateUserDefaultSummary();}
async function resolveLocationAndLoad(){setLoading(true);const s=state.settings;let loc;if(s.locationMode==='device'){try{loc=await deviceLocation();}catch(e){loc={...s.adminDefault,source:'admin',name:s.adminDefault.name+' ('+tr('default')+')'};}}else if(s.locationMode==='manual'&&s.latitude!==''&&s.longitude!==''){loc={name:s.locationName||tr('My location'),latitude:Number(s.latitude),longitude:Number(s.longitude),timezone:s.timezone||'auto',source:'manual'};}else{loc={...s.adminDefault,source:'admin'};}await loadWeather(loc);}
function deviceLocation(){
    const last=state.locationTracker?.getLast?.();
    if(last?.point)return Promise.resolve({name:tr('Current location'),latitude:last.point.lat,longitude:last.point.lon,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'auto',source:'device'});
    return new Promise((resolve,reject)=>{
        const watch=Core?.maps?.watchLocation;
        if(typeof watch!=='function'){reject(new Error(tr('Shared App Core location tracking is not available.')));return;}
        let tracker=null,pendingDestroy=false,settled=false;
        const finish=()=>{if(tracker)tracker.destroy();else pendingDestroy=true;};
        try{
            tracker=watch({
                enableHighAccuracy:false,
                timeoutMs:10000,
                maximumAgeMs:300000,
                onPosition(sample){
                    if(settled)return;settled=true;finish();
                    resolve({name:tr('Current location'),latitude:sample.point.lat,longitude:sample.point.lon,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'auto',source:'device'});
                },
                onError(error){
                    if(settled)return;settled=true;finish();
                    reject(new Error(error?.message||tr('Device location is unavailable.')));
                },
            });
            if(pendingDestroy)tracker.destroy();
        }catch(error){settled=true;finish();reject(error);}
    });
}
async function loadWeather(loc){setLoading(true);try{const q=`?lat=${encodeURIComponent(loc.latitude)}&lon=${encodeURIComponent(loc.longitude)}&timezone=${encodeURIComponent(loc.timezone||'auto')}`;const data=await api('/api/weather'+q);state.currentLocation=loc;state.weather=data;state.mapFields={};state.aladinFields={};state.mapViews={weather:null,radar:null,wind:null,storms:null,aladin:null};state.mapBaseTileKey='';resetCoreMapsForHome();renderWeather();renderAdminCurrent();refreshMapProviderOptions();setLoading(false);openTab(state.activeTab);}catch(e){showError(e);}}
function hourlyRows(){const w=state.weather||{},h=w.hourly||{},times=h.time||[];const now=new Date(w.current?.time||Date.now()).getTime();let idx=times.findIndex(x=>new Date(x).getTime()>=now);if(idx<0)idx=0;return times.map((time,i)=>({time,temperature:h.temperature_2m?.[i],apparent:h.apparent_temperature?.[i],prob:h.precipitation_probability?.[i],precip:h.precipitation?.[i],code:h.weather_code?.[i],wind:h.wind_speed_10m?.[i],windDir:h.wind_direction_10m?.[i],gust:h.wind_gusts_10m?.[i],pressure:h.surface_pressure?.[i],uv:h.uv_index?.[i],visibility:h.visibility?.[i],cloud:h.cloud_cover?.[i],cape:h.cape?.[i]})).slice(idx);}
function dailyRows(){const d=state.weather?.daily||{};return (d.time||[]).map((time,i)=>({time,code:d.weather_code?.[i],max:d.temperature_2m_max?.[i],min:d.temperature_2m_min?.[i],sunrise:d.sunrise?.[i],sunset:d.sunset?.[i],daylight:d.daylight_duration?.[i],sunshine:d.sunshine_duration?.[i],uv:d.uv_index_max?.[i],precip:d.precipitation_sum?.[i],prob:d.precipitation_probability_max?.[i],wind:d.wind_speed_10m_max?.[i],gust:d.wind_gusts_10m_max?.[i]}));}
function renderWeather(){
    const w=state.weather,c=w.current||{},hours=hourlyRows(),days=dailyRows(),day=days[0]||{};
    $('wp-location-subtitle').textContent=state.currentLocation?.name||'--';
    $('wp-current-icon').textContent=icon(c.weather_code,c.is_day);
    $('wp-current-temp').textContent=round(c.temperature_2m)+'°';
    $('wp-current-condition').textContent=text(c.weather_code);
    $('wp-current-feels').textContent=tr('Feels like')+' '+round(c.apparent_temperature)+' °C';
    $('wp-current-meta').innerHTML=`<span>💧 ${round(c.relative_humidity_2m)} %</span><span>💨 ${round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</span><span>🌧️ ${round(c.precipitation,1)} mm</span><span>🔵 ${round(c.surface_pressure)} hPa</span>`;
    $('wp-daylight-label').textContent=duration(day.daylight);
    $('wp-sun-details').innerHTML=detail('🌅',tr('Sunrise'),fmtTime(day.sunrise))+detail('🌇',tr('Sunset'),fmtTime(day.sunset))+detail('☀️',tr('Day length'),duration(day.daylight))+detail('🌞',tr('Sunshine duration'),duration(day.sunshine));
    updateSun(day.sunrise,day.sunset);
    $('wp-now-details').innerHTML=detail('🌧️',tr('Precipitation'),round(c.precipitation,1)+' mm')+detail('☁️',tr('Cloud cover'),round(c.cloud_cover)+' %')+detail('💨',tr('Gusts'),round(c.wind_gusts_10m)+' km/h')+detail('🧭',tr('Wind'),round(c.wind_speed_10m)+' km/h '+windDir(c.wind_direction_10m));
    renderCompactForecast(hours,days);
    renderWind();renderStorms();if(state.radar)renderRadarBase();$('wp-error').hidden=true;
}
function detail(ic,label,value){return `<div class="wp-detail"><span>${ic}</span><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;}
function updateSun(sr,ss){const el=$('wp-sun-position');if(!sr||!ss||!el)return;const a=new Date(sr).getTime(),b=new Date(ss).getTime(),n=Date.now();const p=Math.max(0,Math.min(1,(n-a)/(b-a)));el.style.left=(p*100)+'%';el.classList.toggle('night',n<a||n>b);}
function compactHours(hours){
    const indexes=[0,1,2,3,5,7,9,12,15,18,21];
    return indexes.map(i=>hours[i]).filter(Boolean);
}
function renderCompactForecast(hours,days){
    const sample=compactHours(hours);
    const hourly=$('wp-hourly-compact'),daily=$('wp-daily-compact');
    if(hourly)hourly.innerHTML=sample.map(h=>`<article class="wp-hour-mini"><time>${fmtTime(h.time)}</time><div class="wp-mini-icon">${icon(h.code,1)}</div><strong>${round(h.temperature)}°</strong><small>🌧 ${round(h.prob)}%</small></article>`).join('');
    if(daily)daily.innerHTML=days.slice(0,7).map(d=>`<article class="wp-day-mini"><time>${esc(fmtDay(d.time))}</time><div class="wp-mini-icon">${icon(d.code,1)}</div><strong>${round(d.max)}°/${round(d.min)}°</strong><small>🌧 ${round(d.prob)}% · 💨 ${round(d.wind)} km/h</small></article>`).join('');
    renderTemperatureTrend(sample);
}
function renderTemperatureTrend(rows){
    const svg=$('wp-temperature-trend');if(!svg||!rows.length)return;
    const values=rows.map(r=>Number(r.temperature)).filter(Number.isFinite);if(!values.length){svg.innerHTML='';return;}
    const min=Math.min(...values),max=Math.max(...values),range=Math.max(2,max-min),left=28,right=972,top=18,bottom=98;
    const pts=rows.map((r,i)=>{const x=left+(right-left)*(i/Math.max(1,rows.length-1)),y=bottom-((Number(r.temperature)-min)/range)*(bottom-top);return{x,y,t:Number(r.temperature),label:fmtTime(r.time)}});
    const path=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
    const area=`M ${pts[0].x} ${bottom} `+pts.map((p,i)=>(i?'L':'L')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')+` L ${pts[pts.length-1].x} ${bottom} Z`;
    svg.innerHTML=`<path d="${area}" fill="color-mix(in srgb, var(--color-primary-element) 20%, transparent)"></path><path d="${path}" fill="none" stroke="var(--color-primary-element)" stroke-width="3" vector-effect="non-scaling-stroke"></path>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="var(--color-primary-element)"></circle><text x="${p.x}" y="${Math.max(12,p.y-8)}" text-anchor="middle" font-size="12" fill="currentColor">${round(p.t)}°</text>`).join('')}`;
    if($('wp-trend-range'))$('wp-trend-range').textContent=`${round(min)}–${round(max)} °C · ${tr('1 h → 2–3 h steps')}`;
}

function floatingLocationBox(){return $('wp-floating-location-results');}
function hideFloatingLocationResults(){const f=floatingLocationBox();if(!f)return;f.hidden=true;f.setAttribute('aria-hidden','true');f.innerHTML='';state.floatingLocationAnchor=null;}
function positionFloatingLocationResults(){const f=floatingLocationBox(),anchor=state.floatingLocationAnchor;if(!f||f.hidden||!anchor)return;const r=anchor.getBoundingClientRect(),vp=viewportBox(),margin=10;const width=Math.min(Math.max(r.width,320),Math.max(220,vp.width-margin*2));let left=Math.max(vp.left+margin,Math.min(r.left,vp.left+vp.width-width-margin));const below=r.bottom+6,above=r.top-6;const maxBelow=Math.max(120,vp.top+vp.height-below-margin);const desired=Math.min(300,Math.max(120,f.scrollHeight||180));let top=below,maxHeight=maxBelow;if(maxBelow<160&&above-vp.top>maxBelow){maxHeight=Math.max(120,above-vp.top-margin);top=Math.max(vp.top+margin,above-Math.min(desired,maxHeight));}f.style.left=left+'px';f.style.top=top+'px';f.style.width=width+'px';f.style.maxHeight=Math.min(300,maxHeight)+'px';}
function showFloatingLocationResults(anchor,html){const f=floatingLocationBox();if(!f||!anchor)return;state.floatingLocationAnchor=anchor;f.innerHTML=html;f.hidden=false;f.setAttribute('aria-hidden','false');positionFloatingLocationResults();}

async function searchLocations(){const input=$('wp-location-search'),inline=$('wp-location-results');if(!input)return;const q=input.value.trim();if(inline)inline.innerHTML='';if(q.length<2){hideFloatingLocationResults();return;}try{const d=await api('/api/geocode?q='+encodeURIComponent(q)+'&lang='+encodeURIComponent(navigator.language||'en'));const html=(d.results||[]).map((x,i)=>`<button type="button" data-location-index="${i}"><strong>${esc(x.name)}</strong><small>${esc(x.label)}</small></button>`).join('')||'<div class="wp-muted">'+esc(tr('Nothing found'))+'</div>';showFloatingLocationResults(input,html);floatingLocationBox()?.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>selectManual(d.results[i])));}catch(e){showFloatingLocationResults(input,'<div class="wp-error-inline">'+esc(e.message)+'</div>');}}
function selectManual(x){state.selectedManual=x;$('wp-location-search').value='';$('wp-location-results').innerHTML='';hideFloatingLocationResults();document.querySelector('input[name="location-mode"][value="manual"]').checked=true;renderSelectedManual();toggleManual();}
async function searchAdminLocations(){const input=$('wp-admin-location-search'),box=$('wp-admin-location-results');if(!input)return;const q=input.value.trim();if(box)box.innerHTML='';if(q.length<2){hideFloatingLocationResults();return;}try{const d=await api('/api/geocode?q='+encodeURIComponent(q)+'&lang='+encodeURIComponent(navigator.language||'en'));const html=(d.results||[]).map((x,i)=>`<button type="button" data-admin-location-index="${i}"><strong>${esc(x.name)}</strong><small>${esc(x.label)}</small></button>`).join('')||'<div class="wp-muted">'+esc(tr('Nothing found'))+'</div>';showFloatingLocationResults(input,html);floatingLocationBox()?.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>selectAdminLocation(d.results[i])));}catch(e){showFloatingLocationResults(input,'<div class="wp-error-inline">'+esc(e.message)+'</div>');}}
function selectAdminLocation(x){if(!x)return;$('wp-admin-name').value=x.label||x.name||tr('Default location');$('wp-admin-lat').value=x.latitude;$('wp-admin-lon').value=x.longitude;$('wp-admin-timezone').value=x.timezone||'auto';const input=$('wp-admin-location-search'),box=$('wp-admin-location-results');if(input)input.value='';if(box)box.innerHTML='';hideFloatingLocationResults();renderAdminCurrent();}
function renderSelectedManual(){updateUserDefaultSummary();if(!state.selectedManual){$('wp-selected-location').innerHTML='<span class="wp-muted">'+esc(tr('Search and select your own location.'))+'</span>';return;}const x=state.selectedManual;$('wp-selected-location').innerHTML=`<strong>📍 ${esc(x.label||x.name)}</strong><small>${round(x.latitude,4)}, ${round(x.longitude,4)}</small><button type="button" class="wp-map-link">🗺️ ${esc(tr('Show on map'))}</button>`;$('wp-selected-location').querySelector('.wp-map-link')?.addEventListener('click',()=>openExternalMap(x));}
function renderUserMapySettings(){if($('wp-user-mapy-key-status')){const sStatus=state.settings?.coreMapyApiConfigured?tr('Shared App Core has a working Mapy.com API key.'):tr('Mapy.com API key is not configured in Shared App Core.');$('wp-user-mapy-key-status').textContent=sStatus;}}
async function saveActiveSettings(){if(state.settingsTab==='admin')return saveAdmin();return saveSettings();}
async function saveSettings(){const sMode=document.querySelector('input[name="location-mode"]:checked')?.value||'admin';const oLocation=state.selectedManual||{};const oBody={locationMode:sMode,locationName:oLocation.label||oLocation.name||'',latitude:oLocation.latitude!==undefined?String(oLocation.latitude):'',longitude:oLocation.longitude!==undefined?String(oLocation.longitude):'',timezone:oLocation.timezone||'auto',savedLocations:state.savedLocations,widgetFields:[...document.querySelectorAll('[data-widget-field]:checked')].map(oItem=>oItem.value)};try{await api('/api/settings',{method:'PUT',body:JSON.stringify(oBody)});state.settings=await api('/api/settings');await refreshCoreMapProviderState();renderUserMapySettings();refreshMapProviderOptions();closeSettings();await resolveLocationAndLoad();}catch(oError){showError(oError);}}
function saveCurrentLocation(){const l=state.currentLocation;if(!l)return;const label=prompt(tr('Saved place name:'),l.name||tr('My place'));if(!label)return;state.savedLocations.push({name:label,latitude:l.latitude,longitude:l.longitude,timezone:l.timezone||'auto'});state.savedLocations=state.savedLocations.slice(0,20);renderSavedLocations();}
function renderSavedLocations(){$('wp-saved-locations').innerHTML=state.savedLocations.length?state.savedLocations.map((x,i)=>`<div class="wp-saved-row"><button type="button" data-map-saved="${i}" title="${esc(tr('Show on map'))}">📍 <strong>${esc(x.name)}</strong></button><button type="button" data-use-saved="${i}" title="${esc(tr('Use this location'))}">${esc(tr('Use'))}</button><button type="button" data-remove-saved="${i}" aria-label="${esc(tr('Remove'))}">×</button></div>`).join(''):'<div class="wp-muted">'+esc(tr('You have no saved locations yet.'))+'</div>';$('wp-saved-locations').querySelectorAll('[data-map-saved]').forEach(b=>b.addEventListener('click',()=>openExternalMap(state.savedLocations[Number(b.dataset.mapSaved)])));$('wp-saved-locations').querySelectorAll('[data-use-saved]').forEach(b=>b.addEventListener('click',()=>{state.selectedManual=state.savedLocations[Number(b.dataset.useSaved)];document.querySelector('input[name="location-mode"][value="manual"]').checked=true;renderSelectedManual();toggleManual();updateUserDefaultSummary();}));$('wp-saved-locations').querySelectorAll('[data-remove-saved]').forEach(b=>b.addEventListener('click',()=>{state.savedLocations.splice(Number(b.dataset.removeSaved),1);renderSavedLocations();}));}
function positionLocationPopover(){const p=$('wp-location-popover'),anchor=window.matchMedia('(max-width:760px)').matches?$('wp-mobile-menu'):$('wp-location-button');if(!p||p.hidden||!anchor)return;const r=anchor.getBoundingClientRect(),vp=viewportBox(),margin=10,width=Math.min(360,Math.max(220,vp.width-margin*2)),left=Math.max(vp.left+margin,Math.min(r.right-width,vp.left+vp.width-width-margin)),estimated=Math.min(420,Math.max(120,p.offsetHeight||220)),top=Math.max(vp.top+margin,Math.min(r.bottom+8,vp.top+vp.height-estimated-margin));p.style.width=width+'px';p.style.left=left+'px';p.style.top=top+'px';}
function hideLocationPopover(restore=false){const p=$('wp-location-popover');if(!p)return;p.hidden=true;p.setAttribute('aria-hidden','true');if(restore)$('wp-location-button')?.focus();}
function toggleLocationPopover(){const p=$('wp-location-popover');if(!p)return;if(!p.hidden){hideLocationPopover(false);return;}setWeatherMobileNav(false);const rows=[`<button type="button" data-location-kind="default">🏠 ${esc(state.settings?.adminDefault?.name||tr('Default'))}</button>`,`<button type="button" data-location-kind="device">📍 ${esc(tr('Current device location'))}</button>`,...state.savedLocations.map((x,i)=>`<button type="button" data-saved="${i}">⭐ ${esc(x.name)}</button>`)];p.innerHTML=rows.join('');p.hidden=false;p.setAttribute('aria-hidden','false');requestAnimationFrame(positionLocationPopover);p.querySelector('[data-location-kind="default"]')?.addEventListener('click',()=>{hideLocationPopover(false);loadWeather({...state.settings.adminDefault,source:'admin'});});p.querySelector('[data-location-kind="device"]')?.addEventListener('click',async()=>{hideLocationPopover(false);try{await loadWeather(await deviceLocation());}catch(e){showError(e);}});p.querySelectorAll('[data-saved]').forEach(b=>b.addEventListener('click',()=>{hideLocationPopover(false);loadWeather({...state.savedLocations[Number(b.dataset.saved)],source:'saved'});}));}
async function loadAdminSettings(){try{const a=await api('/api/admin/settings');$('wp-admin-section').hidden=state.settingsTab!=='admin';$('wp-settings-admin-tab').hidden=false;if($('wp-open-admin-location')){$('wp-open-admin-location').hidden=false;}$('wp-admin-name').value=a.name||'';$('wp-admin-lat').value=a.latitude??'';$('wp-admin-lon').value=a.longitude??'';$('wp-admin-timezone').value=a.timezone||'auto';if($('wp-mapy-key-status'))$('wp-mapy-key-status').textContent=(state.settings?.coreMapyApiConfigured||a.mapyApiConfigured)?tr('Mapy.com API key is configured in Shared App Core.'):tr('Mapy.com API key is not configured.');if($('wp-admin-mapy-key'))$('wp-admin-mapy-key').value='';if($('wp-admin-mapy-clear'))$('wp-admin-mapy-clear').checked=false;renderAdminCurrent();}catch(_){$('wp-admin-section').hidden=true;if($('wp-settings-admin-tab'))$('wp-settings-admin-tab').hidden=true;if($('wp-open-admin-location'))$('wp-open-admin-location').hidden=true;}}
function renderAdminCurrent(){const el=$('wp-admin-current-location');if(!el)return;const l=state.currentLocation;if(!l){el.textContent=tr('Current location is not loaded.');return;}el.textContent=`${l.name||tr('Current location')} · ${round(l.latitude,5)}, ${round(l.longitude,5)}`;}
async function saveAdminPayload(payload){await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(payload)});state.settings=await api('/api/settings');await refreshCoreMapProviderState();$('wp-admin-default-label').textContent='('+state.settings.adminDefault.name+')';}
async function saveAdmin(){const sMapyApiKey=$('wp-admin-mapy-key')?.value||'';try{if(sMapyApiKey.trim())await offerMapyKeyToCore(sMapyApiKey,true);await saveAdminPayload({name:$('wp-admin-name').value||tr('Default location'),latitude:Number($('wp-admin-lat').value),longitude:Number($('wp-admin-lon').value),timezone:$('wp-admin-timezone').value||'auto',mapyApiKey:sMapyApiKey,clearMapyApiKey:Boolean($('wp-admin-mapy-clear')?.checked)});if($('wp-admin-mapy-key'))$('wp-admin-mapy-key').value='';if($('wp-admin-mapy-clear'))$('wp-admin-mapy-clear').checked=false;await loadAdminSettings();renderUserMapySettings();refreshMapProviderOptions();closeSettings();await resolveLocationAndLoad();}catch(oError){alert(oError.message);}}
async function saveAdminFromCurrent(){const l=state.currentLocation;if(!l){alert(tr('Load the requested location first.'));return;}try{await saveAdminPayload({name:l.name||tr('Default location'),latitude:Number(l.latitude),longitude:Number(l.longitude),timezone:l.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'auto',mapyApiKey:'',clearMapyApiKey:false});$('wp-admin-name').value=l.name||tr('Default location');$('wp-admin-lat').value=l.latitude;$('wp-admin-lon').value=l.longitude;$('wp-admin-timezone').value=l.timezone||'auto';await loadAdminSettings(); updateUserDefaultSummary(); alert(tr('The active location was set as the default for all users without their own settings.'));}catch(e){alert(e.message);}}

function openExternalMap(loc){if(!loc)return;const lat=Number(loc.latitude),lon=Number(loc.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;window.open(`https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=14/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`,'_blank','noopener,noreferrer');}
function openMapProvider(provider,kind){kind=kind==='weather'?(activeMapKind()||'radar'):kind;const spec=getMapSpec(kind),lat=Number(spec.lat),lon=Number(spec.lon),z=Math.max(2,Math.min(20,Math.round(spec.zoom||10)));if(!Number.isFinite(lat)||!Number.isFinite(lon))return;if(provider!=='mapy')return;const url=`https://mapy.com/fnc/v1/showmap?mapset=basic&center=${encodeURIComponent(lon+','+lat)}&zoom=${z}&marker=true`;window.open(url,'_blank','noopener,noreferrer');}
const RANGE_ZOOM={200:7,700:6,2000:5,5000:4};
const MAP_ZOOM_LIMITS={radar:{min:3,max:10},wind:{min:3,max:10},storms:{min:3,max:10},aladin:{min:3,max:10}};
const RADAR_NATIVE_ZOOM={min:1,max:7};
function currentCenter(){const lat=Number(state.currentLocation?.latitude),lon=Number(state.currentLocation?.longitude);return{lat:Number.isFinite(lat)?lat:49,lon:Number.isFinite(lon)?lon:15};}
function resetCoreMapsForHome(){
    stopLocationTracking();
    try{state.coreMapControllers.weather?.destroy?.();}catch(_){}
    state.coreMapControllers={};state.coreWeatherLayersRegistered=false;
    state.coreMapDrivers={};
}

function getHomeLocation(){
    const c=currentCenter();
    return {lat:c.lat,lon:c.lon,zoom:Math.max(7,Number(getMapSpec(state.activeMapLayer||'radar')?.zoom)||7)};
}
function isSamePoint(a,b,eps=0.0002){
    return a&&b&&Math.abs(Number(a.lat)-Number(b.lat))<eps&&Math.abs(Number(a.lon)-Number(b.lon))<eps;
}
function clearMapPick(kind,render=true){
    state.mapPicks[kind]=null;
    state.mapInfoMode[kind]='active';
    if(render)renderMapKind(kind,true);
}
function resetMapView(kind,render=false){const c=currentCenter(),radius=state.mapRanges[kind]||200;state.mapViews.weather={lat:c.lat,lon:c.lon,zoom:RANGE_ZOOM[radius]||6};if(render){renderMapKind(kind,true);emitWeatherMapDriver(kind,'moveend');}}
function clampMapZoom(kind,zoom){const lim=MAP_ZOOM_LIMITS[kind]||{min:2,max:10};return Math.max(lim.min,Math.min(lim.max,Number.isFinite(Number(zoom))?Number(zoom):6));}
function getMapSpec(kind){if(!state.mapViews.weather)resetMapView(kind,false);state.mapViews.weather.zoom=clampMapZoom(kind,state.mapViews.weather.zoom);return state.mapViews.weather;}
function setMapRange(kind,radius){radius=[200,700,2000,5000].includes(Number(radius))?Number(radius):200;state.mapRanges[kind]=radius;document.querySelectorAll(`[data-map-range-group="${kind}"] [data-map-range]`).forEach(b=>b.classList.toggle('active',Number(b.dataset.mapRange)===radius));resetMapView(kind,false);if(kind==='wind'||kind==='storms'){state.mapFields={};if(kind==='wind'){stopWindPlay();ensureWindMap(true);}else{stopStormPlay();ensureStormMap(true);}}else{renderMapKind(kind,true);emitWeatherMapDriver(kind,'moveend');}}
function changeMapZoom(kind,delta,notify=true){kind=sharedMapLayer(kind);const v=getMapSpec(kind),next=clampMapZoom(kind,v.zoom+delta);if(next===v.zoom)return;v.zoom=next;renderMapKind(kind,true);if(notify)emitWeatherMapDriver(kind,'zoomend');}
function zoomMapAt(kind,delta,clientX,clientY,notify=true,focusPointer=false){
    kind=sharedMapLayer(kind);
    const map=mapElement(kind),v=getMapSpec(kind),next=clampMapZoom(kind,v.zoom+delta);
    if(next===v.zoom)return;
    const rect=map?.getBoundingClientRect();
    if(!rect?.width||!rect?.height||!Number.isFinite(clientX)||!Number.isFinite(clientY)){changeMapZoom(kind,delta,notify);return;}
    const dx=clientX-rect.left-rect.width/2,dy=clientY-rect.top-rect.height/2;
    const tile=tileXY(v.lat,v.lon,v.zoom),scale=2**(next-v.zoom);
    // The mouse wheel moves the pointed place to the center; pinch keeps its midpoint in place.
    const center=focusPointer
        ? tileLonLat(tile.x+dx/256,tile.y+dy/256,v.zoom)
        : tileLonLat((tile.x+dx/256)*scale-dx/256,(tile.y+dy/256)*scale-dy/256,next);
    notifyManualMapPan(kind);
    state.mapViews.weather={...center,zoom:next};
    renderMapKind(kind,true);
    if(notify){emitWeatherMapDriver(kind,'zoomend');emitWeatherMapDriver(kind,'moveend');}
}
function tileLonLat(x,y,z){const n=2**z,lon=x/n*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;return{lat:Math.max(-85,Math.min(85,lat)),lon:((lon+540)%360)-180};}
function weatherMapBounds(spec,map){
    const w=map?.clientWidth||900,h=map?.clientHeight||420,c=tileXY(spec.lat,spec.lon,spec.zoom);
    const nw=tileLonLat(c.x-w/512,c.y-h/512,spec.zoom),se=tileLonLat(c.x+w/512,c.y+h/512,spec.zoom);
    return{north:nw.lat,south:se.lat,east:se.lon,west:nw.lon};
}
function emitWeatherMapDriver(kind,event){
    const driver=state.coreMapDrivers.weather||state.coreMapDrivers[kind];
    if(!driver)return;
    driver.emit(event);
}
function createWeatherMapDriver(kind,map){
    const listeners={movestart:new Set(),moveend:new Set(),zoomstart:new Set(),zoomend:new Set()};
    const driver={
        getCenter(){const s=getMapSpec(activeMapKind()||kind);return{lat:Number(s.lat)||0,lon:Number(s.lon)||0};},
        getZoom(){return Number(getMapSpec(activeMapKind()||kind).zoom)||6;},
        getBounds(){return weatherMapBounds(getMapSpec(activeMapKind()||kind),map);},
        setView(center,zoom){const sLayer=activeMapKind()||kind;const next={lat:Number(center.lat),lon:Number(center.lon),zoom:clampMapZoom(sLayer,Number.isFinite(Number(zoom))?Number(zoom):getMapSpec(sLayer).zoom)};state.mapViews.weather=next;if(isSamePoint(next,currentCenter()))clearMapPick(sLayer,false);scheduleMapRender(true);driver.emit('moveend');},
        zoomIn(){driver.emit('zoomstart');changeMapZoom(activeMapKind()||kind,1,false);driver.emit('zoomend');},
        zoomOut(){driver.emit('zoomstart');changeMapZoom(activeMapKind()||kind,-1,false);driver.emit('zoomend');},
        invalidateSize(){scheduleMapRender(true);},
        setRotation(degrees){state.coreMapRotations.weather=Number(degrees)||0;map?.style?.setProperty('--wp-map-rotation',String(state.coreMapRotations.weather));},
        on(event,listener){listeners[event]?.add(listener);},
        off(event,listener){listeners[event]?.delete(listener);},
        emit(event){for(const fn of listeners[event]||[])try{fn();}catch(e){console.warn('[Weather] Core map driver listener failed:',e);}},
        destroy(){Object.values(listeners).forEach(s=>s.clear());}
    };
    return driver;
}

function registerCoreWeatherLayers(oController){
    if(!oController||state.coreWeatherLayersRegistered)return;
    const aLayers=[
        {
            id:'hc_weather:radar',
            attach(){},
            update(){if(layerIsVisible('radar')&&state.radar){scheduleMapRender();}},
            detach(){},
            destroy(){}
        },
        {
            id:'hc_weather:wind',
            attach(){},
            update(){if(layerIsVisible('wind'))scheduleMapRender();},
            detach(){},
            destroy(){stopWindAnimation();}
        },
        {
            id:'hc_weather:storms',
            attach(){},
            update(){if(layerIsVisible('storms'))scheduleMapRender();},
            detach(){},
            destroy(){stopStormPlay();}
        },
        {
            id:'hc_weather:aladin',
            attach(){},
            update(){if(layerIsVisible('aladin'))scheduleMapRender();},
            detach(){},
            destroy(){stopAladinPlay();}
        }
    ];
    aLayers.forEach(oLayer=>{
        try{Promise.resolve(oController.addLayer?.(oLayer)).catch(oError=>console.warn('[Weather] Core layer failed:',oLayer.id,oError));}catch(oError){console.warn('[Weather] Core map layer registration failed:',oLayer.id,oError);}
    });
    state.coreWeatherLayersRegistered=true;
}

function updateLocationFollowUi(){
    const button=$('wp-map-follow');
    if(!button)return;
    const tracking=!!state.locationTracker;
    const following=!!state.locationFollow?.isEnabled?.();
    button.classList.toggle('active',following);
    button.dataset.tracking=tracking?'1':'0';
    button.setAttribute('aria-pressed',following?'true':'false');
    if(state.locationTrackingError){
        button.title=tr('Location tracking error')+': '+state.locationTrackingError;
    }else if(following){
        button.title=tr('Following my location. Drag the map to stop following; zoom keeps following enabled.');
    }else if(tracking){
        button.title=tr('Location tracking is active. Click to follow my location again.');
    }else{
        button.title=tr('Follow my location');
    }
}
function locationMarkerPoint(){
    const live=state.deviceLocationSample?.point;
    if(live&&Number.isFinite(Number(live.lat))&&Number.isFinite(Number(live.lon)))return{lat:Number(live.lat),lon:Number(live.lon),live:true};
    if(state.currentLocation)return{lat:Number(state.currentLocation.latitude),lon:Number(state.currentLocation.longitude),live:false};
    return null;
}
function refreshLiveLocationMarker(){
    if(state.activeTab!=='map')return;
    const layer=state.activeMapLayer||'radar',map=mapElement(layer),marker=mapMarkerElement(layer);
    if(map&&marker)positionUserMarker(map,marker,getMapSpec(layer));
}
function showLocationTrackingError(error){
    const code=error?.code||'position_unavailable';
    const message=error?.message||tr('Device location is unavailable.');
    const duplicate=state.locationTrackingError===code+': '+message;
    state.locationTrackingError=code+': '+message;
    updateLocationFollowUi();
    if(duplicate)return;
    const text=tr('Location tracking failed')+': '+message;
    if(Core?.notifications?.error)Core.notifications.error(text);else console.warn('[Weather]',text);
}
function stopLocationTracking(keepError=false){
    const previousError=state.locationTrackingError;
    try{state.locationFollow?.destroy?.();}catch(error){console.warn('[Weather] Location follow cleanup failed:',error);}
    state.locationFollow=null;
    try{state.locationAbortController?.abort?.();}catch(_){ }
    state.locationAbortController=null;
    try{state.locationTracker?.destroy?.();}catch(error){console.warn('[Weather] Location tracker cleanup failed:',error);}
    state.locationTracker=null;
    state.deviceLocationSample=null;
    state.locationTrackingError=keepError?previousError:null;
    updateLocationFollowUi();
}
function startLocationTracking(recenter=true){
    const maps=Core?.maps;
    if(typeof maps?.watchLocation!=='function'||typeof maps?.followLocation!=='function'){
        showLocationTrackingError({code:'unsupported',message:tr('Shared App Core location tracking is not available.')});
        return null;
    }
    const controller=setupCoreMap(state.activeMapLayer||'radar');
    if(!controller){
        showLocationTrackingError({code:'position_unavailable',message:tr('Map controller is not available.')});
        return null;
    }
    if(state.locationTracker&&state.locationFollow){
        state.locationTrackingError=null;
        if(recenter)state.locationFollow.enable();
        updateLocationFollowUi();
        refreshLiveLocationMarker();
        return state.locationFollow;
    }
    stopLocationTracking();
    const abortController=new AbortController();
    state.locationAbortController=abortController;
    try{
        let tracker=null;
        tracker=maps.watchLocation({
            enableHighAccuracy:true,
            timeoutMs:10000,
            maximumAgeMs:5000,
            minIntervalMs:1000,
            minDistanceM:2,
            signal:abortController.signal,
            onPosition(sample){
                state.deviceLocationSample=sample;
                state.locationTrackingError=null;
                refreshLiveLocationMarker();
                updateLocationFollowUi();
            },
            onError(error){
                showLocationTrackingError(error);
                if(error?.code==='permission_denied'||error?.code==='unsupported')queueMicrotask(()=>{if(state.locationTracker===tracker)stopLocationTracking(true);});
            },
        });
        state.locationTracker=tracker;
        state.locationFollow=maps.followLocation(controller,tracker,{keepZoom:true,disableOnManualPan:true,recenterOnStart:true});
        if(recenter)state.locationFollow.enable();
        updateLocationFollowUi();
        return state.locationFollow;
    }catch(error){
        stopLocationTracking();
        showLocationTrackingError({code:'position_unavailable',message:error instanceof Error?error.message:String(error)});
        return null;
    }
}
function notifyManualMapPan(kind){
    const controller=state.coreMapControllers.weather||state.coreMapControllers[kind];
    try{controller?.notifyManualPan?.();}catch(error){console.warn('[Weather] Core manual pan notification failed:',error);}
    updateLocationFollowUi();
}

function setupCoreMap(kind){
    const api=Core?.maps;
    const sLayer=sharedMapLayer(kind);
    if(!api?.mount)return null;
    const oMap=mapElement(sLayer);
    if(!oMap)return null;
    if(state.coreMapControllers.weather)return state.coreMapControllers.weather;
    if(state.coreMapMounting)return null;
    const spec=getMapSpec(sLayer),driver=createWeatherMapDriver(sLayer,oMap),home=currentCenter();
    state.coreMapDrivers.weather=driver;
    state.coreMapMounting=true;
    try{
        const controller=api.mount(oMap,{driver,center:{lat:spec.lat,lon:spec.lon},zoom:spec.zoom,home,controls:{zoom:true,home:true,gps:false,compass:false},compassOverlay:false});
        state.coreMapControllers.weather=controller;
        registerCoreWeatherLayers(controller);
        controller.on?.('viewportChanged',vp=>{state.coreMapRotations.weather=Number(vp?.rotationDeg)||0;});
        controller.on?.('headingChanged',oHeading=>{if(oHeading?.mapRotation!==undefined)oMap.style.setProperty('--wp-map-rotation',String(oHeading.mapRotation));});
        updateLocationFollowUi();
        return controller;
    }catch(e){driver.destroy();delete state.coreMapDrivers.weather;console.warn('[Weather] Core Maps mount failed:',e);return null;}finally{state.coreMapMounting=false;}
}
function setupAllCoreMaps(){setupCoreMap(activeMapKind()||'radar');}

// Driver callbacks must never mount Core: mount itself calls driver.setView().
// One queued paint coalesces setView, resize and Core layer updates.
let mapResetPending=false;
function scheduleMapRender(reset=false){
    mapResetPending=mapResetPending||reset;
    if(state.mapRenderRaf!==null||!activeMapKind())return;
    state.mapRenderRaf=requestAnimationFrame(()=>{
        state.mapRenderRaf=null;
        const reset=mapResetPending;mapResetPending=false;
        const kind=activeMapKind();if(kind)renderMapKind(kind,reset);
    });
}
function renderMapKind(kind,reset=false){
    if(activeMapKind()!==kind)return;
    renderOsmBase(mapElement(kind),mapBaseElement(kind),getMapSpec(kind),kind);
    positionUserMarker(mapElement(kind),mapMarkerElement(kind),getMapSpec(kind));
    if(layerIsVisible('radar')){
        if(state.radar)showRadarFrame(state.radarIndex);
        else if(!state.radarRequest)void ensureRadar();
    }
    if(layerIsVisible('wind'))renderWindMap(reset);
    if(layerIsVisible('storms'))renderStormMapFrame();
    if(layerIsVisible('aladin'))renderAladinMapFrame();
    if(['wind','storms'].some(layer=>layerIsVisible(layer)&&!state.mapFields[mapFieldKey(layer)])){
        clearTimeout(state.mapDataTimer);
        state.mapDataTimer=setTimeout(()=>{for(const layer of ['wind','storms'])if(layerIsVisible(layer)&&!state.mapFields[mapFieldKey(layer)])ensureActiveMapLayerData(layer);},400);
    }
    if(layerIsVisible('aladin')&&!aladinCachedField())scheduleAladinFieldLoad();
}
function applyMapStyle(base,kind){if(!base)return;base.classList.remove('wp-map-light','wp-map-dark');const st=state.mapStyles[sharedMapKey(kind)]||state.mapStyles[kind]||'osm';if(st==='osm-light')base.classList.add('wp-map-light');if(st==='osm-dark')base.classList.add('wp-map-dark');}
function projectPoint(lat,lon,spec,w,h){const c=tileXY(spec.lat,spec.lon,spec.zoom),p=tileXY(lat,lon,spec.zoom);const n=2**spec.zoom,dx=((p.x-c.x+n/2)%n+n)%n-n/2;return{x:w/2+dx*256,y:h/2+(p.y-c.y)*256};}
function fillTileTemplate(sTemplate,nZoom,nX,nY){return String(sTemplate).replace('{z}',encodeURIComponent(String(nZoom))).replace('{x}',encodeURIComponent(String(nX))).replace('{y}',encodeURIComponent(String(nY)));}
function isCoreMapProviderUsable(sProvider,sMapset){
    if(sProvider!=='mapy')return true;
    const oMapy=state.settings?.coreMapyProvider||null;
    const aMapsets=Array.isArray(oMapy?.mapsets)?oMapy.mapsets:[];
    return !!(oMapy?.enabled&&oMapy?.configured&&(!aMapsets.length||aMapsets.includes(sMapset)));
}
function coreTileTemplate(sProvider,sMapset){
    const oCore=Core||window.HcSharedAppCore;
    const fTemplate=oCore?.maps?.tileTemplate;
    if(typeof fTemplate!=='function')throw new Error('Core maps.tileTemplate is not available.');
    oCore?.assertCompatible?.(requiredCoreVersion());
    const sTemplate=fTemplate(sProvider,sMapset,256);
    if(!sTemplate)throw new Error('Core tileTemplate returned an empty URL template.');
    return String(sTemplate);
}
function ensureCoreTileLoader(){
    const oCore=Core||window.HcSharedAppCore;
    if(!state.coreTileLoader){
        if(typeof oCore?.maps?.createTileLoader!=='function')throw new Error('Core maps.createTileLoader is not available.');
        state.coreTileLoader=oCore.maps.createTileLoader();
    }
    return state.coreTileLoader;
}
// Each visible tile owns its request. Moving the viewport preserves overlapping tiles.
const baseTiles = new Map();
function releaseBaseTile(key, tile){
    tile.abort.abort();
    if(tile.blobUrl)URL.revokeObjectURL(tile.blobUrl);
    tile.img.remove();
    baseTiles.delete(key);
}
function clearBaseTileRequests(){
    for(const [key,tile] of baseTiles)releaseBaseTile(key,tile);
}
function tileUrl(kind,z,x,y){
    const sStyle=state.mapStyles[sharedMapKey(kind)]||state.mapStyles[kind]||'osm';
    let sProvider='osm',sMapset='basic';
    if(sStyle.startsWith('mapy-')){sProvider='mapy';sMapset=sStyle.slice(5)||'basic';}
    try{
        if(!isCoreMapProviderUsable(sProvider,sMapset))throw new Error('Map provider is disabled or not configured in Shared App Core.');
        const sTemplate=coreTileTemplate(sProvider,sMapset);
        const sUrl=fillTileTemplate(sTemplate,z,x,y);
        if(!sUrl.includes('/apps/hc_shared_app_core/api/v1/maps/tile/'))throw new Error('Tile URL does not use the Shared App Core map proxy.');
        if(/api\.mapy\.com|tile\.openstreetmap\.org|apikey=/i.test(sUrl))throw new Error('Unsafe external tile URL returned by Core.');
        return sUrl;
    }catch(oError){
        console.warn('[Weather] Core tile template failed:',oError);
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    }
}
function renderOsmBase(map,base,spec,kind){
    if(!map||!base||!map.clientWidth||!map.clientHeight)return;
    applyMapStyle(base,kind);
    const z=spec.zoom,t=tileXY(spec.lat,spec.lon,z),w=map.clientWidth,h=map.clientHeight,n=2**z;
    const wanted=new Set(), pending=[];
    // Request only the viewport; no multi-screen prefetch margin.
    for(let y=Math.floor(t.y-h/512);y<=Math.floor(t.y+h/512);y++){
        if(y<0||y>=n)continue;
        for(let rawX=Math.floor(t.x-w/512);rawX<=Math.floor(t.x+w/512);rawX++){
            const x=((rawX%n)+n)%n,sUrl=tileUrl(kind,z,x,y);
            const key=sUrl+':'+rawX;
            wanted.add(key);
            let tile=baseTiles.get(key);
            if(!tile){
                const img=document.createElement('img');img.alt='';img.draggable=false;
                img.dataset.coreTileUrl=sUrl;
                tile={img,abort:new AbortController(),blobUrl:null};
                baseTiles.set(key,tile);base.appendChild(img);
                pending.push({tile,sUrl,distance:(rawX-t.x)**2+(y-t.y)**2});
            }
            tile.img.style.left=(w/2+(rawX-t.x)*256)+'px';
            tile.img.style.top=(h/2+(y-t.y)*256)+'px';
        }
    }
    for(const [key,tile] of baseTiles)if(!wanted.has(key))releaseBaseTile(key,tile);
    // Center tiles first; Core controls concurrency and Retry-After handling.
    pending.sort((a,b)=>a.distance-b.distance).forEach(({tile,sUrl})=>{
        const oLoader=ensureCoreTileLoader();
        oLoader.load(sUrl,{signal:tile.abort.signal,onWait:seconds=>{base.dataset.retryAfter=String(seconds);}})
        .then(blob=>{if(tile.abort.signal.aborted)return;tile.blobUrl=URL.createObjectURL(blob);tile.img.src=tile.blobUrl;tile.img.dataset.loaded='1';})
        .catch(error=>{if(error?.name!=='AbortError'){tile.img.dataset.error=error.message;console.warn('[Weather] Tile failed:',error);}});
    });
    renderMapAttribution(kind,map);renderMapPick(kind,map,spec);
}
function renderMapAttribution(kind,map){let el=map.querySelector('.wp-map-attribution');if(!el){el=document.createElement('div');el.className='wp-map-attribution';map.appendChild(el);}const st=state.mapStyles[sharedMapKey(kind)]||state.mapStyles[kind]||'osm';if(st.startsWith('mapy-'))el.innerHTML='<a href="https://mapy.com" target="_blank" rel="noopener noreferrer">Mapy.com</a> · © Seznam.cz · © OpenStreetMap contributors';else el.innerHTML='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';if(layerIsVisible('aladin'))el.innerHTML+=' · <a href="https://www.chmi.cz/predpoved-pocasi/aladin/srazky" target="_blank" rel="noopener noreferrer">ČHMÚ ALADIN</a> / <a href="https://open-meteo.com/en/docs/chmi-api" target="_blank" rel="noopener noreferrer">Open‑Meteo</a>';}
function positionUserMarker(map,marker,spec){if(!map||!marker)return;const point=locationMarkerPoint();if(!point){marker.hidden=true;return;}const p=projectPoint(point.lat,point.lon,spec,map.clientWidth||900,map.clientHeight||420);marker.style.left=p.x+'px';marker.style.top=p.y+'px';marker.hidden=p.x<-20||p.x>(map.clientWidth+20)||p.y<-20||p.y>(map.clientHeight+20);marker.classList.toggle('wp-location-marker-live',point.live);marker.title=point.live?tr('Current device location'):tr('Selected location');}
function refreshMapProviderOptions(){const bMapyEnabled=coreMapProviderConfigured();document.querySelectorAll('[data-map-style]').forEach(oSelect=>{const sCurrent=state.mapStyles[oSelect.dataset.mapStyle]||'osm';oSelect.querySelectorAll('option[data-requires-mapy]').forEach(oOption=>oOption.disabled=!bMapyEnabled);if(!bMapyEnabled&&sCurrent.startsWith('mapy-')){state.mapStyles[oSelect.dataset.mapStyle]='osm';if(oSelect.dataset.mapStyle==='weather'){state.mapStyles.radar='osm';state.mapStyles.wind='osm';state.mapStyles.storms='osm';state.mapStyles.aladin='osm';}oSelect.value='osm';}else oSelect.value=sCurrent;});}
function selectMapPoint(kind,map,clientX,clientY){const r=map.getBoundingClientRect(),spec=getMapSpec(kind),c=tileXY(spec.lat,spec.lon,spec.zoom),tx=c.x+(clientX-r.left-r.width/2)/256,ty=c.y+(clientY-r.top-r.height/2)/256,p=tileLonLat(tx,ty,spec.zoom);state.mapPicks[kind]={lat:p.lat,lon:p.lon,name:'',weather:null,source:'map-click'};state.mapInfoMode[kind]='picked';renderMapKind(kind,true);}
function ensureMapPickUi(kind,map){let marker=map.querySelector('.wp-picked-marker');if(!marker){marker=document.createElement('div');marker.className='wp-picked-marker';marker.textContent='🎯';map.appendChild(marker);}let card=map.querySelector('.wp-map-click-card');if(!card){card=document.createElement('div');card.className='wp-map-click-card';card.addEventListener('pointerdown',e=>e.stopPropagation());card.addEventListener('pointerup',e=>e.stopPropagation());map.appendChild(card);}return{marker,card};}
function weatherMini(w){const c=w?.current||{};return `<span>🌡️ <strong>${round(c.temperature_2m)}°C</strong></span><span>💧 ${round(c.relative_humidity_2m)} %</span><span>💨 ${round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</span><span>🌧️ ${round(c.precipitation,1)} mm</span>`;}
function renderMapPick(kind,map,spec){
    if(!map)return;
    const ui=ensureMapPickUi(kind,map),pick=state.mapPicks[kind];
    if(!pick){ui.marker.hidden=true;ui.card.hidden=true;return;}
    const q=projectPoint(pick.lat,pick.lon,spec,map.clientWidth||900,map.clientHeight||420);
    ui.marker.style.left=q.x+'px';ui.marker.style.top=q.y+'px';
    ui.marker.hidden=q.x<-20||q.x>map.clientWidth+20||q.y<-20||q.y>map.clientHeight+20;
    ui.card.hidden=false;
    const active=state.mapInfoMode[kind]==='active',shownWeather=active?state.weather:pick.weather;
    const activeName=state.currentLocation?.name||tr('Configured location');
    const pickName=pick.name||`${round(pick.lat,5)}, ${round(pick.lon,5)}`;
    ui.card.innerHTML=`<div class="wp-map-pick-heading"><div class="wp-map-pick-switch"><button type="button" data-pick-mode="active" class="${active?'active':''}">📍 ${esc(tr('Configured location'))}</button><button type="button" data-pick-mode="picked" class="${!active?'active':''}">🎯 ${esc(tr('Selected point'))}</button></div><button type="button" class="wp-map-pick-close" data-close-picked aria-label="${esc(tr('Close'))}" title="${esc(tr('Close'))}">×</button></div><strong>${esc(active?activeName:pickName)}</strong><small>${active?`${round(state.currentLocation?.latitude,5)}, ${round(state.currentLocation?.longitude,5)}`:`${round(pick.lat,5)}, ${round(pick.lon,5)}`}</small>${shownWeather?`<div class="wp-map-pick-weather">${weatherMini(shownWeather)}</div>`:(!active?`<button type="button" class="primary" data-load-picked-weather>${esc(tr('Load weather here'))}</button>`:'')}${!active?`<button type="button" data-clear-picked>${esc(tr('Cancel selected point'))}</button>`:''}`;
    ui.card.querySelectorAll('[data-pick-mode]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.mapInfoMode[kind]=b.dataset.pickMode;renderMapPick(kind,map,spec);}));
    ui.card.querySelector('[data-load-picked-weather]')?.addEventListener('click',e=>{e.stopPropagation();loadPickedWeather(kind);});
    const close=e=>{e.stopPropagation();clearMapPick(kind,false);renderMapPick(kind,map,spec);};
    ui.card.querySelector('[data-close-picked]')?.addEventListener('click',close);
    ui.card.querySelector('[data-clear-picked]')?.addEventListener('click',close);
}
async function loadPickedWeather(kind){const pick=state.mapPicks[kind];if(!pick)return;const map=mapElement(kind),card=map?.querySelector('.wp-map-click-card');if(card)card.classList.add('wp-loading-inline');try{const [w,r]=await Promise.all([api(`/api/weather?lat=${encodeURIComponent(pick.lat)}&lon=${encodeURIComponent(pick.lon)}&timezone=auto`),api(`/api/reverse?lat=${encodeURIComponent(pick.lat)}&lon=${encodeURIComponent(pick.lon)}`).catch(()=>({}))]);pick.weather=w;pick.name=r.label||r.name||'';state.mapInfoMode[kind]='picked';renderMapPick(kind,map,getMapSpec(kind));}catch(e){showError(e);}finally{card?.classList.remove('wp-loading-inline');}}


function setPlaybackButton(id,playing){
    const btn=$(id);
    if(!btn)return;
    btn.dataset.playing=playing?'1':'0';
    btn.classList.toggle('active',Boolean(playing));
    btn.innerHTML=playing?'⏸️ '+esc(tr('Pause')):'▶️ '+esc(tr('Play'));
    const baseTitle=id==='wp-radar-play'?tr('Play or pause radar animation'):id==='wp-wind-play'?tr('Play or pause wind forecast'):id==='wp-aladin-play'?tr('Play or pause ALADIN forecast'):tr('Play or pause storm forecast');
    btn.title=baseTitle;
    btn.setAttribute('aria-label',baseTitle);
}
function fieldLength(field){return Array.isArray(field?.times)?field.times.length:0;}
function safeNextIndex(current,total){return total>0?(Number(current)+1)%total:0;}

async function ensureRadar(force=false){
    if(state.radarRequest)return state.radarRequest;
    if(state.radar&&!force&&Date.now()-state.radarFetchedAt<180000){renderRadarBase();showRadarFrame(state.radarIndex);return state.radar;}
    const status=$('wp-radar-status');if(status){status.textContent=tr('Loading radar…');status.classList.remove('is-error');}
    state.radarRequest=(async()=>{
        try{
            const previous=state.radar?.frames?.[state.radarIndex],wasLatest=state.radarIndex===(state.radar?.frames?.length||0)-1;
            const data=await api('/api/radar');
            if(!Array.isArray(data.frames)||!data.frames.length)throw new Error(tr('No radar frames are available.'));
            state.radar=data;state.radarFetchedAt=Date.now();
            const selected=previous&&!wasLatest?data.frames.findIndex(frame=>frame.time===previous.time):-1;
            state.radarIndex=selected>=0?selected:data.frames.length-1;
            const slider=$('wp-radar-slider');if(slider){slider.max=data.frames.length-1;slider.value=state.radarIndex;}
            renderRadarBase();showRadarFrame(state.radarIndex);
            if(status){status.textContent=tr('Last 2 hours · 10 min step');status.classList.remove('is-error');}
            return data;
        }catch(error){state.radarFetchedAt=Date.now();if(status){status.textContent=tr('Could not load radar:')+' '+error.message;status.classList.add('is-error');}return null;}
    })().finally(()=>{state.radarRequest=null;});
    return state.radarRequest;
}
function tileXY(lat,lon,z){lat=Math.max(-85.05112878,Math.min(85.05112878,Number(lat)));const n=2**z;const x=(lon+180)/360*n;const r=lat*Math.PI/180;const y=(1-Math.asinh(Math.tan(r))/Math.PI)/2*n;return{x,y};}
function renderRadarBase(){if(!layerIsVisible('radar'))return;const map=mapElement('radar'),base=mapBaseElement('radar'),spec=getMapSpec('radar');renderOsmBase(map,base,spec,'radar');positionUserMarker(map,mapMarkerElement('radar'),spec);}
function pauseRadarRequests(){
    if(Date.now()<state.radarBlockedUntil)return;
    state.radarBlockedUntil=Date.now()+60000;
    state.radarTileQueue=[];stopRadar();
    const status=$('wp-radar-status');if(status){status.textContent=tr('Radar image could not be loaded.')+' '+tr('Retry in 1 minute.');status.classList.add('is-error');}
    clearTimeout(state.radarRetryTimer);
    state.radarRetryTimer=setTimeout(()=>{state.radarBlockedUntil=0;state.radarTileFailures=0;state.radarTileRetryAt.clear();if(layerIsVisible('radar'))void ensureRadar(true);},60000);
}
function pumpRadarTiles(){
    if(Date.now()<state.radarBlockedUntil)return;
    while(state.radarTileActive<2&&state.radarTileQueue.length){
        const job=state.radarTileQueue.shift(),img=job.img;
        if(!img.isConnected||img.dataset.tileKey!==job.key)continue;
        state.radarTileActive++;
        let finished=false;
        const finish=(failed,canceled=false)=>{
            if(finished)return;finished=true;img._radarFinish=null;img.onload=null;img.onerror=null;
            state.radarTileActive=Math.max(0,state.radarTileActive-1);
            if(failed){
                img.remove();state.radarTileRetryAt.set(job.key,Date.now()+15000);
                if(++state.radarTileFailures>=3)pauseRadarRequests();
                else {const status=$('wp-radar-status');if(status){status.textContent=tr('Radar image could not be loaded.')+' '+tr('Retrying…');status.classList.add('is-error');}clearTimeout(state.radarRetryTimer);state.radarRetryTimer=setTimeout(()=>{if(layerIsVisible('radar'))showRadarFrame(state.radarIndex);},15000);}
            } else if(!canceled){state.radarTileFailures=0;state.radarTileRetryAt.delete(job.key);const status=$('wp-radar-status');if(status?.classList.contains('is-error')){status.textContent=tr('Last 2 hours · 10 min step');status.classList.remove('is-error');}}
            pumpRadarTiles();
        };
        img._radarFinish=()=>finish(false,true);
        img.onload=()=>finish(false);
        img.onerror=()=>finish(true);
        img.src=job.url;
    }
}
function discardRadarTile(img){
    img._radarFinish?.();img.onload=null;img.onerror=null;img.removeAttribute('src');img.remove();
}
function showRadarFrame(idx){
    if(!layerIsVisible('radar')||!state.radar||!state.currentLocation)return;
    if(Date.now()-state.radarFetchedAt>=180000){if(!state.radarRequest)void ensureRadar(true);return;}
    const frames=state.radar.frames||[];if(!frames.length)return;
    idx=Math.max(0,Math.min(frames.length-1,idx));state.radarIndex=idx;
    const f=frames[idx],map=mapElement('radar'),layer=$('wp-radar-layer'),spec=getMapSpec('radar');
    if(!map||!layer)return;
    const mapZoom=Number(spec.zoom)||6;
    // One lower-resolution image covers four former tile requests at overview zoom.
    const radarZoom=Math.max(RADAR_NATIVE_ZOOM.min,Math.min(RADAR_NATIVE_ZOOM.max,Math.round(mapZoom)-2));
    const scale=Math.pow(2,mapZoom-radarZoom);
    const tileSize=256*scale;
    const t=tileXY(spec.lat,spec.lon,radarZoom),w=map.clientWidth||900,h=map.clientHeight||420;
    const n=2**radarZoom,wanted=new Set();
    const existing=new Map([...layer.children].map(img=>[img.dataset.tileKey,img]));
    state.radarTileQueue=[];
    for(let y=Math.floor(t.y-h/(2*tileSize));y<=Math.floor(t.y+h/(2*tileSize));y++){
        if(y<0||y>=n)continue;
        for(let rawX=Math.floor(t.x-w/(2*tileSize));rawX<=Math.floor(t.x+w/(2*tileSize));rawX++){
            const x=((rawX%n)+n)%n,key=`${f.path}:${radarZoom}:${rawX}:${y}`;
            wanted.add(key);let img=existing.get(key);
            if(!img){img=document.createElement('img');img.alt='';img.draggable=false;img.dataset.tileKey=key;layer.appendChild(img);}
            if(!img.hasAttribute('src')&&!img._radarFinish&&Date.now()>=state.radarBlockedUntil&&Date.now()>=(state.radarTileRetryAt.get(key)||0)){
                state.radarTileQueue.push({img,key,url:OC.generateUrl(`/apps/hc_weather/api/radar/tile/${f.time}/${radarZoom}/${x}/${y}`)});
            }
            img.style.left=(w/2+(rawX-t.x)*tileSize)+'px';img.style.top=(h/2+(y-t.y)*tileSize)+'px';
            img.style.width=tileSize+'px';img.style.height=tileSize+'px';
        }
    }
    for(const [key,img] of existing)if(!wanted.has(key))discardRadarTile(img);
    pumpRadarTiles();
    const d=new Date(f.time*1000);$('wp-radar-time').textContent=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});$('wp-radar-slider').value=idx;positionUserMarker(map,mapMarkerElement('radar'),spec);
}
function radarPlaybackIndices(total){const count=Math.min(3,total),indices=[];for(let i=0;i<count;i++)indices.push(Math.round(i*(total-1)/(count-1)));return indices;}
function toggleRadarPlay(){if(state.radarTimer){stopRadar();return;}if(Date.now()<state.radarBlockedUntil)return;if(!state.radar){ensureRadar().then(()=>{if(fieldLength({times:state.radar?.frames})>1)toggleRadarPlay();});return;}const total=Array.isArray(state.radar?.frames)?state.radar.frames.length:0;if(total<2)return;const indices=radarPlaybackIndices(total);setPlaybackButton('wp-radar-play',true);state.radarTimer=setInterval(()=>{const next=indices.find(index=>index>state.radarIndex)??indices[0];showRadarFrame(next);},2500);}
function stopRadar(){if(state.radarTimer){clearInterval(state.radarTimer);state.radarTimer=null;}setPlaybackButton('wp-radar-play',false);}
function parseMapTime(s){if(!s)return new Date();return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s+'Z');}
function mapFieldRequest(kind){
    const spec=getMapSpec(kind),map=mapElement(kind);
    const bounds=weatherMapBounds(spec,map);
    const extent=Math.max(Math.abs(bounds.north-spec.lat),Math.abs(spec.lat-bounds.south))*111;
    const widthKm=(map?.clientWidth||900)/256*360/(2**spec.zoom)*111*Math.cos(spec.lat*Math.PI/180)/2;
    const radius=[200,700,2000,5000].find(r=>r>=Math.max(extent,widthKm))||5000;
    const lat=Number(spec.lat.toFixed(1)),lon=Number(spec.lon.toFixed(1));
    return{lat,lon,radius,key:`${radius}:${lat}:${lon}`};
}
function mapFieldKey(kind){return mapFieldRequest(kind).key;}
async function loadMapField(kind){
    const {key,lat,lon,radius}=mapFieldRequest(kind);
    if(state.mapFields[key])return state.mapFields[key];
    if(!state.mapDataRequests[key]){
        state.mapDataRequests[key]=api(`/api/map-field?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${radius}`)
        .then(data=>{
            state.mapFields[key]=data;
            // Keep a small working set even during a long trip.
            const keys=Object.keys(state.mapFields);while(keys.length>6)delete state.mapFields[keys.shift()];
            return data;
        }).finally(()=>{delete state.mapDataRequests[key];});
    }
    return state.mapDataRequests[key];
}
function initialFieldIndex(field){const times=field?.times||[];let i=times.findIndex(t=>parseMapTime(t).getTime()>=Date.now());return i<0?0:Math.min(i,times.length-1);}
function fieldPointRaw(p,key,index){const a=p?.[key];if(!Array.isArray(a)||a[index]===null||a[index]===undefined||a[index]==='')return null;const n=Number(a[index]);return Number.isFinite(n)?n:null;}
function fieldPointValue(p,key,index){return fieldPointRaw(p,key,index)??0;}
async function ensureWindMap(reset=false){const status=$('wp-wind-status');if(status)status.textContent=tr('Loading wind field…');try{const key=mapFieldKey('wind'),field=await loadMapField('wind');if(!layerIsVisible('wind')||key!==mapFieldKey('wind'))return;if(reset||!Number.isFinite(state.windIndex))state.windIndex=initialFieldIndex(field);const slider=$('wp-wind-slider');slider.max=Math.max(0,field.times.length-1);slider.value=state.windIndex;if(status)status.textContent=`${tr('model')} Open‑Meteo`;renderWindMap(true);renderWind();}catch(e){if(status)status.textContent=tr('Could not load wind:')+' '+e.message;}}
function resizeCanvas(canvas){const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w:r.width,h:r.height};}
const WIND_LEVELS={
    '10m':{label:'10 m',speed:'wind10',direction:'direction10',color:'#29b6f6'},
    '80m':{label:'80 m',speed:'wind80',direction:'direction80',color:'#66bb6a'},
    '120m':{label:'120 m',speed:'wind120',direction:'direction120',color:'#ffb74d'},
    '180m':{label:'180 m',speed:'wind180',direction:'direction180',color:'#ef5350'},
};
function setWindLevel(level){
    state.windLevel=(level==='all'||WIND_LEVELS[level])?level:'10m';
    document.querySelectorAll('[data-wind-level]').forEach(b=>b.classList.toggle('active',b.dataset.windLevel===state.windLevel));
    state.windParticles={};
    renderWindMap(true);
    updateWindLegend();
}
function buildWindVectors(field,map,spec,index,level='10m'){
    const cfg=WIND_LEVELS[level]||WIND_LEVELS['10m'],w=map.clientWidth||900,h=map.clientHeight||500;
    return (field.points||[]).map(p=>{
        const q=projectPoint(Number(p.lat),Number(p.lon),spec,w,h);
        let speed=fieldPointRaw(p,cfg.speed,index),dir=fieldPointRaw(p,cfg.direction,index);
        // Compatibility fallback for older cached 10 m payloads only. Never invent upper-level data.
        if(level==='10m'){if(speed===null)speed=fieldPointRaw(p,'wind',index);if(dir===null)dir=fieldPointRaw(p,'direction',index);}
        if(speed===null||dir===null)return null;
        return{x:q.x,y:q.y,speed,dir,gust:fieldPointValue(p,'gust',index)};
    }).filter(Boolean);
}
// Open-Meteo returns a sparse grid. Interpolate vector components so that
// particles do not change direction abruptly at the midpoint of two cells.
function interpolateWindVector(x,y,vectors){
    if(!vectors.length)return null;
    const nearest=[];
    for(const v of vectors){
        const d=(x-v.x)**2+(y-v.y)**2;
        let i=nearest.findIndex(item=>d<item.d);
        if(i<0)i=nearest.length;
        if(i<4){nearest.splice(i,0,{v,d});if(nearest.length>4)nearest.pop();}
    }
    let sum=0,vx=0,vy=0;
    for(const {v,d} of nearest){
        const weight=1/(d+256),angle=(v.dir+180)*Math.PI/180;
        vx+=Math.sin(angle)*v.speed*weight;
        vy-=Math.cos(angle)*v.speed*weight;
        sum+=weight;
    }
    return{vx:vx/sum,vy:vy/sum};
}
function windFlowGrid(vectors,w,h){
    const step=32,cols=Math.ceil(w/step)+1,rows=Math.ceil(h/step)+1,values=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)values.push(interpolateWindVector(x*step,y*step,vectors));
    return{step,cols,rows,values};
}
function windFlowAt(grid,x,y){
    const gx=Math.max(0,Math.min(grid.cols-1-1e-6,x/grid.step)),gy=Math.max(0,Math.min(grid.rows-1-1e-6,y/grid.step));
    const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,i=iy*grid.cols+ix;
    const a=grid.values[i],b=grid.values[i+1],c=grid.values[i+grid.cols],d=grid.values[i+grid.cols+1];
    return{vx:(a.vx*(1-fx)+b.vx*fx)*(1-fy)+(c.vx*(1-fx)+d.vx*fx)*fy,
           vy:(a.vy*(1-fx)+b.vy*fx)*(1-fy)+(c.vy*(1-fx)+d.vy*fx)*fy};
}
function seedWindParticles(w,h,level){
    const mobile=window.matchMedia?.('(max-width: 760px)').matches??window.innerWidth<=760;
    const all=state.windLevel==='all';
    // v0.8.3: denser adaptive field. Single-level desktop maps deliberately use
    // many more particles; all-level mode reduces each layer to preserve readability.
    const divisor=mobile?(all?3200:1450):(all?1550:650);
    const min=mobile?(all?90:190):(all?180:480);
    const max=mobile?(all?240:560):(all?520:1600);
    const count=Math.max(min,Math.min(max,Math.round((w*h)/divisor)));
    const seed={'10m':17,'80m':31,'120m':47,'180m':67}[level]||17;
    state.windParticles[level]=Array.from({length:count},(_,i)=>({x:(i*83.17+seed*13)%w,y:(i*47.31+seed*19)%h,life:70+(i*29+seed)%180,cache:null,tick:0}));
}
function windParticleColor(level,alpha=.88){
    const hex=(WIND_LEVELS[level]||WIND_LEVELS['10m']).color.replace('#','');
    const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
}
function updateWindLegend(){
    const legend=$('wp-wind-legend'); if(!legend)return;
    if(state.windLevel==='all'){
        legend.innerHTML=`<strong>${esc(tr('Altitude levels'))}</strong><div class="wp-wind-level-legend">${Object.entries(WIND_LEVELS).map(([key,c])=>`<span><i style="background:${c.color}"></i>${c.label}</span>`).join('')}</div><small>${esc(tr('Wind speed controls particle movement speed, not line length.'))}</small>`;
    } else {
        const c=WIND_LEVELS[state.windLevel]||WIND_LEVELS['10m'];
        legend.innerHTML=`<strong><i class="wp-legend-dot" style="background:${c.color}"></i> ${esc(tr('Wind'))} ${c.label}</strong><small>${esc(tr('Direction = movement direction · stronger wind = faster movement.'))}</small>`;
    }
}
function renderWindMap(resetParticles=false){
    if(!layerIsVisible('wind'))return;
    const field=state.mapFields[mapFieldKey('wind')];if(!field){stopWindAnimation();const canvas=$('wp-wind-canvas');if(canvas){const d=resizeCanvas(canvas);d.ctx.clearRect(0,0,d.w,d.h);}return;}
    const map=mapElement('wind'),base=mapBaseElement('wind'),canvas=$('wp-wind-canvas'),marker=mapMarkerElement('wind');if(!map||!base||!canvas)return;
    const spec=getMapSpec('wind');
    const dim=resizeCanvas(canvas),requestedLevels=state.windLevel==='all'?Object.keys(WIND_LEVELS):[state.windLevel];
    const vectorSets={};requestedLevels.forEach(level=>vectorSets[level]=buildWindVectors(field,map,spec,state.windIndex,level));
    const levels=requestedLevels.filter(level=>vectorSets[level].length>0);
    const flowGrids={};levels.forEach(level=>{flowGrids[level]=windFlowGrid(vectorSets[level],dim.w,dim.h);});
    if(resetParticles)state.windParticles={};
    levels.forEach(level=>{if(!state.windParticles[level]?.length)seedWindParticles(dim.w,dim.h,level);});
    $('wp-wind-slider').value=state.windIndex;
    $('wp-wind-time').textContent=parseMapTime(field.times[state.windIndex]).toLocaleString([], {weekday:'short',hour:'2-digit',minute:'2-digit'});
    const status=$('wp-wind-status');
    if(status)status.textContent=levels.length?((state.windLevel==='all'?`${levels.length} ${tr('levels')}`:`${tr('wind')} ${WIND_LEVELS[state.windLevel].label}`)+' · Open‑Meteo'):tr('Data for the selected level are not available');
    updateWindLegend();stopWindAnimation();const ctx=dim.ctx;ctx.clearRect(0,0,dim.w,dim.h);
    if(!levels.length)return;
    let last=performance.now();
    function frame(now){
        if(!layerIsVisible('wind'))return;
        const dt=Math.min(2.2,Math.max(.45,(now-last)/16.67));last=now;ctx.clearRect(0,0,dim.w,dim.h);ctx.lineCap='round';
        for(const level of levels){
            const grid=flowGrids[level],particles=state.windParticles[level]||[],color=windParticleColor(level,state.windLevel==='all'?.88:.94);
            for(const p of particles){
                const v=windFlowAt(grid,p.x,p.y),speed=Math.hypot(v.vx,v.vy);
                if(speed<.05)continue;
                // Short, nearly constant glyph length. Speed is encoded by travel velocity.
                const visualLen=state.windLevel==='all'?7:9,velocity=Math.max(.45,Math.min(5.4,.28+speed*.11)),dx=v.vx/speed,dy=v.vy/speed;
                ctx.beginPath();ctx.moveTo(p.x-dx*visualLen*.45,p.y-dy*visualLen*.45);ctx.lineTo(p.x+dx*visualLen*.55,p.y+dy*visualLen*.55);
                ctx.lineWidth=state.windLevel==='all'?1.8:2.2;ctx.strokeStyle='rgba(0,0,0,.38)';ctx.stroke();
                ctx.beginPath();ctx.moveTo(p.x-dx*visualLen*.45,p.y-dy*visualLen*.45);ctx.lineTo(p.x+dx*visualLen*.55,p.y+dy*visualLen*.55);
                ctx.lineWidth=state.windLevel==='all'?1.05:1.35;ctx.strokeStyle=color;ctx.stroke();
                p.x+=dx*velocity*dt;p.y+=dy*velocity*dt;p.life-=dt;
                if(p.life<0||p.x<-20||p.x>dim.w+20||p.y<-20||p.y>dim.h+20){p.x=Math.random()*dim.w;p.y=Math.random()*dim.h;p.life=80+Math.random()*170;p.cache=null;}
            }
        }
        state.windRaf=requestAnimationFrame(frame);
    }
    state.windRaf=requestAnimationFrame(frame);
}
function stopWindAnimation(){if(state.windRaf){cancelAnimationFrame(state.windRaf);state.windRaf=null;}}
function toggleWindPlay(){if(state.windTimer){stopWindPlay();return;}const field=state.mapFields[mapFieldKey('wind')];if(!field){ensureWindMap().then(()=>{const f=state.mapFields[mapFieldKey('wind')];if(fieldLength(f)>1)toggleWindPlay();});return;}const total=fieldLength(field);if(total<2)return;setPlaybackButton('wp-wind-play',true);state.windTimer=setInterval(()=>{state.windIndex=safeNextIndex(state.windIndex,total);renderWindMap(false);renderWind();},950);}
function stopWindPlay(){if(state.windTimer){clearInterval(state.windTimer);state.windTimer=null;}setPlaybackButton('wp-wind-play',false);}
function renderWind(){if(!state.weather)return;const c=state.weather.current||{},hours=hourlyRows().slice(0,12),box=$('wp-wind-current'),list=$('wp-wind-hours');if(!box||!list)return;box.innerHTML=`<div class="wp-wind-arrow" style="transform:rotate(${Number(c.wind_direction_10m)||0}deg)">↑</div><div><strong>${round(c.wind_speed_10m)} km/h</strong><span>10 m · ${windDir(c.wind_direction_10m)} · ${esc(tr('gusts'))} ${round(c.wind_gusts_10m)} km/h</span></div>`;list.innerHTML=hours.map(h=>`<div><time>${fmtTime(h.time)}</time><span class="wp-mini-arrow" style="transform:rotate(${Number(h.windDir)||0}deg)">↑</span><strong>${round(h.wind)} km/h</strong><small>${esc(tr('gust'))} ${round(h.gust)}</small></div>`).join('');}
function stormPotential(h){
    if([95,96,99].includes(Number(h.code)))return 1;
    const cape=Math.max(0,Number(h.cape)||0),probability=Math.max(0,Math.min(100,Number(h.prob)||0));
    // Gusts or a chance of ordinary rain alone do not imply a thunderstorm.
    if(cape<100)return 0;
    return Math.min(1,(cape-100)/1250*(.3+.7*probability/100));
}
function stormRisk(h){const score=stormPotential(h);if(score>=.72)return[tr('High'),'high','⛈️'];if(score>=.38)return[tr('Elevated'),'medium','🌩️'];if(score>=.1)return[tr('Low'),'low','🌦️'];return[tr('Minimal'),'none','☁️'];}
function pointStormRisk(p,index){return stormRisk({cape:fieldPointValue(p,'cape',index),gust:fieldPointValue(p,'gust',index),prob:fieldPointValue(p,'probability',index),code:fieldPointValue(p,'code',index)});}
async function ensureStormMap(reset=false){const status=$('wp-storm-status');if(status)status.textContent=tr('Loading storm map…');try{const key=mapFieldKey('storms'),field=await loadMapField('storms');if(!layerIsVisible('storms')||key!==mapFieldKey('storms'))return;if(reset||!Number.isFinite(state.stormIndex))state.stormIndex=initialFieldIndex(field);const slider=$('wp-storm-slider');slider.max=Math.max(0,field.times.length-1);slider.value=state.stormIndex;if(status)status.textContent=`CAPE + ${tr('precipitation')} + ${tr('Thunderstorm')}`;renderStormMapFrame();renderStorms();}catch(e){if(status)status.textContent=tr('Could not load storm map:')+' '+e.message;}}
function stormSampleSpacing(points){
    const distances=points.map((point,i)=>{
        let nearest=Infinity;
        for(let j=0;j<points.length;j++){if(i===j)continue;const dx=point.x-points[j].x,dy=point.y-points[j].y,d=Math.hypot(dx,dy);if(d>1&&d<nearest)nearest=d;}
        return nearest;
    }).filter(Number.isFinite).sort((a,b)=>a-b);
    return distances.length?distances[Math.floor(distances.length/2)]:0;
}
function interpolateStormSignal(x,y,points,spacing){
    if(!points.length||spacing<=0)return null;
    const nearest=[];
    for(const point of points){const d2=(point.x-x)**2+(point.y-y)**2;if(nearest.length<4){nearest.push({d2,value:point.value});nearest.sort((a,b)=>a.d2-b.d2);}else if(d2<nearest[3].d2){nearest[3]={d2,value:point.value};nearest.sort((a,b)=>a.d2-b.d2);}}
    const distance=Math.sqrt(nearest[0].d2);
    if(distance>spacing*1.9)return null;
    const smooth=(spacing*.25)**2;
    let sum=0,weight=0;
    for(const point of nearest){const w=1/(point.d2+smooth);sum+=point.value*w;weight+=w;}
    return {value:sum/weight,coverage:Math.max(0,Math.min(1,(spacing*1.9-distance)/(spacing*.8)))};
}
function renderStormMapFrame(){
    if(!layerIsVisible('storms'))return;
    const field=state.mapFields[mapFieldKey('storms')],canvas=$('wp-storm-canvas');
    if(!field){if(canvas){const d=resizeCanvas(canvas);d.ctx.clearRect(0,0,d.w,d.h);}return;}
    const map=mapElement('storms'),base=mapBaseElement('storms'),marker=mapMarkerElement('storms');
    if(!map||!base||!canvas)return;
    const spec=getMapSpec('storms');
    const {ctx,w,h}=resizeCanvas(canvas);ctx.clearRect(0,0,w,h);
    const points=(field.points||[]).map(point=>{
        const projected=projectPoint(Number(point.lat),Number(point.lon),spec,w,h);
        return {...projected,value:stormPotential({cape:fieldPointValue(point,'cape',state.stormIndex),prob:fieldPointValue(point,'probability',state.stormIndex),code:fieldPointValue(point,'code',state.stormIndex)})};
    });
    const spacing=stormSampleSpacing(points),step=9,sw=Math.max(1,Math.ceil(w/step)),sh=Math.max(1,Math.ceil(h/step));
    if(spacing>0&&w>0&&h>0){
        const small=document.createElement('canvas');small.width=sw;small.height=sh;
        const smallCtx=small.getContext('2d'),pixels=smallCtx.createImageData(sw,sh);
        for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
            const sample=interpolateStormSignal((x+.5)*w/sw,(y+.5)*h/sh,points,spacing);
            if(!sample||sample.value<.1)continue;
            const value=sample.value,index=(y*sw+x)*4;
            pixels.data[index]=value<.6?246:Math.round(246-(value-.6)*70);
            pixels.data[index+1]=Math.round(200-165*value);
            pixels.data[index+2]=Math.round(48-20*value);
            pixels.data[index+3]=Math.round((.13+.54*value)*sample.coverage*255);
        }
        smallCtx.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,0,0,w,h);
    }
    const active=points.filter(point=>point.value>=.38).length,high=points.filter(point=>point.value>=.72).length;
    $('wp-storm-slider').value=state.stormIndex;
    $('wp-storm-time').textContent=parseMapTime(field.times[state.stormIndex]).toLocaleString([], {weekday:'short',hour:'2-digit',minute:'2-digit'});
    const activity=$('wp-storm-map-activity');if(activity)activity.textContent=high?`${high} ${tr('areas with high potential')}`:active?`${active} ${tr('areas with elevated potential')}`:tr('No significant storm activity in the loaded area');
}
function toggleStormPlay(){if(state.stormTimer){stopStormPlay();return;}const field=state.mapFields[mapFieldKey('storms')];if(!field){ensureStormMap().then(()=>{const f=state.mapFields[mapFieldKey('storms')];if(fieldLength(f)>1)toggleStormPlay();});return;}const total=fieldLength(field);if(total<2)return;setPlaybackButton('wp-storm-play',true);state.stormTimer=setInterval(()=>{state.stormIndex=safeNextIndex(state.stormIndex,total);renderStormMapFrame();renderStorms();},1000);}
function stopStormPlay(){if(state.stormTimer){clearInterval(state.stormTimer);state.stormTimer=null;}setPlaybackButton('wp-storm-play',false);}
function renderStorms(){if(!state.weather)return;const hours=hourlyRows().slice(0,24),sum=$('wp-storm-summary'),list=$('wp-storm-hours');if(!sum||!list)return;let best={score:-1,h:null,r:null};hours.forEach(h=>{const r=stormRisk(h),score={none:0,low:1,medium:2,high:3}[r[1]];if(score>best.score)best={score,h,r};});sum.innerHTML=best.h?`<div class="wp-storm-level ${best.r[1]}"><span>${best.r[2]}</span><div><small>${esc(tr('Highest estimate in the next 24 h for the selected location'))}</small><strong>${best.r[0]}</strong><em>${fmtTime(best.h.time)} · CAPE ${round(best.h.cape)} J/kg · ${esc(tr('precipitation'))} ${round(best.h.prob)} % · ${esc(tr('gusts'))} ${round(best.h.gust)} km/h</em></div></div>`:'';list.innerHTML=hours.map(h=>{const r=stormRisk(h);return `<div class="wp-storm-hour ${r[1]}"><time>${fmtTime(h.time)}</time><span>${r[2]}</span><strong>${r[0]}</strong><small>CAPE ${round(h.cape)} · 🌧️ ${round(h.prob)}% · 💨 ${round(h.gust)}</small></div>`;}).join('');}

// A viewport-sized sample grid keeps ALADIN requests bounded and improves detail
// when zooming in. The map is interpolated from samples, not the native 1 km raster.
function aladinFieldRequest(){
    const spec=getMapSpec('aladin'),map=mapElement('aladin');
    const halfPixels=Math.max(map?.clientWidth||900,map?.clientHeight||420)/2;
    const halfKm=halfPixels*156.543*Math.max(.25,Math.cos(spec.lat*Math.PI/180))/(2**spec.zoom);
    const radius=[20,40,80,160,320,640].find(value=>value>=halfKm*1.35)||640;
    const step=Math.max(.02,radius/500);
    const lat=Number((Math.round(spec.lat/step)*step).toFixed(4));
    const lon=Number((Math.round(spec.lon/step)*step).toFixed(4));
    return {lat,lon,radius,key:`${radius}:${lat}:${lon}`};
}
function aladinCachedField(){
    const field=state.aladinFields[aladinFieldRequest().key];
    return field&&Date.now()-field.loadedAt<(field.available===false?300000:1200000)?field:null;
}
function showAladinNoData(){
    const status=$('wp-aladin-status');
    if(status){status.textContent=tr('ALADIN forecast has no data for this area.');status.title='';status.classList.remove('is-error');}
    renderAladinMapFrame();
}
function scheduleAladinFieldLoad(){
    const key=aladinFieldRequest().key;
    if(state.aladinRequests[key]||Date.now()<(state.aladinFailedUntil[key]||0))return;
    clearTimeout(state.aladinLoadTimer);
    state.aladinLoadTimer=setTimeout(()=>{if(layerIsVisible('aladin')&&!aladinCachedField())void ensureAladinMap();},350);
}
async function ensureAladinMap(){
    const request=aladinFieldRequest(),{key,lat,lon,radius}=request,status=$('wp-aladin-status');
    if(Date.now()<(state.aladinFailedUntil[key]||0))return null;
    const cached=aladinCachedField();
    if(cached){if(cached.available===false){showAladinNoData();return null;}renderAladinMapFrame();return cached;}
    if(!state.aladinRequests[key]){
        if(status){status.textContent=tr('Loading ALADIN forecast…');status.classList.remove('is-error');}
        state.aladinRequests[key]=api(`/api/aladin-field?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&radius=${radius}`)
        .then(field=>{
            if(field?.available===false&&field?.reason==='no-data'){
                field.loadedAt=Date.now();state.aladinFields[key]=field;
                return field;
            }
            if(!Array.isArray(field?.times)||!field.times.length||!Array.isArray(field.points)||!field.points.length)throw new Error(tr('ALADIN forecast has no data for this area.'));
            field.loadedAt=Date.now();state.aladinFields[key]=field;
            return field;
        }).then(field=>{
            const keys=Object.keys(state.aladinFields);while(keys.length>4)delete state.aladinFields[keys.shift()];
            return field;
        }).catch(error=>{state.aladinFailedUntil[key]=Date.now()+60000;throw error;})
        .finally(()=>{delete state.aladinRequests[key];});
    }
    try{
        const field=await state.aladinRequests[key];
        if(!layerIsVisible('aladin')||key!==aladinFieldRequest().key)return field;
        if(field.available===false){showAladinNoData();return null;}
        const previousTime=state.aladinTime;
        const nearest=previousTime===null?-1:field.times.findIndex(time=>parseMapTime(time).getTime()>=previousTime);
        state.aladinIndex=nearest>=0?nearest:initialFieldIndex(field);
        const slider=$('wp-aladin-slider');slider.max=field.times.length-1;slider.value=state.aladinIndex;
        if(status){status.textContent='ČHMÚ ALADIN · Open‑Meteo';status.title='';status.classList.remove('is-error');}
        renderAladinMapFrame();return field;
    }catch(error){
        if(layerIsVisible('aladin')&&key===aladinFieldRequest().key&&status){
            status.textContent=tr('ALADIN service is temporarily unavailable. Retry in 1 minute.');
            status.title=error.message;status.classList.add('is-error');
        }
        return null;
    }
}
function setAladinMetric(metric){
    state.aladinMetric=metric==='temperature'?'temperature':'precipitation';
    document.querySelectorAll('[data-aladin-metric]').forEach(button=>{
        const selected=button.dataset.aladinMetric===state.aladinMetric;
        button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
    });
    const detail=$('wp-aladin-detail-title'),scale=$('wp-aladin-scale'),colorbar=$('wp-aladin-colorbar');
    if(detail)detail.textContent=tr(state.aladinMetric==='temperature'?'ALADIN temperature forecast':'ALADIN precipitation forecast');
    if(scale)scale.textContent=tr(state.aladinMetric==='temperature'?'Temperature (°C)':'Precipitation per hour (mm)');
    colorbar?.classList.toggle('is-temperature',state.aladinMetric==='temperature');
    renderAladinMapFrame();
}
function aladinColor(value,metric){
    if(metric==='precipitation'){
        if(value<.08)return null;
        if(value<.3)return [55,175,246,95];
        if(value<1)return [24,124,232,135];
        if(value<3)return [88,65,206,165];
        if(value<8)return [220,45,97,190];
        return [254,150,32,205];
    }
    const stops=[[-25,[77,48,142]],[-10,[51,109,203]],[0,[84,206,229]],[10,[81,190,115]],[20,[249,216,67]],[30,[236,90,45]],[40,[163,35,61]]];
    for(let i=1;i<stops.length;i++)if(value<=stops[i][0]){
        const a=stops[i-1],b=stops[i],t=Math.max(0,Math.min(1,(value-a[0])/(b[0]-a[0])));
        return a[1].map((channel,j)=>Math.round(channel+(b[1][j]-channel)*t)).concat(135);
    }
    return [...stops.at(-1)[1],135];
}
function renderAladinMapFrame(){
    if(!layerIsVisible('aladin'))return;
    const canvas=$('wp-aladin-canvas');if(!canvas)return;
    const {ctx,w,h}=resizeCanvas(canvas);ctx.clearRect(0,0,w,h);
    const field=aladinCachedField(),map=mapElement('aladin');
    if(!field||field.available===false||!map||!w||!h)return;
    const index=Math.max(0,Math.min(field.times.length-1,Number(state.aladinIndex)||0));
    state.aladinIndex=index;state.aladinTime=parseMapTime(field.times[index]).getTime();
    const metric=state.aladinMetric,spec=getMapSpec('aladin');
    const points=field.points.map(point=>{
        const value=fieldPointRaw(point,metric,index);
        return value===null?null:{...projectPoint(Number(point.lat),Number(point.lon),spec,w,h),value};
    }).filter(Boolean);
    if(points.length>3){
        const spacing=stormSampleSpacing(points),pixelStep=7,sw=Math.ceil(w/pixelStep),sh=Math.ceil(h/pixelStep);
        if(spacing>0){
            const small=document.createElement('canvas');small.width=sw;small.height=sh;
            const smallCtx=small.getContext('2d'),pixels=smallCtx.createImageData(sw,sh);
            for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
                const sample=interpolateStormSignal((x+.5)*w/sw,(y+.5)*h/sh,points,spacing);
                if(!sample)continue;
                const color=aladinColor(sample.value,metric);if(!color)continue;
                const at=(y*sw+x)*4;
                for(let channel=0;channel<3;channel++)pixels.data[at+channel]=color[channel];
                pixels.data[at+3]=Math.round(color[3]*sample.coverage);
            }
            smallCtx.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(small,0,0,w,h);
        }
    }
    const slider=$('wp-aladin-slider');if(slider)slider.value=index;
    const time=$('wp-aladin-time');if(time)time.textContent=parseMapTime(field.times[index]).toLocaleString([], {weekday:'short',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
    const source=$('wp-aladin-detail-source');if(source)source.textContent=`${tr('CHMI ALADIN via Open-Meteo; sampled grid spacing approximately')} ${field.sampleSpacingKm} km. ${tr('Interpolated map; forecast, not radar measurement.')}`;
    const status=$('wp-aladin-status');if(status&&!points.length){status.textContent=tr('ALADIN has no values for the selected hour.');status.classList.add('is-error');}
    else if(status?.classList.contains('is-error')){status.textContent='ČHMÚ ALADIN · Open‑Meteo';status.classList.remove('is-error');}
}
function toggleAladinPlay(){
    if(state.aladinTimer){stopAladinPlay();return;}
    const field=aladinCachedField();
    if(!field){void ensureAladinMap().then(result=>{if(result&&layerIsVisible('aladin')&&aladinCachedField())toggleAladinPlay();});return;}
    if(field.times.length<2)return;
    setPlaybackButton('wp-aladin-play',true);
    state.aladinTimer=setInterval(()=>{state.aladinIndex=safeNextIndex(state.aladinIndex,field.times.length);renderAladinMapFrame();},1100);
}
function stopAladinPlay(){if(state.aladinTimer){clearInterval(state.aladinTimer);state.aladinTimer=null;}setPlaybackButton('wp-aladin-play',false);}

function debounce(fn,ms){let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms);};}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

function cleanupWeatherApplication(){
    stopRadar();
    stopWindPlay();
    stopStormPlay();
    stopAladinPlay();
    stopWindAnimation();
    clearTimeout(state.layoutResizeTimer);
    clearTimeout(state.mapDataTimer);
    clearTimeout(state.aladinLoadTimer);
    if(state.mapRenderRaf!==null)cancelAnimationFrame(state.mapRenderRaf);state.mapRenderRaf=null;
    try{state.layoutController?.destroy?.();}catch(oError){console.warn('[Weather] Layout cleanup failed:',oError);}
    state.layoutController=null;
    state.layoutViewControllers.forEach(oController=>{try{oController?.destroy?.();}catch(oError){console.warn('[Weather] View layout cleanup failed:',oError);}});
    state.layoutViewControllers=[];
    stopLocationTracking();
    Object.values(state.coreMapControllers||{}).forEach(oController=>{try{oController?.destroy?.();}catch(oError){console.warn('[Weather] Map cleanup failed:',oError);}});
    state.coreMapControllers={};state.coreWeatherLayersRegistered=false;
    state.coreMapDrivers={};
    clearBaseTileRequests();
    try{state.coreTileLoader?.destroy?.();}catch(oError){console.warn('[Weather] Tile loader cleanup failed:',oError);}
    state.coreTileLoader=null;
    const oRoot=getAppRoot();
    if(oRoot){
        oRoot.classList.remove('wp-app','hc-weather-app','wp-modal-open');
        delete oRoot.dataset.weatherMounted;
    }
}
async function mountApplication(oRoot,oCore){
    Core=oCore;
    oRoot.classList.add('wp-app','hc-weather-app');
    oRoot.dataset.weatherMounted='true';
    prepareWeatherMarkup();
    state.core=Core;
    registerCoreAbout();
    setLoading(true);
    await init();
    return cleanupWeatherApplication;
}
async function startWeatherBootstrap(){
    const oRoot=getAppRoot();
    if(!oRoot||oRoot.dataset.weatherMounted==='true')return;
    const oCore=window.HcSharedAppCore;
    if(!oCore){
        showStartupError(oRoot,tr('Shared App Core is unavailable'),tr('Install and enable Shared App Core 0.18.1 or newer.'));
        return;
    }
    try{
        oCore.assertCompatible(requiredCoreVersion());
        if(Number(oCore.apiVersion)!==requiredCoreApiVersion())throw new Error(tr('Unsupported Shared App Core API version.'));
        fnStartupCleanup=await mountApplication(oRoot,oCore);
    }catch(oError){
        cleanupWeatherApplication();
        showStartupError(oRoot,'Aplikaci nelze spustit',oError instanceof Error?oError.message:String(oError));
    }
}
window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    if(typeof fnStartupCleanup==='function')fnStartupCleanup();
    fnStartupCleanup=null;
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startWeatherBootstrap,{once:true});
else startWeatherBootstrap();
})();
