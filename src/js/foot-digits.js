// The hero's 0s and 1s return inside the closing wordmark, faint enough to be found rather than seen.
(() => {
  const canvas = document.querySelector('[data-foot-digits]');
  if (!canvas) return;

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pen = canvas.getContext('2d');
  const word = canvas.parentElement;
  const textNode = word.firstChild;
  const mask = document.createElement('canvas');
  const CELL_WIDTH = 11;
  const CELL_HEIGHT = 15;
  const FRAME_MS = 1000 / 12;
  const PEAK_OPACITY = 0.16;
  const FLIP_MIN_MS = 1500;
  const FLIP_SPREAD_MS = 5000;
  const WAVE_SHARPNESS = 5;
  const MAX_RATIO = 2;

  let cells = [];
  let ratio = 1;
  let width = 0;
  let height = 0;

  const randomDigit = () => (Math.random() < 0.5 ? '0' : '1');
  const nextFlip = (now) => now + FLIP_MIN_MS + Math.random() * FLIP_SPREAD_MS;

  function findBaseline(box) {
    const probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0';
    word.insertBefore(probe, canvas);
    const baseline = probe.getBoundingClientRect().bottom - box.top;
    probe.remove();
    return baseline;
  }

  // Each letter is placed where the page put it, so the clip matches the gradient text under any spacing.
  function drawMask(box) {
    const style = getComputedStyle(word);
    const baseline = findBaseline(box);
    const range = document.createRange();
    const shape = mask.getContext('2d');
    mask.width = canvas.width;
    mask.height = canvas.height;
    shape.scale(ratio, ratio);
    shape.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    [...textNode.textContent].forEach((letter, i) => {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      shape.fillText(letter, range.getBoundingClientRect().left - box.left, baseline);
    });
  }

  function layout() {
    const box = word.getBoundingClientRect();
    ratio = Math.min(devicePixelRatio || 1, MAX_RATIO);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    drawMask(box);

    const now = performance.now();
    cells = [];
    for (let y = CELL_HEIGHT; y < height; y += CELL_HEIGHT) {
      for (let x = 0; x < width; x += CELL_WIDTH) {
        cells.push({ x, y, digit: randomDigit(), flipAt: nextFlip(now) });
      }
    }
  }

  function waveOpacity(x, y, seconds) {
    const crest = Math.sin(x * 0.009 + y * 0.012 + seconds * 0.7 + Math.sin(y * 0.02 + seconds * 0.25));
    // A steep power keeps the light in narrow bands and leaves the troughs almost empty.
    return PEAK_OPACITY * ((crest + 1) / 2) ** WAVE_SHARPNESS;
  }

  function draw(now) {
    const seconds = now / 1000;
    pen.setTransform(1, 0, 0, 1, 0, 0);
    pen.globalCompositeOperation = 'source-over';
    pen.clearRect(0, 0, canvas.width, canvas.height);
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    pen.font = `500 ${CELL_HEIGHT - 3}px ${getComputedStyle(word).fontFamily}`;
    pen.fillStyle = getComputedStyle(word).getPropertyValue('--white');
    for (const cell of cells) {
      if (now >= cell.flipAt) {
        cell.digit = randomDigit();
        cell.flipAt = nextFlip(now);
      }
      const opacity = waveOpacity(cell.x, cell.y, seconds);
      if (opacity < 0.004) continue;
      pen.globalAlpha = opacity;
      pen.fillText(cell.digit, cell.x, cell.y);
    }
    pen.globalAlpha = 1;
    pen.globalCompositeOperation = 'destination-in';
    pen.setTransform(1, 0, 0, 1, 0, 0);
    pen.drawImage(mask, 0, 0);
  }

  let frame = 0;
  let lastDraw = 0;
  function tick(now) {
    frame = requestAnimationFrame(tick);
    if (now - lastDraw < FRAME_MS) return;
    lastDraw = now;
    draw(now);
  }
  const start = () => { if (!frame && !calm) frame = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };

  function refresh() {
    layout();
    draw(performance.now());
  }

  document.fonts.load(`800 100px ${getComputedStyle(word).fontFamily}`).then(() => {
    refresh();
    new ResizeObserver(refresh).observe(word);
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(word);
  });
})();
