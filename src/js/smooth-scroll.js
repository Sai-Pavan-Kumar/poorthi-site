// A mouse wheel moves in hard notches, which makes the held scenes look like they stutter.
// So wheel input glides towards its target. Touch keeps the phone's own scrolling, which is
// already smooth and which people notice instantly if it is imitated.
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const GLIDE = 0.11;
  const STOP_WITHIN_PX = 0.5;
  const LINE_PX = 40;
  const HEADER_ROOM_PX = 80;

  const limit = () => document.documentElement.scrollHeight - innerHeight;
  let target = scrollY;
  let position = scrollY;
  let gliding = false;

  function glide() {
    position += (target - position) * GLIDE;
    if (Math.abs(target - position) < STOP_WITHIN_PX) position = target;
    scrollTo(0, position);
    gliding = position !== target;
    if (gliding) requestAnimationFrame(glide);
  }

  function glideTo(destination) {
    target = Math.max(0, Math.min(limit(), destination));
    if (gliding) return;
    position = scrollY;
    gliding = true;
    requestAnimationFrame(glide);
  }

  function stopGliding() {
    gliding = false;
    target = scrollY;
    position = scrollY;
  }

  if (!calm && hasMouse) {
    addEventListener('wheel', (event) => {
      if (event.ctrlKey) return; // Pinch and ctrl-wheel are zoom, not scroll.
      event.preventDefault();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? innerHeight : 1;
      const from = gliding ? target : scrollY;
      glideTo(from + event.deltaY * unit);
    }, { passive: false });
    // The keyboard and the scrollbar must always win over a glide still in progress.
    addEventListener('keydown', stopGliding);
    addEventListener('pointerdown', stopGliding);
  }

  // The same glide for menu links, so a jump never teleports past the scenes' sense of place.
  if (!calm) {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const place = document.querySelector(link.getAttribute('href'));
      if (!place) return;
      event.preventDefault();
      glideTo(place.getBoundingClientRect().top + scrollY - HEADER_ROOM_PX);
      history.pushState(null, '', link.getAttribute('href'));
    });
  }
})();
