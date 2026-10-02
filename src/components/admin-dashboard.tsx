"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type AdminProduct = {
  _id: string;
  slug: string;
  title: string;
  price: number;
  priceValue: string;
  image: string;
  images: string[];
  active: boolean;
  sizes: string[];
  description: string;
  category: string;
  badge: string;
  colors?: string[];
  dtfPlacement: string;
  fabric: string;
  printMethod: "DTF" | "DTG" | "Embroidered";
  inventory?: Record<string, number>;
  featured: boolean;
};

type AdminOrder = {
  _id: string;
  stripeSessionId: string;
  email: string;
  items: { productId: string; title: string; size: string; color?: string; quantity: number; unitAmount: number }[];
  amountTotal: number;
  currency: string;
  status: string;
  shippingAddress: string;
  trackingNumber: string;
  createdAt: string;
};

type ApiResponse = {
  error?: string;
  authenticated?: boolean;
  draft?: {
    title: string;
    slug: string;
    category: string;
    badge: string;
    description: string;
    colors: string[];
    sizes: string[];
    dtfPlacement: string;
    fabric: string;
    printMethod: string;
  };
  imageDataUrl?: string;
  productDetails?: {
    title: string;
    slug: string;
    category: string;
    description: string;
    price: number;
    colors: string[];
  };
  productDetailsError?: string;
  products?: Omit<AdminProduct, "priceValue">[];
  canManageProducts?: boolean;
  storageMessage?: string;
  orders?: AdminOrder[];
  updated?: number;
  emailSent?: boolean;
};

const productPromptStarters = {
  tee: "Oversized heavyweight streetwear T-shirt, front view, full garment centered, premium ecommerce studio photo, realistic cotton texture, bold but clean graphic placement, navy-blue studio background.",
  hoodie: "Relaxed heavyweight pullover hoodie, front view, full garment centered, premium ecommerce studio photo, realistic fleece texture, structured hood and ribbed cuffs, navy-blue studio background.",
  cap: "Structured six-panel streetwear cap, front view, full product centered, premium ecommerce studio photo, realistic cotton twill texture, clean embroidered front detail, navy-blue studio background.",
};

function toEditorProducts(products: ApiResponse["products"] = []): AdminProduct[] {
  return products.map((product) => {
    const rawInventory = (product as Omit<AdminProduct, "priceValue"> & { inventory?: { size: string; quantity: number }[] | Record<string, number> }).inventory;
    const inventory = Array.isArray(rawInventory)
      ? Object.fromEntries(rawInventory.map((variant) => [variant.size, variant.quantity]))
      : rawInventory;
    return {
      ...product,
      images: product.images?.length ? product.images : [product.image],
      inventory,
      featured: product.featured ?? false,
      priceValue: Number(product.price).toFixed(2),
    };
  });
}

async function readResponse(response: Response): Promise<ApiResponse> {
  return response.json() as Promise<ApiResponse>;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [activeAdminView, setActiveAdminView] = useState<"catalog" | "orders">("catalog");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [imageAnalysisMessage, setImageAnalysisMessage] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState("");
  const [generatedProductDetails, setGeneratedProductDetails] = useState<ApiResponse["productDetails"]>();
  const [manualProductDetails, setManualProductDetails] = useState({ title: "", category: "Graphic tee", description: "", price: "45.00" });
  const [manualUploadTitle, setManualUploadTitle] = useState("");
  const [manualUploadPrice, setManualUploadPrice] = useState("45.00");
  const [manualUploadCategory, setManualUploadCategory] = useState("Graphic tee");
  const [manualUploadDescription, setManualUploadDescription] = useState("");
  const [manualUploadFiles, setManualUploadFiles] = useState<File[]>([]);
  const [isQuickUploading, setIsQuickUploading] = useState(false);

  function isProductDetailsComplete(productDetails?: ApiResponse["productDetails"]) {
    if (!productDetails) return false;
    return Boolean(productDetails.title.trim()) && Boolean(productDetails.category.trim()) && Boolean(productDetails.description.trim()) && Number(productDetails.price) > 0;
  }

  function updateManualProductDetails(field: "title" | "category" | "description" | "price", value: string) {
    setManualProductDetails((current) => ({ ...current, [field]: value }));
    setGeneratedProductDetails((current) => {
      if (!current) return current;
      const next = { ...current };
      if (field === "title") next.title = value.trim().slice(0, 120);
      if (field === "category") next.category = value.trim().slice(0, 80) || "Graphic tee";
      if (field === "description") next.description = value.trim().slice(0, 2000);
      if (field === "price") {
        const numericPrice = Number(value);
        next.price = Number.isFinite(numericPrice) && numericPrice > 0 ? Number(numericPrice.toFixed(2)) : 45;
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const result = await readResponse(response);
        if (cancelled) return;
        if (response.status === 503) setError(result.error ?? "Admin sign-in is not configured.");
        if (result.authenticated) {
          setIsSignedIn(true);
          const productResponse = await fetch("/api/admin/products", { cache: "no-store" });
          const productResult = await readResponse(productResponse);
          if (!productResponse.ok) throw new Error(productResult.error ?? "Could not load products.");
          if (!cancelled) {
            setProducts(toEditorProducts(productResult.products));
            setCanManageProducts(productResult.canManageProducts === true);
            setStorageMessage(productResult.storageMessage ?? "");
            const orderResponse = await fetch("/api/admin/orders", { cache: "no-store" });
            const orderResult = await readResponse(orderResponse);
            if (orderResponse.ok && !cancelled) setOrders(orderResult.orders ?? []);
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not connect to the admin service.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, []);

  async function refreshProducts() {
    const response = await fetch("/api/admin/products", { cache: "no-store" });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(result.error ?? "Could not load products.");
    setProducts(toEditorProducts(result.products));
    setCanManageProducts(result.canManageProducts === true);
    setStorageMessage(result.storageMessage ?? "");
  }

  async function refreshOrders() {
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await readResponse(response);
    if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
    setOrders(result.orders ?? []);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await readResponse(response);
    if (!response.ok) {
      setError(result.error ?? "Could not sign in.");
      return;
    }
    setIdentifier("");
    setPassword("");
    setIsSignedIn(true);
    try {
      await refreshProducts();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load products.");
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setProducts([]);
    setOrders([]);
    setSelectedIds([]);
    setCanManageProducts(false);
    setStorageMessage("");
    setIsSignedIn(false);
    setNotice("");
    setError("");
  }

  function updateProduct(id: string, update: Partial<AdminProduct>) {
    setProducts((current) => current.map((product) => product._id === id ? { ...product, ...update } : product));
  }

  async function saveProduct(product: AdminProduct) {
    setSavingId(product._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(product.priceValue), active: product.active, featured: product.featured, colors: product.colors ?? [], stock: product.inventory ? Object.entries(product.inventory).map(([size, quantity]) => ({ size, quantity })) : [] }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not save product changes.");
      await refreshProducts();
      setNotice(`${product.title} updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save product changes.");
    } finally {
      setSavingId("");
    }
  }

  async function saveProductDetails(event: FormEvent<HTMLFormElement>, product: AdminProduct) {
    event.preventDefault();
    setSavingId(product._id);
    setError("");
    setNotice("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("price", product.priceValue);
      form.set("active", String(product.active));
      form.set("featured", String(product.featured));
      form.set("stock", Object.entries(product.inventory ?? {}).map(([size, quantity]) => `${size}:${quantity}`).join(", "));
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product._id)}`, { method: "PATCH", body: form });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not save product changes.");
      await refreshProducts();
      setEditingId("");
      setNotice(`${product.title} updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save product changes.");
    } finally {
      setSavingId("");
    }
  }

  async function deleteProduct(product: AdminProduct) {
    if (!window.confirm(`Delete ${product.title}? This permanently removes the product from Sanity.`)) return;
    setDeletingId(product._id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product._id)}`, { method: "DELETE" });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not delete product.");
      setProducts((current) => current.filter((item) => item._id !== product._id));
      setEditingId("");
      setNotice(`${product.title} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete product.");
    } finally {
      setDeletingId("");
    }
  }

  function updateProductPrompt(prompt: string) {
    setImagePrompt(prompt);
    if (generatedImageDataUrl || generatedProductDetails) {
      setGeneratedImageDataUrl("");
      setGeneratedProductDetails(undefined);
      setImageAnalysisMessage("");
    }
  }

  function updateArtworkFile(file: File | null) {
    if (file && file.size > 4 * 1024 * 1024) {
      setError("Artwork must be 4 MB or smaller.");
      return;
    }
    setArtworkFile(file);
    if (generatedImageDataUrl || generatedProductDetails) {
      setGeneratedImageDataUrl("");
      setGeneratedProductDetails(undefined);
      setImageAnalysisMessage("");
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageProducts) return;
    setIsCreating(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    try {
      let imageDataUrl = generatedImageDataUrl;
      let productDetails = generatedProductDetails;
      if (!imageDataUrl || !productDetails) {
        setIsGeneratingImage(true);
        const generationForm = new FormData();
        generationForm.set("prompt", imagePrompt.trim());
        if (artworkFile) generationForm.set("artwork", artworkFile);
        const generationResponse = await fetch("/api/admin/products/generate-image", { method: "POST", body: generationForm });
        const generationResult = await readResponse(generationResponse);
        if (!generationResponse.ok || !generationResult.imageDataUrl) throw new Error(generationResult.error ?? "Could not generate a clothing mockup.");
        imageDataUrl = generationResult.imageDataUrl;
        setGeneratedImageDataUrl(imageDataUrl);
        const fallbackDetails = generationResult.productDetails ?? {
          title: "",
          slug: "",
          category: "Graphic tee",
          description: "",
          price: 45,
          colors: ["Black"],
        };
        setGeneratedProductDetails(fallbackDetails);
        setManualProductDetails({
          title: fallbackDetails.title,
          category: fallbackDetails.category,
          description: fallbackDetails.description,
          price: fallbackDetails.price.toFixed(2),
        });
        if (!generationResult.productDetails) {
          setImageAnalysisMessage("Mockup generated. Using a default product draft and publishing to the storefront...");
        } else if (!isProductDetailsComplete(fallbackDetails)) {
          setImageAnalysisMessage(generationResult.productDetailsError ?? "Mockup generated. Using a sensible default draft and publishing to the storefront...");
        } else {
          setImageAnalysisMessage("Mockup and details generated. Publishing to the storefront now...");
        }
        productDetails = generationResult.productDetails ?? fallbackDetails;
        setIsGeneratingImage(false);
      }

      if (!productDetails || !isProductDetailsComplete(productDetails)) {
        const fallbackDetails = {
          title: manualProductDetails.title.trim() || productDetails?.title || "",
          slug: productDetails?.slug || "",
          category: manualProductDetails.category.trim() || productDetails?.category || "Graphic tee",
          description: manualProductDetails.description.trim() || productDetails?.description || "",
          price: Number(manualProductDetails.price) || productDetails?.price || 45,
          colors: productDetails?.colors && productDetails.colors.length ? productDetails.colors : ["Black"],
        };
        if (!fallbackDetails.title || !fallbackDetails.category || !fallbackDetails.description || !Number.isFinite(fallbackDetails.price) || fallbackDetails.price <= 0) {
          fallbackDetails.title = fallbackDetails.title || "38 RICHES Graphic Tee";
          fallbackDetails.category = fallbackDetails.category || "Graphic tee";
          fallbackDetails.description = fallbackDetails.description || `${fallbackDetails.category} styled for a premium 38 RICHES streetwear drop. Designed with a clean, elevated silhouette and bold front-facing energy.`;
          fallbackDetails.price = Number(fallbackDetails.price) > 0 ? Number(fallbackDetails.price) : 45;
        }
        productDetails = fallbackDetails;
      }

      const productForm = new FormData(form);
      productForm.set("title", productDetails.title);
      productForm.set("slug", productDetails.slug || "38-riches-piece");
      productForm.set("price", productDetails.price.toFixed(2));
      productForm.set("category", productDetails.category);
      productForm.set("badge", "NEW DROP");
      productForm.set("colors", productDetails.colors.join(", ") || "Black");
      productForm.set("sizes", "XL, 2XL");
      productForm.set("stock", "");
      productForm.set("description", productDetails.description);
      productForm.set("dtfPlacement", "Front graphic, centered on chest.");
      productForm.set("fabric", "");
      productForm.set("printMethod", "DTF");
      productForm.set("active", "true");
      productForm.set("featured", "false");
      const generatedResponse = await fetch(imageDataUrl);
      const generatedBlob = await generatedResponse.blob();
      productForm.append("images", new File([generatedBlob], "venice-generated-product.webp", { type: "image/webp" }));
      const response = await fetch("/api/admin/products", { method: "POST", body: productForm });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not create product.");
      if (form) form.reset();
      setImagePrompt("");
      setArtworkFile(null);
      setGeneratedImageDataUrl("");
      setGeneratedProductDetails(undefined);
      setImageAnalysisMessage("");
      await refreshProducts();
      setNotice(`${productDetails.title} published to your storefront.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not generate and publish the product.");
    } finally {
      setIsCreating(false);
      setIsGeneratingImage(false);
    }
  }

  async function publishManualUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageProducts) return;
    const title = manualUploadTitle.trim();
    const price = Number(manualUploadPrice);
    if (!title || !Number.isFinite(price) || price <= 0) {
      setError("Add a T-shirt title and a valid price before publishing.");
      return;
    }
    if (manualUploadFiles.length === 0) {
      setError("Upload at least one product image before publishing.");
      return;
    }

    setIsQuickUploading(true);
    setError("");
    setNotice("");

    try {
      const slug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "38-riches-piece";
      const productForm = new FormData(event.currentTarget);
      productForm.set("title", title);
      productForm.set("slug", slug);
      productForm.set("price", price.toFixed(2));
      productForm.set("category", manualUploadCategory.trim() || "Graphic tee");
      productForm.set("badge", "NEW DROP");
      productForm.set("colors", "Black");
      productForm.set("sizes", "XL, 2XL");
      productForm.set("stock", "");
      productForm.set("description", manualUploadDescription.trim() || `${title} is a premium 38 RICHES streetwear tee built for everyday wear and comfort.`);
      productForm.set("dtfPlacement", "Front graphic, centered on chest.");
      productForm.set("fabric", "Heavyweight cotton blend");
      productForm.set("printMethod", "DTF");
      productForm.set("active", "true");
      productForm.set("featured", "false");
      manualUploadFiles.forEach((file) => productForm.append("images", file));

      const response = await fetch("/api/admin/products", { method: "POST", body: productForm });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not publish the product.");
      setManualUploadTitle("");
      setManualUploadPrice("45.00");
      setManualUploadCategory("Graphic tee");
      setManualUploadDescription("");
      setManualUploadFiles([]);
      if (event.currentTarget) event.currentTarget.reset();
      await refreshProducts();
      setNotice(`${title} published to your storefront.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Could not upload the product.");
    } finally {
      setIsQuickUploading(false);
    }
  }

  async function applyBulk(changes: { active?: boolean; featured?: boolean }) {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, ...changes }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not apply bulk changes.");
      await refreshProducts();
      setNotice(`Updated ${result.updated ?? selectedIds.length} products.`);
      setSelectedIds([]);
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Could not apply bulk changes.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function updateOrder(order: AdminOrder, changes: { status?: string; trackingNumber?: string }) {
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not update order.");
      await refreshOrders();
      setNotice(`Order ${order.stripeSessionId} updated.${changes.status === "shipped" ? result.emailSent ? " Shipping email sent." : " Shipping email not sent; configure Resend to enable email notifications." : ""}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update order.");
    }
  }

  const visibleProducts = products.filter((product) => `${product.title} ${product.slug} ${product.category}`.toLowerCase().includes(catalogQuery.trim().toLowerCase()));

  function toggleProductSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]);
  }

  if (isLoading) return <main className="admin-page"><p className="eyebrow">38 RICHES / ADMIN</p><p className="admin-loading">Checking admin access...</p></main>;

  if (!isSignedIn) {
    return (
      <main className="admin-page admin-page--login">
        <div className="admin-login">
          <p className="eyebrow">38 RICHES / PRIVATE ACCESS</p>
          <h1>CONTROL<br />THE DROP.</h1>
          <p className="admin-intro">Sign in to create, edit, hide, or remove products from your storefront.</p>
          {error && <p className="admin-alert" role="alert">{error}</p>}
          <form className="admin-login__form" onSubmit={signIn}>
            <label htmlFor="admin-identifier">Email or username</label>
            <input id="admin-identifier" type="text" autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
            <label htmlFor="admin-password">Admin password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="button button--lime" type="submit">Sign in <span aria-hidden="true">↗</span></button>
          </form>
          <Link className="admin-back" href="/">← Back to storefront</Link>
        </div>
      </main>
    );
  }

  const liveCount = products.filter((product) => product.active).length;

  return (
    <main className="admin-page">
      <div className="admin-topline">
        <div><p className="eyebrow">38 RICHES / CONTROL ROOM</p><h1>THE DROP.</h1></div>
        <div className="admin-topline__actions"><Link href="/">View storefront ↗</Link><button type="button" onClick={signOut}>Sign out</button></div>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {storageMessage && <p className="admin-storage-note" role="status">{storageMessage}</p>}
      <div className="admin-stats">
        <div><span>CATALOG</span><strong>{products.length.toString().padStart(2, "0")}</strong></div>
        <div><span>LIVE</span><strong>{liveCount.toString().padStart(2, "0")}</strong></div>
        <div><span>DRAFT</span><strong>{(products.length - liveCount).toString().padStart(2, "0")}</strong></div>
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        <button type="button" aria-pressed={activeAdminView === "catalog"} onClick={() => setActiveAdminView("catalog")}>Catalog <span>{products.length}</span></button>
        <button type="button" aria-pressed={activeAdminView === "orders"} onClick={() => setActiveAdminView("orders")}>Orders <span>{orders.length}</span></button>
      </nav>

      {activeAdminView === "catalog" && <>
      <section className="admin-section" aria-labelledby="new-product-title">
        <div className="admin-section__heading"><div><p className="eyebrow">ADD TO THE LINEUP</p><h2 id="new-product-title">NEW PIECE</h2></div><span>01 / CREATE</span></div>

        <form className="admin-product-form admin-product-form--studio" onSubmit={publishManualUpload}>
          <div className="admin-image-generator">
            <p className="eyebrow">QUICK UPLOAD / MANUAL DROP</p>
            <label htmlFor="manual-upload-title">T-shirt title<input id="manual-upload-title" type="text" value={manualUploadTitle} onChange={(event) => setManualUploadTitle(event.target.value)} placeholder="38 RICHES Signature Tee" required /></label>
            <label htmlFor="manual-upload-price">Price<input id="manual-upload-price" type="number" min="0.01" step="0.01" value={manualUploadPrice} onChange={(event) => setManualUploadPrice(event.target.value)} placeholder="45.00" required /></label>
            <label htmlFor="manual-upload-category">Category<input id="manual-upload-category" type="text" value={manualUploadCategory} onChange={(event) => setManualUploadCategory(event.target.value)} placeholder="Graphic tee" /></label>
            <label htmlFor="manual-upload-description">Description<textarea id="manual-upload-description" rows={3} value={manualUploadDescription} onChange={(event) => setManualUploadDescription(event.target.value)} placeholder="Premium oversized streetwear tee built for everyday wear." /></label>
            <label className="admin-artwork-upload" htmlFor="manual-upload-images">Upload product photo(s)<input id="manual-upload-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setManualUploadFiles(Array.from(event.currentTarget.files ?? []))} /><small>{manualUploadFiles.length ? `${manualUploadFiles.length} image(s) selected` : "JPG, PNG, or WebP. Upload one or more product shots."}</small></label>
          </div>
          <div className="admin-product-form__submit"><button className="button button--lime" type="submit" disabled={isQuickUploading || !canManageProducts || !manualUploadTitle.trim() || !manualUploadFiles.length}>{isQuickUploading ? "Publishing..." : !canManageProducts ? "Connect Sanity to publish" : "Upload & publish to storefront"}<span aria-hidden="true">↗</span></button></div>
          <p className="admin-ai-note" role="status">Use this quick-upload form to sell a product by image, title, and price without AI generation.</p>
          {!canManageProducts && <p className="admin-ai-note" role="alert">Product publishing is unavailable until Sanity project, dataset, and write-token settings are configured.</p>}
        </form>

        <form className="admin-product-form admin-product-form--studio" onSubmit={createProduct}>
          <div className="admin-image-generator">
            <p className="eyebrow">VENICE AI / IMAGE STUDIO</p>
            <label className="admin-prompt-starter" htmlFor="product-prompt-starter">Prompt starter<select id="product-prompt-starter" defaultValue="" onChange={(event) => { const starter = productPromptStarters[event.target.value as keyof typeof productPromptStarters]; if (starter) updateProductPrompt(starter); }}><option value="">Choose a garment starter</option><option value="tee">Streetwear tee</option><option value="hoodie">Heavy hoodie</option><option value="cap">Structured cap</option></select></label>
            <label htmlFor="product-image-prompt">Describe the clothing image<textarea id="product-image-prompt" rows={4} maxLength={4000} value={imagePrompt} onChange={(event) => updateProductPrompt(event.target.value)} placeholder="Oversized heavyweight black tee, front view, small silver 38 RICHES chest graphic, washed cotton texture..." /></label>
            <label className="admin-artwork-upload" htmlFor="product-artwork">Attach your art design (optional)<input id="product-artwork" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; updateArtworkFile(file); if (file && file.size > 4 * 1024 * 1024) event.currentTarget.value = ""; }} /><small>{artworkFile ? `Attached: ${artworkFile.name}` : "PNG, JPG, or WebP · 4 MB max. Transparent PNG artwork works best."}</small></label>
            {artworkFile && <button className="admin-generated-image__remove" type="button" onClick={() => updateArtworkFile(null)}>Remove artwork</button>}
            <div className="admin-image-generator__actions">
              <small>One click generates the garment, drafts the details and suggested price, then publishes it. Venice charges credits. Artwork guides the design but may not reproduce exactly.</small>
            </div>
            {generatedImageDataUrl && <div className="admin-generated-image"><Image src={generatedImageDataUrl} alt="AI-generated clothing product preview" width={560} height={560} unoptimized /><button className="admin-generated-image__remove" type="button" onClick={() => setGeneratedImageDataUrl("")}>Remove generated image</button></div>}
            {generatedProductDetails && <section className="admin-generated-details" aria-label="AI-generated product details">
              <div className="admin-generated-details__heading"><span>AI PRODUCT DRAFT</span><strong>${(Number(manualProductDetails.price) || generatedProductDetails.price).toFixed(2)} <small>suggested USD</small></strong></div>
              <h3>{manualProductDetails.title || generatedProductDetails.title}</h3>
              <p className="admin-generated-details__meta">{manualProductDetails.category || generatedProductDetails.category} / {(generatedProductDetails.colors?.length ? generatedProductDetails.colors : ["Black"]).join(", ")} / XL · 2XL</p>
              <p>{manualProductDetails.description || generatedProductDetails.description}</p>
            </section>}
            {generatedImageDataUrl && generatedProductDetails && !isProductDetailsComplete(generatedProductDetails) && (
              <div className="admin-generated-details admin-generated-details--manual">
                <p className="eyebrow">COMPLETE PRODUCT DETAILS</p>
                <label htmlFor="manual-product-title">Name<input id="manual-product-title" value={manualProductDetails.title} onChange={(event) => updateManualProductDetails("title", event.target.value)} placeholder="38 RICHES Signature Tee" /></label>
                <label htmlFor="manual-product-category">Category<input id="manual-product-category" value={manualProductDetails.category} onChange={(event) => updateManualProductDetails("category", event.target.value)} placeholder="Graphic tee" /></label>
                <label htmlFor="manual-product-price">Price<input id="manual-product-price" type="number" min="0.01" step="0.01" value={manualProductDetails.price} onChange={(event) => updateManualProductDetails("price", event.target.value)} /></label>
                <label htmlFor="manual-product-description">Description<textarea id="manual-product-description" rows={4} value={manualProductDetails.description} onChange={(event) => updateManualProductDetails("description", event.target.value)} placeholder="Premium oversized streetwear tee..." /></label>
              </div>
            )}
          </div>
          <div className="admin-product-form__submit"><button className="button button--lime" type="submit" disabled={isCreating || isGeneratingImage || !canManageProducts || !imagePrompt.trim()}>{isGeneratingImage ? "Generating mockup & details..." : isCreating ? generatedProductDetails ? "Publishing..." : "Generating & publishing..." : !canManageProducts ? "Connect Sanity to publish" : generatedProductDetails ? `Publish for $${(Number(manualProductDetails.price) || generatedProductDetails.price).toFixed(2)}` : "Generate & publish to storefront"}<span aria-hidden="true">↗</span></button></div>
          <p className="admin-ai-note" role="status">{isGeneratingImage ? "Generating mockup and product details with Venice AI..." : imageAnalysisMessage || "Generate a mockup to automatically draft the product name, colors, description, and suggested price. Standard sizing is XL / 2XL."}</p>
          {!canManageProducts && <p className="admin-ai-note" role="alert">Product publishing is unavailable until Sanity project, dataset, and write-token settings are configured.</p>}
        </form>
      </section>

      <section className="admin-section" aria-labelledby="catalog-title">
        <div className="admin-section__heading"><div><p className="eyebrow">PRICE / VISIBILITY</p><h2 id="catalog-title">YOUR CATALOG</h2></div><span>{products.length} PRODUCTS</span></div>
        <div className="admin-catalog-tools">
          <input type="search" aria-label="Search admin catalog" placeholder="Search name, slug, category" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} />
          <label><input type="checkbox" checked={visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.includes(product._id))} onChange={(event) => setSelectedIds(event.target.checked ? visibleProducts.map((product) => product._id) : selectedIds.filter((id) => !visibleProducts.some((product) => product._id === id)))} /> Select shown ({visibleProducts.length})</label>
          <div className="admin-bulk-actions">
            <button type="button" disabled={!canManageProducts || !selectedIds.length || bulkBusy} onClick={() => applyBulk({ active: true })}>Set live</button>
            <button type="button" disabled={!canManageProducts || !selectedIds.length || bulkBusy} onClick={() => applyBulk({ active: false })}>Set draft</button>
            <button type="button" disabled={!canManageProducts || !selectedIds.length || bulkBusy} onClick={() => applyBulk({ featured: true })}>Feature</button>
            <button type="button" disabled={!canManageProducts || !selectedIds.length || bulkBusy} onClick={() => applyBulk({ featured: false })}>Unfeature</button>
          </div>
        </div>
        {visibleProducts.length === 0 ? <p className="admin-empty">No products match this search.</p> : (
          <div className="admin-product-list">
            {visibleProducts.map((product) => (
              <article className="admin-product-row" key={product._id}>
                <input className="admin-product-select" type="checkbox" aria-label={`Select ${product.title}`} checked={selectedIds.includes(product._id)} onChange={() => toggleProductSelection(product._id)} />
                <div className="admin-product-row__image" style={{ backgroundImage: product.image ? `url("${product.image}")` : undefined }} role="img" aria-label={`${product.title} photo`} />
                <div className="admin-product-row__identity"><h3>{product.title}</h3><p>/{product.slug} · {product.sizes.join(" / ")}</p></div>
                <label className="admin-product-row__price">PRICE<input aria-label={`Price for ${product.title}`} type="number" min="0.01" max="10000" step="0.01" value={product.priceValue} disabled={!canManageProducts} onChange={(event) => updateProduct(product._id, { priceValue: event.target.value })} /></label>
                <label className="admin-product-row__status">STATUS<select aria-label={`Status for ${product.title}`} value={product.active ? "true" : "false"} disabled={!canManageProducts} onChange={(event) => updateProduct(product._id, { active: event.target.value === "true" })}><option value="true">Live</option><option value="false">Draft</option></select></label>
                <div className="admin-product-row__commands">
                  <button className="admin-save" type="button" onClick={() => saveProduct(product)} disabled={!canManageProducts || savingId === product._id || deletingId === product._id}>{savingId === product._id ? "Saving..." : "Save"}</button>
                  <button className="admin-edit" type="button" aria-expanded={editingId === product._id} onClick={() => setEditingId(editingId === product._id ? "" : product._id)}>{editingId === product._id ? "Close" : "Edit details"}</button>
                  <button className="admin-delete" type="button" onClick={() => deleteProduct(product)} disabled={!canManageProducts || deletingId === product._id}>{deletingId === product._id ? "Deleting..." : "Delete"}</button>
                </div>
                {editingId === product._id && (
                  <form className="admin-edit-form" key={`${product._id}-edit`} onSubmit={(event) => saveProductDetails(event, product)}>
                    <label>Product name<input name="title" required maxLength={120} defaultValue={product.title} /></label>
                    <label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product.slug} /></label>
                    <label>Category<input name="category" required maxLength={80} defaultValue={product.category} /></label>
                    <label>Drop label<input name="badge" maxLength={32} defaultValue={product.badge} /></label>
                    <label className="admin-product-form__wide">Description<textarea name="description" rows={3} maxLength={2000} defaultValue={product.description} /></label>
                    <label>Available colors<input name="colors" defaultValue={product.colors?.join(", ") ?? ""} placeholder="Black, Cream" /></label>
                    <label>Available sizes<input name="sizes" required defaultValue={product.sizes.join(", ")} /></label>
                    <label>Stock by size<input name="stock" defaultValue={Object.entries(product.inventory ?? {}).map(([size, quantity]) => `${size}:${quantity}`).join(", ")} placeholder="XL:4, 2XL:2" /><small>Blank means untracked stock.</small></label>
                    <label>Print method<select name="printMethod" defaultValue={product.printMethod}><option>DTF</option><option>DTG</option><option>Embroidered</option></select></label>
                    <label>Feature product<select name="featured" defaultValue={product.featured ? "true" : "false"}><option value="false">Standard</option><option value="true">Featured</option></select></label>
                    <label>Print placement<input name="dtfPlacement" maxLength={160} defaultValue={product.dtfPlacement} /></label>
                    <label>Fabric / weight<input name="fabric" maxLength={100} defaultValue={product.fabric} /></label>
                    <label className="admin-upload">Replace / add gallery images<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>Optional · Up to 8 JPG, PNG or WebP · 8 MB each</small></label>
                    <div className="admin-edit-form__commands"><button className="button button--lime" type="submit" disabled={!canManageProducts || savingId === product._id}>{savingId === product._id ? "Saving changes..." : "Save product details"}</button></div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      </>}

      {activeAdminView === "orders" && <section className="admin-section" aria-labelledby="orders-title">
        <div className="admin-section__heading"><div><p className="eyebrow">PAYMENTS / FULFILLMENT</p><h2 id="orders-title">ORDERS</h2></div><span>{orders.length} ORDERS</span></div>
        {orders.length === 0 ? <p className="admin-empty">No paid orders yet. Paid Stripe checkouts will appear here after the webhook is configured.</p> : <div className="admin-order-list">
          {orders.map((order) => <article className="admin-order-row" key={order._id}>
            <div className="admin-order-row__summary"><strong>{order.stripeSessionId.replace("cs_", "ORDER ").slice(0, 24)}</strong><span>{new Date(order.createdAt).toLocaleString()}</span><span>{order.email || "No email provided"}</span><span>${(order.amountTotal / 100).toFixed(2)} {order.currency?.toUpperCase()}</span></div>
            <div className="admin-order-row__items">{order.items.map((item, index) => <span key={`${item.productId}-${item.size}-${item.color ?? "Default"}-${index}`}>{item.quantity} × {item.title} / {item.size} / {item.color ?? "Default"}</span>)}</div>
            <p className="admin-order-row__address">{order.shippingAddress}</p>
            <div className="admin-order-row__controls">
              <label>FULFILLMENT<select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })}><option value="paid">Paid</option><option value="packing">Packing</option><option value="shipped">Shipped</option><option value="cancelled">Cancelled</option><option value="inventory_issue">Inventory issue</option></select></label>
              <label>TRACKING<input defaultValue={order.trackingNumber} placeholder="Tracking number" onBlur={(event) => { if (event.target.value !== order.trackingNumber) void updateOrder(order, { trackingNumber: event.target.value }); }} /></label>
            </div>
          </article>)}
        </div>}
      </section>}
    </main>
  );
}