const $ = id => document.getElementById(id);
const fmt = (value, decimals=0) => Number(value).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
const palette = {Low:'#3478e7',Medium:'#17aa8b',High:'#f3a448'};
const deviceNames = {Meter_1:'Kitchen',Meter_2:'Laundry',Meter_3:'Water heating & cooling'};
const deviceColors = {Meter_1:'#3478e7',Meter_2:'#17aa8b',Meter_3:'#f3a448'};
let clockFormat = '24';
let overviewCache = null;
function timeLabel(hour, minute=false){const h=Number(hour);if(clockFormat==='12'){const display=h%12||12;return `${display}${minute?':00':''} ${h<12?'AM':'PM'}`;}return `${String(h).padStart(2,'0')}${minute?':00':''}`;}
function applyTheme(theme){document.body.dataset.theme=theme;$('themeText').textContent=theme==='dark'?'Light':'Dark';$('themeToggle').setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');localStorage.setItem('energyscope-theme',theme);}
function applyClock(value){clockFormat=value;$('clockText').textContent=value==='12'?'24-hour':'12-hour';$('clockToggle').setAttribute('aria-label',value==='12'?'Switch to 24-hour time':'Switch to 12-hour time');localStorage.setItem('energyscope-clock',value);if(overviewCache){$('peakHour').textContent=timeLabel(overviewCache.peak_hour,true);renderHourChart(overviewCache.hours);}}
$('themeToggle').addEventListener('click',()=>applyTheme(document.body.dataset.theme==='dark'?'light':'dark'));
$('clockToggle').addEventListener('click',()=>applyClock(clockFormat==='12'?'24':'12'));
applyTheme(localStorage.getItem('energyscope-theme')==='dark'?'dark':'light');
applyClock(localStorage.getItem('energyscope-clock')==='12'?'12':'24');
function renderHourChart(data){
  const wrap=$('hourChart'), tip=$('chartTooltip');
  if(!data?.length){wrap.textContent='No hourly readings available.';return;}
  const width=960,height=330,L=53,R=22,T=19,B=50;
  const iw=width-L-R,ih=height-T-B,values=data.map(d=>Number(d.avg_kw));
  const max=Math.ceil(Math.max(0.2,...values)*1.12*2)/2;
  const px=i=>L+(iw*i/(values.length-1)),py=v=>T+ih*(1-v/max);
  const grid=[0,1,2,3,4].map(i=>{const y=T+i*ih/4;return `<line x1="${L}" y1="${y}" x2="${width-R}" y2="${y}" class="grid-line"/><text x="${L-13}" y="${y+4}" text-anchor="end" class="tick">${fmt(max*(1-i/4),1)}</text>`}).join('');
  const ticks=data.map((d,i)=>i%3===0||i===23?`<text x="${px(i)}" y="${height-17}" text-anchor="middle" class="tick">${timeLabel(d.hour)}</text>`:'').join('');
  const line=values.map((v,i)=>`${i?'L':'M'}${px(i).toFixed(2)},${py(v).toFixed(2)}`).join(' ');
  const area=`${line} L${px(values.length-1)},${T+ih} L${L},${T+ih} Z`;
  const dots=values.map((v,i)=>`<circle class="chart-dot" tabindex="0" data-i="${i}" cx="${px(i)}" cy="${py(v)}" r="5" aria-label="${timeLabel(data[i].hour,true)}, ${fmt(v,3)} kilowatts"/>`).join('');
  wrap.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Average electricity demand by hour"><defs><linearGradient id="chartAreaFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3478e7" stop-opacity=".25"/><stop offset="1" stop-color="#3478e7" stop-opacity=".01"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#chartAreaFill)"/><path class="energy-line" d="${line}"/>${ticks}${dots}<text x="${L}" y="${height-2}" class="axis-title">Time of day</text><text x="${L+5}" y="${T-5}" class="axis-title">kW</text></svg>`;
  const show=(i)=>{const d=data[i];const x=px(i)/width*100,y=py(values[i])/height*100;tip.innerHTML=`<strong>${timeLabel(d.hour,true)}</strong><span>${fmt(d.avg_kw,3)} kW average demand</span>`;tip.hidden=false;tip.style.left=`${Math.min(82,Math.max(17,x))}%`;tip.style.top=`${Math.max(17,y)}%`;wrap.querySelectorAll('.chart-dot').forEach(dot=>dot.classList.toggle('selected',Number(dot.dataset.i)===i));};
  wrap.querySelectorAll('.chart-dot').forEach(dot=>{dot.addEventListener('mouseenter',()=>show(+dot.dataset.i));dot.addEventListener('focus',()=>show(+dot.dataset.i));dot.addEventListener('click',()=>show(+dot.dataset.i));});
  wrap.onmouseleave=()=>{tip.hidden=true;wrap.querySelectorAll('.chart-dot').forEach(dot=>dot.classList.remove('selected'));};
}
function renderDevices(devices){
  const total=devices.reduce((sum,d)=>sum+Number(d.energy_kwh),0);
  const max=Math.max(...devices.map(d=>Number(d.energy_kwh)),1);
  $('deviceBars').innerHTML=devices.map(d=>`<div class="device-bar-item"><div class="device-bar-label"><strong>${deviceNames[d.name]||'Appliance group'}</strong><span>${fmt(d.energy_kwh)} kWh</span></div><div class="bar-track"><div class="bar-fill" style="width:${100*d.energy_kwh/max}%;background:${deviceColors[d.name]||'#3478e7'}"></div></div></div>`).join('');
  if(!total)return;
  let position=0;const segments=[];
  devices.forEach(d=>{const next=position+Number(d.energy_kwh)/total*100;segments.push(`${deviceColors[d.name]} ${position}% ${next}%`);position=next;});
  $('donut').style.background=`conic-gradient(${segments.join(',')})`;
  $('deviceLegend').innerHTML=devices.map(d=>`<div class="legend-item"><span><i class="legend-dot" style="background:${deviceColors[d.name]}"></i>${deviceNames[d.name]}</span><strong>${fmt(d.energy_kwh/total*100,1)}%</strong></div>`).join('');
}
async function load(){try{const response=await fetch('/api/overview');const raw=await response.json();if(!response.ok)throw new Error(raw.detail||'Unable to load household statistics');overviewCache=raw;$('dateRange').textContent=`Recorded period: ${raw.date_start} – ${raw.date_end}`;$('totalEnergy').textContent=fmt(raw.total_energy_kwh);$('averagePower').textContent=fmt(raw.average_power_kw,2);$('totalHours').textContent=fmt(raw.count);$('peakHour').textContent=timeLabel(raw.peak_hour,true);renderHourChart(raw.hours);renderDevices(raw.meters);$('quality').textContent=raw.quality_note;}catch(error){$('errorBox').classList.remove('hidden');$('errorBox').textContent=`Could not load your dashboard: ${error.message}. Check the files inside website_artifacts.`;}}
load();
