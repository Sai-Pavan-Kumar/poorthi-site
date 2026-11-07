// The water drawn in characters: a form is made of typed text, so the tide is too.
// Glyphs are stamped from a pre-rendered sheet, because calling fillText thousands
// of times a frame is what would make this stutter on a cheap phone.
window.AsciiWater = (() => {
  // One alphabet, brightness does the drawing: mixed symbols looked like noise, a uniform grid looks set.
  const DIGITS = '01';
  const LEVELS = 8;
  const FLIPS_PER_CELL = 0.0005; // A few digits change each frame, so still water still feels alive without flickering.
  const MAX_PIXEL_RATIO = 1.5;
  const FOAM_DEPTH = 80;
  const TEXT_CLEARING = 70;
  const QUIET_NEAR_TEXT = 0.14;
  // Below this a cell is still water: only a checkered dot field, so crests sit in one body of water, not floating patches.
  const CREST_FLOOR = 0.14;
  // A slow device gets bigger characters, never a lower frame rate: fewer stamps look intentional, stutter does not.
  const BUDGET_MS = 12;
  const COARSE_SCALE = 1.4;
  const SLOW_FRAMES_ALLOWED = 20;

  function create(canvas, stage) {
    const context = canvas.getContext('2d');
    const clearing = stage.querySelector('.hero__foot, .close__action');
    let sheet = null;
    let cellWidth = 0;
    let cellHeight = 0;
    let ratio = 1;
    let columns = 0;
    let rows = 0;
    let calmth = null;
    let digits = null;
    let scale = 1;
    let slowFrames = 0;

    function buildSheet() {
      sheet = document.createElement('canvas');
      sheet.width = cellWidth * ratio * LEVELS;
      sheet.height = cellHeight * ratio * DIGITS.length;
      const pen = sheet.getContext('2d');
      pen.scale(ratio, ratio);
      pen.font = `600 ${cellHeight - 4}px Outfit, system-ui, sans-serif`;
      pen.textAlign = 'center';
      pen.textBaseline = 'middle';
      for (let level = 0; level < LEVELS; level += 1) {
        const strength = (level + 1) / LEVELS;
        // Pale blue deepening to white at the crests; no second hue enters the water.
        pen.fillStyle = level === LEVELS - 1 ? '#FFFFFF' : `rgba(224, 236, 255, ${(0.22 + strength * 0.68).toFixed(2)})`;
        for (let digit = 0; digit < DIGITS.length; digit += 1) {
          pen.fillText(DIGITS[digit], cellWidth * (level + 0.5), cellHeight * (digit + 0.5));
        }
      }
    }

    // Worked out once per layout: the sentence does not move, so the clearing around it need not be recomputed each frame.
    function buildCalmth() {
      calmth = new Float32Array(columns * rows).fill(1);
      if (!clearing) return;
      const box = clearing.getBoundingClientRect();
      const origin = stage.getBoundingClientRect();
      const left = box.left - origin.left;
      const right = box.right - origin.left;
      const top = box.top - origin.top;
      const bottom = box.bottom - origin.top;
      for (let column = 0; column < columns; column += 1) {
        const x = column * cellWidth;
        for (let row = 0; row < rows; row += 1) {
          const y = row * cellHeight;
          const distance = Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - y, 0, y - bottom));
          const share = Math.min(1, distance / TEXT_CLEARING);
          calmth[column * rows + row] = QUIET_NEAR_TEXT + (1 - QUIET_NEAR_TEXT) * share;
        }
      }
    }

    function resize() {
      const phone = stage.clientWidth <= 860;
      cellWidth = Math.round((phone ? 10 : 11) * scale);
      cellHeight = Math.round((phone ? 15 : 17) * scale);
      ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
      canvas.width = stage.clientWidth * ratio;
      canvas.height = stage.clientHeight * ratio;
      columns = Math.ceil(stage.clientWidth / cellWidth);
      rows = Math.ceil(stage.clientHeight / cellHeight);
      buildSheet();
      buildCalmth();
      digits = Uint8Array.from({ length: columns * rows }, () => Math.round(Math.random()));
    }

    function coarsenIfSlow(spentMs) {
      if (scale !== 1) return;
      slowFrames = spentMs > BUDGET_MS ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames < SLOW_FRAMES_ALLOWED) return;
      scale = COARSE_SCALE;
      resize();
    }

    // Long crest lines bent by two slow swells, with brighter runs of light travelling along them.
    function strengthAt(bend, x, y, seconds) {
      // Square root spacing: crests crowd near the surface and open up with depth, which reads as distance.
      const ridge = 1 - Math.abs(Math.sin(Math.sqrt(y) * 0.55 + bend + seconds * 0.12));
      const light = 0.68 + 0.32 * Math.sin(x * 0.0042 - seconds * 0.55 + y * 0.009);
      return ridge * ridge * light;
    }

    function draw(surfaceAt, seconds) {
      if (!sheet) return;
      const startedAt = performance.now();
      const stampWidth = cellWidth * ratio;
      const stampHeight = cellHeight * ratio;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let flip = digits.length * FLIPS_PER_CELL; flip > 0; flip -= 1) {
        digits[Math.floor(Math.random() * digits.length)] ^= 1;
      }
      for (let column = 0; column < columns; column += 1) {
        const x = column * cellWidth;
        const surface = surfaceAt(x);
        // Kept shallow on purpose: a steeper bend staircases on the character grid and the crests break into islands.
        const bend = Math.sin(x * 0.0024 + seconds * 0.34) * 1.2 + Math.sin(x * 0.006 - seconds * 0.21) * 0.35;
        const firstRow = Math.max(0, Math.floor(surface / cellHeight));
        for (let row = firstRow; row < rows; row += 1) {
          const y = row * cellHeight;
          const foam = Math.max(0, 1 - (y - surface) / FOAM_DEPTH);
          const crest = strengthAt(bend, x, y, seconds);
          const calm = calmth[column * rows + row];
          const strength = Math.max(crest, foam * foam) * calm;
          const onDotGrid = (column + row) % 2 === 0;
          if (strength < CREST_FLOOR && !(onDotGrid && calm === 1)) continue;
          const level = Math.min(LEVELS - 1, Math.floor(strength * LEVELS));
          context.drawImage(sheet, level * stampWidth, digits[column * rows + row] * stampHeight, stampWidth, stampHeight, x * ratio, y * ratio, stampWidth, stampHeight);
        }
      }
      coarsenIfSlow(performance.now() - startedAt);
    }

    return { resize, draw };
  }

  return { create };
})();
