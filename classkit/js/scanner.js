/* ClassKit — camera scanner.
   Finds several QR codes per video frame with jsQR (each found code is blanked
   out and the frame is scanned again), and reports for each one which side of
   the printed card is on top: A (upright), B, C or D. */
(function (g) {
  'use strict';

  // Angle of the QR's top edge (top-left → top-right corner) in image coords.
  function sideUp(loc) {
    const dx = loc.topRightCorner.x - loc.topLeftCorner.x;
    const dy = loc.topRightCorner.y - loc.topLeftCorner.y;
    const a = Math.atan2(dy, dx) * 180 / Math.PI; // 0 = upright
    if (a > -45 && a <= 45) return 'A';
    if (a > -135 && a <= -45) return 'B'; // card turned a quarter left: B on top
    if (a > 45 && a <= 135) return 'D';
    return 'C';
  }

  /* jsQR gets confused when several codes are in one image, so the frame is cut
     into overlapping tiles at several zoom levels; each tile is decoded alone. */
  function tiles(w, h) {
    const out = [{ x: 0, y: 0, w, h }];
    for (const n of [1.5, 2, 2.5, 3, 4, 5, 6]) {
      const tw = Math.ceil(w / n), th = Math.ceil(h / n);
      const sx = tw / 2, sy = th / 2;
      for (let y = 0; y + th <= h + 1; y += sy) for (let x = 0; x + tw <= w + 1; x += sx) {
        out.push({ x: Math.round(x), y: Math.round(y), w: Math.min(tw, w - Math.round(x)), h: Math.min(th, h - Math.round(y)) });
      }
    }
    return out;
  }
  function scanTile(ctx, t) {
    if (!t || t.w < 40 || t.h < 40) return null;
    const img = ctx.getImageData(t.x, t.y, t.w, t.h);
    const r = g.jsQR(img.data, t.w, t.h, { inversionAttempts: 'dontInvert' });
    if (!r || !r.data) return null;
    for (const k of ['topLeftCorner', 'topRightCorner', 'bottomLeftCorner', 'bottomRightCorner']) {
      r.location[k] = { x: r.location[k].x + t.x, y: r.location[k].y + t.y };
    }
    return r;
  }
  /** Scan a whole canvas once (all tiles). Used by tests and still images. */
  function scanCanvas(ctx, w, h) {
    const found = new Map();
    for (const t of tiles(w, h)) {
      const r = scanTile(ctx, t);
      if (r && !found.has(r.data)) found.set(r.data, sideUp(r.location));
    }
    return found;
  }

  /**
   * start({video, overlay, onCode(text, side, loc), maxPerFrame})
   * returns {stop()}
   */
  async function start(opts) {
    const video = opts.video;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();

    const work = document.createElement('canvas');
    const ctx = work.getContext('2d', { willReadFrequently: true });
    const ov = opts.overlay, octx = ov && ov.getContext('2d');
    let running = true, raf = 0, cursor = 0, list = [];
    const maxW = opts.maxWidth || 1280;
    const seen = new Map(); // text -> {loc, side, t}

    function frame() {
      if (!running) return;
      const vw = video.videoWidth, vh = video.videoHeight;
      if (vw && vh) {
        const s = Math.min(1, maxW / vw);
        const w = Math.round(vw * s), h = Math.round(vh * s);
        if (work.width !== w) { work.width = w; work.height = h; list = tiles(w, h); cursor = 0; }
        ctx.drawImage(video, 0, 0, w, h);
        // Work through the tile list for ~35 ms per frame, then continue next frame.
        const until = performance.now() + (opts.budgetMs || 35);
        do {
          const r = scanTile(ctx, list[cursor]);
          cursor = (cursor + 1) % list.length;
          if (r) {
            const side = sideUp(r.location);
            seen.set(r.data, { loc: r.location, side, t: Date.now() });
            opts.onCode(r.data, side, r.location);
          }
        } while (performance.now() < until && cursor !== 0);
        if (ov) {
          ov.width = w; ov.height = h; octx.clearRect(0, 0, w, h);
          const now = Date.now();
          seen.forEach((v, k) => {
            if (now - v.t > 900) return seen.delete(k);
            drawBox(octx, v.loc, opts.label ? opts.label(k, v.side) : v.side);
          });
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
      },
    };
  }

  function drawBox(c, loc, label) {
    const p = [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner];
    c.lineWidth = 4; c.strokeStyle = '#22c55e';
    c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.closePath(); c.stroke();
    if (label) {
      const cx = p.reduce((s, q) => s + q.x, 0) / 4, cy = p.reduce((s, q) => s + q.y, 0) / 4;
      c.font = 'bold 26px system-ui,sans-serif';
      const w = c.measureText(label).width + 16;
      c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(cx - w / 2, cy - 18, w, 36);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, cx, cy);
    }
  }

  g.CKScanner = { start, sideUp, scanCanvas, tiles };
})(window);
