import { useState, useRef, useEffect } from "react";
import TestGroups from "./components/Dashboard/testGroups";
import Mods from "./components/Dashboard/Mods";
import { requireShopData } from "./components/shop.server";
import { useLoaderData, useLocation, useSearchParams, Link, useNavigate } from "react-router";
import { apiRequest, apiGet, apiPut } from "./components/utils/api";

import { Page, Text, BlockStack, InlineStack, Button, Badge, Tabs, TextField, Spinner  } from "@shopify/polaris";

const TAB_TO_PARAM = {
    0: "testGroups",
    1: "mods",
    2: "targeting",
    3: "analytics",
    4: "preview",
    5: "results",
};

const PARAM_TO_TAB = {
    testGroups: 0,
    mods: 1,
    targeting: 2,
    analytics: 3,
    preview: 4,
    results: 5,
};

const COLORS = ["#2563EB", "#16A34A", "#2563EB", "#9333EA", "#F59E0B"];

function makeGroup(index) {
    return {
        id: `group-${Date.now()}-${index}`,
        name: index === 0 ? "Control Group" : `New Group ${index}`,
        percent: 50,
    };
}

function redistribute(groups) {
    const n = groups.length;
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    return groups.map((g, i) => ({
        ...g,
        percent: base + (i < remainder ? 1 : 0),
    }));
}

export const loader = async ({ request }) => {
    return await requireShopData(request);
};

const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
});

export default function Experiment() {
    const location = useLocation();
    const { shop: shopFromLoader } = useLoaderData();
    const shop = location.state?.shop || shopFromLoader;
    const [saving, setSaving] = useState(false);
    const [loadingExperiment, setLoadingExperiment] = useState(false);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get("action") || "new";
    const experimentId = searchParams.get("id");
    const isEditMode = action === "edit" && !!experimentId;

    const tab = searchParams.get("tab") || "testGroups";

    const [experimentName, setExperimentName] = useState(`Content Edits Test · ${today}`);
    const [editingName, setEditingName] = useState(false);

    const [groups, setGroups] = useState(() =>
        redistribute([makeGroup(0), makeGroup(1)])
    );
    const [editingId, setEditingId] = useState(null);
    const selectedTab = PARAM_TO_TAB[tab] ?? 0;
    const barRef = useRef(null);

    useEffect(() => {
        if (!isEditMode) return;
        const experimentFromState = location.state?.experiment;

        if (experimentFromState) {
            setExperimentName(experimentFromState.name);
            setGroups(experimentFromState.testGroups);
            return;
        }

        const loadExperiment = async () => {
            setLoadingExperiment(true);
            try {
                const data = await apiGet(`/experiments/${experimentId}`);
                setExperimentName(data.experiment.name);
                setGroups(data.experiment.testGroups);
                console.log(data.experiment);
            } catch (err) {
                console.error("Failed to load experiment:", err);
                alert("Failed to load experiment data");
                navigate("/app");
            } finally {
                setLoadingExperiment(false);
            }
        };

        loadExperiment();
    }, [isEditMode, experimentId]);

    const tabs = [
        { id: "testGroups", content: `Test Groups (${groups.length})` },
        { id: "mods", content: "Modifications" },
        { id: "targeting", content: "Targeting" },
        { id: "analytics", content: "Configure Analytics" },
        { id: "preview", content: "Preview" },
        { id: "results", content: "Results", disabled: true },
    ];

    const handleTabChange = (selectedTabIndex) => {
        const newTabParam = TAB_TO_PARAM[selectedTabIndex];
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("tab", newTabParam);
            return next;
        });
    };

    const addGroup = () => {
        if (groups.length >= 5) return;
        const next = [...groups, makeGroup(groups.length)];
        setGroups(redistribute(next));
    };

    const removeGroup = (id) => {
        if (groups.length <= 1) return;
        const next = groups.filter((g) => g.id !== id);
        setGroups(redistribute(next));
    };

    const renameGroup = (id, name) => {
        setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
    };

    const handleDragStart = (index) => (e) => {
        e.preventDefault();
        const onMouseMove = (moveEvent) => {
            if (!barRef.current) return;
            const rect = barRef.current.getBoundingClientRect();
            const x = moveEvent.clientX - rect.left;
            const pct = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));

            setGroups((prev) => {
                const next = [...prev];
                let cumulativeBefore = 0;
                for (let i = 0; i < index; i++) cumulativeBefore += next[i].percent;

                const newCurrent = pct - cumulativeBefore;
                const diff = next[index].percent - newCurrent;
                const newNextVal = next[index + 1].percent + diff;

                if (newCurrent < 0 || newNextVal < 0) return prev;

                next[index] = { ...next[index], percent: newCurrent };
                next[index + 1] = { ...next[index + 1], percent: newNextVal };
                return next;
            });
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const totalPercent = groups.reduce((sum, g) => sum + g.percent, 0);
            if (totalPercent !== 100) {
                alert("Test group percentages must add up to 100%");
                setSaving(false);
                return;
            }

            const payload = {
                shop: shop?.shop?.myshopifyDomain || shop?.myshopifyDomain,
                type: "content/onsiteEdits",
                name: experimentName,
                testGroups: groups.map((g) => ({
                    id: g.id,
                    name: g.name,
                    percent: g.percent,
                })),
            };

            const data = isEditMode
                ? await apiPut(`/experiments/${experimentId}`, payload)
                : await apiRequest("/experiments", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

            console.log("Experiment saved:", data.experiment);
            navigate("/app");
        } catch (err) {
            console.error(err);
            alert("Error saving experiment: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loadingExperiment) {
        return (
            <Page fullWidth>
                <InlineStack align="center">
                    <Spinner accessibilityLabel="Loading experiment" size="large" />
                </InlineStack>
            </Page>
        );
    }

    return (
        <Page fullWidth>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                        <InlineStack gap="100">
                            <Link to="/app">
                                <Text as="span" tone="subdued">Content</Text>
                            </Link>
                            <Text as="span" tone="subdued">›</Text>
                            <Text as="span" tone="subdued">{experimentName}</Text>
                        </InlineStack>

                        {editingName ? (
                            <TextField
                                labelHidden
                                label="Experiment name"
                                autoFocus
                                value={experimentName}
                                onChange={setExperimentName}
                                onBlur={() => setEditingName(false)}
                            />
                        ) : (
                            <Text as="h1" variant="headingLg">
                                <span
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setEditingName(true)}
                                >
                                    {experimentName} ✎
                                </span>
                            </Text>
                        )}
                    </BlockStack>
                    <Button variant="primary" tone="success" onClick={handleSave} loading={saving}>
                        Save
                    </Button>
                </InlineStack>

                <InlineStack gap="200" blockAlign="center">
                    <Badge>All Visitors</Badge>
                </InlineStack>

                <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} />
                {tab === "testGroups" && (<TestGroups
                    groups={groups}
                    COLORS={COLORS}
                    editingId={editingId}
                    addGroup={addGroup}
                    barRef={barRef}
                    handleDragStart={handleDragStart}
                    setEditingId={setEditingId}
                    removeGroup={removeGroup}
                    renameGroup={renameGroup}
                />)}
                {tab === "mods" && (<Mods experimentId={experimentId}
                    shopDomain={shop?.shop?.myshopifyDomain || shop?.myshopifyDomain}
                    testGroups={groups}
                />)}
            </BlockStack>
        </Page>
    );
}