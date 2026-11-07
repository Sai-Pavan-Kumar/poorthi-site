// Shared clock for the held scenes. Progress is eased toward the real scroll position, so a
// wheel notch reads as weight rather than a jump, while the scrollbar stays the truth.
window.Scrub = (() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CATCH_UP = 0.14;
  const SETTLED = 0.0004;
  const scenes = [];
  let running = false;

  function target(section) {
    const travel = section.offsetHeight - innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel));
  }

  function frame() {
    let moving = false;
    for (const scene of scenes) {
      const goal = target(scene.section);
      const gap = goal - scene.progress;
      if (Math.abs(gap) > SETTLED) {
        scene.progress += gap * CATCH_UP;
        scene.draw(scene.progress);
        moving = true;
      }
    }
    running = moving;
    if (moving) requestAnimationFrame(frame);
  }

  function wake() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);

  // Headings are split so each word can rise out of its own mask.
  function splitWords(heading) {
    const text = heading.textContent.trim();
    heading.setAttribute('aria-label', text);
    heading.textContent = '';
    text.split(/\s+/).forEach((word, index) => {
      const mask = document.createElement('span');
      mask.className = 'word';
      mask.setAttribute('aria-hidden', 'true');
      mask.style.setProperty('--i', index);
      const inner = document.createElement('span');
      inner.textContent = word;
      mask.append(inner);
      heading.append(mask, ' ');
    });
  }

  return {
    calm,
    splitWords,
    add(section, draw) {
      const scene = { section, draw, progress: target(section) };
      scenes.push(scene);
      draw(scene.progress);
    },
  };
})();
