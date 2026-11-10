const measurementId = 'G-LVQN6YF718';
const choiceKey = 'eyeballsinjar.analytics';
const prompt = document.querySelector('#analytics-choice');
let choice;
try { choice = localStorage.getItem(choiceKey); } catch {}
let loaded = false;
function enableAnalytics() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    analytics_storage: 'granted', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  });
  gtag('js', new Date());
  gtag('config', measurementId);
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.append(tag);
}
function choose(value) {
  choice = value;
  try { localStorage.setItem(choiceKey, value); } catch {}
  prompt.hidden = true;
  window['ga-disable-' + measurementId] = value !== 'yes';
  if (value === 'yes') enableAnalytics();
  else if (loaded) location.reload();
}
prompt.querySelector('[data-accept]').onclick = () => choose('yes');
prompt.querySelector('[data-decline]').onclick = () => choose('no');
document.querySelector('#cookie-settings').onclick = () => {
  prompt.hidden = false;
  prompt.querySelector('button').focus();
};
prompt.hidden = choice === 'yes' || choice === 'no';
if (choice === 'yes') enableAnalytics();
