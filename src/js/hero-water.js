// The water is the product's promise acted out: it rises and fills the page the way
// the extension fills a form. It is one clipped layer, so the headline underneath
// changes colour exactly where the surface crosses it. Hero and close share this code.
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INTRO_MS = 1100;
  const INTRO_RISE = 0.1; // Small enough that the sentence below the headline is always under water.
  const POINT_SPACING = 28;
  const FRAME_MS = 1000 / 40; // Capped so low-end phones keep scrolling smoothly.
  const FULL_SURFACE_PX = 40;
  const ACTION_SHOWS_BELOW = 0.62;

  function startTide(section) {
    const stage = section.firstElementChild;
    const water = section.querySelector('[data-water]');
    const chips = [...section.querySelectorAll('.drift__chip')];
    // Hero rests partway up and only rises further on scroll; the close starts empty.
    // The hero's level lives in CSS as --rest, because the layout hangs from the same line.
    const cssRest = parseFloat(getComputedStyle(section).getPropertyValue('--rest'));
    const restLevel = cssRest ? cssRest / 100 : 1;
    const introFrom = cssRest ? restLevel + INTRO_RISE : restLevel;

    let width = 0;
    let height = 0;
    let scrollShare = 0;
    let ripple = { x: 0, strength: 0 };
    let visible = true;
    let lastFrame = 0;
    let startedAt = performance.now();
    const ascii = AsciiWater.create(section.querySelector('[data-ascii]'), stage);

    function measure() {
      width = stage.clientWidth;
      height = stage.clientHeight;
      ascii.resize();
    }

    // Reduced motion gets one still drawing of the water, at its resting level.
    if (calm) {
      const paintStill = () => {
        measure();
        const surface = cssRest ? restLevel * height : 0;
        ascii.draw(() => surface, 0);
      };
      paintStill();
      document.fonts.ready.then(paintStill);
      addEventListener('resize', paintStill);
      return;
    }

    function readScroll() {
      const travel = section.offsetHeight - height;
      scrollShare = travel > 0 ? Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel)) : 0;
      chips.forEach((chip) => chip.style.setProperty('--share', scrollShare.toFixed(3)));
    }

    function currentLevel(now) {
      const progress = Math.min(1, (now - startedAt) / INTRO_MS);
      const eased = 1 - Math.pow(1 - progress, 4);
      const resting = introFrom + (restLevel - introFrom) * eased;
      // Overshoots the top so the waves are fully gone when the next chapter arrives.
      return resting * (1 - scrollShare) - 0.05 * scrollShare;
    }

    function waveHeight(x, seconds) {
      const swell = Math.sin(x / 260 + seconds * 0.7) * 11;
      const chop = Math.sin(x / 97 - seconds * 1.15) * 4;
      const distance = (x - ripple.x) / 110;
      return swell + chop - ripple.strength * Math.exp(-distance * distance);
    }

    function draw(now) {
      requestAnimationFrame(draw);
      if (!visible || now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      ripple.strength *= 0.94;

      const level = currentLevel(now);
      const surface = level * height;
      const seconds = now / 1000;
      const points = [];
      for (let x = 0; x <= width + POINT_SPACING; x += POINT_SPACING) {
        points.push(`${x}px ${(surface + waveHeight(x, seconds)).toFixed(1)}px`);
      }
      points.push(`${width + POINT_SPACING}px ${height}px`, `0px ${height}px`);
      water.style.clipPath = `polygon(${points.join(',')})`;
      ascii.draw((x) => surface + waveHeight(x, seconds), seconds);

      const full = surface < FULL_SURFACE_PX;
      if ((section.dataset.full === 'true') !== full) section.dataset.full = String(full);
      section.classList.toggle('is-up', level < ACTION_SHOWS_BELOW);
    }

    stage.addEventListener('pointermove', (event) => {
      ripple = { x: event.clientX, strength: Math.min(26, ripple.strength + Math.abs(event.movementX) * 0.5) };
    }, { passive: true });

    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(section);
    addEventListener('resize', () => { measure(); readScroll(); });
    addEventListener('scroll', readScroll, { passive: true });
    measure();
    readScroll();
    document.fonts.ready.then(measure); // The glyph sheet must be drawn in the real typeface.
    startedAt = performance.now();
    requestAnimationFrame(draw);
  }

  document.querySelectorAll('[data-tide]').forEach(startTide);
})();
