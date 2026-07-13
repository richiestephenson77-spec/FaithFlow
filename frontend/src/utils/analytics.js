import posthog from 'posthog-js';

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = 'https://eu.i.posthog.com';

export function initPostHog() {
  if (!KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // we fire manually on route change
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
    loaded(ph) {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing();
      }
    },
  });
}

export function identifyUser(user) {
  if (!posthog.__loaded) return;
  // Associate events with the pseudonymous user id only. Do NOT send PII
  // (email, name, church, location) to a third-party analytics service —
  // it isn't needed for analytics and needlessly exposes personal data.
  // Only non-identifying product metrics are attached as person properties.
  posthog.identify(user.id, {
    prayerStreak: user.prayerStreak,
    accountCreatedAt: user.createdAt,
  });
}

export function resetUser() {
  if (!posthog.__loaded) return;
  posthog.reset();
}

export function track(event, properties = {}) {
  if (!posthog.__loaded) return;
  posthog.capture(event, properties);
}

export default posthog;
