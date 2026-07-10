"use client";

import { useEffect, useRef } from "react";

export function NoiseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const context = canvas?.getContext("2d", { alpha: true });

    if (!canvas || !parent || !context) return;

    const drawNoise = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      const scale = Math.min(dpr, 1.5);
      const width = Math.max(1, Math.floor(rect.width * scale));
      const height = Math.max(1, Math.floor(rect.height * scale));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.clearRect(0, 0, width, height);

      const image = context.createImageData(width, height);
      const data = image.data;

      for (let index = 0; index < data.length; index += 4) {
        const value = 72 + Math.floor(Math.random() * 142);
        data[index] = value + 8;
        data[index + 1] = value + 5;
        data[index + 2] = value;
        data[index + 3] = 132;
      }

      context.putImageData(image, 0, 0);
    };

    drawNoise();
    window.addEventListener("resize", drawNoise);
    return () => window.removeEventListener("resize", drawNoise);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-[0.64] mix-blend-soft-light"
    />
  );
}
