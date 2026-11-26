export class CyclicBomError extends Error {
  constructor(public readonly cyclePath: string[]) {
    super(`Cyclic BOM detected: ${cyclePath.join(' -> ')}`);
    this.name = 'CyclicBomError';
  }
}

export interface FitmentRecord {
  tenant_id: string;
  product_id: string;
  make: string;
  model: string;
  year_start: number;
  year_end: number;
  engine?: string;
  is_universal: boolean;
}

export interface BomComponentRecord {
  component_sku: string;
  quantity: number;
  is_optional: boolean;
  price_delta_minor: number;
}

export interface BomDefinitionRecord {
  tenant_id: string;
  parent_sku: string;
  stock_mode: 'VIRTUAL' | 'HYBRID' | 'PHYSICAL';
  base_price_minor: number;
  components: BomComponentRecord[];
}

export class InMemoryFitmentBomStore {
  private fitments: FitmentRecord[] = [];
  private inventory = new Map<string, number>();
  private boms = new Map<string, BomDefinitionRecord>();

  constructor(options?: {
    fitments?: FitmentRecord[];
    inventory?: Map<string, number>;
    boms?: BomDefinitionRecord[];
  }) {
    if (options?.fitments) {
      this.fitments = options.fitments.map((f) => ({ ...f }));
    }
    if (options?.inventory) {
      this.inventory = new Map(options.inventory);
    }
    if (options?.boms) {
      for (const bom of options.boms) {
        this.boms.set(`${bom.tenant_id}:${bom.parent_sku}`, {
          ...bom,
          components: bom.components.map((c) => ({ ...c })),
        });
      }
    }
  }

  getFitments(tenantId: string): FitmentRecord[] {
    return this.fitments.filter((f) => f.tenant_id === tenantId);
  }

  getBom(tenantId: string, parentSku: string): BomDefinitionRecord | undefined {
    return this.boms.get(`${tenantId}:${parentSku}`);
  }

  getStock(tenantId: string, sku: string): number {
    return this.inventory.get(`${tenantId}:${sku}`) ?? 0;
  }

  setStock(tenantId: string, sku: string, qty: number): void {
    this.inventory.set(`${tenantId}:${sku}`, qty);
  }
}

export interface VehicleSearchInput {
  year: number;
  make: string;
  model: string;
  engine?: string;
}

export interface ResolveBomLineInput {
  parent_sku: string;
  quantity: number;
  selected_optional_skus?: string[];
}

export interface ResolveBomLineOutput {
  parent_sku: string;
  stock_mode: 'VIRTUAL' | 'HYBRID' | 'PHYSICAL';
  available_quantity: number;
  effective_price_minor: number;
  components: Array<{
    component_sku: string;
    required_qty: number;
    available_qty: number;
    is_optional: boolean;
  }>;
}

export class FitmentBomService {
  constructor(private store: InMemoryFitmentBomStore) {}

  async searchByVehicle(tenantId: string, vehicle: VehicleSearchInput): Promise<FitmentRecord[]> {
    const all = this.store.getFitments(tenantId);
    const makeLower = vehicle.make.trim().toLowerCase();
    const modelLower = vehicle.model.trim().toLowerCase();
    const engineLower = vehicle.engine?.trim().toLowerCase();

    return all.filter((f) => {
      if (f.is_universal) return true;
      if (vehicle.year < f.year_start || vehicle.year > f.year_end) return false;
      if (f.make.toLowerCase() !== makeLower) return false;
      if (f.model.toLowerCase() !== modelLower) return false;
      if (engineLower && f.engine && f.engine.toLowerCase() !== engineLower) return false;
      return true;
    });
  }

  private assertNoCycles(tenantId: string, sku: string, visiting: Set<string>, path: string[]): void {
    if (visiting.has(sku)) {
      throw new CyclicBomError([...path, sku]);
    }
    const bom = this.store.getBom(tenantId, sku);
    if (!bom) return;

    visiting.add(sku);
    for (const comp of bom.components) {
      this.assertNoCycles(tenantId, comp.component_sku, visiting, [...path, sku]);
    }
    visiting.delete(sku);
  }

  private computeVirtualStock(tenantId: string, bom: BomDefinitionRecord): number {
    const required = bom.components.filter((c) => !c.is_optional);
    if (required.length === 0) return 0;

    let minBundles = Infinity;
    for (const comp of required) {
      const childBom = this.store.getBom(tenantId, comp.component_sku);
      const childStock = childBom
        ? this.computeAvailableForBom(tenantId, childBom)
        : this.store.getStock(tenantId, comp.component_sku);
      const possible = Math.floor(childStock / comp.quantity);
      if (possible < minBundles) {
        minBundles = possible;
      }
    }
    return minBundles === Infinity ? 0 : minBundles;
  }

  private computeAvailableForBom(tenantId: string, bom: BomDefinitionRecord): number {
    const preAssembled = this.store.getStock(tenantId, bom.parent_sku);
    if (bom.stock_mode === 'PHYSICAL') {
      return preAssembled;
    }
    const virtual = this.computeVirtualStock(tenantId, bom);
    if (bom.stock_mode === 'VIRTUAL') {
      return virtual;
    }
    return preAssembled + virtual;
  }

  async resolveBom(
    tenantId: string,
    request: { items: ResolveBomLineInput[] },
  ): Promise<{ items: ResolveBomLineOutput[] }> {
    const items: ResolveBomLineOutput[] = [];

    for (const reqItem of request.items) {
      this.assertNoCycles(tenantId, reqItem.parent_sku, new Set(), []);
      const bom = this.store.getBom(tenantId, reqItem.parent_sku);

      if (!bom) {
        const directStock = this.store.getStock(tenantId, reqItem.parent_sku);
        items.push({
          parent_sku: reqItem.parent_sku,
          stock_mode: 'PHYSICAL',
          available_quantity: directStock,
          effective_price_minor: 0,
          components: [],
        });
        continue;
      }

      const available = this.computeAvailableForBom(tenantId, bom);
      const selectedOptional = new Set(reqItem.selected_optional_skus ?? []);

      let priceDeltaTotal = 0;
      const resolvedComponents = bom.components
        .filter((c) => !c.is_optional || selectedOptional.has(c.component_sku))
        .map((c) => {
          if (c.is_optional && selectedOptional.has(c.component_sku)) {
            priceDeltaTotal += c.price_delta_minor;
          }
          return {
            component_sku: c.component_sku,
            required_qty: c.quantity * reqItem.quantity,
            available_qty: this.store.getStock(tenantId, c.component_sku),
            is_optional: c.is_optional,
          };
        });

      items.push({
        parent_sku: bom.parent_sku,
        stock_mode: bom.stock_mode,
        available_quantity: available,
        effective_price_minor: bom.base_price_minor + priceDeltaTotal,
        components: resolvedComponents,
      });
    }

    return { items };
  }

  async deductBomStock(
    tenantId: string,
    items: Array<{ sku: string; quantity: number; selected_optional_skus?: string[] }>,
  ): Promise<Array<{ sku: string; delta: number }>> {
    const deductions: Array<{ sku: string; delta: number }> = [];

    for (const item of items) {
      this.assertNoCycles(tenantId, item.sku, new Set(), []);
      const bom = this.store.getBom(tenantId, item.sku);

      if (!bom) {
        const current = this.store.getStock(tenantId, item.sku);
        if (current < item.quantity) {
          throw new Error(`Insufficient stock for SKU ${item.sku}: need ${item.quantity}, have ${current}`);
        }
        this.store.setStock(tenantId, item.sku, current - item.quantity);
        deductions.push({ sku: item.sku, delta: item.quantity });
        continue;
      }

      const selectedOpt = new Set(item.selected_optional_skus ?? []);
      for (const comp of bom.components) {
        if (comp.is_optional && !selectedOpt.has(comp.component_sku)) continue;
        const needed = comp.quantity * item.quantity;
        const current = this.store.getStock(tenantId, comp.component_sku);
        if (current < needed) {
          throw new Error(
            `Insufficient component stock for ${comp.component_sku}: need ${needed}, have ${current}`,
          );
        }
        this.store.setStock(tenantId, comp.component_sku, current - needed);
        deductions.push({ sku: comp.component_sku, delta: needed });
      }
    }

    return deductions;
  }

  async restoreBomStock(tenantId: string, deductions: Array<{ sku: string; delta: number }>): Promise<void> {
    for (const d of deductions) {
      const current = this.store.getStock(tenantId, d.sku);
      this.store.setStock(tenantId, d.sku, current + d.delta);
    }
  }
}
