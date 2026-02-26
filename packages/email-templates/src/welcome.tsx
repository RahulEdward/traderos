import * as React from "react";

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <div>
      <h1>Welcome to TradeOS India, {name}!</h1>
      <p>
        You&apos;re now part of the operating system for Indian breakout
        traders.
      </p>
      <p>Get started by creating your first strategy.</p>
    </div>
  );
}
