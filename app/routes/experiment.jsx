import { useState, useRef, useEffect } from "react";
import TestGroups from "./components/Dashboard/testGroups";
import Mods from "./components/Dashboard/Mods";
import Targeting from "./components/Dashboard/Targeting";
import PreviewTheme from "./components/Dashboard/PreviewTheme";
import ConfigureAnalytics from "./components/Dashboard/Configure-Analytics";

import { requireShopData } from "./components/shop.server";
import { useLoaderData, useLocation, useSearchParams, Link, useNavigate } from "react-router";
import { apiRequest, apiGet, apiPut } from "./components/utils/api";
import { Page, Text, BlockStack, InlineStack, Button, Badge, Tabs, TextField, Icon } from "@shopify/polaris";
import { EditIcon } from "@shopify/polaris-icons";
import { SaveBar } from "@shopify/app-bridge-react";

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

function statusBadgeProps(status) {
    if (status === "active") {
        return { tone: "success", label: "Live" };
    }
    return { tone: "attention", label: "Pending" };
}

export const loader = async ({ request }) => {
    const shopData = await requireShopData(request);
    return {
        ...shopData,
        appEmbedId: process.env.SHOPIFY_API_KEY || "",
    };
};

const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
});

export default function Experiment() {
    const location = useLocation();
    const { shop: shopFromLoader, appEmbedId } = useLoaderData();
    const shop = location.state?.shop || shopFromLoader;
    const [saving, setSaving] = useState(false);
    const [loadingExperiment, setLoadingExperiment] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [theme, setTheme] = useState("");

    const [status, setStatus] = useState("pending");

    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get("action") || "new";
    const experimentId = searchParams.get("id");
    const isEditMode = action === "edit" && !!experimentId;
    const [isDirty, setIsDirty] = useState(false);
    const initialSnapshot = useRef(null);

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
        if (!isEditMode) {
            initialSnapshot.current = null;
            setStatus("pending");
            setIsDirty(true);
            return;
        }
        const experimentFromState = location.state?.experiment;

        if (experimentFromState) {
            setExperimentName(experimentFromState.name);
            setGroups(experimentFromState.testGroups);
            setSelectedCountries(experimentFromState.countries || []);
            setStatus(experimentFromState.status || "pending");
            initialSnapshot.current = JSON.stringify({
                experimentName: experimentFromState.name,
                groups: experimentFromState.testGroups,
                selectedCountries: experimentFromState.countries || [],
            });
            setIsDirty(false);
            return;
        }

        const loadExperiment = async () => {
            setLoadingExperiment(true);
            try {
                const data = await apiGet(`/experiments/${experimentId}`);
                setExperimentName(data.experiment.name);
                setGroups(data.experiment.testGroups);
                setSelectedCountries(data.experiment.countries || []);
                setStatus(data.experiment.status || "pending");
                initialSnapshot.current = JSON.stringify({
                    experimentName: data.experiment.name,
                    groups: data.experiment.testGroups,
                    selectedCountries: data.experiment.countries || [],
                });
                setIsDirty(false);
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
                countries: selectedCountries,
            };

            const data = isEditMode
                ? await apiPut(`/experiments/${experimentId}`, payload)
                : await apiRequest("/experiments", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

            initialSnapshot.current = JSON.stringify({ experimentName, groups, selectedCountries });
            setIsDirty(false);
            if (data?.experiment?.status) {
                setStatus(data.experiment.status);
            }

            if (!isEditMode) {
                const newId = data?.experiment?.experimentId;
                if (newId) {
                    setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("id", newId);
                        next.set("action", "edit");
                        return next;
                    });
                } else {
                    console.error("Save response me experimentId nahi mila:", data);
                }
            }

            if (window.shopify?.saveBar) {
                window.shopify.saveBar.hide("experiment-save-bar");
            }

            console.log("Experiment saved:", data.experiment);
            // navigate("/app");
        } catch (err) {
            console.error(err);
            alert("Error saving experiment: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (initialSnapshot.current === null) return;
        const current = JSON.stringify({ experimentName, groups, selectedCountries });
        setIsDirty(current !== initialSnapshot.current);
    }, [experimentName, groups, selectedCountries]);

    const handleDiscard = () => {
        if (!isEditMode) {
            setExperimentName(`Content Edits Test · ${today}`);
            setGroups(redistribute([makeGroup(0), makeGroup(1)]));
            setSelectedCountries([]);
            setIsDirty(true);
            if (window.shopify?.saveBar) {
                window.shopify.saveBar.hide("experiment-save-bar");
            }
            return;
        }

        if (!initialSnapshot.current) return;
        const original = JSON.parse(initialSnapshot.current);
        setExperimentName(original.experimentName);
        setGroups(original.groups);
        setSelectedCountries(original.selectedCountries || []);
        setIsDirty(false);

        if (window.shopify?.saveBar) {
            window.shopify.saveBar.hide("experiment-save-bar");
        }
    };

    const { tone: statusTone, label: statusLabel } = statusBadgeProps(status);

    return (
        <Page fullWidth>
            <SaveBar id="experiment-save-bar" open={isDirty}>
                <button
                    variant="primary" onClick={(e) => { e.preventDefault(); handleSave(); }}
                    {...(saving ? { loading: "" } : {})}>
                    Save </button>
                <button
                    onClick={(e) => { e.preventDefault(); handleDiscard(); }}>
                    Discard
                </button>
            </SaveBar>

            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                        <InlineStack gap="100">
                            <Link to="/app" style={{ textDecoration: "none" }}>
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
                                    style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                    onClick={() => setEditingName(true)}
                                >
                                    {experimentName}
                                    <Icon source={EditIcon} tone="subdued" />
                                </span>
                            </Text>
                        )}

                        <InlineStack>
                            <Badge tone={statusTone}>{statusLabel}</Badge>
                        </InlineStack>

                    </BlockStack>
                    <Button
                        variant="primary"
                        tone="success"
                        onClick={handleSave}
                        loading={saving}
                        disabled={!isDirty || saving}
                    >
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
                    loadingExperiment={loadingExperiment}
                />)}
                {tab === "mods" && (
                    <Mods
                        experimentId={experimentId}
                        shopDomain={shop?.shop?.myshopifyDomain || shop?.myshopifyDomain}
                        testGroups={groups}
                        experimentName={experimentName}
                        onExperimentCreated={(newId) => {
                            setSearchParams((prev) => {
                                const next = new URLSearchParams(prev);
                                next.set("id", newId);
                                next.set("action", "edit");
                                return next;
                            });
                        }}
                        appEmbedId={appEmbedId}
                    />
                )}
                {tab === "targeting" && (
                    <Targeting
                        value={selectedCountries}
                        onChange={setSelectedCountries}
                    />
                )}
                {tab === "preview" && (
                    experimentId ? (
                        <PreviewTheme
                            value={theme}
                            onChange={setTheme}
                            shop={shop}
                            experimentId={experimentId}
                            testGroups={groups}
                        />
                    ) : (
                        <div
                            style={{
                                border: "1px solid var(--p-color-border)",
                                borderRadius: "8px",
                                minHeight: "420px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "16px",
                                padding: "40px",
                            }}
                        >
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6b6b6b"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
                                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                            <Text as="p" variant="bodyLg">
                                Please save your Test to access the preview.
                            </Text>
                        </div>
                    )
                )}
                {tab === "analytics" && (
                    <ConfigureAnalytics />)}
            </BlockStack>
        </Page>
    );
}