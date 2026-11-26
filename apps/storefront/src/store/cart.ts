import { create } from 'zustand';

export interface CartItemInput {
  sku: string;
  title: string;
  unitPriceMinor: number;
  qty: number;
  materialVariant?: string;
  selectedOptionalSkus?: string[];
}

export interface CartLineItem extends CartItemInput {
  lineKey: string;
  selectedOptionalSkus: string[];
}

export interface CartState {
  items: CartLineItem[];
  gstin?: string;
  upiNudgeDiscountInr: number;
  addItem: (item: CartItemInput) => void;
  removeItem: (lineKey: string) => void;
  setGstin: (gstin: string | undefined) => void;
  setUpiNudgeDiscountInr: (amountInr: number) => void;
  clear: () => void;
}

function buildLineKey(item: CartItemInput): string {
  const opts = [...(item.selectedOptionalSkus ?? [])].sort().join(',');
  return `${item.sku}::${item.materialVariant ?? 'default'}::${opts}`;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  gstin: undefined,
  upiNudgeDiscountInr: 0,
  addItem: (item) =>
    set((state) => {
      const lineKey = buildLineKey(item);
      const normalizedOpts = [...(item.selectedOptionalSkus ?? [])].sort();
      const existing = state.items.find((i) => i.lineKey === lineKey);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.lineKey === lineKey ? { ...i, qty: i.qty + item.qty } : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            ...item,
            lineKey,
            selectedOptionalSkus: normalizedOpts,
          },
        ],
      };
    }),
  removeItem: (lineKey) =>
    set((state) => ({
      items: state.items.filter((i) => i.lineKey !== lineKey),
    })),
  setGstin: (gstin) => set({ gstin }),
  setUpiNudgeDiscountInr: (amountInr) =>
    set({ upiNudgeDiscountInr: Math.max(0, Math.floor(amountInr)) }),
  clear: () => set({ items: [], gstin: undefined, upiNudgeDiscountInr: 0 }),
}));
