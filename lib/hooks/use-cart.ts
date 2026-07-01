"use client";

import { useAPI, useAuthToken } from "./use-api";
import { api } from "@/lib/api-client";
import { mutate } from "swr";
import type { CartItem } from "@/lib/types";

export function useCart() {
  const { data, error, isLoading } = useAPI<CartItem[]>("/cart");
  const getToken = useAuthToken();

  const addToCart = async (
    productId: string,
    quantity: number = 1,
    selectedSize?: string
  ) => {
    const token = await getToken();
    await api.post("/cart/add", { productId, quantity, selectedSize }, token);
    mutate("/cart");
    mutate("/cart/count");
  };

  const updateQuantity = async (
    productId: string,
    quantity: number,
    selectedSize?: string
  ) => {
    const token = await getToken();
    await api.put("/cart/update", { productId, quantity, selectedSize }, token);
    mutate("/cart");
    mutate("/cart/count");
  };

  const removeItem = async (productId: string) => {
    const token = await getToken();
    await api.delete(`/cart/${productId}`, token);
    mutate("/cart");
    mutate("/cart/count");
  };

  const clearCart = async () => {
    const token = await getToken();
    await api.delete("/cart", token);
    mutate("/cart");
    mutate("/cart/count");
  };

  return {
    items: data || [],
    isLoading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    total: (data || []).reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ),
    count: (data || []).reduce((sum, item) => sum + item.quantity, 0),
  };
}
