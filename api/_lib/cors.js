export const ALLOWED_BROWSER_ORIGINS = new Set([
  "https://carenbloom.com",
  "https://www.carenbloom.com",
]);

export function applyBrowserCors(req, res, allowedMethods) {
  res.setHeader("Vary", "Origin");
  const origin = req?.headers?.origin;
  if (typeof origin === "string" && ALLOWED_BROWSER_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", allowedMethods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
