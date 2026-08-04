import { useRef } from "react";
import {
  Outlet,
  useLoaderData,
  useRouteError,
  useNavigation,
} from "react-router";

import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

const PROGRESS_BAR_KEYFRAMES = `
  @keyframes upcart-slide {
    0%   { transform: translateX(-100%); }
    50%  { transform: translateX(150%); }
    100% { transform: translateX(-100%); }
  }
`;

const NAV_LINKS = [
  { href: "/app", label: "Home" },
];

export const ssr = false;

export async function loader({ request }) {
  const { authenticate } = await import("../shopify.server");
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
  };
}

export async function headers(headersArgs) {
  const { boundary } = await import("@shopify/shopify-app-react-router/server");
  return boundary.headers(headersArgs);
}

export function shouldRevalidate() {
  return false;
}

function PolarisProvider({ children }) {
  return (
    <PolarisAppProvider i18n={enTranslations}>
      {children}
    </PolarisAppProvider>
  );
}

function NavigationProgressBar() {
  return (
    <>
      <style>{PROGRESS_BAR_KEYFRAMES}</style>
      <div
        role="progressbar"
        aria-label="Page loading"
        aria-busy="true"
        style={{
          position: "fixed", inset: 0, zIndex: 2_147_483_647,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f1f1f1",
        }}
      >
        <div style={{ width: 300, height: 8, background: "#e1e3e5", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: "40%", background: "#111111",
            borderRadius: 4, animation: "upcart-slide 1.2s ease-in-out infinite",
          }} />
        </div>
      </div>
    </>
  );
}

function AppNav() {
  return (
    <s-app-nav>
      {NAV_LINKS.map(({ href, label }, index) => (
        <s-link key={href} href={href} {...(index === 0 ? { rel: "home" } : {})}>
          {label}
        </s-link>
      ))}
    </s-app-nav>
  );
}

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const initialLoadDoneRef = useRef(false);

  if (!isNavigating) initialLoadDoneRef.current = true;
  const showInitialLoader = isNavigating && !initialLoadDoneRef.current;

  // NOTE: Polaris AppProvider is already provided in root.jsx — do NOT wrap again
  // here, or Polaris mounts twice and flickers on every navigation.
  return (
    <ShopifyAppProvider embedded apiKey={apiKey}>
      {showInitialLoader && <NavigationProgressBar />}
      <AppNav />
      <Outlet />
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <PolarisProvider>
      <div style={{ padding: 20 }}>
        <h2>Something went wrong</h2>
        <pre>{error?.message ?? "Unknown error"}</pre>
      </div>
    </PolarisProvider>
  );
}