"use client";

import { Toaster } from "react-hot-toast";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister />
      {children}
      <Toaster position="top-right" />
    </>
  );
}
