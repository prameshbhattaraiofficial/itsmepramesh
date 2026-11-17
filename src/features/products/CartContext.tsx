import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/src/app/providers/AuthProvider';
import { portfolioApi } from '@/src/services/api/portfolioApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/Dialog';
import { CustomerAuthForm } from '@/src/features/auth/CustomerAuthForm';
import type { CurrencyCode, ProductDto } from '@/src/types/portfolio';

export interface CartEntry {
  product: ProductDto;
  quantity: number;
}

interface PendingCartAction {
  product: ProductDto;
  quantity: number;
  openDrawer: boolean;
}

interface CartContextValue {
  items: CartEntry[];
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openAuthPrompt: () => void;
  addItem: (product: ProductDto, quantity?: number, openDrawer?: boolean) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
}

const CART_STORAGE_KEY = 'portfolio_store_cart_v1';
const CURRENCY_STORAGE_KEY = 'portfolio_store_currency_v1';

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function formatMoney(amount: number, currency: CurrencyCode): string {
  if (currency === 'NPR') {
    return `NPR ${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `$${amount.toFixed(2)}`;
}

export function getProductPrice(product: ProductDto, currency: CurrencyCode): number {
  return currency === 'NPR' ? product.priceNpr : product.priceUsd;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartEntry[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartEntry[]) : [];
    } catch {
      return [];
    }
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      return saved === 'NPR' ? 'NPR' : 'USD';
    } catch {
      return 'USD';
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const pendingActionRef = useRef<PendingCartAction | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const openAuthPrompt = useCallback(() => {
    pendingActionRef.current = null;
    setAuthPromptOpen(true);
  }, []);

  const commitAddItem = useCallback(
    (product: ProductDto, quantity: number, openDrawer: boolean, recipientEmail?: string) => {
      setItems((prev) => {
        const existing = prev.find((entry) => entry.product.id === product.id);
        if (existing) {
          const nextQty = Math.min(existing.quantity + quantity, product.isDigital ? 25 : Math.max(1, product.inventoryCount));
          return prev.map((entry) =>
            entry.product.id === product.id ? { ...entry, product, quantity: nextQty } : entry
          );
        }
        return [...prev, { product, quantity }];
      });

      if (openDrawer) setIsCartOpen(true);

      portfolioApi
        .notifyCartAdded({ productId: product.id, quantity, currency })
        .then((res) => {
          if (res.sent) {
            toast.success(`${product.title} added to cart. Email sent to ${res.recipientEmail}.`);
          } else {
            toast.success(`${product.title} added to cart. Notification logged for ${res.recipientEmail}.`);
          }
        })
        .catch(() => {
          toast.success(
            recipientEmail
              ? `${product.title} added to cart (${recipientEmail}).`
              : `${product.title} added to cart.`
          );
        });
    },
    [currency]
  );

  const addItem = useCallback(
    (product: ProductDto, quantity = 1, openDrawer = false) => {
      if (!user) {
        pendingActionRef.current = { product, quantity, openDrawer };
        setAuthPromptOpen(true);
        return;
      }
      commitAddItem(product, quantity, openDrawer, user.email);
    },
    [user, commitAddItem]
  );

  const handleAuthSuccess = useCallback(() => {
    setAuthPromptOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) {
      commitAddItem(pending.product, pending.quantity, pending.openDrawer);
    }
  }, [commitAddItem]);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((entry) => entry.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((entry) => {
        if (entry.product.id !== productId) return entry;
        const maxQty = entry.product.isDigital ? 25 : Math.max(1, entry.product.inventoryCount);
        return { ...entry, quantity: Math.min(quantity, maxQty) };
      })
    );
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((entry) => entry.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + getProductPrice(item.product, currency) * item.quantity, 0),
    [items, currency]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        currency,
        setCurrency,
        isCartOpen,
        openCart,
        closeCart,
        openAuthPrompt,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalCount,
        subtotal,
      }}
    >
      {children}

      <Dialog
        open={authPromptOpen}
        onOpenChange={(open) => {
          setAuthPromptOpen(open);
          if (!open) pendingActionRef.current = null;
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In to Continue</DialogTitle>
          </DialogHeader>
          <CustomerAuthForm
            description="Sign in or create an account so cart confirmation emails are sent directly to your login email address."
            onSuccess={handleAuthSuccess}
          />
        </DialogContent>
      </Dialog>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
