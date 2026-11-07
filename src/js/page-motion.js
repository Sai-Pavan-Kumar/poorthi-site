(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.querySelector('[data-bar]');
  const tides = [...document.querySelectorAll('[data-tide]')];
  const chapters = [...document.querySelectorAll('[data-ink]')];
  const HEADER_LINE = 28;
  const INK = '#0D0D1A';
  const WHITE = '#FFFFFF';
  const OCEAN = '#005AE0';

  if (!calm) document.querySelectorAll('[data-rise]').forEach(Scrub.splitWords);

  const revealer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-rise], [data-reveal]').forEach((el) => revealer.observe(el));

  function headerInk() {
    const tide = tides.find((section) => {
      const box = section.getBoundingClientRect();
      return box.top <= HEADER_LINE && box.bottom > HEADER_LINE;
    });
    // Once the page is full of water the bar goes solid, so the leaving headline passes under it.
    if (tide) return tide.dataset.full === 'true' ? { ink: WHITE, ground: OCEAN } : { ink: INK, ground: 'transparent' };
    const under = chapters.find((chapter) => {
      const box = chapter.getBoundingClientRect();
      return box.top <= HEADER_LINE && box.bottom > HEADER_LINE;
    });
    if (!under) return { ink: INK, ground: 'transparent' };
    // A solid bar in the chapter's own colour, so scrolling text never runs through the links.
    return { ink: under.dataset.ink, ground: getComputedStyle(under).backgroundColor };
  }

  let queued = false;
  function updateHeader() {
    queued = false;
    const { ink, ground } = headerInk();
    bar.style.setProperty('--bar-ink', ink);
    bar.style.setProperty('--bar-ground', ground);
    bar.classList.toggle('is-on-ocean', ink === WHITE);
  }
  const queueHeader = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(updateHeader);
    }
  };
  addEventListener('scroll', queueHeader, { passive: true });
  addEventListener('resize', queueHeader);
  const fullWatcher = new MutationObserver(queueHeader);
  tides.forEach((section) => fullWatcher.observe(section, { attributes: true, attributeFilter: ['data-full'] }));
  updateHeader();

  const footer = document.querySelector('.foot');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    const footerOnScreen = footer.getBoundingClientRect().top < innerHeight;
    if (!footerOnScreen || y < lastY) bar.classList.remove('is-tucked');
    else if (y > lastY) bar.classList.add('is-tucked');
    lastY = y;
  }, { passive: true });

  // Site names light in reading order as the sentence passes through the screen.
  const list = document.querySelector('[data-sites]');
  if (list && !calm) {
    const names = [...list.querySelectorAll('li')];
    const light = () => {
      const box = list.getBoundingClientRect();
      const travelled = (innerHeight * 0.85 - box.top) / (innerHeight * 0.5 + box.height);
      const lit = Math.round(Math.min(1, Math.max(0, travelled)) * names.length);
      names.forEach((name, i) => name.classList.toggle('is-lit', i < lit));
    };
    addEventListener('scroll', light, { passive: true });
    light();
  } else if (list) {
    list.querySelectorAll('li').forEach((name) => name.classList.add('is-lit'));
  }
})();
