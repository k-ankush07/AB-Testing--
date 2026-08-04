
import {
    Text,
    BlockStack,
    InlineStack,
    Button,
    Card,
    TextField,
    Box,
} from "@shopify/polaris";
import { PlusIcon, ArrowRightIcon } from "@shopify/polaris-icons";

export default function TestGroups({ groups, COLORS, editingId, addGroup, barRef, handleDragStart, setEditingId,
    removeGroup, renameGroup
    
}) {
    return (
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
    )
}
