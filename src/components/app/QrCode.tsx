"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: 336, errorCorrectionLevel: "M" }).then(url => { if (active) setSrc(url); });
    return () => { active = false; };
  }, [value]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={label} width={168} height={168} /> : null;
}
