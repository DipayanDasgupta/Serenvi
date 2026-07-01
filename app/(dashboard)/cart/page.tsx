"use client";

import Link from "next/link";
import { useCart } from "@/lib/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, isLoading, total, count, updateQuantity, removeItem, clearCart } = useCart();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Shopping Cart</h1>
        <EmptyState
          icon={
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
          }
          title="Your cart is empty"
          description="Browse our product catalog and add items to get started."
          action={
            <Link href="/products">
              <Button variant="primary">Browse Products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
          <p className="mt-1 text-muted">{count} item{count !== 1 ? "s" : ""} in your cart</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.selectedSize || "default"}`}
              className="glass rounded-2xl p-4 flex gap-4"
            >
              {/* Product Image */}
              <div className="flex-shrink-0">
                {item.product.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div>
                  <h3 className="font-semibold text-foreground truncate">
                    {item.product.name}
                  </h3>
                  {item.selectedSize && (
                    <p className="text-xs text-muted mt-0.5">Size: {item.selectedSize}</p>
                  )}
                  <p className="text-sm text-accent font-medium mt-1">
                    {formatCurrency(item.product.price)}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, Math.max(1, item.quantity - 1), item.selectedSize)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1, item.selectedSize)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>

                  {/* Remove & Subtotal */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div>
          <Card title="Order Summary">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal ({count} items)</span>
                <span className="text-foreground font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Shipping</span>
                <span className="text-success font-medium">Free</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
              <Link href="/cart/checkout" className="block pt-2">
                <Button variant="primary" size="lg" className="w-full">
                  Proceed to Checkout
                </Button>
              </Link>
              <Link href="/products" className="block">
                <Button variant="ghost" size="sm" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
