/* ═══════════════════════════════════════════════════════════════
   MRT1 · BMW iDrive 8 Authentic Cockpit · Engine
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CLOCK
  // ═══════════════════════════════════════════════════════════
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');

    if (clock) clock.textContent = `${hh}:${mm}`;
    if (date) {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      date.textContent = `${days[now.getDay()]} · ${String(now.getDate()).padStart(2, '0')} ${months[now.getMonth()]}`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GAUGE (Canvas)
  // ═══════════════════════════════════════════════════════════
  const gaugeState = {
    rpm: 0,
    targetRpm: 0,
    maxRpm: 8000
  };

  function drawGauge() {
    const canvas = document.getElementById('gauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 20;

    const startA = Math.PI * 0.75;
    const endA = Math.PI * 2.25;
    const span = endA - startA;

    ctx.clearRect(0, 0, w, h);

    // Outer subtle ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, startA, endA);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(28, 105, 212, 0.08)';
    ctx.stroke();

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // RPM progress arc
    const ratio = Math.min(gaugeState.rpm / gaugeState.maxRpm, 1);
    if (ratio > 0.001) {
      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0.0, '#1c69d4');
      grad.addColorStop(0.5, '#4a9eff');
      grad.addColorStop(0.85, '#a8d0ff');
      grad.addColorStop(1.0, '#ffffff');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startA, startA + span * ratio);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.shadowColor = '#4a9eff';
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Redline
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA + span * 0.84, endA);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 60, 40, 0.45)';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= 40; i++) {
      const a = startA + span * (i / 40);
      const isMajor = i % 5 === 0;
      const r1 = r - 16;
      const r2 = isMajor ? r - 30 : r - 23;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.lineWidth = isMajor ? 1.8 : 0.6;
      ctx.strokeStyle = isMajor
        ? 'rgba(74, 158, 255, 0.75)'
        : 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
    }
  }

  // Smooth animation loop
  function animateGauge() {
    const diff = gaugeState.targetRpm - gaugeState.rpm;
    if (Math.abs(diff) > 2) {
      gaugeState.rpm += diff * 0.18;
    } else {
      gaugeState.rpm = gaugeState.targetRpm;
    }
    drawGauge();
    requestAnimationFrame(animateGauge);
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE SPEED & RPM
  // ═══════════════════════════════════════════════════════════
  function updateSpeed(speed, rpm) {
    const speedEl = document.getElementById('speed');
    const rpmEl = document.getElementById('rpm');

    if (speedEl) {
      speedEl.textContent = Math.round(speed);
    }
    if (rpmEl) {
      rpmEl.textContent = Math.round(rpm)
        .toLocaleString('en-US')
        .replace(/,/g, ' ');
    }
    gaugeState.targetRpm = rpm;
  }

  // ═══════════════════════════════════════════════════════════
  // MODE PILLS
  // ═══════════════════════════════════════════════════════════
  function initModes() {
    const pills = document.querySelectorAll('.mode-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const mode = pill.dataset.mode;
        document.body.setAttribute('data-mode', mode);

        // Update gear mode label
        const gearMode = document.querySelector('.gear-mode');
        if (gearMode) {
          gearMode.textContent = mode.toUpperCase();
        }

        // Update page accent color based on mode
        applyModeTheme(mode);
      });
    });
  }

  function applyModeTheme(mode) {
    const root = document.documentElement;
    const themes = {
      comfort:  { accent: '#1c69d4', glow: '#4a9eff' },
      sport:    { accent: '#d41818', glow: '#ff4a4a' },
      eco:      { accent: '#1cd46c', glow: '#4aff9e' },
      adaptive: { accent: '#8b3fd4', glow: '#b87aff' }
    };
    const theme = themes[mode] || themes.comfort;

    root.style.setProperty('--bmw-blue', theme.accent);
    root.style.setProperty('--bmw-blue-glow', theme.glow);
  }

  // ═══════════════════════════════════════════════════════════
  // SIMULATION (Replace with real data later)
  // ═══════════════════════════════════════════════════════════
  let simTime = 0;

  function simulate() {
    simTime += 0.012;

    const speed = 85 +
                  45 * Math.sin(simTime * 0.6) +
                  25 * Math.sin(simTime * 2.1) +
                  12 * Math.sin(simTime * 4.3);

    const rpm = 3300 +
                1700 * Math.abs(Math.sin(simTime * 1.1)) +
                400 * Math.sin(simTime * 3.2);

    updateSpeed(Math.max(0, speed), Math.max(800, rpm));
    requestAnimationFrame(simulate);
  }

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS (Bonus)
  // ═══════════════════════════════════════════════════════════
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Number keys 1-4 for modes
      const modes = ['comfort', 'sport', 'eco', 'adaptive'];
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) {
        const pills = document.querySelectorAll('.mode-pill');
        if (pills[num - 1]) pills[num - 1].click();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initModes();
    initKeyboard();

    drawGauge();
    animateGauge();
    simulate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
