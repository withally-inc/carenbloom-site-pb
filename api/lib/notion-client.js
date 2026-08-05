export const NOTION_VERSION = "2022-06-28";
export const NOTION_FILE_UPLOAD_VERSION = "2026-03-11";
export const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_UPLOAD_TIMEOUT_MS = 12000;

export function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

export async function notionRequest(path, token, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`${NOTION_API_BASE}${path}`, {
    ...options,
    headers: { ...notionHeaders(token), ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.message || `Notion request failed (${response.status})`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export function createPage(token, payload, fetchImpl) {
  return notionRequest("/pages", token, {
    method: "POST",
    body: JSON.stringify(payload),
  }, fetchImpl);
}

async function fetchWithTimeout(url, options, fetchImpl, timeoutMs = NOTION_UPLOAD_TIMEOUT_MS) {
  if (options.signal || timeoutMs <= 0) return fetchImpl(url, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Notion file upload timed out after ${timeoutMs}ms`);
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadFile(token, file, fetchImpl = fetch) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.name) return null;
  const contentType = file.type || "application/octet-stream";
  const filename = file.name;
  const createResponse = await fetchWithTimeout(`${NOTION_API_BASE}/file_uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_FILE_UPLOAD_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "single_part",
      filename,
      content_type: contentType,
    }),
  }, fetchImpl);
  const createText = await createResponse.text();
  const upload = createText ? JSON.parse(createText) : {};
  if (!createResponse.ok) {
    const error = new Error(upload.message || `Notion file upload create failed (${createResponse.status})`);
    error.status = createResponse.status;
    error.details = upload;
    throw error;
  }

  const formData = new FormData();
  const fileBlob = new Blob([await file.arrayBuffer()], { type: contentType });
  formData.append("file", fileBlob, filename);
  const sendResponse = await fetchWithTimeout(upload.upload_url || `${NOTION_API_BASE}/file_uploads/${upload.id}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_FILE_UPLOAD_VERSION,
    },
    body: formData,
  }, fetchImpl);
  const sendText = await sendResponse.text();
  const sent = sendText ? JSON.parse(sendText) : {};
  if (!sendResponse.ok || sent.status !== "uploaded") {
    const error = new Error(sent.message || `Notion file upload send failed (${sendResponse.status})`);
    error.status = sendResponse.status;
    error.details = sent;
    throw error;
  }

  return { id: upload.id, name: filename };
}
