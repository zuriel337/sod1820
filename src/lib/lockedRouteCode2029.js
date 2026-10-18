const routeCodeImports = {
  world: () => import("../pages/World2029Page.jsx"),
  number: () => import("../pages/Number2029Page.jsx"),
};

const routeCodePromises = new Map();

function loadRouteCode(key) {
  if (!routeCodePromises.has(key)) routeCodePromises.set(key, routeCodeImports[key]());
  return routeCodePromises.get(key);
}

// React.lazy and the early route preparation both call these exact loaders. A
// fulfilled or rejected promise remains shared until an explicit document reload.
export function loadWorld2029RouteCode() {
  return loadRouteCode("world");
}

export function loadNumber2029RouteCode() {
  return loadRouteCode("number");
}

export function lockedRouteCodeLoaderForPath2029(pathname) {
  if (/^\/world\/?$/.test(pathname)) return loadWorld2029RouteCode;
  if (/^\/number\/[^/]+\/?$/.test(pathname)) return loadNumber2029RouteCode;
  return null;
}
