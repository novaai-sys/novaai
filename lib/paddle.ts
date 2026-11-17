"use client";

import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
} from "@paddle/paddle-js";

/**
 * Paddle.js in the browser: loaded once, reused by every checkout button.
 * Uses the client-side token, which is safe to expose. The secret API key
 * never reaches the browser.
 */

let paddlePromise: Promise<Paddle | undefined> | null = null;
let onCompleted: (() => void) | null = null;

export const paddleConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);

export function getPaddle() {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox" ? "sandbox" : "production",
      eventCallback: (event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) onCompleted?.();
      },
    }).catch(() => undefined);
  }
  return paddlePromise;
}

/**
 * Opens the Paddle checkout overlay for one price. The NovaAI user ID goes in
 * customData, so the webhook can find the account; the email pre-fills
 * checkout. `onComplete` runs when payment succeeds.
 */
export async function openCheckout(input: {
  priceId: string;
  userId: string;
  email: string;
  onComplete: () => void;
}) {
  const paddle = await getPaddle();
  if (!paddle) {
    throw new Error(
      "The payment form could not load. Check your connection or ad blocker, then try again.",
    );
  }
  onCompleted = input.onComplete;
  paddle.Checkout.open({
    items: [{ priceId: input.priceId, quantity: 1 }],
    customer: { email: input.email },
    customData: { userId: input.userId },
    settings: { displayMode: "overlay", theme: "dark", allowLogout: false },
  });
}
