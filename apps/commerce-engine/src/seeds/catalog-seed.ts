export interface SeedCatalogItem {
  id: string;
  sku: string;
  title: string;
  description: string;
  category: 'AUTOMOTIVE' | 'INDUSTRIAL' | 'LIFESTYLE';
  hsn_code: string;
  gst_rate_bps: number;
  price_minor: number;
  currency: string;
  stock_qty: number;
  stock_mode?: 'PHYSICAL' | 'VIRTUAL' | 'HYBRID';
  bom_components?: Array<{
    component_sku: string;
    quantity: number;
    is_optional: boolean;
    price_delta_minor: number;
  }>;
  fitments?: Array<{
    make: string;
    model: string;
    year_start: number;
    year_end: number;
    engine?: string;
  }>;
}

export function generateRealisticSeedCatalog(): SeedCatalogItem[] {
  const items: SeedCatalogItem[] = [];

  const makes = ['Hyundai', 'Maruti Suzuki', 'Mahindra', 'Toyota', 'Honda', 'Tata'];
  const models: Record<string, string[]> = {
    Hyundai: ['Creta', 'Verna', 'Venue', 'i20'],
    'Maruti Suzuki': ['Swift', 'Baleno', 'Brezza', 'Dzire'],
    Mahindra: ['Thar', 'Scorpio-N', 'XUV700'],
    Toyota: ['Fortuner', 'Innova Crysta', 'Urban Cruiser'],
    Honda: ['City', 'Amaze', 'Elevate'],
    Tata: ['Nexon', 'Harrier', 'Safari', 'Punch'],
  };

  // 1. Automotive Brake & Performance Kits (BOM + Fitment)
  let skuIndex = 1;
  for (const make of makes) {
    for (const model of models[make]) {
      const parentSku = `KIT-BRK-${make.slice(0, 3).toUpperCase()}-${model.slice(0, 3).toUpperCase()}`;
      const rotorSku = `RTR-${make.slice(0, 3).toUpperCase()}-${model.slice(0, 3).toUpperCase()}`;
      const padSku = `PAD-${make.slice(0, 3).toUpperCase()}-${model.slice(0, 3).toUpperCase()}`;

      // Component 1: Slotted Rotor
      items.push({
        id: `prod_rtr_${skuIndex}`,
        sku: rotorSku,
        title: `${make} ${model} High-Carbon Slotted Brake Rotor`,
        description: `Precision-machined high-carbon vented rotor for ${make} ${model}.`,
        category: 'AUTOMOTIVE',
        hsn_code: '870830',
        gst_rate_bps: 1800,
        price_minor: 450000,
        currency: 'INR',
        stock_qty: 40,
        fitments: [{ make, model, year_start: 2018, year_end: 2026 }],
      });
      skuIndex++;

      // Component 2: Ceramic Pad
      items.push({
        id: `prod_pad_${skuIndex}`,
        sku: padSku,
        title: `${make} ${model} Low-Dust Ceramic Brake Pad Set`,
        description: `Copper-free low-dust ceramic formulation designed for ${make} ${model}.`,
        category: 'AUTOMOTIVE',
        hsn_code: '870830',
        gst_rate_bps: 1800,
        price_minor: 280000,
        currency: 'INR',
        stock_qty: 60,
        fitments: [{ make, model, year_start: 2018, year_end: 2026 }],
      });
      skuIndex++;

      // Parent Virtual Kit: Complete Ceramic Brake Overhaul Kit
      items.push({
        id: `prod_kit_${skuIndex}`,
        sku: parentSku,
        title: `${make} ${model} Full Axle Ceramic Brake Overhaul Kit`,
        description: `Complete bundled kit: 2x high-carbon slotted rotors and 1x low-dust ceramic pad set.`,
        category: 'AUTOMOTIVE',
        hsn_code: '870830',
        gst_rate_bps: 1800,
        price_minor: 1100000,
        currency: 'INR',
        stock_qty: 0,
        stock_mode: 'VIRTUAL',
        bom_components: [
          { component_sku: rotorSku, quantity: 2, is_optional: false, price_delta_minor: 0 },
          { component_sku: padSku, quantity: 1, is_optional: false, price_delta_minor: 0 },
          { component_sku: 'ACC-CALIPER-BOLT', quantity: 4, is_optional: true, price_delta_minor: 25000 },
        ],
        fitments: [{ make, model, year_start: 2018, year_end: 2026 }],
      });
      skuIndex++;
    }
  }

  // Universal Hardware & Fluids
  items.push({
    id: `prod_bolt_univ`,
    sku: 'ACC-CALIPER-BOLT',
    title: 'Grade 10.9 Caliper Mounting Bolt Set (Pack of 4)',
    description: 'High-tensile zinc-plated caliper mounting hardware.',
    category: 'AUTOMOTIVE',
    hsn_code: '731815',
    gst_rate_bps: 1800,
    price_minor: 25000,
    currency: 'INR',
    stock_qty: 500,
  });

  items.push({
    id: `prod_oil_01`,
    sku: 'LUB-SYN-5W40',
    title: 'Full Synthetic 5W-40 Engine Oil (4L Cask)',
    description: 'API SN/CF certified advanced synthetic engine lubricant.',
    category: 'AUTOMOTIVE',
    hsn_code: '271019',
    gst_rate_bps: 1800,
    price_minor: 320000,
    currency: 'INR',
    stock_qty: 150,
  });

  // 2. Industrial & Workshop Equipment
  for (let i = 1; i <= 20; i++) {
    items.push({
      id: `prod_ind_${i}`,
      sku: `TOOL-WRN-${100 + i}`,
      title: `Industrial 1/2" Digital Torque Wrench ${10 + i * 5}-${100 + i * 10} Nm`,
      description: 'ISO 6789 calibrated digital torque indicator with ergonomic grip.',
      category: 'INDUSTRIAL',
      hsn_code: '820411',
      gst_rate_bps: 1800,
      price_minor: 850000 + i * 25000,
      currency: 'INR',
      stock_qty: 25,
    });
  }

  // 3. Retail & Racing Apparel
  for (let i = 1; i <= 20; i++) {
    items.push({
      id: `prod_app_${i}`,
      sku: `APP-DRV-GLV-${i}`,
      title: `Perforated Leather Driving Gloves Series ${i}`,
      description: 'Supple lambskin driving gloves with reinforced palm stitching.',
      category: 'LIFESTYLE',
      hsn_code: '620342',
      gst_rate_bps: 1200,
      price_minor: 185000 + i * 10000,
      currency: 'INR',
      stock_qty: 50,
    });
  }

  return items;
}

export const REALISTIC_SEED_CATALOG = generateRealisticSeedCatalog();
