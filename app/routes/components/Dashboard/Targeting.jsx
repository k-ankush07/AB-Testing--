import { useState, useCallback, useMemo } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Autocomplete,
  Tag,
  Icon,
  Box,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { COUNTRIES } from "../utils/countries";

export default function Targeting({ value = [], onChange }) {
  const [selectedCountries, setSelectedCountries] = useState(value);
  const [inputValue, setInputValue] = useState("");

  const options = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: c.label,
      })),
    [],
  );

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    const q = inputValue.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [inputValue, options]);

  const updateSelection = useCallback(
    (newSelected) => {
      setSelectedCountries(newSelected);
      onChange?.(newSelected);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (selected) => {
      updateSelection(selected);
      setInputValue("");
    },
    [updateSelection],
  );

  const removeCountry = useCallback(
    (code) => {
      updateSelection(selectedCountries.filter((c) => c !== code));
    },
    [selectedCountries, updateSelection],
  );

  const selectedLabels = selectedCountries
    .map((code) => COUNTRIES.find((c) => c.code === code)?.label)
    .filter(Boolean);

  const textField = (
    <Autocomplete.TextField
      onChange={setInputValue}
      label="Countries"
      value={inputValue}
      placeholder="Search countries"
      prefix={<Icon source={SearchIcon} tone="subdued" />}
      autoComplete="off"
    />
  );

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Targeting
        </Text>

        <BlockStack gap="200">
          <Autocomplete
            allowMultiple
            options={filteredOptions}
            selected={selectedCountries}
            onSelect={handleSelect}
            textField={textField}
          />

          {selectedLabels.length > 0 && (
            <Box paddingBlockStart="100">
              <InlineStack gap="150" wrap>
                {selectedCountries.map((code) => {
                  const country = COUNTRIES.find((c) => c.code === code);
                  if (!country) return null;
                  return (
                    <Tag key={code} onRemove={() => removeCountry(code)}>
                      {country.label}
                    </Tag>
                  );
                })}
              </InlineStack>
            </Box>
          )}

          {selectedLabels.length === 0 && (
            <Text as="p" tone="subdued">
              No countries selected — this experiment will target all
              visitors regardless of location.
            </Text>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}