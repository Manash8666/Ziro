import { MoneyMinorSchema, SignedMoneyMinorSchema } from '@ziro/shared-types';

export interface MaterialFinishOption {
  id: string;
  label: string;
  swatchHex: string;
  metalness?: number;
  roughness?: number;
  priceDeltaMinor?: number;
  materialVariant?: string;
}

export interface BomConfiguratorOption {
  id: string;
  childSku: string;
  label: string;
  optionGroup?: string;
  priceDeltaMinor: number;
  description?: string;
  defaultSelected?: boolean;
}

export interface ConfiguratorSelectionResult {
  basePriceMinor: number;
  deltaMinor: number;
  totalPriceMinor: number;
  selectedOptions: BomConfiguratorOption[];
  selectedOptionalSkus: string[];
  selectedIds: string[];
  materialVariant?: string;
}

/**
 * Pure integer minor-unit configurator pricing and BOM selection resolver.
 * Safe for both Next.js Server Components and interactive client configurators.
 */
export function computeConfiguratorSelection(
  basePriceMinor: number,
  options: readonly BomConfiguratorOption[],
  selectedIds: readonly string[],
  materialFinish?: MaterialFinishOption | null,
): ConfiguratorSelectionResult {
  const safeBase = MoneyMinorSchema.parse(basePriceMinor);
  const finishDelta =
    materialFinish?.priceDeltaMinor !== undefined
      ? SignedMoneyMinorSchema.parse(materialFinish.priceDeltaMinor)
      : 0;

  const selectedSet = new Set(selectedIds);
  const selectedOptions: BomConfiguratorOption[] = [];

  let optionsDelta = 0;
  for (const option of options) {
    const validatedDelta = SignedMoneyMinorSchema.parse(option.priceDeltaMinor);
    if (selectedSet.has(option.id)) {
      selectedOptions.push({ ...option, priceDeltaMinor: validatedDelta });
      optionsDelta += validatedDelta;
    }
  }

  const deltaMinor = SignedMoneyMinorSchema.parse(optionsDelta + finishDelta);
  const totalPriceMinor = MoneyMinorSchema.parse(safeBase + deltaMinor);

  const result: ConfiguratorSelectionResult = {
    basePriceMinor: safeBase,
    deltaMinor,
    totalPriceMinor,
    selectedOptions,
    selectedOptionalSkus: selectedOptions.map((option) => option.childSku),
    selectedIds: selectedOptions.map((option) => option.id),
  };

  if (materialFinish) {
    result.materialVariant = materialFinish.materialVariant ?? materialFinish.id;
  }

  return result;
}
