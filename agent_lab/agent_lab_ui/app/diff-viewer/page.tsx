"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DiffViewerRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/diff${params ? "?" + params : ""}`);
  }, []);
  return null;
}
