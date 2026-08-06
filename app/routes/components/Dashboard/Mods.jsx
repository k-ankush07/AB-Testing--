import { useState, useEffect } from "react";
import {
    Card,
    Text,
    Box,
    InlineStack,
    BlockStack,
    Button,
    Banner,
    Icon,
    TextField,
    Checkbox,
    Divider,
    Spinner,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";

const TYPE_LABELS = {
    text: "Text",
    hide: "Hide",
    html: "HTML",
    image: "Image",
};

export default function Modifications({
    experimentId,
    shopDomain,
    testGroups = [],
    experimentName,
    onExperimentCreated,
}) {
    const [loadingBuilder, setLoadingBuilder] = useState(false);
    const [loadingMods, setLoadingMods] = useState(true);
    const [modifications, setModifications] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [draft, setDraft] = useState(null);
    const [savingMod, setSavingMod] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (!experimentId) {
            setLoadingMods(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGet(`/experiments/${experimentId}`);
                if (cancelled) return;
                const mods = (data.experiment?.modifications || []).filter(
                    (m) => m && m.groupValues
                );
                setModifications(mods);
            } catch (err) {
                console.error("Failed to load modifications:", err);
            } finally {
                if (!cancelled) setLoadingMods(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [experimentId]);

    const openVisualBuilder = async () => {
        setLoadingBuilder(true);
        try {
            let currentExperimentId = experimentId;

            if (!currentExperimentId) {
                const totalPercent = (testGroups || []).reduce(
                    (sum, g) => sum + g.percent,
                    0
                );
                if (totalPercent !== 100) {
                    alert(
                        "Test group percentages must add up to 100% before opening the editor"
                    );
                    setLoadingBuilder(false);
                    return;
                }

                const createData = await apiPost("/experiments", {
                    shop: shopDomain,
                    type: "content/onsiteEdits",
                    name: experimentName,
                    testGroups: (testGroups || []).map((g) => ({
                        id: g.id,
                        name: g.name,
                        percent: g.percent,
                    })),
                });

                currentExperimentId = createData.experiment.experimentId;

                if (onExperimentCreated) {
                    onExperimentCreated(currentExperimentId);
                }
            }

            const data = await apiPost(
                `/experiments/${currentExperimentId}/builder-token`,
                { shop: shopDomain }
            );

            const previewUrl = `https://${shopDomain}/?ig-preview=${currentExperimentId}&ig-builder-entity=experiment`;
            const fullUrl = `${previewUrl}#ig-auth-token=${data.token}`;

            window.open(fullUrl, "_blank");
        } catch (err) {
            console.error("Failed to open visual builder:", err);
            alert("Failed to open visual builder");
        } finally {
            setLoadingBuilder(false);
        }
    };

    const selectMod = (index) => {
        setSelectedIndex(index);
        setDraft(JSON.parse(JSON.stringify(modifications[index])));
    };

    const updateDraftGroupField = (groupName, field, value) => {
        setDraft((prev) => ({
            ...prev,
            groupValues: {
                ...prev.groupValues,
                [groupName]: {
                    ...prev.groupValues[groupName],
                    [field]: value,
                },
            },
        }));
    };

    const deleteMod = async (index, e) => {
        e.stopPropagation();
        const mod = modifications[index];
        if (!window.confirm("Delete this edit?")) return;

        setDeletingId(mod.id);
        try {
            await apiDelete(`/experiments/${experimentId}/modifications/${mod.id}`);
            const next = modifications.filter((_, i) => i !== index);
            setModifications(next);
            if (selectedIndex === index) {
                setSelectedIndex(null);
                setDraft(null);
            } else if (selectedIndex > index) {
                setSelectedIndex(selectedIndex - 1);
            }
        } catch (err) {
            console.error("Failed to delete modification:", err);
            alert("Failed to delete edit");
        } finally {
            setDeletingId(null);
        }
    };

    const saveDraft = async () => {
        if (!draft) return;
        setSavingMod(true);
        try {
            const updated = await apiPut(
                `/experiments/${experimentId}/modifications/${draft.id}`,
                draft
            );
            const savedMod = updated.modification || draft;
            setModifications((prev) =>
                prev.map((m) => (m.id === savedMod.id ? savedMod : m))
            );
        } catch (err) {
            console.error("Failed to save modification:", err);
            alert("Failed to save edit");
        } finally {
            setSavingMod(false);
        }
    };

    const groupNames =
        testGroups.length > 0
            ? testGroups.map((g) => g.name)
            : draft
                ? Object.keys(draft.groupValues || {})
                : [];

    if (loadingMods) {
        return (
            <Card>
                <Box padding="800">
                    <InlineStack align="center">
                        <Spinner accessibilityLabel="Loading modifications" size="small" />
                    </InlineStack>
                </Box>
            </Card>
        );
    }

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
                    You can keep using the legacy onsite editor through August 18,
                    2026. After that, it will no longer be available.
                </Banner>

                {modifications.length === 0 ? (
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
                                Open the visual editor to spot-edit and hide text, images,
                                and more on specific pages or across your site.
                            </Text>
                            <InlineStack gap="200" align="center">
                                <Button variant="primary" onClick={openVisualBuilder} loading={loadingBuilder}>
                                    Visual Builder
                                </Button>
                                <Text as="span" tone="subdued">OR</Text>
                                <Button onClick={openVisualBuilder} loading={loadingBuilder}>
                                    Legacy onsite editor
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    </Box>
                ) : (
                    <>
                        <Text as="p" fontWeight="semibold">
                            The following changes are applied in this experience:
                        </Text>

                        <InlineStack gap="400" align="start" blockAlign="start" wrap={false}>
                            <Box minWidth="320px" maxWidth="360px" width="100%">
                                <BlockStack gap="200">
                                    {modifications.map((mod, i) => (
                                        <Box
                                            key={mod.id || i}
                                            padding="300"
                                            borderWidth="025"
                                            borderColor={selectedIndex === i ? "border-emphasis" : "border"}
                                            borderRadius="200"
                                            background={selectedIndex === i ? "bg-surface-selected" : "bg-surface"}
                                        >
                                            <div
                                                style={{ cursor: "pointer" }}
                                                onClick={() => selectMod(i)}
                                            >
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <Text as="span" fontWeight="semibold">
                                                        {i + 1}. {TYPE_LABELS[mod.type] || "Edit"}
                                                    </Text>
                                                    <Button
                                                        icon={DeleteIcon}
                                                        variant="plain"
                                                        tone="critical"
                                                        loading={deletingId === mod.id}
                                                        onClick={(e) => deleteMod(i, e)}
                                                        accessibilityLabel="Delete edit"
                                                    />
                                                </InlineStack>

                                                {selectedIndex === i && (
                                                    <BlockStack gap="050">
                                                        <Text as="span" tone="subdued" variant="bodySm">
                                                            Selector: {mod.selector}
                                                        </Text>
                                                        {Object.entries(mod.groupValues || {}).map(([gName, gv]) => (
                                                            <Text as="span" tone="subdued" variant="bodySm" key={gName}>
                                                                {gName}:{" "}
                                                                {gv.hide
                                                                    ? "Remove"
                                                                    : gv.leaveAsIs
                                                                        ? "Leave as is"
                                                                        : (gv.value || "").slice(0, 40)}
                                                            </Text>
                                                        ))}
                                                    </BlockStack>
                                                )}
                                            </div>
                                        </Box>
                                    ))}
                                </BlockStack>
                            </Box>

                            <Box minWidth="320px" width="100%">
                                {!draft ? (
                                    <Box padding="800" borderWidth="025" borderColor="border" borderRadius="200">
                                        <InlineStack align="center">
                                            <Text as="p" tone="subdued">
                                                Select an edit to see its details
                                            </Text>
                                        </InlineStack>
                                    </Box>
                                ) : (
                                    <Box padding="400" borderWidth="025" borderColor="border" borderRadius="200">
                                        <BlockStack gap="300">
                                            <TextField
                                                label="Targeting selector"
                                                value={draft.selector}
                                                onChange={(v) => setDraft((p) => ({ ...p, selector: v }))}
                                            />

                                            <Text as="p" fontWeight="semibold">
                                                Replace
                                            </Text>

                                            {groupNames.map((gName) => {
                                                const gv =
                                                    draft.groupValues[gName] || {
                                                        value: "",
                                                        hide: false,
                                                        leaveAsIs: false,
                                                    };
                                                return (
                                                    <BlockStack gap="100" key={gName}>
                                                        <Text as="span" fontWeight="medium" variant="bodySm">
                                                            {gName}
                                                        </Text>
                                                        <TextField
                                                            labelHidden
                                                            label={gName}
                                                            value={gv.value || ""}
                                                            multiline={draft.type === "html"}
                                                            disabled={gv.hide}
                                                            onChange={(v) =>
                                                                updateDraftGroupField(gName, "value", v)
                                                            }
                                                        />
                                                        <InlineStack gap="400">
                                                            <Checkbox
                                                                label="Hide"
                                                                checked={!!gv.hide}
                                                                onChange={(v) =>
                                                                    updateDraftGroupField(gName, "hide", v)
                                                                }
                                                            />
                                                            <Checkbox
                                                                label="Leave as is"
                                                                checked={!!gv.leaveAsIs}
                                                                onChange={(v) =>
                                                                    updateDraftGroupField(gName, "leaveAsIs", v)
                                                                }
                                                            />
                                                        </InlineStack>
                                                    </BlockStack>
                                                );
                                            })}

                                            <InlineStack align="end">
                                                <Button variant="primary" onClick={saveDraft} loading={savingMod}>
                                                    Save changes
                                                </Button>
                                            </InlineStack>
                                        </BlockStack>
                                    </Box>
                                )}
                            </Box>
                        </InlineStack>

                        <Divider />

                        <InlineStack gap="200" align="center">
                            <Button onClick={openVisualBuilder} loading={loadingBuilder}>
                                Visual Builder
                            </Button>
                            <Text as="span" tone="subdued">OR</Text>
                            <Button onClick={openVisualBuilder} loading={loadingBuilder}>
                                Legacy onsite editor
                            </Button>
                        </InlineStack>
                    </>
                )}
            </BlockStack>
        </Card>
    );
}