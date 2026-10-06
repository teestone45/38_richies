"use client";

import Link from "next/link";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { requestStoreDashboardAction, type StoreDashboardAction } from "@/lib/store-dashboard";
import type { Product } from "@/lib/products";

type DashboardItem = {
  label: string;
  detail: string;
  action?: StoreDashboardAction;
  href?: string;
  external?: boolean;
  disabled?: boolean;
};

function createShirtShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.28, 0.66);
  shape.lineTo(-0.72, 0.34);
  shape.lineTo(-0.5, -0.03);
  shape.lineTo(-0.3, 0.1);
  shape.lineTo(-0.28, -0.72);
  shape.lineTo(0.28, -0.72);
  shape.lineTo(0.3, 0.1);
  shape.lineTo(0.5, -0.03);
  shape.lineTo(0.72, 0.34);
  shape.lineTo(0.28, 0.66);
  shape.lineTo(0.14, 0.46);
  shape.quadraticCurveTo(0, 0.58, -0.14, 0.46);
  shape.closePath();
  return shape;
}

function DashboardScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = sceneHostRef.current;
    if (!canvas || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 3, 0.1, 40);
    camera.position.set(0, 0, 5.4);
    scene.add(new THREE.HemisphereLight(0xf5e9d9, 0x392126, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffe6ca, 3.2);
    keyLight.position.set(-2, 3, 4);
    scene.add(keyLight);
    const edgeLight = new THREE.DirectionalLight(0x9cae91, 2.1);
    edgeLight.position.set(3, 0, -2);
    scene.add(edgeLight);

    const garment = new THREE.Group();
    scene.add(garment);
    const shirt = new THREE.Mesh(
      new THREE.ExtrudeGeometry(createShirtShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.025, bevelSegments: 3, curveSegments: 12 }),
      new THREE.MeshStandardMaterial({ color: 0x713c49, roughness: 0.78, metalness: 0.04 }),
    );
    garment.add(shirt);

    const badgeCanvas = document.createElement("canvas");
    badgeCanvas.width = 256;
    badgeCanvas.height = 128;
    const context = badgeCanvas.getContext("2d");
    if (context) {
      context.fillStyle = "#31513d";
      context.fillRect(25, 23, 206, 82);
      context.strokeStyle = "#e8ddcc";
      context.lineWidth = 4;
      context.strokeRect(30, 28, 196, 72);
      context.fillStyle = "#f1e6d6";
      context.font = "bold 64px Georgia";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("38", 128, 65);
    }
    const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
    badgeTexture.colorSpace = THREE.SRGBColorSpace;
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true, side: THREE.DoubleSide }));
    badge.position.set(0, -0.04, 0.17);
    garment.add(badge);

    const stitch = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.012, 8, 100), new THREE.MeshStandardMaterial({ color: 0xc48363, roughness: 0.55, metalness: 0.35 }));
    stitch.rotation.set(1.18, 0.16, -0.2);
    garment.add(stitch);

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resizeObserver.observe(host);

    function onPointerMove(event: PointerEvent) {
      const bounds = host?.getBoundingClientRect();
      if (!bounds) return;
      targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.26;
      targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12;
    }
    function onPointerLeave() {
      targetX = 0;
      targetY = 0;
    }
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    function render(time: number) {
      const seconds = time * 0.001;
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      garment.rotation.x = pointerX + (reducedMotion ? 0 : Math.sin(seconds * 0.45) * 0.045);
      garment.rotation.y = pointerY + (reducedMotion ? 0.12 : Math.sin(seconds * 0.35) * 0.16);
      garment.position.y = reducedMotion ? 0 : Math.sin(seconds * 1.05) * 0.07;
      stitch.rotation.z = reducedMotion ? -0.2 : -0.2 + seconds * 0.12;
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    }

    render(0);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      garment.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      badgeTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="store-dashboard__scene" ref={sceneHostRef} aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

export default function StoreDashboard({ products }: { products: Product[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const featuredCount = products.some((product) => product.featured) ? products.filter((product) => product.featured).length : Math.min(products.length, 4);
  const limitedCount = products.filter((product) => /limited|small run/i.test(`${product.badge ?? ""} ${product.dropName ?? ""}`)).length;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const items: DashboardItem[] = [
    { label: "Product search", detail: "Search the collection", action: "search" },
    { label: "Product filters", detail: "Browse by category", action: "filters" },
    { label: "Size selection", detail: "Find your fit", action: "size" },
    { label: "Color selection", detail: "Choose a garment color", action: "color" },
    { label: "Add to cart", detail: "Add the featured piece", action: "add-to-cart" },
    { label: "Shopping cart", detail: "Review your bag", href: "/cart" },
    { label: "Checkout", detail: "Pay securely", href: "/cart" },
    { label: "WhatsApp contact", detail: "Open a WhatsApp message", href: "https://wa.me/?text=Hello%2C%20I%27m%20interested%20in%2038%20RICHES.", external: true },
    { label: "Order confirmation", detail: "Check order status", href: "/track" },
    { label: "Customer account", detail: "Order lookup; sign-in is not set up", href: "/track" },
    { label: "Product availability", detail: "Show available pieces", action: "availability" },
    { label: "Featured products", detail: `${featuredCount} featured picks`, action: "featured" },
    { label: "New arrivals", detail: "Sort newest first", action: "new-arrivals" },
    { label: "Limited drops", detail: limitedCount ? `${limitedCount} tagged ${limitedCount === 1 ? "piece" : "pieces"}` : "Drop details not configured", action: limitedCount ? "limited-drops" : undefined, disabled: limitedCount === 0 },
  ];

  function onAction(action: StoreDashboardAction) {
    requestStoreDashboardAction(action);
    setIsOpen(false);
  }

  return (
    <section className={`store-dashboard${isOpen ? " is-open" : ""}`} aria-label="Store dashboard">
      <div className="store-dashboard__launcher">
        <DashboardScene />
        <button className="store-dashboard__trigger" type="button" aria-expanded={isOpen} aria-controls="store-dashboard-panel" onClick={() => setIsOpen((open) => !open)}>
          <span className="store-dashboard__signal" aria-hidden="true" />
          <span>Store dashboard</span>
          <span className="store-dashboard__trigger-count">{String(products.length).padStart(2, "0")} PIECES</span>
          <span className="store-dashboard__chevron" aria-hidden="true">{isOpen ? "−" : "+"}</span>
        </button>
      </div>
      {isOpen && <div className="store-dashboard__panel" id="store-dashboard-panel">
        <div className="store-dashboard__heading"><div><p className="eyebrow">38 RICHES / STORE DECK</p><h2>Move through the store.</h2></div><span>{products.length} LIVE PIECES</span></div>
        <div className="store-dashboard__grid">
          {items.map((item, index) => {
            const content = <><span className="store-dashboard__item-index">{String(index + 1).padStart(2, "0")}</span><span className="store-dashboard__item-copy"><strong>{item.label}</strong><small>{item.detail}</small></span><span className="store-dashboard__item-arrow" aria-hidden="true">↗</span></>;
            const className = `store-dashboard__item${item.disabled ? " is-disabled" : ""}`;
            if (item.href) return <Link className={className} href={item.href} key={item.label} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} onClick={() => setIsOpen(false)}>{content}</Link>;
            return <button className={className} key={item.label} type="button" disabled={item.disabled} onClick={() => item.action && onAction(item.action)}>{content}</button>;
          })}
        </div>
      </div>}
    </section>
  );
}