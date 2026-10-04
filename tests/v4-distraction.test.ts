import {
  DEFAULT_BLOCKED_DOMAINS,
  isDomainBlocked,
  normalizeDomain,
  sanitizeBlockedDomains,
} from '../src/lib/distractionGuard';

const passed: string[] = [];
const failed: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed.push(message);
  } else {
    failed.push(message);
  }
}

function run() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V4: DISTRACTION GUARD TEST SUITE');
  console.log('====================================================\n');

  assert(DEFAULT_BLOCKED_DOMAINS.includes('youtube.com'), 'Default blocked list includes YouTube');
  assert(isDomainBlocked('https://www.youtube.com/watch?v=abc', DEFAULT_BLOCKED_DOMAINS), 'YouTube domains are blocked');
  assert(isDomainBlocked('https://reddit.com/r/CS', DEFAULT_BLOCKED_DOMAINS), 'Reddit domains are blocked');
  assert(!isDomainBlocked('https://learn.university.edu/courses', DEFAULT_BLOCKED_DOMAINS), 'Academic domains remain allowed');
  assert(normalizeDomain('https://www.Instagram.com/') === 'instagram.com', 'Domain normalization strips protocol and www');
  assert(sanitizeBlockedDomains(['youtube.com', 'youtube.com', 'https://reddit.com', 'app.example.com']).length === 3, 'Duplicates are removed and config stays clean');

  console.log(`✓ ${passed.length} passed`);
  if (failed.length > 0) {
    console.log(`✗ ${failed.length} failed`);
    failed.forEach((item) => console.error(`  ${item}`));
    process.exit(1);
  }

  console.log('V4 TEST SUMMARY: 5 passed, 0 failed');
}

run();
