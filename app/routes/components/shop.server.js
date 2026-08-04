import { authenticate } from "../../shopify.server";

const _shopCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const shopLoader = async (request) => {
  try {
    const authResponse = await authenticate.admin(request);

    if (authResponse instanceof Response) {
      return authResponse;
    }

    const { admin, session } = authResponse;
    const accessToken = session?.accessToken;
    const shopDomain = session?.shop;

    const cachedEntry = _shopCache.get(shopDomain);
    const isCacheValid = cachedEntry && (Date.now() - cachedEntry.cachedAt < CACHE_TTL_MS);

    if (isCacheValid) {
      return {
        ...cachedEntry.data,
        accessToken,
        admin,
      };
    }

    // ── Fetch fresh from Shopify (cache miss ya expired) ────────────────────
    const shopRes = await admin.graphql(`
      {
        shop {
          name
          email
          shopOwnerName
          myshopifyDomain
          currencyCode
          plan {
            displayName
            partnerDevelopment
            shopifyPlus
          }
        }
        themes(first: 5, roles: [MAIN]) {
          nodes { id }
        }
      }
    `);

    const shopData = await shopRes.json();
    const rawThemeId = shopData?.data?.themes?.nodes?.[0]?.id || "";
    const mainThemeId = rawThemeId.split("/").pop() || "current";

    const cached = {
      shop: shopData?.data?.shop || null,
      currency: shopData?.data?.shop?.currencyCode || "",
      apiUrl: process.env.PUBLIC_REACT_APP_API_URL,
      mainThemeId,
    };

    _shopCache.set(shopDomain, { data: cached, cachedAt: Date.now() });

    return {
      ...cached,
      accessToken,
      admin,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("Shop Loader Error:", error);

    return {
      shop: null,
      apiUrl: process.env.PUBLIC_REACT_APP_API_URL,
      accessToken: null,
      mainThemeId: "current",
    };
  }
};

export async function requireShopData(request) {
  const result = await shopLoader(request);
  if (result instanceof Response) {
    throw result;
  }
  return result;
}