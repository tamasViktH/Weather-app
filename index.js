// tiny helpers
const $ = (s, r = document) => r.querySelector(s)
const esc = s => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#39;')

const LS = {
  get(k, f){ try{return JSON.parse(localStorage.getItem(k)) ?? f}catch{return f} },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
}

const state = {
  unit: LS.get('unit','imperial'),   // 'metric' | 'imperial'
  city: LS.get('city','')
}

// ---------- background (unsplash via scrimba) ----------
async function setBackground(){
  try{
    const res = await fetch('https://apis.scrimba.com/unsplash/photos/random?orientation=landscape&query=nature')
    const data = await res.json()
    document.body.style.backgroundImage = `url(${data.urls.regular})`
    $('#bg-credit').textContent = `Photo: ${data.user.name}`
  }catch{
    // safe fallback
    document.body.style.backgroundImage = 'linear-gradient(135deg,#232526,#414345)'
    $('#bg-credit').textContent = ''
  }
}
setBackground()
$('#bg-refresh').addEventListener('click', setBackground)

// ---------- clock ----------
function tick(){
  const now = new Date()
  $('#clock').textContent = now.toLocaleTimeString([], { timeStyle: 'short' })
  $('#today').textContent = now.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric', year:'numeric' })
}
tick(); setInterval(tick, 1000)

// ---------- weather (openweather via scrimba) ----------
const unitBtns = [$('#c-btn'), $('#f-btn')]
function syncUnits(){
  $('#c-btn').setAttribute('aria-pressed', String(state.unit === 'metric'))
  $('#f-btn').setAttribute('aria-pressed', String(state.unit === 'imperial'))
}
syncUnits()

unitBtns.forEach(btn => btn.addEventListener('click', () => {
  state.unit = btn.dataset.unit; LS.set('unit', state.unit); syncUnits()
  if(state.city) getByCity(state.city); else tryGeo()
}))

$('#loc-form').addEventListener('submit', e => {
  e.preventDefault()
  const city = $('#city-input').value.trim()
  if(!city) return
  state.city = city; LS.set('city', city)
  getByCity(city)
})

async function getByCity(city){
  await renderWeather(() =>
    fetch(`https://apis.scrimba.com/openweathermap/data/2.5/weather?q=${encodeURIComponent(city)}&units=${state.unit}`)
  )
}
async function getByCoords(lat, lon){
  await renderWeather(() =>
    fetch(`https://apis.scrimba.com/openweathermap/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.unit}`)
  )
}

async function renderWeather(doFetch){
  const main = $('#w-main'); const extras = $('#w-extras'); const err = $('#w-error')
  main.classList.add('skeleton'); extras.classList.add('skeleton'); err.hidden = true; err.textContent = ''

  try{
    const res = await doFetch()
    if(!res.ok) throw new Error(`weather ${res.status}`)
    const d = await res.json()

    // main
    const icon = `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`
    $('#w-icon').src = icon
    $('#w-icon').alt = d.weather[0].description
    const unitSymbol = state.unit === 'metric' ? '°C' : '°F'
    $('#w-temp').textContent = `${Math.round(d.main.temp)}${unitSymbol}`
    $('#w-city').textContent = d.name

    // extras
    const feels = `${Math.round(d.main.feels_like)}${unitSymbol}`
    const windU = state.unit === 'metric' ? 'm/s' : 'mph'
    const sunrise = new Date(d.sys.sunrise * 1000).toLocaleTimeString([], { timeStyle:'short' })
    const sunset  = new Date(d.sys.sunset  * 1000).toLocaleTimeString([], { timeStyle:'short' })
    extras.innerHTML = `
      <div>🌥 ${esc(d.weather[0].description)}</div>
      <div>🥵 Feels like ${feels}</div>
      <div>💧 Humidity ${d.main.humidity}%</div>
      <div>🌬 Wind ${Math.round(d.wind.speed)} ${windU}</div>
      <div>🌅 ${sunrise}</div>
      <div>🌇 ${sunset}</div>
    `
  }catch(e){
    $('#w-icon').src = ''; $('#w-temp').textContent = '—'; $('#w-city').textContent = '—'
    extras.innerHTML = ''
    err.hidden = false
    err.textContent = 'Weather unavailable. Try searching a city above.'
    console.error(e)
  }finally{
    main.classList.remove('skeleton'); extras.classList.remove('skeleton')
  }
}

// geo → saved city → manual
function tryGeo(){
  if(!navigator.geolocation){ if(state.city) getByCity(state.city); return }
  navigator.geolocation.getCurrentPosition(
    p => getByCoords(p.coords.latitude, p.coords.longitude),
    _ => { if(state.city) getByCity(state.city) }
  )
}
tryGeo()
if(state.city) getByCity(state.city)
