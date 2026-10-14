// ═══════════════════════════════════════════════════════════
// MRT1 — Ultimate Cockpit
// Web Dashboard JavaScript
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Clock ─────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    const dateEl = document.getElementById('date');

    if (clockEl) clockEl.textContent = `${hh}:${mm}`;
    if (dateEl) {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      dateEl.textContent = `${days[now.getDay()]} · ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]}`;
    }
  }

  // ─── RPM Gauge Canvas ──────────────────────────────────────
  function drawGauge(rpm) {
    const canvas = document.getElementById('gauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 15;

    const startA = Math.PI * 0.75;
    const endA = Math.PI * 2.25;
    const span = endA - startA;

    ctx.clearRect(0, 0, w, h);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.stroke();

    // Progress
    const ratio = Math.min(rpm / 8000, 1);
    if (ratio > 0.001) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ff6b00');
      grad.addColorStop(0.5, '#ffb84d');
      grad.addColorStop(1, '#ffffff');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startA, startA + span * ratio);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.shadowColor = '#ffb84d';
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Redline
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA + span * 0.85, endA);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,60,40,0.4)';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= 36; i++) {
      const a = startA + span * (i / 36);
      const r1 = r - 16;
      const r2 = (i % 6 === 0) ? r - 28 : r - 22;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.lineWidth = (i % 6 === 0) ? 1.5 : 0.5;
      ctx.strokeStyle = (i % 6 === 0)
        ? 'rgba(255,180,60,0.7)'
        : 'rgba(255,255,255,0.15)';
      ctx.stroke();
    }
  }

  // ─── Update Speed & RPM ────────────────────────────────────
  function updateSpeed(speed, rpm) {
    const speedEl = document.getElementById('speed');
    const rpmEl = document.getElementById('rpm');

    if (speedEl) speedEl.textContent = Math.round(speed);
    if (rpmEl) {
      rpmEl.textContent = Math.round(rpm)
        .toLocaleString('en-US')
        .replace(/,/g, ' ') + ' RPM';
    }
    drawGauge(rpm);
  }

  // ─── Update Telemetry Cards ────────────────────────────────
  function updateTelemetry(data) {
    // Fuel
    const fuelEl = document.getElementById('fuel');
    const fuelBar = document.getElementById('fuel-bar');
    if (fuelEl && data.fuel !== undefined) {
      fuelEl.innerHTML = Math.round(data.fuel) + '<span class="unit">%</span>';
    }
    if (fuelBar && data.fuel !== undefined) {
      fuelBar.style.width = Math.min(data.fuel, 100) + '%';
    }

    // Battery
    const batEl = document.getElementById('battery');
    const batBar = document.getElementById('battery-bar');
    if (batEl && data.battery !== undefined) {
      batEl.innerHTML = data.battery.toFixed(1) + '<span class="unit">V</span>';
    }
    if (batBar && data.battery !== undefined) {
      const pct = Math.min(Math.max((data.battery - 10) / 5, 0), 1) * 100;
      batBar.style.width = pct + '%';
    }

    // Coolant
    const coolEl = document.getElementById('coolant');
    const coolBar = document.getElementById('coolant-bar');
    if (coolEl && data.coolant !== undefined) {
      coolEl.innerHTML = Math.round(data.coolant) + '<span class="unit">°C</span>';
    }
    if (coolBar && data.coolant !== undefined) {
      coolBar.style.width = Math.min(data.coolant / 130, 1) * 100 + '%';
    }
  }

  // ─── Mode Switching ────────────────────────────────────────
  function initModeSwitching() {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.dataset.mode;
        document.body.setAttribute('data-mode', mode);
      });
    });
  }

  // ─── Car Drag Rotation ─────────────────────────────────────
  function initCarDrag() {
    const wrap = document.querySelector('.car-3d-wrap');
    const car = document.querySelector('.car-3d');
    if (!wrap || !car) return;

    let dragging = false;
    let lastX = 0;
    let rotY = -30;
    let autoRotate = true;

    wrap.addEventListener('mousedown', (e) => {
      dragging = true;
      lastX = e.clientX;
      autoRotate = false;
      car.style.animation = 'none';
    });

    wrap.addEventListener('touchstart', (e) => {
      dragging = true;
      lastX = e.touches[0].clientX;
      autoRotate = false;
      car.style.animation = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      rotY += dx * 0.5;
      car.style.transform = `rotateX(-12deg) rotateY(${rotY}deg)`;
    });

    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - lastX;
      lastX = e.touches[0].clientX;
      rotY += dx * 0.5;
      car.style.transform = `rotateX(-12deg) rotateY(${rotY}deg)`;
    });

    function stopDrag() {
      if (!dragging) return;
      dragging = false;
      setTimeout(() => {
        if (!dragging) {
          autoRotate = true;
          car.style.animation = 'carRotate 25s linear infinite';
        }
      }, 3000);
    }

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
  }

  // ─── Simulation (for testing without real data) ────────────
  let simTime = 0;
  function simulate() {
    simTime += 0.015;

    const speed = 60 + 60 * Math.sin(simTime) + 20 * Math.sin(simTime * 2.7);
    const rpm = 2500 + 2500 * Math.abs(Math.sin(simTime * 1.4));

    updateSpeed(speed, rpm);

    // Occasionally update telemetry
    if (Math.floor(simTime * 30) % 10 === 0) {
      updateTelemetry({
        fuel: 87,
        battery: 14.2,
        coolant: 90
      });
    }

    requestAnimationFrame(simulate);
  }

  // ─── Init ──────────────────────────────────────────────────
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initModeSwitching();
    initCarDrag();

    // Start simulation — replace later with real data source
    simulate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
