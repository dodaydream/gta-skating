import type { Metadata } from "next";
import { NotFoundPage } from "@/components/NotFoundPage";
import { notFoundMetadata } from "@/lib/metadata";

export const metadata: Metadata = notFoundMetadata;

export default function NotFound() {
  return <NotFoundPage />;
}
