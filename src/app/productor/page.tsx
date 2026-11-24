import type { Metadata } from "next";
import { ProducerApp } from "@/components/producer/ProducerApp";

export const metadata: Metadata = { title: "Panel del productor · Sal de Origen" };

export default function ProducerPage() {
  return <ProducerApp />;
}
