"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAPI } from "@/lib/hooks/use-api";
import { useCart } from "@/lib/hooks/use-cart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const { data, isLoading } = useAPI<Product[] | { products: Product[] }>("/products");
  // Backend returns a paginated object { products, total }; normalize defensively.
  const products: Product[] = Array.isArray(data) ? data : data?.products ?? [];
  const { addToCart } = useCart();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [addingId, setAddingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return [
      { label: "All", value: "all" },
      ...cats.map((c) => ({ label: c, value: c })),
    ];
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesCategory = category === "all" || p.category === category;
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch && p.isActive;
    });
  }, [products, category, search]);

  const handleAddToCart = async (productId: string) => {
    setAddingId(productId);
    try {
      await addToCart(productId, 1);
    } catch {
      // Toast will handle error display
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="mt-1 text-muted">
          Browse our catalog and add items to your cart.
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
      />

      {/* Category Tabs */}
      {categories.length > 1 && (
        <Tabs tabs={categories} activeTab={category} onChange={setCategory} />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          }
          title="No products found"
          description="Try adjusting your search or filter to find what you're looking for."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <div key={product.id} className="glass rounded-2xl overflow-hidden flex flex-col">
              {/* Product Image */}
              <Link href={`/products/${product.id}`}>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-48 w-full object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center">
                    <svg className="h-12 w-12 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                )}
              </Link>

              {/* Product Info */}
              <div className="flex flex-col flex-1 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate hover:text-accent transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <Badge variant="info">{product.category}</Badge>
                </div>

                {product.sizes && (
                  <p className="text-xs text-muted">
                    Sizes: {product.sizes}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(product.price)}
                  </span>
                  {product.gender && (
                    <Badge>{product.gender}</Badge>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  isLoading={addingId === product.id}
                  onClick={() => handleAddToCart(product.id)}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                  </svg>
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
