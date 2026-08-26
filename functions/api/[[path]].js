export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  url.hostname = "calendarjet-hr.edubot-leonardus.workers.dev";
  url.port = "";
  url.protocol = "https:";
  return fetch(new Request(url.toString(), request));
}
