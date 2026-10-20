(() => {
'use strict';
const APP='hc_weather';
const CORE_MIN='0.17.0';
const tr=s=>typeof t==='function'?t(APP,s):s;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=code=>({0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'🌧️',95:'⛈️',96:'⛈️',99:'⛈️'}[Number(code)]||'🌡️');
const api=async(path)=>{const r=await fetch(OC.generateUrl('/apps/'+APP+path),{cache:'no-store',headers:{requesttoken:OC.requestToken}});if(!r.ok)throw new Error(r.statusText);return r.json();};

function coreDeviceLocation(){
    const core=window.HcSharedAppCore;
    if(!core) return Promise.reject(new Error('Shared App Core is unavailable.'));
    core.assertCompatible(CORE_MIN);
    if(typeof core.maps?.watchLocation!=='function')return Promise.reject(new Error('Shared App Core location tracking is unavailable.'));
    return new Promise((resolve,reject)=>{
        let tracker=null;
        let destroyPending=false;
        let settled=false;
        const finish=()=>{if(tracker)tracker.destroy();else destroyPending=true;};
        try{
            tracker=core.maps.watchLocation({
                enableHighAccuracy:false,
                timeoutMs:5000,
                maximumAgeMs:300000,
                minIntervalMs:0,
                minDistanceM:0,
                onPosition(sample){
                    if(settled)return;
                    settled=true;
                    finish();
                    resolve(sample.point);
                },
                onError(error){
                    if(settled)return;
                    settled=true;
                    finish();
                    reject(new Error(error?.message||String(error?.code||'Location unavailable')));
                },
            });
            if(destroyPending)tracker.destroy();
        }catch(error){
            settled=true;
            finish();
            reject(error);
        }
    });
}

OCA.Dashboard.register(APP, async(el)=>{
    el.innerHTML='<div class="wp-widget wp-widget-loading">'+esc(tr('Loading weather…'))+'</div>';
    try{
        const s=await api('/api/settings');
        let loc=s.adminDefault;
        if(s.locationMode==='manual'&&s.latitude!==''&&s.longitude!=='')loc={name:s.locationName||tr('My location'),latitude:Number(s.latitude),longitude:Number(s.longitude),timezone:s.timezone||'auto'};
        if(s.locationMode==='device'){
            try{
                const point=await coreDeviceLocation();
                loc={name:tr('Current location'),latitude:point.lat,longitude:point.lon,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'auto'};
            }catch(_){}
        }
        const w=await api(`/api/weather?lat=${encodeURIComponent(loc.latitude)}&lon=${encodeURIComponent(loc.longitude)}&timezone=${encodeURIComponent(loc.timezone||'auto')}`);
        const c=w.current||{},h=w.hourly||{},times=h.time||[];
        const now=new Date(c.time||Date.now()).getTime();
        let ix=times.findIndex(x=>new Date(x).getTime()>=now);if(ix<0)ix=0;
        const fields=s.widgetFields||[];
        const near=[1,2,3].map(n=>{const i=ix+n;return `<div><small>${new Date(times[i]).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small><b>${icon(h.weather_code?.[i])}</b><strong>${Math.round(h.temperature_2m?.[i]??0)}°</strong></div>`;}).join('');
        const sr=w.daily?.sunrise?.[0],ss=w.daily?.sunset?.[0],base=Number(c.temperature_2m??h.temperature_2m?.[ix]??0),future=Number(h.temperature_2m?.[ix+3]??base),delta=future-base,arrow=delta>0.6?'↗':delta<-0.6?'↘':'→',trend=delta>0.6?tr('Rising'):delta<-0.6?tr('Falling'):tr('Stable');
        el.innerHTML=`<a class="wp-widget" href="${OC.generateUrl('/apps/hc_weather/')}"><div class="wp-widget-top"><div class="wp-widget-icon">${icon(c.weather_code)}</div><div class="wp-widget-summary"><small class="wp-widget-location">${esc(loc.name||tr('Weather'))}</small><div class="wp-widget-temp-line"><strong>${Math.round(c.temperature_2m??0)}°</strong><span>${fields.includes('wind')?'💨 '+Math.round(c.wind_speed_10m??0)+' km/h':''}</span></div><div class="wp-widget-trend"><b>${arrow}</b><span>${esc(tr('Temperature tendency'))}: ${esc(trend)} ${delta?((delta>0?'+':'')+delta.toFixed(1)+'° / 3 h'):''}</span></div></div></div>${fields.includes('nearTerm')?`<div class="wp-widget-near">${near}</div>`:''}${fields.includes('sun')?`<div class="wp-widget-sun">🌅 ${sr?new Date(sr).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'--'} &nbsp; 🌇 ${ss?new Date(ss).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'--'}</div>`:''}</a>`;
    }catch(e){
        el.innerHTML=`<a class="wp-widget" href="${OC.generateUrl('/apps/hc_weather/')}"><strong>${esc(tr('Weather'))}</strong><span>${esc(tr('Weather could not be loaded.'))}</span></a>`;
    }
});
})();
