import { buildApplicationPayload, clean, safeUrl } from "./lib/application-payload.js";
import { createPage, uploadFile } from "./lib/notion-client.js";
import Busboy from "busboy";

const DEFAULT_DATABASE_ID = "3792b7ec4597800fab56f5a61ff00187";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TIME_ZONES = new Set(["US", "Europe", "Asia"]);
const INTRO_VIDEO_REQUIRED_ROLES = new Set([
  "graphic-designer",
  "video-editor",
  "social-media-manager",
  "head-of-performance-marketing",
  "creative-strategist-performance-marketing",
]);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function publicError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

function bufferBackedFile(buffer, name, type) {
  return {
    name: clean(name) || "attachment",
    type: type || "application/octet-stream",
    size: buffer.length,
    async arrayBuffer() {
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    },
  };
}

function readMultipartPayload(req, contentType) {
  return new Promise((resolve, reject) => {
    const files = {};
    const fileWrites = [];
    let payloadText = "{}";
    let fileTooLarge = false;
    const parser = Busboy({
      headers: { ...req.headers, "content-type": contentType },
      limits: {
        files: 2,
        fileSize: MAX_UPLOAD_BYTES,
      },
    });

    parser.on("field", (name, value) => {
      if (name === "payload") payloadText = value;
    });

    parser.on("file", (name, stream, info) => {
      const chunks = [];
      let size = 0;
      stream.on("data", (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });
      stream.on("limit", () => {
        fileTooLarge = true;
        stream.resume();
      });
      fileWrites.push(new Promise((resolveFile, rejectFile) => {
        stream.on("error", rejectFile);
        stream.on("end", () => {
          if (!fileTooLarge && size > 0) {
            const file = bufferBackedFile(Buffer.concat(chunks, size), info.filename, info.mimeType);
            if (name === "resume") files.resume = file;
            if (name === "additional_attachment") files.additionalAttachment = file;
          }
          resolveFile();
        });
      }));
    });

    parser.on("error", reject);
    parser.on("finish", async () => {
      try {
        await Promise.all(fileWrites);
        if (fileTooLarge) throw publicError(400, "Keep file uploads under 8 MB each.");
        resolve({
          payload: JSON.parse(payloadText || "{}"),
          files,
        });
      } catch (error) {
        reject(error);
      }
    });

    req.pipe(parser);
  });
}

async function readPayload(req) {
  const contentType = req.headers?.["content-type"] || req.headers?.["Content-Type"] || "";
  if (req.body instanceof FormData) {
    const payload = JSON.parse(String(req.body.get("payload") || "{}"));
    return {
      payload,
      files: {
        resume: req.body.get("resume"),
        additionalAttachment: req.body.get("additional_attachment"),
      },
    };
  }
  if (contentType.includes("multipart/form-data")) {
    return readMultipartPayload(req, contentType);
  }
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return req.body.trim() ? JSON.parse(req.body) : {};
  if (Buffer.isBuffer(req.body)) {
    const rawBody = req.body.toString("utf8");
    return rawBody.trim() ? JSON.parse(rawBody) : {};
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? JSON.parse(raw) : {};
}

function isUploadFile(file) {
  return file && typeof file.arrayBuffer === "function" && file.size > 0 && clean(file.name);
}

function uploadSizeError(files = {}) {
  for (const file of [files.resume, files.additionalAttachment]) {
    if (isUploadFile(file) && file.size > MAX_UPLOAD_BYTES) {
      return "Keep file uploads under 8 MB each.";
    }
  }
  return null;
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeTimeZones(payload) {
  const values = Array.isArray(payload.timeZones) ? payload.timeZones : [payload.timeZone];
  return values.map(clean).filter(Boolean);
}

function introVideoIsRequired(payload) {
  return payload.introVideoRequired === true || clean(payload.introVideoRequired) === "true" || INTRO_VIDEO_REQUIRED_ROLES.has(clean(payload.roleSlug));
}

function validatePayload(payload) {
  const required = [
    "role",
    "roleSlug",
    "firstName",
    "lastName",
    "email",
    "phoneCountryCode",
    "phoneNumber",
    "monthlyIncomeUsd",
    "location",
  ];
  for (const field of required) {
    if (!clean(payload[field])) return { error: `Missing required field: ${field}` };
  }

  if (!emailIsValid(clean(payload.email))) return { error: "Enter a valid email address." };
  if (clean(payload.linkedIn) && !safeUrl(payload.linkedIn)) return { error: "Enter a valid LinkedIn URL." };
  if (clean(payload.introVideoUrl) && !safeUrl(payload.introVideoUrl)) return { error: "Enter a valid intro video URL." };
  if (introVideoIsRequired(payload) && !safeUrl(payload.introVideoUrl)) return { error: "Intro video is required for this role." };
  if (!/^\+\d{1,4}$/.test(clean(payload.phoneCountryCode))) return { error: "Choose a valid country / area code." };
  if (!/^[0-9][0-9\s().-]{3,}$/.test(clean(payload.phoneNumber))) return { error: "Enter a valid phone number." };
  if (!/^\d+$/.test(clean(payload.monthlyIncomeUsd))) return { error: "Monthly income must be numbers only." };

  const timeZones = normalizeTimeZones(payload);
  if (!timeZones.length || timeZones.some((timeZone) => !ALLOWED_TIME_ZONES.has(timeZone))) {
    return { error: "Choose a valid time zone." };
  }

  const questions = Array.isArray(payload.questions) ? payload.questions.slice(0, 3) : [];
  for (let i = 0; i < questions.length; i += 1) {
    if (!clean(questions[i].answer)) return { error: `Missing required answer: role question ${i + 1}` };
  }

  const fileError = uploadSizeError(payload.files);
  if (fileError) return { error: fileError };

  return { questions };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, error: "Method not allowed." });
    return;
  }

  let payload;
  try {
    const submission = await readPayload(req);
    payload = submission.payload || submission;
    payload.files = submission.files || {};
  } catch (error) {
    sendJson(res, error.statusCode || 400, { success: false, error: error.publicMessage || "Invalid JSON payload." });
    return;
  }

  const validation = validatePayload(payload);
  if (validation.error) {
    sendJson(res, 400, { success: false, error: validation.error });
    return;
  }

  const applicationRef = clean(payload.applicationRef) || undefined;
  const databaseId = clean(process.env.NOTION_CB_TALENTS_DB_ID) || DEFAULT_DATABASE_ID;
  const baseNotionPayload = {
    ...payload,
    phone: `${clean(payload.phoneCountryCode)} ${clean(payload.phoneNumber)}`,
    timeZones: normalizeTimeZones(payload),
    introVideoRequired: introVideoIsRequired(payload),
    applicationRef,
  };

  if (process.env.NOTION_INTAKE_DRY_RUN === "1") {
    const notionPayload = buildApplicationPayload(databaseId, baseNotionPayload);
    sendJson(res, 200, { success: true, ref: notionPayload.applicationRef, dryRun: true });
    return;
  }

  const token = process.env.NOTION_KEY || process.env.NOTION_API_KEY;
  if (!token) {
    sendJson(res, 500, { success: false, error: "Notion intake is not configured." });
    return;
  }

  try {
    const [resumeUpload, additionalAttachmentUpload] = await Promise.all([
      isUploadFile(payload.files.resume) ? uploadFile(token, payload.files.resume) : null,
      isUploadFile(payload.files.additionalAttachment) ? uploadFile(token, payload.files.additionalAttachment) : null,
    ]);
    const notionPayload = buildApplicationPayload(databaseId, {
      ...baseNotionPayload,
      resumeUpload,
      additionalAttachmentUpload,
    });
    const { applicationRef: ref, ...pagePayload } = notionPayload;
    const page = await createPage(token, pagePayload);
    sendJson(res, 200, { success: true, ref: notionPayload.applicationRef, notionPageId: page.id });
  } catch (error) {
    console.error("C&B talent intake failed", error);
    sendJson(res, 502, { success: false, error: "Could not save application right now." });
  }
}

export const _private = {
  buildApplicationPayload,
  validatePayload,
};
