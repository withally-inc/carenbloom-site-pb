const MAX_TEXT = 1900;

export function clean(value) {
  return String(value || "").trim();
}

export function truncate(value, max = MAX_TEXT) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function richText(value) {
  const content = truncate(value);
  return content ? [{ type: "text", text: { content } }] : [];
}

export function fileUploadProperty(upload) {
  if (!upload || !clean(upload.id)) return { files: [] };
  const name = clean(upload.name) || clean(upload.filename) || "Attachment";
  return {
    files: [{
      name,
      type: "file_upload",
      file_upload: { id: clean(upload.id) },
    }],
  };
}

export function safeUrl(value) {
  const text = clean(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function submittedAtIso(value) {
  const candidate = clean(value);
  if (!candidate) return new Date().toISOString();
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function makeRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CB-${stamp}-${suffix}`;
}

export function paragraph(text) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: richText(text) },
  };
}

export function heading(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: richText(text) },
  };
}

export function answerBlocks(questions = []) {
  const blocks = [heading("Application Answers")];
  questions.slice(0, 3).forEach((item, index) => {
    const question = clean(item.question) || `Role-specific question ${index + 1}`;
    const answer = clean(item.answer) || "No answer provided.";
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: richText(question) },
    });
    blocks.push(paragraph(answer));
  });
  return blocks;
}

function timeZoneNames(payload) {
  const values = Array.isArray(payload.timeZones) ? payload.timeZones : [payload.timeZone];
  return values.map(clean).filter(Boolean);
}

export function buildApplicationPayload(databaseId, payload) {
  const firstName = clean(payload.firstName);
  const lastName = clean(payload.lastName);
  const fullName = clean(payload.name) || `${firstName} ${lastName}`.trim();
  const questions = Array.isArray(payload.questions) ? payload.questions.slice(0, 3) : [];
  const submittedAt = submittedAtIso(payload.submittedAt);
  const sourceUrl = safeUrl(payload.url);
  const linkedIn = safeUrl(payload.linkedIn);
  const introVideo = safeUrl(payload.introVideoUrl);
  const monthlyIncome = Number.parseInt(clean(payload.monthlyIncomeUsd), 10);
  const applicationRef = clean(payload.applicationRef) || makeRef();
  const timeZones = timeZoneNames(payload);

  const properties = {
    Name: { title: richText(fullName) },
    Status: { select: { name: "New" } },
    Role: { rich_text: richText(payload.role) },
    "Role Slug": { rich_text: richText(payload.roleSlug) },
    "First Name": { rich_text: richText(firstName) },
    "Last Name": { rich_text: richText(lastName) },
    Email: { email: clean(payload.email).toLowerCase() },
    Phone: { phone_number: clean(payload.phone) },
    Location: { rich_text: richText(payload.location) },
    "Time Zone": { multi_select: timeZones.map((name) => ({ name })) },
    "Monthly Income": { number: Number.isFinite(monthlyIncome) ? monthlyIncome : null },
    "Applied At": { date: { start: submittedAt } },
    "Application Ref": { rich_text: richText(applicationRef) },
    Resume: fileUploadProperty(payload.resumeUpload),
    "Additional Attachment": fileUploadProperty(payload.additionalAttachmentUpload),
  };

  if (linkedIn) properties.LinkedIn = { url: linkedIn };
  if (introVideo) properties["Intro Video"] = { url: introVideo };
  if (sourceUrl) properties["Source URL"] = { url: sourceUrl };

  questions.forEach((item, index) => {
    const number = index + 1;
    properties[`Question ${number}`] = { rich_text: richText(item.question) };
    properties[`Answer ${number}`] = { rich_text: richText(item.answer) };
  });

  return {
    parent: { database_id: databaseId },
    properties,
    children: [
      heading("Application Metadata"),
      paragraph(`Role: ${clean(payload.role)}`),
      paragraph(`Role slug: ${clean(payload.roleSlug)}`),
      paragraph(`Phone: ${clean(payload.phone)}`),
      paragraph(`Resume: ${clean(payload.resume) || "Not attached"}`),
      paragraph(`Intro video: ${introVideo || "Not provided"}`),
      paragraph(`Additional attachment: ${clean(payload.additionalAttachment) || "Not attached"}`),
      ...answerBlocks(questions),
    ],
    applicationRef,
  };
}
