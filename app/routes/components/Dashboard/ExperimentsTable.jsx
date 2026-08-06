import { useState } from "react";
import {
  Card,
  IndexTable,
  Badge,
  Text,
  Button,
  InlineStack,
  Popover,
  ActionList,
  Icon,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";

const STATUS_TONE = {
  active: "success",
  pending: "info",
  paused: "warning",
  ended: "critical",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function daysSince(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function ExperimentsTable({
  experiments,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loadingAction, setLoadingAction] = useState({});

  const handleStatusChange = async (experimentId, newStatus) => {
    setLoadingAction((prev) => ({ ...prev, [experimentId]: newStatus }));
    try {
      await onStatusChange(experimentId, newStatus);
    } finally {
      setLoadingAction((prev) => {
        const next = { ...prev };
        delete next[experimentId];
        return next;
      });
    }
  };

  const rowMarkup = experiments.map((exp, index) => {
    const isActive = exp.status === "active";
    const isPending = exp.status === "pending";
    const isEnded = exp.status === "ended";
    const currentLoadingAction = loadingAction[exp.experimentId];

    return (
      <IndexTable.Row id={exp.experimentId} key={exp.experimentId} position={index}>
        <IndexTable.Cell>
          <Text as="span" variant="bodySm" tone="subdued">
            TEST
          </Text>
          <br />
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {exp.name}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <InlineStack gap="100" blockAlign="center">
            <Badge tone={STATUS_TONE[exp.status] || "info"}>
              {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
            </Badge>
            {isActive && exp.startedAt && (
              <Text as="span" tone="subdued">
                · {daysSince(exp.startedAt)}d
              </Text>
            )}
          </InlineStack>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" tone="subdued">
            {isPending
              ? `Created ${formatDate(exp.createdAt)}`
              : isEnded
              ? `${formatDate(exp.startedAt)} – ${formatDate(exp.endedAt)}`
              : `Started ${formatDate(exp.startedAt)}`}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {exp.type ? (
            <Badge>{exp.type.split("/").pop()}</Badge>
          ) : (
            <Text as="span" tone="subdued">-------</Text>
          )}
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span" tone="subdued">
            {isPending ? "-------" : `<${exp.visitors || 100}`}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <InlineStack gap="200" blockAlign="center" align="end">
            {isActive && (
              <>
                <Button
                  variant="plain"
                  loading={currentLoadingAction === "ended"}
                  disabled={!!currentLoadingAction}
                  onClick={() => handleStatusChange(exp.experimentId, "ended")}
                >
                  End
                </Button>
                <Button
                  loading={currentLoadingAction === "paused"}
                  disabled={!!currentLoadingAction}
                  onClick={() => handleStatusChange(exp.experimentId, "paused")}
                >
                  Pause
                </Button>
              </>
            )}
            {isPending && (
              <Button
                loading={currentLoadingAction === "active"}
                disabled={!!currentLoadingAction}
                onClick={() => handleStatusChange(exp.experimentId, "active")}
              >
                Start
              </Button>
            )}
            {exp.status === "paused" && (
              <Button
                loading={currentLoadingAction === "active"}
                disabled={!!currentLoadingAction}
                onClick={() => handleStatusChange(exp.experimentId, "active")}
              >
                Resume
              </Button>
            )}

            <Popover
              active={openMenuId === exp.experimentId}
              activator={
                <Button
                  variant="plain"
                  icon={MenuHorizontalIcon}
                  onClick={() =>
                    setOpenMenuId(
                      openMenuId === exp.experimentId ? null : exp.experimentId
                    )
                  }
                  accessibilityLabel="More actions"
                />
              }
              onClose={() => setOpenMenuId(null)}
            >
              <ActionList
                items={[
                  {
                    content: "Edit",
                    onAction: () => {
                      setOpenMenuId(null);
                      onEdit(exp);
                    },
                  },
                  {
                    content: "Delete",
                    destructive: true,
                    onAction: () => {
                      setOpenMenuId(null);
                      onDelete(exp.experimentId);
                    },
                  },
                ]}
              />
            </Popover>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Card padding="0">
      <IndexTable
        itemCount={experiments.length}
        selectable={false}
        headings={[
          { title: "Name" },
          { title: "Status" },
          { title: "Timeline" },
          { title: "Modifications" },
          { title: "Visitors" },
          { title: "" },
        ]}
      >
        {rowMarkup}
      </IndexTable>
    </Card>
  );
}