/* ═══════════════════════════════════════════════════════════════
   MRT1 · BMW iDrive 8 Cockpit · JavaScript Engine
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Clock ──────────────────────────────────────────────────
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

  // ─── Gauge Drawing ──────────────────────────────────────────
  const gaugeState = { rpm: 0, targetRpm: 0 };

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
    const r = Math.min(w, h) / 2 - 25;

    const startA = Math.PI * 0.75;
    const endA = Math.PI * 2.25;
    const span = endA - startA;

    ctx.clearRect(0, 0, w, h);

    // Outer subtle ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, startA, endA);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 180, 60, 0.08)';
    ctx.stroke();

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    // RPM progress
    const ratio = Math.min(gaugeState.rpm / 8000, 1);
    if (ratio > 0.001) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ff6b00');
      grad.addColorStop(0.4, '#ffb84d');
      grad.addColorStop(0.7, '#ffd98a');
      grad.addColorStop(1, '#ffffff');

      ctx.beginPath();
      ctx.arc(cx, cy, r, startA, startA + span * ratio);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.shadowColor = '#ffb84d';
      ctx.shadowBlur = 30;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Redline
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA + span * 0.85, endA);
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 60, 40, 0.5)';
    ctx.stroke();

    // Ticks
    for (let i = 0; i <= 40; i++) {
      const a = startA + span * (i / 40);
      const isMajor = i % 5 === 0;
      const r1 = r - 20;
      const r2 = isMajor ? r - 34 : r - 27;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.lineWidth = isMajor ? 1.8 : 0.6;
      ctx.strokeStyle = isMajor ? 'rgba(255, 180, 60, 0.75)' : 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();
    }
  }

  // ─── Animate gauge smoothly ─────────────────────────────────
  function animateGauge() {
    const diff = gaugeState.targetRpm - gaugeState.rpm;
    if (Math.abs(diff) > 1) {
      gaugeState.rpm += diff * 0.15;
    } else {
      gaugeState.rpm = gaugeState.targetRpm;
    }
    drawGauge();
    requestAnimationFrame(animateGauge);
  }

  // ─── Update Speed & RPM ────────────────────────────────────
  function updateSpeed(speed, rpm) {
    const speedEl = document.getElementById('speed');
    const rpmEl = document.getElementById('rpm');

    if (speedEl) speedEl.textContent = Math.round(speed);
    if (rpmEl) {
      rpmEl.textContent = Math.round(rpm).toLocaleString('en-US').replace(/,/g, ' ') + ' RPM';
    }
    gaugeState.targetRpm = rpm;
  }

  // ─── Mode Switching ────────────────────────────────────────
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

  // ─── Car Drag Rotation ─────────────────────────────────────
  function initCarDrag() {
    const scene = document.querySelector('.scene');
    const car = document.querySelector('.car');
    if (!scene || !car) return;

    let dragging = false;
    let lastX = 0;
    let rotY = -35;

    const startDrag = (x) => {
      dragging = true;
      lastX = x;
      car.style.animation = 'none';
    };

    const moveDrag = (x) => {
      if (!dragging) return;
      const dx = x - lastX;
      lastX = x;
      rotY += dx * 0.6;
      car.style.transform = `rotateX(-18deg) rotateY(${rotY}deg)`;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      setTimeout(() => {
        if (!dragging) {
          car.style.animation = 'carSpin 30s linear infinite';
        }
      }, 2500);
    };

    scene.addEventListener('mousedown', e => startDrag(e.clientX));
    scene.addEventListener('touchstart', e => startDrag(e.touches[0].clientX), { passive: true });
    window.addEventListener('mousemove', e => moveDrag(e.clientX));
    window.addEventListener('touchmove', e => moveDrag(e.touches[0].clientX), { passive: true });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }

  // ─── Simulation ────────────────────────────────────────────
  let t = 0;
  function simulate() {
    t += 0.012;

    // Smooth sine waves for realistic feel
    const speed = 80 + 50 * Math.sin(t * 0.7) + 25 * Math.sin(t * 2.3) + 15 * Math.sin(t * 4.1);
    const rpm = 3200 + 1800 * Math.abs(Math.sin(t * 1.1)) + 500 * Math.sin(t * 3.5);

    updateSpeed(Math.max(0, speed), Math.max(800, rpm));
    requestAnimationFrame(simulate);
  }

  // ─── Init ──────────────────────────────────────────────────
  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    initModes();
    initCarDrag();

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
