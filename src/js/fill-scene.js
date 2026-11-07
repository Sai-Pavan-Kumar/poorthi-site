// The product's one job, shown at the visitor's own pace: scrolling types the form.
// The markup already holds the finished form, so nothing is lost if this never runs.
(() => {
  const root = document.querySelector('[data-fill]');
  if (!root || Scrub.calm) return;

  const SAVE_ENDS = 0.2;
  const OPEN_ENDS = 0.38;
  const TYPING_ENDS = 0.8;

  const beats = [...root.querySelectorAll('.beat')];
  const steps = [...root.querySelectorAll('.fill__steps li')];
  const title = root.querySelector('.win__title');
  const status = root.querySelector('.win__status');
  const submit = root.querySelector('.win__submit');
  const fields = [...root.querySelectorAll('.win__field')].map((el) => ({
    el,
    box: el.querySelector('i'),
    value: el.dataset.value,
    shown: null,
  }));
  const typed = fields.filter((field) => field.value);

  beats.forEach((beat) => Scrub.splitWords(beat.querySelector('h2')));
  root.classList.add('is-live');

  function beatAt(progress) {
    if (progress < SAVE_ENDS) return 0;
    if (progress < OPEN_ENDS) return 1;
    if (progress < TYPING_ENDS) return 2;
    return 3;
  }

  function setText(field, text) {
    if (field.shown !== text) {
      field.box.textContent = text;
      field.shown = text;
    }
  }

  // Fields type one after another, each given an equal slice of the typing stretch.
  function typeFields(progress, shownTyped) {
    const share = (progress - OPEN_ENDS) / (TYPING_ENDS - OPEN_ENDS);
    let done = 0;
    shownTyped.forEach((field, index) => {
      const own = Math.min(1, Math.max(0, share * shownTyped.length - index));
      setText(field, field.value.slice(0, Math.ceil(own * field.value.length)));
      field.el.classList.toggle('is-filled', own > 0);
      if (own === 1) done += 1;
    });
    return done;
  }

  function draw(progress) {
    const beat = beatAt(progress);
    beats.forEach((el, i) => el.classList.toggle('is-on', i === beat));
    steps.forEach((el, i) => el.classList.toggle('is-on', i === beat));
    title.textContent = beat === 0 ? 'Your details' : 'Apply for this job';
    submit.classList.toggle('is-away', beat !== 3);
    status.classList.toggle('is-button', beat === 1);

    const needed = fields.find((field) => !field.value);
    needed.el.classList.toggle('is-away', beat === 0);
    needed.el.classList.toggle('is-needed', beat === 3);

    if (beat === 0) {
      typed.forEach((field) => { setText(field, field.value); field.el.classList.remove('is-filled'); });
      status.textContent = 'Saved on this device';
    } else if (beat === 1) {
      typed.forEach((field) => { setText(field, ''); field.el.classList.remove('is-filled'); });
      status.textContent = 'Fill this form';
    } else {
      // Short screens hide two rows, and the count must match the rows a visitor can see.
      const shownTyped = typed.filter((field) => field.el.offsetParent !== null);
      const total = shownTyped.length + 1;
      const done = typeFields(progress, shownTyped);
      status.textContent = beat === 3
        ? `${shownTyped.length} of ${total} filled. One needs you.`
        : `${done} of ${total} filled`;
    }
  }

  Scrub.add(root, draw);
})();
