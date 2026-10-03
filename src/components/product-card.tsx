import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@/lib/products";

export default function ProductCard({ product, isFavorite, onToggleFavorite }: { product: Product; isFavorite: boolean; onToggleFavorite: (slug: string) => void }) {
  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        <Link className="product-card__image-link" href={`/product/${product.slug}`} aria-label={`View ${product.title}`}>
          <div className="product-card__image" style={{ backgroundImage: `url("${product.image}")` }} role="img" aria-label={`${product.title} product photo`} />
          {product.featured && <span className="product-card__featured">FEATURED</span>}
          <span className="product-card__label">{product.badge}</span>
          {product.inventory && <span className="product-card__stock">{Object.values(product.inventory).reduce((total, quantity) => total + quantity, 0) === 0 ? "SOLD OUT" : "LIMITED STOCK"}</span>}
        </Link>
        <button className="product-card__favorite" type="button" aria-label={`${isFavorite ? "Remove" : "Save"} ${product.title} ${isFavorite ? "from" : "to"} saved pieces`} aria-pressed={isFavorite} onClick={() => onToggleFavorite(product.slug)}><span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span></button>
      </div>
      <Link className="product-card__meta-link" href={`/product/${product.slug}`} aria-label={`View ${product.title}`}>
        <div className="product-card__meta">
          <div><h3 className="product-card__name">{product.title}</h3><p className="product-card__detail">{product.printMethod ?? product.category} / {product.sizes.join(" · ")}</p></div>
          <span className="product-card__price">{formatCurrency(product.priceCents / 100)}</span>
        </div>
      </Link>
    </article>
  );
}