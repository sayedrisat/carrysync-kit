// Harness-only lifecycle UI. No SDK, application records or camera data enter this channel.
export function prepareOffline() {
  const status = document.getElementById('offline-status');
  const retry = document.getElementById('offline-retry');
  let registration;
  let checking = false;
  const show = (text) => { status.textContent = text; };
  async function check(repair = false) {
    if (checking) return;
    checking = true;
    retry.disabled = true;
    show('Checking offline resources…');
    try {
      if (!isSecureContext || !('serviceWorker' in navigator)) throw new Error('unsupported');
      registration = await navigator.serviceWorker.register(new URL('./sw.js', location.href), { scope: './', updateViaCache: 'none' });
      // Normal lifecycle: never force a waiting update onto an in-flight import/camera session.
      registration.onupdatefound = () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'redundant') show('Offline preparation failed. Reconnect and retry; existing records are unchanged.');
          if (worker.state === 'installed' && registration.waiting) void check();
        });
      };
      await new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (navigator.serviceWorker.controller) { clearInterval(timer); resolve(); }
          else if ((!registration.installing && !registration.active && Date.now() - started > 1000) || Date.now() - started > 30000) {
            clearInterval(timer); reject(new Error('not ready'));
          }
        }, 100);
      });
      const result = await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, 10000);
        channel.port1.onmessage = ({ data }) => { clearTimeout(timer); channel.port1.close(); resolve(data); };
        const entry = document.querySelector('script[type="module"][src]')?.src;
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_OFFLINE', entry, repair }, [channel.port2]);
      });
      if (!result?.ready) throw new Error('cache incomplete');
      show('Ready for Offline Use' + (registration.waiting ? ' — update cached. Close all CarrySync tabs/windows, then reopen to activate it.' : '.'));
    } catch {
      show('Offline preparation unavailable or incomplete. Reconnect and retry; allow site storage. Existing records are unchanged.');
    } finally { checking = false; retry.disabled = false; }
  }
  retry.addEventListener('click', () => { void check(true); void registration?.update().catch(() => {}); });
  navigator.serviceWorker?.addEventListener('controllerchange', () => { void check(); });
  window.addEventListener('online', () => { void check(); });
  window.addEventListener('offline', () => { void check(); });
  window.addEventListener('pageshow', () => { void check(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
  void check();
}
