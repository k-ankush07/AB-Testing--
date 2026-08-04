import { useState, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import {
    Page,
    Text,
    BlockStack,
    InlineStack,
    Button,
    Badge,
    Tabs,
    Card,
    TextField,
    Box,
} from "@shopify/polaris";
import { PlusIcon, ArrowRightIcon } from "@shopify/polaris-icons";

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

export default function Experiment() {
    const [searchParams] = useSearchParams();
    const tab = searchParams.get("tab") || "testGroups";

    const [groups, setGroups] = useState(() =>
        redistribute([makeGroup(0), makeGroup(1)])
    );
    const [editingId, setEditingId] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const barRef = useRef(null);

    const tabs = [
        { id: "testGroups", content: `Test Groups (${groups.length})` },
        { id: "modifications", content: "Modifications" },
        { id: "targeting", content: "Targeting" },
        { id: "analytics", content: "Configure Analytics" },
        { id: "preview", content: "Preview" },
        { id: "results", content: "Results", disabled: true },
    ];

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

    let cumulative = 0;

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
                            <Text as="span" tone="subdued">Content Edits Test · Aug 4</Text>
                        </InlineStack>
                        <Text as="h1" variant="headingLg">
                            Content Edits Test · Aug 4
                        </Text>
                    </BlockStack>
                    <Button variant="primary" tone="success">
                        Save
                    </Button>
                </InlineStack>

                <InlineStack gap="200" blockAlign="center">
                    <Badge>All Visitors</Badge>
                </InlineStack>

                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />

                {tab === "testGroups" && selectedTab === 0 && (
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="start">
                                <BlockStack gap="100">
                                    <Text as="h2" variant="headingMd">Test Groups</Text>
                                    <Text as="p" tone="subdued">
                                        Add up to 5 test groups, naming each one, and allocate a
                                        percent of site traffic to each.
                                    </Text>
                                </BlockStack>
                                <Button icon={ArrowRightIcon}>Next step</Button>
                            </InlineStack>

                            <Box paddingBlockStart="400">
                                <InlineStack gap="600" wrap={false} blockAlign="center">
                                    {groups.map((group, index) => {
                                        const color = COLORS[index % COLORS.length];
                                        return (
                                            <Box key={group.id} position="relative">
                                                {index !== 0 && groups.length > 1 && (
                                                    <Box
                                                        style={{
                                                            position: "absolute",
                                                            top: -4,
                                                            right: -4,
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() => removeGroup(group.id)}
                                                    >
                                                        <Text as="span">✕</Text>
                                                    </Box>
                                                )}
                                                <BlockStack gap="200" align="center">
                                                    <div
                                                        style={{
                                                            width: 140,
                                                            height: 140,
                                                            borderRadius: "50%",
                                                            border: `3px solid ${color}`,
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Text as="span" variant="heading2xl">
                                                            <span style={{ color }}>{group.percent}%</span>
                                                        </Text>
                                                        {editingId === group.id ? (
                                                            <TextField
                                                                labelHidden
                                                                label="name"
                                                                autoFocus
                                                                value={group.name}
                                                                onChange={(val) => renameGroup(group.id, val)}
                                                                onBlur={() => setEditingId(null)}
                                                            />
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    color,
                                                                    textDecoration: "underline",
                                                                    cursor: "pointer",
                                                                    fontSize: 13,
                                                                }}
                                                                onClick={() => setEditingId(group.id)}
                                                            >
                                                                {group.name} ✎
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 12, opacity: 0.6 }}>⇄</span>
                                                    </div>
                                                </BlockStack>
                                            </Box>
                                        );
                                    })}

                                    {groups.length < 5 && (
                                        <Button icon={PlusIcon} onClick={addGroup} accessibilityLabel="Add group" />
                                    )}
                                </InlineStack>
                            </Box>

                            <div
                                ref={barRef}
                                style={{
                                    position: "relative",
                                    width: "100%",
                                    height: 8,
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    display: "flex",
                                }}
                            >
                                <div style={{ display: "flex", width: "100%" }}>
                                    {groups.map((g, i) => (
                                        <div
                                            key={g.id}
                                            style={{
                                                width: `${g.percent}%`,
                                                background: COLORS[i % COLORS.length],
                                                position: "relative",
                                            }}
                                        >
                                            {i < groups.length - 1 && (
                                                <div
                                                    onMouseDown={handleDragStart(i)}
                                                    style={{
                                                        position: "absolute",
                                                        right: -8,
                                                        top: -6,
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: "50%",
                                                        background: "#fff",
                                                        border: `3px solid ${COLORS[i % COLORS.length]}`,
                                                        cursor: "ew-resize",
                                                        zIndex: 2,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", width: "100%" }}>
                                {groups.map((g, i) => (
                                    <div
                                        key={g.id}
                                        style={{
                                            width: `${g.percent}%`,
                                            textAlign:
                                                i === 0 ? "left" : i === groups.length - 1 ? "right" : "center",
                                        }}
                                    >
                                        <Text as="span" variant="bodySm" tone="subdued">
                                            <span style={{ color: COLORS[i % COLORS.length] }}>{g.name}</span>
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        </BlockStack>
                    </Card>
                )}
            </BlockStack>
        </Page>
    );
}