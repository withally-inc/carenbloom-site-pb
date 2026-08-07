import { getClosingPresentation } from "./careers-deadline.js";
import { careerRoles } from "./careers-roles.js";

(function () {
  const roles = careerRoles;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("role") || roles[0]?.slug;
  const role = roles.find((item) => item.slug === slug) || roles[0];

  if (!role) return;

  const location = role.locationType || "Remote";
  const isRemote = location === "Remote";
  const locationDescription = `${role.title} — ${location} at Care & Bloom.`;

  document.title = `${role.title} | Care & Bloom`;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.setAttribute("content", locationDescription);
  const openGraphDescription = document.querySelector('meta[property="og:description"]');
  if (openGraphDescription) openGraphDescription.setAttribute("content", locationDescription);

  const title = document.querySelector("[data-role-title]");
  const summary = document.querySelector("[data-role-summary]");
  const level = document.querySelector("[data-role-level]");
  const mission = document.querySelector("[data-role-mission]");
  const responsibilities = document.querySelector("[data-role-responsibilities]");
  const requirements = document.querySelector("[data-role-requirements]");
  const questions = document.querySelector("[data-role-questions]");
  const roleInput = document.querySelector('input[name="role"]');
  const closeApply = document.querySelector("[data-close-apply]");
  const closeDate = document.querySelector("[data-close-date]");
  const countdown = document.querySelector("[data-close-countdown]");

  if (title) title.textContent = role.title;
  if (summary) summary.textContent = role.summary;
  if (level) level.textContent = role.level;
  if (mission) mission.textContent = role.mission;
  if (roleInput) roleInput.value = role.title;

  const introVideoInput = document.querySelector('input[name="intro_video_url"]');
  const introVideoLabel = document.querySelector("[data-intro-video-label]");
  if (introVideoInput) introVideoInput.required = !!role.introVideoRequired;
  if (introVideoLabel) introVideoLabel.textContent = role.introVideoRequired ? "Intro video*" : "Intro video (optional)";
  const introVideoSmall = introVideoInput ? introVideoInput.closest("label")?.querySelector("small") : null;
  if (introVideoSmall && role.loomPrompt) introVideoSmall.textContent = role.loomPrompt;

  const attachmentInput = document.querySelector('input[name="additional_attachment"]');
  const attachmentLabel = attachmentInput ? attachmentInput.closest("label")?.querySelector("span") : null;
  if (attachmentInput && role.portfolioRequired) {
    attachmentInput.required = true;
    if (attachmentLabel) attachmentLabel.textContent = role.portfolioLabel || "Portfolio / Work Samples*";
  } else if (attachmentLabel) {
    attachmentLabel.textContent = "Additional attachment (optional) \u2014 resume addendum, case study, or any supporting work";
  }

  const locationTag = document.querySelector(".role-hero .role-location");
  if (locationTag) locationTag.textContent = location;
  const locationDd = document.querySelector(".role-meta dd");
  if (locationDd) locationDd.textContent = location;

  // Google Jobs structured data (JSON-LD)
  const initialClosing = getClosingPresentation(new Date(), role.title);
  const jobPosting = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: role.title,
    description: `${role.mission} Responsibilities: ${role.responsibilities.join(". ")}. Requirements: ${role.requirements.join(". ")}.`,
    datePosted: new Date().toISOString().split("T")[0],
    validThrough: initialClosing.dateTime,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: "Care & Bloom",
      sameAs: "https://carenbloom.com",
    },
    directApply: true,
    jobLocationType: isRemote ? "TELECOMMUTE" : undefined,
    jobLocation: !isRemote ? {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
      },
    } : undefined,
  };
  Object.keys(jobPosting).forEach((k) => jobPosting[k] === undefined && delete jobPosting[k]);
  const jsonLd = document.createElement("script");
  jsonLd.type = "application/ld+json";
  jsonLd.textContent = JSON.stringify(jobPosting);
  document.head.appendChild(jsonLd);

  const syncClosingWindow = () => {
    const closing = getClosingPresentation(new Date(), role.title);
    if (closeDate) closeDate.textContent = closing.visibleLabel;
    if (countdown) {
      countdown.dateTime = closing.dateTime;
      countdown.textContent = closing.countdown;
    }
    if (closeApply) closeApply.setAttribute("aria-label", closing.applyLabel);
    jobPosting.validThrough = closing.dateTime;
    jsonLd.textContent = JSON.stringify(jobPosting);
  };
  syncClosingWindow();
  setInterval(syncClosingWindow, 1000);

  document.querySelectorAll(".application-tooltip").forEach((tooltip) => {
    const row = tooltip.closest(".application-label-row");
    if (!row) return;
    tooltip.addEventListener("focus", () => row.classList.add("is-tooltip-open"));
    tooltip.addEventListener("blur", () => row.classList.remove("is-tooltip-open"));
  });

  const callingCodes = [
    "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39", "+40", "+41", "+43", "+44", "+45", "+46", "+47", "+48", "+49",
    "+51", "+52", "+53", "+54", "+55", "+56", "+57", "+58", "+60", "+61", "+62", "+63", "+64", "+65", "+66", "+81", "+82", "+84", "+86", "+90",
    "+91", "+92", "+93", "+94", "+95", "+98", "+211", "+212", "+213", "+216", "+218", "+220", "+221", "+222", "+223", "+224", "+225", "+226", "+227", "+228",
    "+229", "+230", "+231", "+232", "+233", "+234", "+235", "+236", "+237", "+238", "+239", "+240", "+241", "+242", "+243", "+244", "+245", "+246", "+248", "+249",
    "+250", "+251", "+252", "+253", "+254", "+255", "+256", "+257", "+258", "+260", "+261", "+262", "+263", "+264", "+265", "+266", "+267", "+268", "+269", "+290",
    "+291", "+297", "+298", "+299", "+350", "+351", "+352", "+353", "+354", "+355", "+356", "+357", "+358", "+359", "+370", "+371", "+372", "+373", "+374", "+375",
    "+376", "+377", "+378", "+380", "+381", "+382", "+383", "+385", "+386", "+387", "+389", "+420", "+421", "+423", "+500", "+501", "+502", "+503", "+504", "+505",
    "+506", "+507", "+508", "+509", "+590", "+591", "+592", "+593", "+594", "+595", "+596", "+597", "+598", "+599", "+670", "+672", "+673", "+674", "+675", "+676",
    "+677", "+678", "+679", "+680", "+681", "+682", "+683", "+685", "+686", "+687", "+688", "+689", "+690", "+691", "+692", "+850", "+852", "+853", "+855", "+856", "+880",
    "+886", "+960", "+961", "+962", "+963", "+964", "+965", "+966", "+967", "+968", "+970", "+971", "+972", "+973", "+974", "+975", "+976", "+977", "+992", "+993",
    "+994", "+995", "+996", "+998"
  ];
  const codeSelect = document.querySelector('select[name="phone_country_code"]');
  if (codeSelect) {
    codeSelect.append(...callingCodes.map((code) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code;
      return option;
    }));
  }

  const countryCodes = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB UM US UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");
  const countrySelect = document.querySelector('select[name="location"]');
  if (countrySelect && Intl.DisplayNames) {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const countryNames = countryCodes
      .map((code) => displayNames.of(code))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const uniqueCountries = [...new Set(countryNames)];
    countrySelect.append(...uniqueCountries.map((country) => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      return option;
    }));
  }

  document.querySelectorAll("[data-numeric-only]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
    });
  });

  const timeZoneChoices = [...document.querySelectorAll('input[name="open_time_zone"]')];
  const syncTimeZoneRequired = () => {
    const hasSelection = timeZoneChoices.some((input) => input.checked);
    timeZoneChoices.forEach((input, index) => {
      input.required = index === 0 && !hasSelection;
    });
  };
  timeZoneChoices.forEach((input) => input.addEventListener("change", syncTimeZoneRequired));
  syncTimeZoneRequired();

  const applicationForm = document.querySelector("#application-form");
  if (applicationForm && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      document.body.classList.toggle("is-application-visible", entries.some((entry) => entry.isIntersecting));
    }, { threshold: 0.12 });
    observer.observe(applicationForm);
  }

  const renderList = (node, items) => {
    if (!node) return;
    node.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
  };

  renderList(responsibilities, role.responsibilities);
  renderList(requirements, role.requirements);

  if (questions) {
    questions.replaceChildren(...role.questions.slice(0, 3).map((question, index) => {
      const label = document.createElement("label");
      label.className = "application-form-wide";
      const span = document.createElement("span");
      span.textContent = question;
      const textarea = document.createElement("textarea");
      textarea.name = `role_question_${index + 1}`;
      textarea.rows = 4;
      textarea.required = true;
      textarea.placeholder = "Your answer";
      label.append(span, textarea);
      return label;
    }));
  }

  const form = document.querySelector("#application-form");
  const status = document.querySelector(".application-form-status");
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;
  const endpoint = window.CB_TALENTS_ENDPOINT || "/api/applications";
  // Mirrors the authoritative upload limits in api/applications.js; keep in sync.
  const maxUploadBytes = 4 * 1024 * 1024;
  const maxTotalUploadBytes = 4 * 1024 * 1024;
  let isSubmitting = false;
  const setStatus = (message, state) => {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "";
  };

  const collectQuestions = () => [...form.querySelectorAll("[data-role-questions] textarea")].slice(0, 3).map((textarea) => ({
    question: textarea.closest("label")?.querySelector("span")?.textContent || textarea.placeholder || "",
    answer: textarea.value,
  }));

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const resumeFile = data.get("resume");
      const additionalAttachmentFile = data.get("additional_attachment");
      const oversizedFile = [resumeFile, additionalAttachmentFile].find((file) => file instanceof File && file.size > maxUploadBytes);
      if (oversizedFile) {
        setStatus("Each file must be under 4 MB.", "error");
        return;
      }
      const totalUploadBytes = [resumeFile, additionalAttachmentFile]
        .filter((file) => file instanceof File)
        .reduce((total, file) => total + file.size, 0);
      if (totalUploadBytes > maxTotalUploadBytes) {
        setStatus("Your files together are too large. Keep their combined size under 4 MB.", "error");
        return;
      }

      const payload = {
        role: role.title,
        roleSlug: role.slug,
        firstName: data.get("first_name"),
        lastName: data.get("last_name"),
        name: `${data.get("first_name") || ""} ${data.get("last_name") || ""}`.trim(),
        email: data.get("email"),
        phoneCountryCode: data.get("phone_country_code"),
        phoneNumber: data.get("phone_number"),
        linkedIn: data.get("linkedin"),
        resume: resumeFile instanceof File && resumeFile.size > 0 ? resumeFile.name : "",
        introVideoUrl: data.get("intro_video_url"),
        introVideoRequired: !!role.introVideoRequired,
        additionalAttachment: additionalAttachmentFile instanceof File && additionalAttachmentFile.size > 0 ? additionalAttachmentFile.name : "",
        monthlyIncomeUsd: data.get("monthly_income_usd"),
        timeZones: data.getAll("open_time_zone"),
        location: data.get("location"),
        questions: collectQuestions(),
        submittedAt: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
      };

      isSubmitting = true;
      if (submitButton) submitButton.disabled = true;
      form.setAttribute("aria-busy", "true");
      setStatus("Submitting application...", "loading");

      try {
        const body = new FormData();
        body.append("payload", JSON.stringify(payload));
        if (resumeFile instanceof File && resumeFile.size > 0) body.append("resume", resumeFile);
        if (additionalAttachmentFile instanceof File && additionalAttachmentFile.size > 0) body.append("additional_attachment", additionalAttachmentFile);

        const response = await fetch(endpoint, {
          method: "POST",
          body,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || "Submission failed.");
        setStatus(`Application received. Reference: ${result.ref || "submitted"}.`, "success");
        form.reset();
      } catch (error) {
        setStatus(error.message || "Could not submit application right now.", "error");
      } finally {
        isSubmitting = false;
        if (submitButton) submitButton.disabled = false;
        form.removeAttribute("aria-busy");
      }
    });
  }
})();
