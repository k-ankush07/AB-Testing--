import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    const themesRes = await admin.graphql(
        `#graphql
    query getThemes {
      themes(first: 250) {
        nodes { id name role }
      }
    }`
    );
    const { data: themesData } = await themesRes.json();
    const activeTheme = themesData.themes.nodes.find((t) => t.role === "MAIN");

    if (!activeTheme) {
        return json({ enabled: false, themeId: null, appEmbedTarget: null });
    }

    const themeIdNumeric = activeTheme.id.split("/").pop();

    const assetRes = await admin.graphql(
        `#graphql
    query getThemeAsset($themeId: ID!, $key: String!) {
      theme(id: $themeId) {
        files(filenames: [$key]) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText { content }
            }
          }
        }
      }
    }`,
        { variables: { themeId: activeTheme.id, key: "config/settings_data.json" } }
    );
    const { data: assetData } = await assetRes.json();
    const fileContent = assetData?.theme?.files?.nodes?.[0]?.body?.content;

    let enabled = false;
    let appEmbedTarget = null;

    if (fileContent) {
        try {
            const cleanedContent = fileContent.replace(/^\/\*[\s\S]*?\*\/\s*/, "");
            const settings = JSON.parse(cleanedContent);
            const blocks = settings?.current?.blocks || {};

            for (const block of Object.values(blocks)) {
                if (
                    typeof block.type === "string" &&
                    block.type.includes("shopify://apps/ab-testing/blocks/preview-toolbar")
                ) {
                    const parts = block.type.split("/blocks/")[1];
                    appEmbedTarget = parts;
                    enabled = block.disabled !== true;
                    break;
                }
            }
        } catch (e) {
            console.error("Failed to parse settings_data.json:", e);
        }
    }

    return json({
        enabled,
        themeId: themeIdNumeric,
        appEmbedTarget,
    });
};