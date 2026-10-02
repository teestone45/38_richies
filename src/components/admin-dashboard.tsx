"use client";

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
  products?: Omit<AdminProduct, "priceValue">[];
  canManageProducts?: boolean;
  storageMessage?: string;
  orders?: AdminOrder[];
  updated?: number;
  emailSent?: boolean;
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

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/admin/products", { method: "POST", body: new FormData(form) });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error ?? "Could not create product.");
      form.reset();
      await refreshProducts();
      setNotice("Product added to your catalog.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create product.");
    } finally {
      setIsCreating(false);
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
        <form className="admin-product-form" onSubmit={createProduct}>
          <label>Product name<input name="title" required maxLength={120} placeholder="Night Shift Tee" /></label>
          <label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="night-shift-tee" /></label>
          <label>Price (USD)<input name="price" type="number" required min="0.01" max="10000" step="0.01" placeholder="45.00" /></label>
          <label>Category<input name="category" required placeholder="Graphic tee" /></label>
          <label>Drop label<input name="badge" maxLength={32} placeholder="DROP 002" /></label>
          <label>Available colors<input name="colors" defaultValue="Black, Cream" placeholder="Black, Cream" /></label>
          <label>Available sizes<input name="sizes" required defaultValue="XL, 2XL" placeholder="XL, 2XL" /></label>
          <label>Stock by size<input name="stock" placeholder="XL:4, 2XL:2" /><small>Leave blank to leave stock untracked.</small></label>
          <label className="admin-product-form__wide">Description<textarea name="description" rows={3} placeholder="Fabric, fit, print details..." /></label>
          <label>Print placement<input name="dtfPlacement" placeholder="A3 front print" /></label>
          <label>Fabric / weight<input name="fabric" placeholder="280 GSM cotton" /></label>
          <label>Print method<select name="printMethod" defaultValue="DTF"><option>DTF</option><option>DTG</option><option>Embroidered</option></select></label>
          <label>Store status<select name="active" defaultValue="true"><option value="true">Live</option><option value="false">Draft</option></select></label>
          <label>Feature product<select name="featured" defaultValue="false"><option value="false">Standard</option><option value="true">Featured</option></select></label>
          <label className="admin-upload">Product photos<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required /><small>Up to 8 JPG, PNG or WebP files · 8 MB each</small></label>
          <div className="admin-product-form__submit"><button className="button button--lime" type="submit" disabled={isCreating || !canManageProducts}>{isCreating ? "Uploading..." : "Upload product"}<span aria-hidden="true">↗</span></button></div>
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