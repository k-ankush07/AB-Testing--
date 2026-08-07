import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Combobox,
    Listbox,
    Icon,
    Text,
    InlineStack,
    BlockStack,
    Button,
    Spinner,
    Banner,
    Box,
    Card,
    EmptySearchResult,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";

const numericId = (gid) => String(gid).split("/").pop();
const labelFor = (theme) => `${theme.name} (${numericId(theme.id)})`;

function ToggleSwitch({ checked, onChange, label }) {
    return (
        <InlineStack gap="150" blockAlign="center">
            <Text as="span" tone="subdued">{label}</Text>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                style={{
                    width: 36,
                    height: 20,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    padding: 2,
                    background: checked ? "#008060" : "#d1d5db",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: checked ? "flex-end" : "flex-start",
                    transition: "background 120ms ease",
                }}
            >
                <span
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    }}
                />
            </button>
        </InlineStack>
    );
}

function QrCode({ url, size = 140 }) {

    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
    return (
        <img
            src={src}
            alt="QR code"
            width={size}
            height={size}
            style={{ display: "block", borderRadius: 4 }}
        />
    );
}

function GroupPreviewCard({ group, buildUrl }) {
    const [copied, setCopied] = useState(false);
    const url = buildUrl(group);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    return (
        <Box
            padding="300"
            borderWidth="025"
            borderColor="border"
            borderRadius="200"
        >
            <BlockStack gap="200" inlineAlign="start">
                <QrCode url={url} />
                <Text as="span" fontWeight="medium">{group.name}</Text>
                <Button size="slim" onClick={handleCopy}>
                    {copied ? "Copied!" : "Copy link"}
                </Button>
            </BlockStack>
        </Box>
    );
}

function PreviewTheme({ value, onChange, shop, experimentId, testGroups = [] }) {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [viewLive, setViewLive] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch("/store/api/themes")
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                return res.json();
            })
            .then((data) => setThemes(data.themes ?? []))
            .catch((err) => {
                console.error("Failed to load themes:", err);
                setError("We couldn't load your themes. Try again.");
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (loading || value || !themes.length) return;
        if (typeof onChange !== "function") {
            console.error(
                "PreviewTheme: `onChange` prop is missing or not a function. " +
                "Pass a state-setter, e.g. <PreviewTheme value={theme} onChange={setTheme} />"
            );
            return;
        }
        const liveTheme = themes.find((t) => t.role === "MAIN");
        if (liveTheme) onChange(numericId(liveTheme.id));
    }, [loading, value, themes, onChange]);

    const sortedThemes = useMemo(() => {
        return [...themes].sort((a, b) => {
            if (a.role === "MAIN") return -1;
            if (b.role === "MAIN") return 1;
            return 0;
        });
    }, [themes]);

    const selectedTheme = useMemo(
        () => themes.find((t) => numericId(t.id) === String(value)),
        [themes, value]
    );

    const filteredThemes = useMemo(() => {
        if (!query) return sortedThemes;
        const q = query.toLowerCase();
        return sortedThemes.filter(
            (t) =>
                t.name.toLowerCase().includes(q) ||
                numericId(t.id).includes(q)
        );
    }, [sortedThemes, query]);

    const handleSelect = useCallback(
        (selectedId) => {
            if (typeof onChange === "function") onChange(selectedId);
            setQuery("");
        },
        [onChange]
    );

    const shopDomain =
        typeof shop === "string"
            ? shop
            : shop?.shop?.myshopifyDomain || shop?.myshopifyDomain;

    const previewUrl = useMemo(() => {
        if (!shopDomain || !experimentId) return null;
        const params = new URLSearchParams({
            "ig-preview": experimentId,
            pb: "0",
            utm_source: "intelligems_app",
        });
        if (value) params.set("preview_theme_id", value);
        return `https://${shopDomain}/?${params.toString()}`;
    }, [shopDomain, experimentId, value]);

    const buildGroupUrl = useCallback(
        (group) => {
            if (!shopDomain || !experimentId) return "";
            const params = new URLSearchParams({
                "ig-preview": experimentId,
                "ig-preview-group": group.id,
                pb: viewLive ? "1" : "0",
                utm_source: "intelligems_app",
            });
            if (value) params.set("preview_theme_id", value);
            return `https://${shopDomain}/?${params.toString()}`;
        },
        [shopDomain, experimentId, value, viewLive]
    );

    const handleOpenPreview = () => {
        if (!previewUrl) {
            console.error(
                "PreviewTheme: can't build preview URL — missing `shop` or `experimentId` prop."
            );
            return;
        }
        window.open(previewUrl, "_blank");
    };

    if (loading) {
        return (
            <Card>
                <Box padding="800">
                    <InlineStack align="center">
                        <Spinner accessibilityLabel="Loading themes" size="small" />
                    </InlineStack>
                </Box>
            </Card>
        );
    }

    return (
        <BlockStack gap="400">
            <Card>
                <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                        <div style={{ flexGrow: 1 }}>
                            <Combobox
                                activator={
                                    <Combobox.TextField
                                        id="select-theme"
                                        prefix={<Icon source={SearchIcon} />}
                                        onChange={setQuery}
                                        label="Theme"
                                        labelHidden
                                        value={query || (selectedTheme ? labelFor(selectedTheme) : "")}
                                        placeholder="Search themes"
                                        autoComplete="off"
                                        disabled={Boolean(error)}
                                    />
                                }
                            >
                                {filteredThemes.length ? (
                                    <Listbox onSelect={handleSelect}>
                                        {filteredThemes.map((theme) => (
                                            <Listbox.Option
                                                key={theme.id}
                                                value={numericId(theme.id)}
                                                selected={numericId(theme.id) === String(value)}
                                            >
                                                <div style={{ padding: "6px 12px" }}>
                                                    <InlineStack gap="200" blockAlign="center">
                                                        {theme.role === "MAIN" && (
                                                            <span
                                                                style={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: "50%",
                                                                    background: "#008060",
                                                                    display: "inline-block",
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        )}
                                                        <Text as="span">{labelFor(theme)}</Text>
                                                    </InlineStack>
                                                </div>
                                            </Listbox.Option>
                                        ))}
                                    </Listbox>
                                ) : (
                                    <EmptySearchResult
                                        title="No themes found"
                                        description="Try a different search term"
                                    />
                                )}
                            </Combobox>
                        </div>

                        <Button
                            variant="primary"
                            disabled={Boolean(error) || !value || !previewUrl}
                            onClick={handleOpenPreview}
                        >
                            Open preview
                        </Button>
                    </InlineStack>

                    {error && (
                        <Banner tone="critical" title={error} />
                    )}
                </BlockStack>
            </Card>

            {testGroups.length > 0 && (
                <Card>
                    <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="050">
                                <Text as="h3" variant="headingSm">Preview on mobile</Text>
                                <Text as="p" tone="subdued">
                                    Scan a QR code to preview each test group on your device
                                </Text>
                            </BlockStack>
                            <ToggleSwitch
                                checked={viewLive}
                                onChange={setViewLive}
                                label="View live"
                            />
                        </InlineStack>

                        <InlineStack gap="300" wrap>
                            {testGroups.map((group) => (
                                <GroupPreviewCard
                                    key={group.id}
                                    group={group}
                                    buildUrl={buildGroupUrl}
                                />
                            ))}
                        </InlineStack>
                    </BlockStack>
                </Card>
            )}
        </BlockStack>
    );
}

export default PreviewTheme;