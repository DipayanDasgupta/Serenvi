"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/hooks/use-cart";
import { useAuthToken } from "@/lib/hooks/use-api";
import { api } from "@/lib/api-client";
import { openCheckout } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { RazorpayOrder } from "@/lib/types";
import type { RazorpayResponse } from "@/lib/razorpay";

type CheckoutStatus = "idle" | "creating-order" | "paying" | "verifying" | "recording-sales" | "success" | "error";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, count, clearCart } = useCart();
  const getToken = useAuthToken();
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handlePayment = async () => {
    if (items.length === 0) return;

    try {
      setStatus("creating-order");
      setErrorMessage("");
      const token = await getToken();

      // Step 1: Create Razorpay order
      const order = await api.post<RazorpayOrder>(
        "/payments/create-order",
        { amount: total },
        token
      );

      // Step 2: Open Razorpay checkout
      setStatus("paying");

      await new Promise<RazorpayResponse>((resolve, reject) => {
        openCheckout({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Serenvi",
          description: `Order - ${count} item${count !== 1 ? "s" : ""}`,
          order_id: order.orderId,
          theme: { color: "#6366f1" },
          handler: (response) => {
            resolve(response);
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
        }).catch(reject);
      }).then(async (response) => {
        // Step 3: Verify payment
        setStatus("verifying");
        await api.post(
          "/payments/verify",
          {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
          token
        );

        // Step 4: Record sales for each item
        setStatus("recording-sales");
        for (const item of items) {
          await api.post(
            "/sales",
            {
              productId: item.productId,
              quantity: item.quantity,
              amount: item.product.price * item.quantity,
              paymentMethod: "RAZORPAY",
            },
            token
          );
        }

        // Step 5: Clear cart and show success
        await clearCart();
        setStatus("success");
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      if (message === "Payment cancelled") {
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMessage(message);
      }
    }
  };

  const statusMessages: Record<string, string> = {
    "creating-order": "Creating order...",
    paying: "Processing payment...",
    verifying: "Verifying payment...",
    "recording-sales": "Recording your purchase...",
  };

  // Success State
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <svg className="h-10 w-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
        <p className="text-muted mb-8 max-w-md">
          Your order has been placed and payment has been confirmed. You can view your order history for details.
        </p>
        <div className="flex gap-4">
          <Link href="/orders">
            <Button variant="primary">View Orders</Button>
          </Link>
          <Link href="/products">
            <Button variant="secondary">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Empty Cart
  if (items.length === 0 && status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <p className="text-lg text-muted mb-4">Your cart is empty. Add items before checkout.</p>
        <Link href="/products">
          <Button variant="primary">Browse Products</Button>
        </Link>
      </div>
    );
  }

  const isProcessing = status !== "idle" && status !== "error";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Cart
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
        <p className="mt-1 text-muted">Review your order and complete payment.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="space-y-4 lg:col-span-2">
          <Card title="Order Items">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.selectedSize || "default"}`}
                  className="flex items-center gap-4 rounded-xl bg-surface-2/50 p-3"
                >
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center flex-shrink-0">
                      <svg className="h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted">
                      Qty: {item.quantity}
                      {item.selectedSize ? ` | Size: ${item.selectedSize}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Payment Summary */}
        <div>
          <Card title="Payment Summary">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal ({count} items)</span>
                <span className="text-foreground">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Shipping</span>
                <span className="text-success">Free</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Error State */}
              {status === "error" && (
                <div className="rounded-xl bg-danger/10 border border-danger/20 p-3">
                  <p className="text-sm text-danger">{errorMessage || "Payment failed. Please try again."}</p>
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/20 p-3">
                  <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-accent">{statusMessages[status]}</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handlePayment}
                isLoading={isProcessing}
                disabled={isProcessing}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Pay {formatCurrency(total)}
              </Button>

              <div className="flex items-center justify-center gap-2 pt-1">
                <svg className="h-3 w-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-xs text-muted">Secured by Razorpay</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
