import { useState } from "react";
import {
    Card,
    Text,
    Box,
    InlineStack,
    BlockStack,
    Button,
    Banner,
    Icon,
} from "@shopify/polaris";
import { EditIcon } from "@shopify/polaris-icons";
import { apiPost } from "../utils/api";

export default function Modifications({ experimentId, shopDomain }) {
    const [loadingBuilder, setLoadingBuilder] = useState(false);

    const openVisualBuilder = async () => {
        setLoadingBuilder(true);
        try {
            const data = await apiPost(`/experiments/${experimentId}/builder-token`, {
                shop: shopDomain,
            });

            const previewUrl = `https://${shopDomain}/?ig-preview=${experimentId}&ig-builder-entity=experiment`;
            const fullUrl = `${previewUrl}#ig-auth-token=${data.token}`;

            window.open(fullUrl, "_blank");
        } catch (err) {
            console.error("Failed to open visual builder:", err);
            alert("Failed to open visual builder");
        } finally {
            setLoadingBuilder(false);
        }
    };

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack gap="200" align="start" blockAlign="center">
                    <Box>
                        <Icon source={EditIcon} />
                    </Box>
                    <Text as="h2" variant="headingMd">
                        Content Edits
                    </Text>
                </InlineStack>
                <Text as="p" tone="subdued">
                    Dynamically update content on your site based on a visitor's test
                    group.
                </Text>

                <Banner tone="warning">
                    You can keep using the legacy onsite editor through August 11,
                    2026. After that, it will no longer be available.
                </Banner>

                <Box
                    padding="800"
                    borderWidth="025"
                    borderColor="border"
                    borderRadius="200"
                >
                    <BlockStack gap="300" align="center">
                        <Text as="p" variant="headingSm" alignment="center">
                            No edits added yet
                        </Text>
                        <Text as="p" tone="subdued" alignment="center">
                            Open the visual editor to spot-edit and hide text, images, and
                            more on specific pages or across your site.
                        </Text>

                        <InlineStack gap="200" align="center">
                            <Button variant="primary">
                                Visual Builder
                            </Button>
                            <Text as="span" tone="subdued">
                                OR
                            </Text>
                            <Button onClick={openVisualBuilder} loading={loadingBuilder}>
                                Legacy onsite editor
                            </Button>
                        </InlineStack>
                    </BlockStack>
                </Box>
            </BlockStack>
        </Card>
    );
}