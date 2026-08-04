import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import {
  Page,
  Text,
  BlockStack,
  InlineStack,
  Card,
  Button,
  Modal,
  Box,
  Badge,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";

import { requireShopData } from "./components/shop.server";

export const loader = async ({ request }) => {
  return await requireShopData(request);
};

export default function Index() {
  const { shop } = useLoaderData();
  const [modalActive, setModalActive] = useState(false);
  const navigate = useNavigate();

  const toggleModal = () => setModalActive((prev) => !prev);

  return (
    <Page fullWidth>
      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">
              {shop?.name ? shop.name.toUpperCase() : "STORE"}
            </Text>
            <Text as="h1" variant="headingXl">
              Welcome, {shop?.shopOwnerName || "there"}
            </Text>
          </BlockStack>

          <Button variant="primary" icon={PlusIcon} onClick={toggleModal}>
            New experience
          </Button>
        </InlineStack>

        <Card>
          <BlockStack gap="200"></BlockStack>
        </Card>
      </BlockStack>

      <Modal
        open={modalActive}
        onClose={toggleModal}
        title="Choose an Experience to create"
        large
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm" tone="subdued">
              CONTENT
            </Text>

            <Card padding="0">
              <Box
                padding="400"
                borderBlockEndWidth="025"
                borderColor="border"
              >
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Preview
                  </Text>
                  <Badge tone="magic">✨ AI Powered</Badge>
                </InlineStack>
              </Box>

              <div
                onClick={() =>
                  navigate(
                    "/experiment?action=new&type=content%2FonsiteEdits&tab=testGroups"
                  )
                }
                style={{ cursor: "pointer" }}
              >
                <Box padding="400">
                  <BlockStack gap="150">
                    <Text as="h3" variant="headingMd">
                      Content Edits
                    </Text>
                    <Text as="p" tone="subdued">
                      Change headlines, copy, and on-page elements.
                    </Text>
                  </BlockStack>
                </Box>
              </div>
            </Card>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}