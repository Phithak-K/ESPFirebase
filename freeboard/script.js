// =========================================================================
// ⚙️ Firebase Database URL Configuration (ซ่อนคีย์เมื่อ Deploy บน GitHub)
// ลำดับการอ่านค่า:
// 1. จาก URL Query Parameter (?db=https://...) สะดวกเวลาเปิดผ่าน GitHub Pages
// 2. จากไฟล์ config.js (ถูกซ่อนด้วย .gitignore ไว้ ไม่หลุดขึ้น GitHub)
// 3. จาก LocalStorage ในเบราว์เซอร์
// =========================================================================

const urlParams = new URLSearchParams(window.location.search);
const queryDbUrl = urlParams.get('db');
if (queryDbUrl) {
    let cleanUrl = queryDbUrl.trim();
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
    localStorage.setItem('esp32_db_url', cleanUrl);
    window.history.replaceState({}, document.title, window.location.pathname);
}

const fileDbUrl = (typeof window.FIREBASE_CONFIG !== 'undefined' && window.FIREBASE_CONFIG.DATABASE_URL) 
    ? window.FIREBASE_CONFIG.DATABASE_URL.trim() 
    : "";

let DB_URL = fileDbUrl || localStorage.getItem('esp32_db_url') || "";
// Student ID placeholder in database path
const DEVICE_PATH = "/iot-120"; 

// DOM Elements
const modal = document.getElementById('configModal');
const dbUrlInput = document.getElementById('dbUrlInput');
const saveBtn = document.getElementById('saveBtn');

const tempVal = document.getElementById('tempValue');
const humiVal = document.getElementById('humiValue');
const lightVal = document.getElementById('lightValue');
const pressureVal = document.getElementById('pressureValue');
const soilVal = document.getElementById('soilValue');
const batteryVal = document.getElementById('batteryValue');

// Progress bars
const tempBar     = document.getElementById('tempBar');
const humiBar     = document.getElementById('humiBar');
const lightBar    = document.getElementById('lightBar');
const pressureBar = document.getElementById('pressureBar');
const soilBar     = document.getElementById('soilBar');
const batteryBar  = document.getElementById('batteryBar');

const statusPulse = document.getElementById('statusPulse');
const statusText  = document.getElementById('statusText');
const statusPill  = document.getElementById('statusPill');
const lastUpdated = document.getElementById('lastUpdated');

function setBar(el, value, min, max) {
    if (!el || value === undefined || value === null) return;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    el.style.width = pct + '%';
}

// Circumference for r=20 SVG circle = 2π×20 ≈ 125.66
const CIRC = 2 * Math.PI * 20;
function setGauge(id, value, min, max) {
    const arc = document.getElementById(id);
    if (!arc || value === undefined || value === null) return;
    const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
    arc.style.strokeDashoffset = CIRC * (1 - pct);
}

// ═══════════════════════════════════════════
// 🌡️ HEALTH STATUS — Thresholds per sensor
// ═══════════════════════════════════════════
const THRESHOLDS = {
    temp:     { warn: 35,  danger: 40,  unit: '°C',  label: 'Temperature' },
    humi:     { warn: 80,  danger: 90,  unit: '%',   label: 'Humidity', lowWarn: 20, lowDanger: 10 },
    light:    { warn: 900, danger: 1100,unit: 'lx',  label: 'Light Level' },
    pressure: { warn: 1010,danger: 1020,unit: 'hPa', label: 'Pressure', lowWarn: 980, lowDanger: 960 },
    soil:     { warn: 80,  danger: 90,  unit: '%',   label: 'Soil Moisture', lowWarn: 20, lowDanger: 10 },
    battery:  { warn: null,danger: null,unit: '%',   label: 'Battery', lowWarn: 30, lowDanger: 15 }
};

const toastCooldown = {}; // prevent spam

function setHealth(key, value) {
    const el = document.getElementById(key + 'Health');
    const t  = THRESHOLDS[key];
    if (!el || !t || value === undefined || value === null) return;

    let level = 'ok', icon = '✅', text = 'Normal';

    // High threshold check
    if (t.danger !== null && value >= t.danger)     { level = 'danger'; icon = '🚨'; text = 'DANGER'; }
    else if (t.warn !== null && value >= t.warn)    { level = 'warn';   icon = '⚠️'; text = 'Warning'; }
    // Low threshold check
    else if (t.lowDanger !== undefined && value <= t.lowDanger) { level = 'danger'; icon = '🚨'; text = 'DANGER LOW'; }
    else if (t.lowWarn   !== undefined && value <= t.lowWarn)   { level = 'warn';   icon = '⚠️'; text = 'Low'; }

    el.className = `health-badge visible ${level}`;
    el.innerHTML = `${icon} ${text}`;

    // Trigger toast if warn/danger and not on cooldown
    if (level !== 'ok') {
        const now = Date.now();
        if (!toastCooldown[key] || now - toastCooldown[key] > 30000) {
            toastCooldown[key] = now;
            showToast(level, t.label, `ค่า ${t.label} = ${value} ${t.unit} (${text})`);
        }
    }
}

// ═══════════════════════════════════════════
// 🚨 TOAST ALERT SYSTEM
// ═══════════════════════════════════════════
const toastContainer = document.getElementById('toastContainer');

function showToast(level, title, msg) {
    const toast = document.createElement('div');
    toast.className = `toast ${level}`;
    const iconHtml = level === 'danger'
        ? '<i class="fa-solid fa-triangle-exclamation"></i>'
        : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `
        <div class="toast-icon">${iconHtml}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>`;
    toastContainer.appendChild(toast);

    // Click to dismiss
    toast.addEventListener('click', () => dismissToast(toast));
    // Auto dismiss after 6s
    setTimeout(() => dismissToast(toast), 6000);
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => toast.parentNode && toast.parentNode.removeChild(toast), 300);
}

// ═══════════════════════════════════════════
// 📊 EXPORT CSV
// ═══════════════════════════════════════════
let lastHistoryData = null; // keep a reference for export

document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!lastHistoryData) {
        showToast('warn', 'ไม่มีข้อมูล', 'ยังไม่มีข้อมูล History กรุณารอสักครู่');
        return;
    }
    const rows = [['Timestamp', 'Temperature(°C)', 'Humidity(%)', 'Light(lx)', 'Pressure(hPa)', 'SoilMoisture(%)', 'Battery(%)']];
    const records = Object.values(lastHistoryData).sort((a,b) => (a.timestamp||0)-(b.timestamp||0));
    records.forEach(r => {
        if (!r) return;
        const t = r.timestamp ? new Date(r.timestamp * 1000).toLocaleString('th-TH') : '';
        rows.push([t, r.temp??'', r.humi??'', r.light??'', r.pressure??'', r.soil??'', r.battery??'']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `iot-120_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('warn', 'Export สำเร็จ ✅', `ดาวน์โหลด ${records.length} รายการแล้ว`);
});

// Chart Instance
let historyChart;

// Initialize
if (!DB_URL) {
    modal.classList.remove('hidden');
} else {
    modal.classList.add('hidden');
    initDashboard();
}

const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        dbUrlInput.value = DB_URL;
        modal.classList.remove('hidden');
    });
}

modal.addEventListener('click', (e) => {
    if (e.target === modal && DB_URL) {
        modal.classList.add('hidden');
    }
});

saveBtn.addEventListener('click', () => {
    let url = dbUrlInput.value.trim();
    if(url) {
        if(url.endsWith('/')) url = url.slice(0, -1);
        localStorage.setItem('esp32_db_url', url);
        DB_URL = url;
        modal.classList.add('hidden');
        initDashboard();
    }
});

function initDashboard() {
    if(!historyChart) initChart();
    fetchLatest();
    fetchHistory();
    setInterval(fetchLatest, 5000);
    setInterval(fetchHistory, 10000);
}

function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temp (°C)',
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4,
                    data: []
                },
                {
                    label: 'Humi (%)',
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4,
                    data: []
                },
                {
                    label: 'Light (lx)',
                    borderColor: '#eab308',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    data: []
                },
                {
                    label: 'Pressure (hPa)',
                    borderColor: '#a855f7',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y2',
                    data: [],
                    hidden: true // hidden by default to keep chart clean
                },
                {
                    label: 'Soil (%)',
                    borderColor: '#22c55e',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.4,
                    data: [],
                    hidden: true
                },
                {
                    label: 'Battery (%)',
                    borderColor: '#ec4899',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.4,
                    data: [],
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12
                },
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, usePointStyle: true, padding: 20 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    title: { display: true, text: 'Temp, Humi, Soil, Battery' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Light (lx)' }
                },
                y2: {
                    type: 'linear',
                    display: 'auto',
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Pressure (hPa)' }
                }
            }
        }
    });
}

async function fetchLatest() {
    try {
        const res = await fetch(`${DB_URL}${DEVICE_PATH}/latest.json`);
        if (!res.ok) throw new Error("Network response was not ok");
        
        const data = await res.json();
        
        if (data) {
            if(data.temp !== undefined)     { tempVal.innerText      = data.temp.toFixed(1);      setBar(tempBar,     data.temp,     -10, 60);   setGauge('tempArc',     data.temp,     -10, 60);   setHealth('temp',     data.temp); }
            if(data.humi !== undefined)     { humiVal.innerText      = data.humi.toFixed(1);      setBar(humiBar,     data.humi,     0, 100);     setGauge('humiArc',     data.humi,     0, 100);    setHealth('humi',     data.humi); }
            if(data.light !== undefined)    { lightVal.innerText     = Math.round(data.light);    setBar(lightBar,    data.light,    0, 1200);    setGauge('lightArc',    data.light,    0, 1200);   setHealth('light',    data.light); }
            if(data.pressure !== undefined) { pressureVal.innerText  = Math.round(data.pressure); setBar(pressureBar, data.pressure, 950, 1050); setGauge('pressureArc', data.pressure, 950, 1050); setHealth('pressure', data.pressure); }
            if(data.soil !== undefined)     { soilVal.innerText      = data.soil.toFixed(1);      setBar(soilBar,     data.soil,     0, 100);     setGauge('soilArc',     data.soil,     0, 100);    setHealth('soil',     data.soil); }
            if(data.battery !== undefined)  { batteryVal.innerText   = Math.round(data.battery);  setBar(batteryBar,  data.battery,  0, 100);     setGauge('batteryArc',  data.battery,  0, 100);    setHealth('battery',  data.battery); }
            
            if (data.timestamp) {
                const date = new Date(data.timestamp * 1000);
                const t = date.toLocaleTimeString('th-TH');
                lastUpdated.innerText = t;
                const lu2 = document.getElementById('lastUpdated2');
                if (lu2) lu2.innerText = '🕐 ' + t;
            }

            setConnectionStatus(true);
        } else {
            setConnectionStatus(false);
        }
    } catch (err) {
        console.error("Latest Fetch Error:", err);
        setConnectionStatus(false);
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(`${DB_URL}${DEVICE_PATH}/history.json?orderBy="$key"&limitToLast=30`);
        if (!res.ok) throw new Error("Network response was not ok");
        
        const data = await res.json();
        
        if (data) {
            lastHistoryData = data;
            updateChart(data);
        }
    } catch (err) {
        console.error("History Fetch Error:", err);
    }
}

function updateChart(dataObj) {
    const labels = [];
    const tempData = [];
    const humiData = [];
    const lightData = [];
    const pressureData = [];
    const soilData = [];
    const batteryData = [];

    const records = Object.values(dataObj);
    records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    records.forEach(record => {
        if (!record) return;
        
        if (record.timestamp) {
            const d = new Date(record.timestamp * 1000);
            labels.push(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`);
        } else {
            labels.push('');
        }

        tempData.push(record.temp || null);
        humiData.push(record.humi || null);
        lightData.push(record.light || null);
        pressureData.push(record.pressure || null);
        soilData.push(record.soil || null);
        batteryData.push(record.battery || null);
    });

    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = tempData;
    historyChart.data.datasets[1].data = humiData;
    historyChart.data.datasets[2].data = lightData;
    historyChart.data.datasets[3].data = pressureData;
    historyChart.data.datasets[4].data = soilData;
    historyChart.data.datasets[5].data = batteryData;
    
    historyChart.update();
}

function setConnectionStatus(connected) {
    if (connected) {
        statusPulse.classList.add('active');
        statusText.innerText = "Live";
        if (statusPill) statusPill.classList.add('connected');
    } else {
        statusPulse.classList.remove('active');
        statusText.innerText = "Disconnected";
        if (statusPill) statusPill.classList.remove('connected');
    }
}
