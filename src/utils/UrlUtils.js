export function getParam(name, fallback) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || fallback;
}
