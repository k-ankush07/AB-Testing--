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
    Modal
} from "@shopify/polaris";
import { EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api";

const TYPE_LABELS = {
    text: "Text",
    hide: "Hide",
    html: "HTML",
    image: "Image",
};

function isMultiImageMod(mod) {
    if (!mod) return false;
    if (mod.isMultiImage) return true;
    if (mod.groupValues) {
        const first = Object.values(mod.groupValues)[0];
        if (first && Array.isArray(first.images)) return true;
    }
    return false;
}

function getModPreviewLine(gName, gv, isMulti) {
    if (isMulti) {
        const count = (gv?.images || []).length;
        const hiddenCount = (gv?.images || []).filter((i) => i.hide).length;
        if (count === 0) return `${gName}: No images`;
        if (hiddenCount === count) return `${gName}: All hidden`;
        return `${gName}: ${count} image${count > 1 ? "s" : ""}`;
    }
    if (!gv) return `${gName}: —`;
    return `${gName}: ${gv.hide ? "Remove" : gv.leaveAsIs ? "Leave as is" : (gv.value || "").slice(0, 40)
        }`;
}

export default function Modifications({
    experimentId,
    shopDomain,
    testGroups = [],
    experimentName,
    onExperimentCreated,
    appEmbedId
}) {
    const [loadingBuilder, setLoadingBuilder] = useState(false);
    const [loadingMods, setLoadingMods] = useState(true);
    const [modifications, setModifications] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [draft, setDraft] = useState(null);
    const [savingMod, setSavingMod] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [checkingEmbed, setCheckingEmbed] = useState(false);
    const [showEmbedModal, setShowEmbedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [activeThemeId, setActiveThemeId] = useState(null);
    const [appEmbedTarget, setAppEmbedTarget] = useState(null);


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

    const updateDraftGroupImageField = (groupName, index, field, value) => {
        setDraft((prev) => {
            const images = [...(prev.groupValues[groupName]?.images || [])];
            images[index] = { ...images[index], [field]: value };
            return {
                ...prev,
                groupValues: {
                    ...prev.groupValues,
                    [groupName]: {
                        ...prev.groupValues[groupName],
                        images,
                    },
                },
            };
        });
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

            const payload = {
                ...draft,
                isMultiImage: isMultiImageMod(draft),
            };
            const updated = await apiPut(
                `/experiments/${experimentId}/modifications/${draft.id}`,
                payload
            );
            const savedMod = updated.modification || payload;
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

    const draftIsMultiImage = isMultiImageMod(draft);

    const checkAppEmbedStatus = async () => {
        const res = await fetch(`/theme/embed-status?shop=${shopDomain}`);
        if (!res.ok) throw new Error("Failed to fetch embed status");
        const data = await res.json();
        return data;
    };

    const handleBuilderClick = async (actionType) => {
        setCheckingEmbed(true);
        try {
            const { enabled, themeId, appEmbedTarget: target } = await checkAppEmbedStatus();
            if (!enabled) {
                setActiveThemeId(themeId);
                setAppEmbedTarget(target);
                setPendingAction(actionType);
                setShowEmbedModal(true);
                return;
            }
            openVisualBuilder();
        } catch (err) {
            console.error("Failed to check app embed status:", err);
            openVisualBuilder();
        } finally {
            setCheckingEmbed(false);
        }
    };

    const redirectToThemeEmbedSettings = () => {
        const storeHandle = shopDomain.replace(".myshopify.com", "");
        const APP_CLIENT_ID = appEmbedId;
        const base = `https://admin.shopify.com/store/${storeHandle}/themes/${activeThemeId}/editor?context=apps`;
        const embedUrl = `${base}&activateAppId=${APP_CLIENT_ID}%2Fpreview-toolbar`;
        window.open(embedUrl, "_blank");
        setShowEmbedModal(false);
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
                                    {modifications.map((mod, i) => {
                                        const modIsMulti = isMultiImageMod(mod);
                                        return (
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
                                                            {modIsMulti ? " (multi)" : ""}
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
                                                                    {getModPreviewLine(gName, gv, modIsMulti)}
                                                                </Text>
                                                            ))}
                                                        </BlockStack>
                                                    )}
                                                </div>
                                            </Box>
                                        );
                                    })}
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

                                            {draftIsMultiImage
                                                ? groupNames.map((gName) => {
                                                    const gv = draft.groupValues[gName] || { images: [] };
                                                    return (
                                                        <BlockStack gap="200" key={gName}>
                                                            <Text as="span" fontWeight="medium" variant="bodySm">
                                                                {gName}
                                                            </Text>

                                                            {(gv.images || []).map((imgVal, idx) => (
                                                                <BlockStack gap="100" key={idx}>
                                                                    <Text as="span" tone="subdued" variant="bodySm">
                                                                        Image {idx + 1}
                                                                        {idx === 0 ? " (Main)" : " (Hover/Alt)"}
                                                                    </Text>

                                                                    {imgVal.value && (
                                                                        <img
                                                                            src={imgVal.value}
                                                                            alt=""
                                                                            style={{
                                                                                width: 56,
                                                                                height: 56,
                                                                                objectFit: "cover",
                                                                                borderRadius: 6,
                                                                                border: "1px solid #e5e7eb",
                                                                            }}
                                                                        />
                                                                    )}

                                                                    <TextField
                                                                        labelHidden
                                                                        label={`${gName} image ${idx + 1}`}
                                                                        value={imgVal.value || ""}
                                                                        disabled={imgVal.hide}
                                                                        onChange={(v) =>
                                                                            updateDraftGroupImageField(
                                                                                gName,
                                                                                idx,
                                                                                "value",
                                                                                v
                                                                            )
                                                                        }
                                                                    />
                                                                    <InlineStack gap="400">
                                                                        <Checkbox
                                                                            label="Hide"
                                                                            checked={!!imgVal.hide}
                                                                            onChange={(v) =>
                                                                                updateDraftGroupImageField(
                                                                                    gName,
                                                                                    idx,
                                                                                    "hide",
                                                                                    v
                                                                                )
                                                                            }
                                                                        />
                                                                        <Checkbox
                                                                            label="Leave as is"
                                                                            checked={!!imgVal.leaveAsIs}
                                                                            onChange={(v) =>
                                                                                updateDraftGroupImageField(
                                                                                    gName,
                                                                                    idx,
                                                                                    "leaveAsIs",
                                                                                    v
                                                                                )
                                                                            }
                                                                        />
                                                                    </InlineStack>
                                                                </BlockStack>
                                                            ))}
                                                            <Divider />
                                                        </BlockStack>
                                                    );
                                                })
                                                : groupNames.map((gName) => {
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
                            <Button
                                onClick={() => handleBuilderClick("builder")}
                                loading={loadingBuilder || checkingEmbed}
                            >
                                Visual Builder
                            </Button>
                            <Text as="span" tone="subdued">OR</Text>
                            <Button
                                onClick={() => handleBuilderClick("legacy")}
                                loading={loadingBuilder || checkingEmbed}
                            >
                                Legacy onsite editor
                            </Button>
                        </InlineStack>
                    </>
                )}
            </BlockStack>

            <Modal
                open={showEmbedModal}
                onClose={() => setShowEmbedModal(false)}
                title="Enable App Embed"
                primaryAction={{
                    content: "Go to Theme Editor",
                    onAction: redirectToThemeEmbedSettings,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: () => setShowEmbedModal(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="200">
                        <Text as="p">
                            The Intelligems app embed isn't enabled on your live theme yet.
                            You'll need to turn it on before using the editor.
                        </Text>
                    </BlockStack>
                </Modal.Section>
            </Modal>

        </Card>
    );
}