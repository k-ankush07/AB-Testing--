import { useState, useEffect, useCallback } from "react";
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
  Spinner,
  EmptyState,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";

import { requireShopData } from "./components/shop.server";
import { apiGet, apiDelete, apiPatch } from "./components/utils/api";
import ExperimentsTable from "./components/Dashboard/ExperimentsTable";

export const loader = async ({ request }) => {
  return await requireShopData(request);
};

export default function Index() {
  const { shop } = useLoaderData();
  const [modalActive, setModalActive] = useState(false);
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const shopDomain = shop?.shop?.myshopifyDomain || shop?.myshopifyDomain;

  const loadExperiments = useCallback(async () => {
    if (!shopDomain) return;
    setLoading(true);
    try {
      const data = await apiGet("/experiments", { shop: shopDomain });
      setExperiments(data.experiments || []);
    } catch (err) {
      console.error("Failed to fetch experiments:", err);
    } finally {
      setLoading(false);
    }
  }, [shopDomain]);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  const toggleModal = () => setModalActive((prev) => !prev);

  const handleEdit = (exp) => {
    navigate(`/experiment?action=edit&id=${exp.experimentId}&tab=testGroups`, {
      state: { shop, experiment: exp },
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this experiment?")) return;
    try {
      await apiDelete(`/experiments/${id}`);
      setExperiments((prev) => prev.filter((e) => e.experimentId !== id));
    } catch (err) {
      console.error("Failed to delete experiment:", err);
      alert("Failed to delete experiment");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const data = await apiPatch(`/experiments/${id}/status`, {
        status: newStatus,
      });
      setExperiments((prev) =>
        prev.map((e) => (e.experimentId === id ? data.experiment : e))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

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

        {loading ? (
          <Card>
            <Box padding="800">
              <InlineStack align="center">
                <Spinner accessibilityLabel="Loading experiments" size="large" />
              </InlineStack>
            </Box>
          </Card>
        ) : experiments.length === 0 ? (
          <Card>
            <EmptyState
              heading="No experiments yet"
              action={{ content: "New experience", onAction: toggleModal }}
              image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
            >
              <p>Create your first A/B test to get started.</p>
            </EmptyState>
          </Card>
        ) : (
          <ExperimentsTable
            experiments={experiments}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
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
              <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Preview
                  </Text>
                  <Badge tone="magic">✨ AI Powered</Badge>
                </InlineStack>
              </Box>

              <div
                onClick={() => {
                  toggleModal();
                  navigate("/experiment?action=new&tab=testGroups", {
                    state: { shop },
                  });
                }}
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