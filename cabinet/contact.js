const form = document.querySelector('#contact');
const feedback = document.querySelector('#sent');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  feedback.textContent = 'Sending your message…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error();
    form.reset();
    feedback.textContent = 'Thank you. Your message has been received.';
  } catch {
    feedback.textContent = 'Your message could not be confirmed. Please try again.';
  } finally {
    button.disabled = false;
  }
});
