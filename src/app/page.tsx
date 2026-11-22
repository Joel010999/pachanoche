import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { demoLots } from "@/domain/demo-fixture";

const mass = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });

export default async function Home() {
  await connection();
  const lots = demoLots.list();
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-12 sm:py-14">
      <header className="rounded-3xl bg-[#17362b] px-7 py-12 text-white sm:px-14 sm:py-20">
        <p className="font-medium text-[#d8eb85]">Salinas Grandes · Jujuy</p>
        <h1 className="mt-4 font-serif text-6xl leading-none font-semibold sm:text-8xl">Sal de Origen</h1>
        <p className="mt-6 max-w-xl text-xl text-[#e2eadf]">Del territorio al mercado. Origen verificable, valor compartido.</p>
      </header>
      <section aria-labelledby="lots-title" className="mt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="lots-title" className="text-2xl font-semibold">Lotes de demostración</h2>
          <Link href="/api/v1/lots" prefetch={false} className="font-medium underline underline-offset-4">Consultar API</Link>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {lots.map(lot => (
            <li key={lot.id} className="rounded-2xl border border-[#d6ded1] bg-white p-5">
              <p className="font-semibold">{lot.productCode === "sal-artesanal" ? "Sal artesanal" : lot.productCode}</p>
              <p className="mt-2 text-lg">{mass.format(lot.availableGrams / 1000)} kg disponibles</p>
              <p className="mt-2 text-sm text-[#425c50]">Extracción declarada el {lot.extractedAt.slice(0, 10)}</p>
              <a href={`/api/v1/lots/${lot.id}/events`} className="mt-4 inline-block underline underline-offset-4">Ver historial</a>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="territory-title" className="mt-12">
        <h2 id="territory-title" className="text-2xl font-semibold">Contexto territorial</h2>
        <figure className="mt-4 overflow-hidden rounded-2xl border border-[#d6ded1] bg-white">
          <Image
            src="/geo/salinas-grandes.jpg"
            alt="Vista satelital de las Salinas Grandes y el paisaje circundante"
            width={1020}
            height={747}
            className="h-auto w-full"
          />
          <figcaption className="p-5 text-[#425c50]">
            <p>Sentinel-2 · 23 de febrero de 2025. Imagen histórica de contexto para los lotes sintéticos.</p>
            <a className="mt-2 inline-block underline underline-offset-4" href="https://copernicuslac-chile.eu/imagen/salinas-grandes-argentina/">
              Fuente: CopernicusLAC Chile
            </a>
          </figcaption>
        </figure>
      </section>
    </main>
  );
}
