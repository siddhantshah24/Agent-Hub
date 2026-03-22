import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "AgentLab: golden evals, versions, and traces for agents",
  description:
    "AgentLab is agent versioning with continuous evaluation: golden evals, version history, diffs, and traces for production confidence. Works with LangChain, LangGraph, RAG, or custom agents.",
};

export default function Home() {
  return <LandingPage />;
}
