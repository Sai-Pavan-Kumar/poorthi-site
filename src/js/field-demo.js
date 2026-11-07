// A small copy of the extension's real rules, so the page proves the claim "it never
// guesses" instead of stating it. Same normalising, block words and refusal lists as the spec.
(() => {
  const input = document.querySelector('#ask');
  const answer = document.querySelector('[data-answer]');
  if (!input || !answer) return;

  const FILLER_WORDS = /\b(your|please|enter|the|what is|in)\b/g;
  const NEVER_FILLED = ['password', 'otp', 'card', 'cvv', 'aadhaar', 'aadhar', 'pan', 'passport', 'bank', 'account number'];
  const LEFT_FOR_YOU = ['gender', 'sex', 'caste', 'religion', 'race', 'ethnicity', 'disability', 'veteran', 'marital'];

  const FIELDS = [
    { label: 'First name', says: ['first name', 'given name', 'fname'], block: ['company', 'manager', 'reference', 'emergency'], value: () => 'Asha' },
    { label: 'Last name', says: ['last name', 'surname', 'family name', 'lname'], block: ['company', 'manager', 'reference', 'emergency'], value: () => 'Rao' },
    { label: 'Full name', says: ['full name', 'your name', 'candidate name', 'applicant name', 'name'], block: ['company', 'first', 'last', 'reference', 'college', 'father', 'mother'], value: () => 'Asha Rao' },
    { label: 'Email', says: ['email', 'e mail', 'mail id'], block: ['alternate', 'secondary', 'parent', 'reference'], value: () => 'asha@example.com' },
    { label: 'Mobile', says: ['phone', 'mobile', 'contact number', 'cell', 'mob no', 'phno'], block: ['alternate', 'alt', 'emergency', 'parent', 'guardian', 'reference', 'office', 'landline'], value: () => '9876543210', why: 'Digits only, because this form did not ask for +91.' },
    { label: 'Notice period', says: ['notice period', 'how soon can you join', 'when can you join', 'availability to join'], value: () => '30 days', why: 'Saved in days, written to match the form.' },
    { label: 'Total experience', says: ['total experience', 'years of experience', 'work experience', 'yoe'], block: ['relevant'], value: () => '2.5 years' },
    { label: 'Current city', says: ['current location', 'current city', 'city', 'location'], block: ['preferred', 'desired', 'relocate', 'birth', 'company'], value: () => 'Hyderabad' },
    { label: 'College', says: ['college', 'university', 'institute'], value: () => 'Osmania University' },
    { label: 'Skills', says: ['skills', 'key skills', 'technical skills'], value: () => 'Excel, SQL, Python' },
    { label: 'LinkedIn', says: ['linkedin'], value: () => 'linkedin.com/in/asharao' },
    { label: 'Resume', says: ['resume', 'cv', 'curriculum vitae'], block: ['cover letter'], value: () => 'Asha-Rao-Resume.pdf', why: 'Attached from your device.' },
    { label: 'Current CTC', says: ['current ctc', 'current salary', 'present salary', 'current package'], block: ['expected', 'desired'], rupees: 600000 },
    { label: 'Expected CTC', says: ['expected ctc', 'ectc', 'expected salary', 'desired salary', 'salary expectation'], block: ['current', 'present'], rupees: 850000 },
  ];

  function normalise(text) {
    return text.toLowerCase().replace(/[_\-.]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(FILLER_WORDS, ' ').replace(/\s+/g, ' ').trim();
  }

  const hasPhrase = (text, phrase) => ` ${text} `.includes(` ${phrase} `);

  function bestField(text) {
    const candidates = FIELDS.filter((field) => !(field.block || []).some((word) => hasPhrase(text, word)));
    let best = null;
    for (const field of candidates) {
      for (const phrase of field.says) {
        if (hasPhrase(text, phrase) && (!best || phrase.length > best.phrase.length)) best = { field, phrase };
      }
    }
    return best && best.field;
  }

  function salaryAnswer(field, rawText) {
    const saved = `Saved as ₹${field.rupees.toLocaleString('en-IN')} a year.`;
    if (/\b(lakh|lakhs|lpa)\b/i.test(rawText)) {
      return { verdict: 'Fills it', value: String(field.rupees / 100000), why: `${saved} The label says lakhs, so it writes lakhs.` };
    }
    if (/\b(month|monthly)\b/i.test(rawText)) {
      return { verdict: 'Fills it', value: Math.round(field.rupees / 12).toLocaleString('en-IN'), why: `${saved} The label says monthly, so it divides by 12.` };
    }
    return { verdict: 'Leaves it for you', value: 'Unit not clear', why: `${saved} This label does not say lakhs or rupees, so it asks you to check.`, left: true };
  }

  function decide(rawText) {
    const text = normalise(rawText);
    if (!text) return { verdict: 'Waiting for a question', value: 'Type a label', why: 'Try something from the last form you filled.', left: true };
    if (NEVER_FILLED.some((word) => hasPhrase(text, word))) {
      return { verdict: 'Never fills this', value: 'Stays yours', why: 'Passwords, payment details, OTPs and ID numbers are never touched.', left: true };
    }
    if (LEFT_FOR_YOU.some((word) => hasPhrase(text, word))) {
      return { verdict: 'Leaves it for you', value: 'Your answer', why: 'Personal questions like this one are not filled unless you turn that on yourself.', left: true };
    }
    const field = bestField(text);
    if (!field) return { verdict: 'Leaves it for you', value: 'Not sure', why: 'No confident match, so the field stays empty and goes on your check list.', left: true };
    if (field.rupees) return salaryAnswer(field, rawText);
    return { verdict: 'Fills it', value: field.value(), why: field.why || `Matched to your saved ${field.label.toLowerCase()}.` };
  }

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TYPE_MS = 26;
  let typing = 0;

  function show() {
    const result = decide(input.value);
    const valueEl = answer.querySelector('.answer__value');
    const changed = valueEl.textContent !== result.value;
    answer.querySelector('.answer__verdict').textContent = result.verdict;
    valueEl.textContent = result.value;
    answer.querySelector('.answer__why').textContent = result.why;
    answer.classList.toggle('is-left', Boolean(result.left));
    // Only a new decision moves; ordinary typing that lands on the same answer stays still.
    if (changed && !calm) {
      valueEl.animate(
        [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    }
  }

  // A sample is typed out, because watching the label arrive is the point of the demo.
  function typeSample(text) {
    clearInterval(typing);
    if (calm) {
      input.value = text;
      show();
      return;
    }
    let length = 0;
    typing = setInterval(() => {
      length += 1;
      input.value = text.slice(0, length);
      if (length === text.length) {
        clearInterval(typing);
        show();
      }
    }, TYPE_MS);
  }

  input.addEventListener('input', () => { clearInterval(typing); show(); });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', () => typeSample(button.dataset.sample));
  });
  show();
})();
