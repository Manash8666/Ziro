export interface AdminProduct {
  id: string;
  sku: string;
  title: string;
  category: string;
  pricePaise: number;
  inventoryOnHand: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  salesChannels: Array<'ONLINE' | 'POS' | 'AI_AGENT'>;
  hsnCode: string;
  gstPercent: number;
  updatedAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  channel: 'ONLINE' | 'POS' | 'AI_AGENT';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  fulfillmentStatus: 'FULFILLED' | 'UNFULFILLED' | 'PARTIAL';
  itemCount: number;
  totalPaise: number;
  platformFeeBps: 0; // Invariant
}

export interface AdminStore {
  id: string;
  name: string;
  vertical: 'FASHION' | 'AYURVEDA' | 'AUTO' | 'ELECTRONICS';
  currency: 'INR' | 'USD';
  taxRegime: 'GST' | 'DDP';
  products: AdminProduct[];
  orders: AdminOrder[];
}

export const MULTI_VERTICAL_STORES: Record<string, AdminStore> = {
  fashion: {
    id: 'store_fashion_01',
    name: 'Aura Haute Couture',
    vertical: 'FASHION',
    currency: 'INR',
    taxRegime: 'GST',
    products: [
      {
        id: 'prod_fsh_01',
        sku: 'AUR-SLK-001',
        title: 'Mulberry Silk Evening Corset Gown',
        category: 'Eveningwear',
        pricePaise: 2450000, // Rs. 24,500.00
        inventoryOnHand: 18,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '62044200',
        gstPercent: 12,
        updatedAt: '2026-11-26T14:30:00Z',
      },
      {
        id: 'prod_fsh_02',
        sku: 'AUR-CSH-002',
        title: 'Handwoven Cashmere Trench Overcoat',
        category: 'Outerwear',
        pricePaise: 3800000, // Rs. 38,000.00
        inventoryOnHand: 9,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '62021100',
        gstPercent: 12,
        updatedAt: '2026-11-25T11:20:00Z',
      },
      {
        id: 'prod_fsh_03',
        sku: 'AUR-LNN-003',
        title: 'Tailored European Linen Resort Blazer',
        category: 'Suits & Blazers',
        pricePaise: 1650000, // Rs. 16,500.00
        inventoryOnHand: 25,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS'],
        hsnCode: '62033900',
        gstPercent: 12,
        updatedAt: '2026-11-24T09:15:00Z',
      },
      {
        id: 'prod_fsh_04',
        sku: 'AUR-DRS-004',
        title: 'Hand-Pleated Chiffon Midi Dress (Sample)',
        category: 'Dresses',
        pricePaise: 1290000, // Rs. 12,900.00
        inventoryOnHand: 0,
        status: 'DRAFT',
        salesChannels: ['ONLINE'],
        hsnCode: '62044300',
        gstPercent: 12,
        updatedAt: '2026-11-20T16:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord_fsh_901',
        orderNumber: '#AUR-1049',
        createdAt: '2026-11-27T08:30:00Z',
        customerName: 'Ananya Singhania',
        customerEmail: 'ananya.s@hautecouture.in',
        channel: 'ONLINE',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
        itemCount: 2,
        totalPaise: 4900000,
        platformFeeBps: 0,
      },
      {
        id: 'ord_fsh_902',
        orderNumber: '#AUR-1048',
        createdAt: '2026-11-26T17:15:00Z',
        customerName: 'Meera Kapoor',
        customerEmail: 'meera.k@gmail.com',
        channel: 'POS',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        itemCount: 1,
        totalPaise: 3800000,
        platformFeeBps: 0,
      },
      {
        id: 'ord_fsh_903',
        orderNumber: '#AUR-1047',
        createdAt: '2026-11-26T12:00:00Z',
        customerName: 'Claude Shopping Agent (ACP)',
        customerEmail: 'agent-session-882@acp.ziro.io',
        channel: 'AI_AGENT',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        itemCount: 1,
        totalPaise: 1650000,
        platformFeeBps: 0,
      },
    ],
  },
  ayurveda: {
    id: 'store_wellness_02',
    name: 'Veda Botanicals',
    vertical: 'AYURVEDA',
    currency: 'INR',
    taxRegime: 'GST',
    products: [
      {
        id: 'prod_vda_01',
        sku: 'VDA-KSM-001',
        title: 'Kumkumadi Tailam Miraculous Beauty Fluid 30ml',
        category: 'Facial Oils',
        pricePaise: 320000, // Rs. 3,200.00
        inventoryOnHand: 140,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '30049011',
        gstPercent: 5,
        updatedAt: '2026-11-26T15:10:00Z',
      },
      {
        id: 'prod_vda_02',
        sku: 'VDA-ASH-002',
        title: 'KSM-66 Organic Ashwagandha Pure Root Extract',
        category: 'Supplements',
        pricePaise: 145000, // Rs. 1,450.00
        inventoryOnHand: 320,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '30049011',
        gstPercent: 5,
        updatedAt: '2026-11-25T10:00:00Z',
      },
      {
        id: 'prod_vda_03',
        sku: 'VDA-BRH-003',
        title: 'Cold-Pressed Brahmi Gotu Kola Hair Nectar 100ml',
        category: 'Hair Care',
        pricePaise: 185000, // Rs. 1,850.00
        inventoryOnHand: 85,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS'],
        hsnCode: '33059011',
        gstPercent: 18,
        updatedAt: '2026-11-24T12:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord_vda_501',
        orderNumber: '#VDA-8821',
        createdAt: '2026-11-27T09:45:00Z',
        customerName: 'Rohit Verma',
        customerEmail: 'rohit.v@ayurwellness.in',
        channel: 'ONLINE',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'UNFULFILLED',
        itemCount: 3,
        totalPaise: 785000,
        platformFeeBps: 0,
      },
      {
        id: 'ord_vda_502',
        orderNumber: '#VDA-8820',
        createdAt: '2026-11-26T16:20:00Z',
        customerName: 'Priya Nambiar',
        customerEmail: 'priya.n@gmail.com',
        channel: 'POS',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        itemCount: 2,
        totalPaise: 465000,
        platformFeeBps: 0,
      },
    ],
  },
  auto: {
    id: 'store_auto_03',
    name: 'Apex Torque Engineering',
    vertical: 'AUTO',
    currency: 'INR',
    taxRegime: 'GST',
    products: [
      {
        id: 'prod_apx_01',
        sku: 'APX-BRK-001',
        title: 'Brembo Ceramic Performance Front Brake Pads',
        category: 'Braking Systems',
        pricePaise: 485000, // Rs. 4,850.00
        inventoryOnHand: 45,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '87083000',
        gstPercent: 18,
        updatedAt: '2026-11-27T08:00:00Z',
      },
      {
        id: 'prod_apx_02',
        sku: 'APX-RTR-002',
        title: 'Heat-Treated Slotted Ventilated Rotor Set',
        category: 'Braking Systems',
        pricePaise: 1250000, // Rs. 12,500.00
        inventoryOnHand: 22,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '87083000',
        gstPercent: 18,
        updatedAt: '2026-11-26T18:00:00Z',
      },
      {
        id: 'prod_apx_03',
        sku: 'APX-COIL-003',
        title: 'Inverted Monotube Track-Spec Coilovers',
        category: 'Suspension',
        pricePaise: 6800000, // Rs. 68,000.00
        inventoryOnHand: 8,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS'],
        hsnCode: '87088000',
        gstPercent: 28,
        updatedAt: '2026-11-25T14:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord_apx_301',
        orderNumber: '#APX-5510',
        createdAt: '2026-11-27T10:15:00Z',
        customerName: 'Devansh Motor Works',
        customerEmail: 'devansh@apmotors.com',
        channel: 'POS',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        itemCount: 4,
        totalPaise: 3470000,
        platformFeeBps: 0,
      },
    ],
  },
  electronics: {
    id: 'store_elec_04',
    name: 'SonicWave Labs',
    vertical: 'ELECTRONICS',
    currency: 'USD',
    taxRegime: 'DDP',
    products: [
      {
        id: 'prod_swl_01',
        sku: 'SWL-DAC-001',
        title: 'Dual ES9038PRO Fully Balanced Audio DAC',
        category: 'DACs & Pre-Amps',
        pricePaise: 89900, // $899.00
        inventoryOnHand: 34,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'AI_AGENT'],
        hsnCode: '85184000',
        gstPercent: 18,
        updatedAt: '2026-11-26T11:00:00Z',
      },
      {
        id: 'prod_swl_02',
        sku: 'SWL-AMP-002',
        title: 'Class-A Discrete Headphone Amplifier 6W',
        category: 'Amplifiers',
        pricePaise: 59900, // $599.00
        inventoryOnHand: 19,
        status: 'ACTIVE',
        salesChannels: ['ONLINE', 'POS', 'AI_AGENT'],
        hsnCode: '85184000',
        gstPercent: 18,
        updatedAt: '2026-11-25T09:00:00Z',
      },
    ],
    orders: [
      {
        id: 'ord_swl_101',
        orderNumber: '#SWL-2201',
        createdAt: '2026-11-27T07:10:00Z',
        customerName: 'Julian Thorne',
        customerEmail: 'julian@audiophile.net',
        channel: 'ONLINE',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        itemCount: 1,
        totalPaise: 89900,
        platformFeeBps: 0,
      },
    ],
  },
};

export function filterProducts(
  products: AdminProduct[],
  filters: { query?: string; status?: string; category?: string }
): AdminProduct[] {
  return products.filter((p) => {
    if (filters.status && filters.status !== 'ALL' && p.status !== filters.status) {
      return false;
    }
    if (filters.category && filters.category !== 'ALL' && p.category !== filters.category) {
      return false;
    }
    if (filters.query && filters.query.trim() !== '') {
      const q = filters.query.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchHsn = p.hsnCode.includes(q);
      if (!matchTitle && !matchSku && !matchHsn) {
        return false;
      }
    }
    return true;
  });
}

export function bulkUpdateProductStatus(
  products: AdminProduct[],
  targetIds: string[],
  newStatus: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
): AdminProduct[] {
  const idSet = new Set(targetIds);
  return products.map((p) => {
    if (idSet.has(p.id)) {
      return { ...p, status: newStatus, updatedAt: new Date().toISOString() };
    }
    return p;
  });
}

export function exportProductsToCsv(products: AdminProduct[]): string {
  const headers = ['ID', 'SKU', 'Title', 'Category', 'Price', 'Inventory', 'Status', 'HSN_Code', 'GST_Percent'];
  const rows = products.map((p) => [
    p.id,
    p.sku,
    `"${p.title.replace(/"/g, '""')}"`,
    `"${p.category.replace(/"/g, '""')}"`,
    (p.pricePaise / 100).toFixed(2),
    p.inventoryOnHand,
    p.status,
    p.hsnCode,
    p.gstPercent,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function computeStoreMetrics(orders: AdminOrder[], products: AdminProduct[]) {
  const totalGmvPaise = orders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalOrders = orders.length;
  const avgOrderValuePaise = totalOrders > 0 ? Math.round(totalGmvPaise / totalOrders) : 0;

  // Legacy toll estimation: 2.9% + Rs. 25 ($0.30) per transaction
  const legacyPercentageFee = Math.round(totalGmvPaise * 0.029);
  const legacyFixedFee = totalOrders * 2500; // 2500 paise = Rs. 25
  const estimatedTaxSavedPaise = legacyPercentageFee + legacyFixedFee;

  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const totalInventory = products.reduce((sum, p) => sum + p.inventoryOnHand, 0);

  return {
    totalGmvPaise,
    totalOrders,
    avgOrderValuePaise,
    estimatedTaxSavedPaise,
    activeProducts,
    totalInventory,
    platformFeeBps: 0 as const, // Invariant: 0% fee
  };
}
