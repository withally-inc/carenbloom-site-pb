import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fixture, fillApplication, submit, file, json, deferred, roleResponse, metadata, posting, serverNow } from './helpers/site-browser.mjs';

const browser = await chromium.launch();
const limit = 4 * 1024 * 1024;
try {
  // Required fields, role questions, multipart bytes, and a single pending POST.
  const gate = deferred();
  const f = await fixture(browser, { application: async (route) => {
    await gate.promise;
    return json(route, { success: true, ref: 'CB-RECEIVED' });
  } });
  try {
    await f.open();
    await f.page.locator('[data-role-content]:not([hidden])').waitFor();
    await submit(f.page);
    assert.equal(f.calls.applications.length, 0);
    for (const name of ['first_name', 'last_name', 'email', 'phone_country_code', 'phone_number', 'resume', 'intro_video_url', 'monthly_income_usd', 'location', 'role_question_1', 'role_question_2', 'role_question_3']) {
      assert.equal(await f.page.locator(`[name="${name}"]`).getAttribute('aria-invalid'), 'true', `${name} is required`);
    }
    assert.equal(await f.page.locator('[name="open_time_zone"]').first().getAttribute('aria-invalid'), 'true');
    await fillApplication(f.page);
    await f.page.locator('[name="additional_attachment"]').setInputFiles(file('work.pdf', 40));
    await submit(f.page);
    await f.page.waitForFunction(() => document.querySelector('#application-form').getAttribute('aria-busy') === 'true');
    assert.equal(await f.page.locator('[data-submit]').isDisabled(), true);
    await f.page.locator('#application-form').evaluate((form) => {
      form.requestSubmit();
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(f.calls.applications.length, 1, 'duplicate submits must not create a second POST');
    const request = f.calls.applications[0];
    assert.equal(request.url(), `${f.origin}/api/applications`);
    assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
    const parts = await new Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type'] } }).formData();
    assert.deepEqual([...parts.keys()].sort(), ['additional_attachment', 'payload', 'resume']);
    const payload = JSON.parse(parts.get('payload'));
    assert.deepEqual(payload, {
      role: 'Chief of Staff', roleSlug: 'chief-of-staff', firstName: 'Test', lastName: 'Applicant', name: 'Test Applicant',
      email: 'applicant@example.invalid', phoneCountryCode: '+1', phoneNumber: '5550100', linkedIn: 'https://example.invalid/profile',
      resume: 'resume.pdf', introVideoUrl: 'https://example.invalid/intro', introVideoRequired: true, additionalAttachment: 'work.pdf',
      monthlyIncomeUsd: '12000', timeZones: ['US', 'Europe'], location: 'United States',
      questions: roleResponse().role.questions.map((question, i) => ({ question, answer: ['First', 'Second', 'Third'][i] + ' synthetic answer.' })),
      url: `${f.origin}/careers/apply/?role=chief-of-staff`, referrer: '',
    });
    for (const [part, name, size] of [['resume', 'resume.pdf', 32], ['additional_attachment', 'work.pdf', 40]]) {
      assert.equal(parts.get(part).name, name);
      assert.deepEqual(Buffer.from(await parts.get(part).arrayBuffer()), Buffer.alloc(size, 65));
    }
    gate.resolve();
    await f.page.locator('[data-success]:not([hidden])').waitFor();
    assert.match(await f.page.locator('[data-success-ref]').textContent(), /CB-RECEIVED/);
    assert.equal(await f.page.locator('#application-form').isVisible(), false);
    assert.equal(await f.page.locator('[data-submit]').isDisabled(), false);
    assert.equal(await f.page.locator('[name="first_name"]').inputValue(), '');
  } finally { gate.resolve(); await f.close(); }

  // Server and transport failures preserve the draft and allow a successful retry.
  for (const failure of ['server', 'network']) {
    const f = await fixture(browser, { application: (route, n) => n > 1 ? json(route, { success: true, ref: 'CB-RETRY' }) : failure === 'network' ? route.abort('failed') : json(route, { success: false, error: 'Please try again.' }, 503) });
    try {
      await f.open();
      await fillApplication(f.page);
      await submit(f.page);
      await f.page.locator('[data-form-status][data-state="error"]').waitFor();
      assert.match(await f.page.locator('[data-form-status]').textContent(), /Your answers are still in the form/);
      assert.equal(await f.page.locator('[name="first_name"]').inputValue(), 'Test');
      assert.equal(await f.page.locator('[name="resume"]').evaluate((el) => el.files[0].name), 'resume.pdf');
      assert.equal(await f.page.locator('[data-submit]').isDisabled(), false);
      await submit(f.page);
      await f.page.locator('[data-success]:not([hidden])').waitFor();
      assert.equal(f.calls.applications.length, 2);
    } finally { await f.close(); }
  }

  // Upload type, individual and combined limits. Exactly 4 MiB remains supported.
  for (const scenario of [
    { resume: file('resume.pdf', limit - 1), ok: true },
    { resume: file('resume.pdf', limit), ok: true },
    { resume: file('resume.pdf', limit + 1), message: /Each file/ },
    { resume: file('resume.exe'), message: /Use a PDF/ },
    { resume: file(), attachment: file('work.pdf', limit + 1), message: /Each file/ },
    { resume: file('resume.pdf', limit / 2 + 1), attachment: file('work.pdf', limit / 2), message: /combined size/ },
  ]) {
    const f = await fixture(browser);
    try {
      await f.open();
      await fillApplication(f.page);
      await f.page.locator('[name="resume"]').setInputFiles(scenario.resume);
      if (scenario.attachment) await f.page.locator('[name="additional_attachment"]').setInputFiles(scenario.attachment);
      await submit(f.page);
      if (scenario.ok) {
        await f.page.locator('[data-success]:not([hidden])').waitFor();
        assert.equal(f.calls.applications.length, 1);
      } else {
        assert.equal(f.calls.applications.length, 0);
        assert.match(await f.page.locator('[data-field][data-invalid] .f-error').allTextContents().then((v) => v.join(' ')), scenario.message);
      }
    } finally { await f.close(); }
  }

  // Canonical role-specific requirements are enforced by the rewritten form.
  for (const slug of ['graphic-designer', 'video-editor', 'chief-of-staff']) {
    const f = await fixture(browser);
    try {
      await f.open(`/careers/apply/?role=${slug}`);
      await fillApplication(f.page);
      const role = roleResponse(slug).role;
      assert.equal(await f.page.locator('[name="intro_video_url"]').evaluate((el) => el.required), !!role.introVideoRequired);
      assert.equal(await f.page.locator('[name="additional_attachment"]').evaluate((el) => el.required), !!role.portfolioRequired);
      assert.deepEqual(await f.page.locator('[data-role-questions] textarea').evaluateAll((els) => els.map((el) => el.dataset.question)), role.questions);
      if (role.portfolioRequired) {
        await submit(f.page);
        assert.equal(f.calls.applications.length, 0);
        assert.equal(await f.page.locator('[name="additional_attachment"]').getAttribute('aria-invalid'), 'true');
        await f.page.locator('[name="additional_attachment"]').setInputFiles(file('portfolio.pdf'));
      }
      await submit(f.page);
      await f.page.locator('[data-success]:not([hidden])').waitFor();
    } finally { await f.close(); }
  }

  // Test the real hostname guard by serving local bytes at each isolated origin.
  for (const origin of ['https://www.carenbloom.com', 'https://review.care-and-bloom.pages.dev', 'https://review.vercel.app', 'http://localhost:49279']) {
    const f = await fixture(browser, { origin });
    try {
      await f.open();
      await fillApplication(f.page);
      await submit(f.page);
      if (origin === 'https://www.carenbloom.com') {
        await f.page.locator('[data-success]:not([hidden])').waitFor();
        assert.equal(f.calls.applications[0].url(), `${origin}/api/applications`);
      } else {
        await f.page.locator('[data-form-status][data-state="preview"]').waitFor();
        assert.equal(f.calls.applications.length, 0);
        assert.equal(await f.page.locator('[name="first_name"]').inputValue(), 'Test');
      }
    } finally { await f.close(); }
  }

  // Weekly refresh updates metadata without clearing an applicant's draft.
  {
    const next = roleResponse('chief-of-staff', '2026-11-10T06:00:00.000Z');
    const f = await fixture(browser, { clock: true, role: (route, n) => json(route, n === 1 ? { ...roleResponse(), state: { ...roleResponse().state, nextRefreshAt: new Date(Date.parse(serverNow) + 10000).toISOString() } } : next) });
    try {
      await f.open(); await fillApplication(f.page);
      await f.page.clock.runFor(10000);
      await f.page.waitForFunction((date) => document.querySelector('[data-close-countdown]').dateTime === date, next.state.validThrough);
      assert.equal((await posting(f.page)).datePosted, next.state.datePosted);
      assert.equal((await posting(f.page)).validThrough, next.state.validThrough);
      assert.equal(await f.page.locator('[name="role_question_1"]').inputValue(), 'First synthetic answer.');
      assert.equal(await f.page.locator('[name="resume"]').evaluate((el) => el.files[0].name), 'resume.pdf');
      assert.match((await metadata(f.page)).canonical, /\/careers\/apply\/\?role=chief-of-staff$/);
      assert.doesNotMatch((await metadata(f.page)).robots, /noindex/);
    } finally { await f.close(); }
  }

  // Close during a pending POST: remove the draft and posting, reject resurrection,
  // but deliver an already accepted receipt. An outage cannot extend the deadline.
  for (const refresh of ['outage', 'late-open']) {
    const applicationGate = deferred();
    const refreshGate = deferred();
    const closeAt = new Date(Date.parse(serverNow) + 15000).toISOString();
    const initial = { ...roleResponse(), state: { ...roleResponse().state, nextRefreshAt: new Date(Date.parse(serverNow) + 10000).toISOString(), effectiveClosesAt: closeAt, validThrough: closeAt } };
    const f = await fixture(browser, { clock: true,
      role: async (route, n) => {
        if (n === 1) return json(route, initial);
        await refreshGate.promise;
        if (refresh === 'outage') return route.abort('failed');
        return json(route, roleResponse());
      },
      application: async (route) => { await applicationGate.promise; return json(route, { success: true, ref: 'CB-BEFORE-CLOSE' }); },
    });
    try {
      await f.open(); await fillApplication(f.page); await submit(f.page);
      await f.page.waitForFunction(() => document.querySelector('[data-submit]').disabled);
      await f.page.clock.runFor(16000);
      await f.page.locator('[data-role-unavailable][data-state="closed"]').waitFor();
      assert.equal(await f.page.locator('#application-form').isVisible(), false);
      assert.equal(await f.page.locator('[name="first_name"]').inputValue(), '');
      assert.equal(await f.page.locator('[name="resume"]').evaluate((el) => el.files.length), 0);
      assert.equal(await posting(f.page), null);
      assert.match((await metadata(f.page)).robots, /noindex/);
      assert.equal((await metadata(f.page)).canonical, null);
      refreshGate.resolve();
      await f.page.clock.runFor(5000);
      await f.page.locator('#application-form').evaluate((form) => form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true })));
      assert.equal(f.calls.applications.length, 1, 'a closed form cannot submit');
      const roleCalls = f.calls.roles.length;
      await f.page.clock.fastForward(60000);
      assert.equal(f.calls.roles.length, roleCalls, 'closure ends role polling');
      applicationGate.resolve();
      await f.page.waitForFunction(() => document.querySelector('[data-form-status]').dataset.state === 'success');
      await f.page.clock.runFor(100);
      assert.match(await f.page.locator('[data-submission-receipt]').textContent(), /CB-BEFORE-CLOSE/);
      assert.equal(await f.page.locator('[data-role-unavailable]').getAttribute('data-state'), 'closed');
      assert.equal(await posting(f.page), null);
    } finally { applicationGate.resolve(); refreshGate.resolve(); await f.close(); }
  }
  console.log('v4 application submission, validation, guard, and lifecycle browser tests passed');
} finally { await browser.close(); }
