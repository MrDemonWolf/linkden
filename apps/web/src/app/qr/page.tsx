"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Download } from "lucide-react";

export default function QRCodePage() {
  const appUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || window.location.origin;
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fgColor, setFgColor] = useState("#091533");
  const [size, setSize] = useState(256);

  function handleDownload() {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "linkden-qr.png";
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-bold">QR Code</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Scan this code to visit your LinkDen page
        </p>

        <div
          className="inline-block p-6 rounded-2xl"
          style={{ backgroundColor: bgColor }}
        >
          <QRCode
            id="qr-code-svg"
            value={appUrl}
            size={size}
            bgColor={bgColor}
            fgColor={fgColor}
            level="H"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="glass-input text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Foreground
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="glass-input text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Size (px)
          </label>
          <input
            type="range"
            min={128}
            max={512}
            step={32}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-brand-cyan"
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {size} x {size}
          </span>
        </div>

        <button
          onClick={handleDownload}
          className="glass-button-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
      </div>
    </div>
  );
}
