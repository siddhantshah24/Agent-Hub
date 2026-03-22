"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VersionHistoryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/dashboard${params ? "?" + params : ""}`);
  }, []);
  return null;
}
