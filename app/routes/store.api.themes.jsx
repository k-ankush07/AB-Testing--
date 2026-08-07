import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query getThemes {
      themes(first: 250) {
        nodes {
          id
          name
          role
          processing
        }
      }
    }`
  );

  const { data } = await response.json();

  return json({ themes: data.themes.nodes });
};