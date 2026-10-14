/* ═══════════════════════════════════════════════════════════════
   MRT1 · iDrive 8 Premium Cockpit · Engine
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ═══ CLOCK ═══
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const clock = document.getElementById('clock');
    const date = document.getElementById('date');

    if (clock) clock.textContent = `${hh}:${mm}`;
    if (date) {
      const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      date.textContent = `${days[now.getDay()]} · ${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]}`;
    }
  }

  // ═══ GAUGE ═══
  const gauge = {
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
    const r = Math.min(w, h) / 2 - 35;

    const startA = Math.PI * 0.72;
    const endA = Math.PI * 2.28;
    const span = endA - startA;

    ctx.clearRect(0, 0, w, h);

    // Outer soft ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, startA, endA);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 180, 60, 0.06)';
    ctx.stroke();

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    // RPM arc
    const ratio = Math.min(gauge.rpm / gauge.maxRpm, 1);
    if (ratio > 0.001) {
      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, '#ff6b00');
      grad.addColorStop(0.35, '#ffb84d');
      grad.addColorStop(0.7, '#ffd98a');
      grad.addColorStop(1, '#ffffff');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startA, startA + span * ratio);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.shadowColor = '#ffb84d';
      ctx.shadowBlur = 35;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Redline
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA + span * 0.84, endA);
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 60, 40, 0.55)';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= 40; i++) {
      const a = startA + span * (i / 40);
      const isMajor = i % 5 === 0;
      const r1 = r - 24;
      const r2 = isMajor ? r - 40 : r - 32;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.lineWidth = isMajor ? 2 : 0.7;
      ctx.strokeStyle = isMajor
        ? 'rgba(255, 180, 60, 0.8)'
        : 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
    }
  }

  function animateGauge() {
    const diff = gauge.targetRpm - gauge.rpm;
    if (Math.abs(diff) > 2) {
      gauge.rpm += diff * 0.18;
    } else {
      gauge.rpm = gauge.targetRpm;
    }
    drawGauge();
    requestAnimationFrame(animateGauge);
  }

  // ═══ UPDATE SPEED ═══
  function updateSpeed(speed, rpm) {
    const speedEl = document.getElementById('speed');
    const rpmEl = document.getElementById('rpm');

    if (speedEl) {
      speedEl.textContent = Math.round(speed);
    }
    if (rpmEl) {
      rpmEl.textContent = Math.round(rpm)
        .toLocaleString('en-US')
        .replace(/,/g, ' ') + ' RPM';
    }
    gauge.targetRpm = rpm;
  }

  // ═══ MODES ═══
  function initModes() {
    const modes = document.querySelectorAll('.mode');
    modes.forEach(btn => {
      btn.addEventListener('click', () => {
        modes.forEach(m => m.classList.remove('active'));
        btn.classList.add('active');
        document.body.setAttribute('data-mode', btn.dataset.mode);
      });
    });
  }

  // ═══ CAR DRAG ═══
  function initCarDrag() {
    const scene = document.querySelector('.stage-scene');
    const carSvg = document.querySelector('.car-svg');
    if (!scene || !carSvg) return;

    let dragging = false;
    let lastX = 0;
    let rotY = 0;
    let velY = 0;

    const start = (x) => {
      dragging = true;
      lastX = x;
      velY = 0;
    };

    const move = (x) => {
      if (!dragging) return;
      const dx = x - lastX;
      lastX = x;
      velY = dx * 0.5;
      rotY += velY;
      applyRotation(rotY);
    };

    const end = () => {
      dragging = false;
      // momentum
      const momentum = () => {
        if (Math.abs(velY) < 0.1) {
          rotY = 0;
          applyRotation(0);
          return;
        }
        velY *= 0.94;
        rotY += velY;
        applyRotation(rotY);
        requestAnimationFrame(momentum);
      };
      momentum();
    };

    function applyRotation(deg) {
      // Rotate SVG subtly — max ±15deg because it's a side-view
      const clamped = Math.max(-15, Math.min(15, deg * 0.15));
      carSvg.style.transform = `rotateY(${clamped}deg)`;
    }

    scene.addEventListener('mousedown', e => start(e.clientX));
    scene.addEventListener('touchstart', e => start(e.touches[0].clientX), { passive: true });
    window.addEventListener('mousemove', e => move(e.clientX));
    window.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  }

  // ═══ PARTICLES ═══
  function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position: absolute;
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
        border-radius: 50%;
        background: rgba(255, 180, 60, ${0.1 + Math.random() * 0.3});
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        filter: blur(1px);
        animation: particleFloat ${8 + Math.random() * 12}s linear infinite;
        animation-delay: ${-Math.random() * 20}s;
      `;
      container.appendChild(p);
    }
  }

  // ═══ SIMULATION ═══
  let t = 0;
  function simulate() {
    t += 0.012;

    const speed = 85 + 45 * Math.sin(t * 0.6) + 25 * Math.sin(t * 2.1) + 12 * Math.sin(t * 4.3);
    const rpm = 3300 + 1700 * Math.abs(Math.sin(t * 1.1)) + 400 * Math.sin(t * 3.2);

    updateSpeed(Math.max(0, speed), Math.max(800, rpm));
    requestAnimationFrame(simulate);
  }

  // ═══ INIT ═══
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initModes();
    initCarDrag();
    initParticles();

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
