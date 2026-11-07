// One saved value, passed up through a window like a reel and rewritten for each form
// that asks. The reel rests on each value so it can actually be read.
(() => {
  const root = document.querySelector('[data-forms]');
  if (!root || Scrub.calm) return;

  const REST_SHARE = 0.45;
  const items = [...root.querySelectorAll('.forms__item')];

  root.classList.add('is-live');

  // Flat around each whole number, smooth between them.
  function reelPosition(raw) {
    const whole = Math.floor(raw);
    const travel = Math.min(1, Math.max(0, (raw - whole - REST_SHARE / 2) / (1 - REST_SHARE)));
    return whole + travel * travel * (3 - 2 * travel);
  }

  function draw(progress) {
    const position = reelPosition(progress * (items.length - 1));
    items.forEach((item, index) => {
      item.style.transform = `translateY(${(index - position) * 100}%)`;
    });
  }

  Scrub.add(root, draw);
})();
