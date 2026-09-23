"use client";

import { useAPI, useAuthToken, matchKey } from "./use-api";
import { api } from "@/lib/api-client";
import { mutate } from "swr";
import type { WalletSummary, WalletTransaction, DepositRequest } from "@/lib/types";

export function useWallet() {
  const { data, error, isLoading } = useAPI<WalletSummary>("/wallet");
  return { wallet: data, error, isLoading };
}

export function useWalletTransactions(skip = 0, take = 20) {
  const result = useAPI<WalletTransaction[] | { transactions: WalletTransaction[] }>(
    `/wallet/history?skip=${skip}&take=${take}`
  );
  // Backend returns a paginated object { transactions, total }; normalize defensively.
  const data: WalletTransaction[] | undefined = Array.isArray(result.data)
    ? result.data
    : result.data?.transactions;
  return { ...result, data };
}

export function useWalletActions() {
  const getToken = useAuthToken();

  const transfer = async (toReferralCode: string, amount: number, tPin: string) => {
    const token = await getToken();
    const result = await api.post(
      "/wallet/transfer",
      { toReferralCode, amount, tPin },
      token
    );
    mutate(matchKey("/wallet"));
    mutate(matchKey("/wallet/history"));
    return result;
  };

  const deposit = async (amount: number, paymentMethod = "UPI", transactionId?: string) => {
    const token = await getToken();
    const result = await api.post(
      "/wallet/deposit",
      { amount, paymentMethod, transactionId },
      token
    );
    mutate(matchKey("/wallet"));
    mutate(matchKey("/wallet/deposits"));
    return result;
  };

  const withdraw = async (amount: number, bankAccount: string, bankIFSC: string, accountHolder: string) => {
    const token = await getToken();
    const result = await api.post(
      "/wallet/withdraw",
      { amount, bankAccount, bankIFSC, accountHolder },
      token
    );
    mutate(matchKey("/wallet"));
    return result;
  };

  const sendTPin = async () => {
    const token = await getToken();
    return api.post("/wallet/send-tpin", {}, token);
  };

  const approveDeposit = async (id: string) => {
    const token = await getToken();
    const result = await api.post(`/wallet/admin/deposits/${id}/approve`, {}, token);
    mutate(matchKey("/deposits"));
    mutate(matchKey("/wallet"));
    return result;
  };

  const rejectDeposit = async (id: string, reason?: string) => {
    const token = await getToken();
    const result = await api.post(
      `/wallet/admin/deposits/${id}/reject`,
      { reason },
      token
    );
    mutate(matchKey("/deposits"));
    return result;
  };

  return { transfer, deposit, withdraw, sendTPin, approveDeposit, rejectDeposit };
}

export function useDeposits(skip = 0, take = 20) {
  const result = useAPI<{ deposits: DepositRequest[]; total: number }>(
    `/wallet/deposits?skip=${skip}&take=${take}`
  );
  return result;
}

export function useAdminDeposits(status?: string, skip = 0, take = 20) {
  const q = status ? `?status=${status}&skip=${skip}&take=${take}` : `?skip=${skip}&take=${take}`;
  const result = useAPI<{ deposits: DepositRequest[]; total: number }>(
    `/wallet/admin/deposits${q}`
  );
  return result;
}
