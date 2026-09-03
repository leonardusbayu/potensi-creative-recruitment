export async function onRequest(context) {
  const { request, env } = context;
  const target = env.WORKER_ORIGIN || "https://calendarjet-hr.edubot-leonardus.workers.dev";
  const url = new URL(request.url);
  url.hostname = new URL(target).hostname;
  url.port = "";
  url.protocol = "https:";
  const forwarded = new Request(url.toString(), request);
  forwarded.headers.delete("cookie");
  return fetch(forwarded);
}