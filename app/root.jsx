import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useLocation } from "react-router";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import '@shopify/polaris/build/esm/styles.css';
import "./index.css";

export async function loader() {
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
}

export default function App() {
  const { apiKey } = useLoaderData();
  const location = useLocation();

  const noPaddingRoutes = ["/app/design-cart"];
  const isNoPaddingRoute = noPaddingRoutes.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={apiKey}
        />
     
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <PolarisAppProvider i18n={enTranslations}>
          <div style={{ paddingBottom: isNoPaddingRoute ? 0 : "40px" }}>
            <Outlet />
          </div>
        </PolarisAppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}