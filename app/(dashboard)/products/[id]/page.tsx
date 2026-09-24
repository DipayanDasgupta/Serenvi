"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { useCart } from "@/lib/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { data: product, isLoading, error } = useAPI<Product>(`/products/${productId}`);
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [isAdding, setIsAdding] = useState(false);

  const sizes = product?.sizes?.split(",").map((s) => s.trim()).filter(Boolean) || [];
  // Apparel with a real size run requires a choice. "One Size"/"Free Size"
  // items are a single fixed size, so there is nothing to pick.
  const singleSize = sizes.length <= 1 || /^(one|free)\s*size$/i.test(sizes[0] || "");
  const needsSize = sizes.length > 0 && !singleSize;
  const sizeMissing = needsSize && !selectedSize;

  const handleAddToCart = async () => {
    if (!product) return;
    if (sizeMissing) return;
    setIsAdding(true);
    try {
      await addToCart(product.id, quantity, selectedSize);
    } catch {
      // Error handling via toast
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-muted">Product not found.</p>
        <Link href="/products">
          <Button variant="secondary" className="mt-4">
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Products
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="glass rounded-2xl overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-96 w-full object-cover"
            />
          ) : (
            <div className="h-96 w-full bg-gradient-to-br from-accent/20 via-accent-2/10 to-accent/5 flex items-center justify-center">
              <svg className="h-24 w-24 text-muted/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="info">{product.category}</Badge>
              {product.gender && <Badge>{product.gender}</Badge>}
              {product.type === "DIGITAL" && <Badge variant="warning">Digital</Badge>}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
          </div>

          <p className="text-3xl font-bold text-accent">
            {formatCurrency(product.price)}
          </p>

          {product.description && (
            <p className="text-muted leading-relaxed">{product.description}</p>
          )}

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {product.stockQuantity != null && product.stockQuantity > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-success font-medium">
                  In Stock ({product.stockQuantity} available)
                </span>
              </>
            ) : product.stockQuantity === 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-danger" />
                <span className="text-sm text-danger font-medium">Out of Stock</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-success font-medium">Available</span>
              </>
            )}
          </div>

          {/* Size Selector */}
          {sizes.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Select Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3rem] rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface-2 text-foreground hover:border-accent/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground hover:bg-surface-hover transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="w-12 text-center text-lg font-semibold text-foreground">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground hover:bg-surface-hover transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted">Total</span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(product.price * quantity)}
              </span>
            </div>
          </div>

          {/* Add to Cart */}
          {sizeMissing && (
            <p className="-mt-2 text-sm text-warning">
              Please select a size to continue.
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isAdding}
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0 || sizeMissing}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            {product.stockQuantity === 0
              ? "Out of Stock"
              : sizeMissing
                ? "Select a Size"
                : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
