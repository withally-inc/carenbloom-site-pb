const VERCEL_APPLICATIONS_URL = "https://carenbloom-site-pb.vercel.app/api/applications";

export function createCloudflareApplicationsHandler({ fetchImpl = fetch } = {}) {
  return async function cloudflareApplicationsHandler({ request }) {
    return fetchImpl(new Request(VERCEL_APPLICATIONS_URL, request));
  };
}

export const onRequest = createCloudflareApplicationsHandler();
