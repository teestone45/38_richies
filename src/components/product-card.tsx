import Link from "next/link";
import type { Product } from "@/lib/products";

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} aria-label={`View ${product.title}`}>
        <div className="product-card__image-wrap">
          <div className="product-card__image" style={{ backgroundImage: `url("${product.image}")` }} role="img" aria-label={`${product.title} product photo`} />
          {product.artwork && <span className={`product-print product-print--${product.artwork.palette}`} aria-hidden="true"><small>{product.artwork.top}</small><strong>{product.artwork.center}</strong><i>{product.artwork.bottom}</i></span>}
          {product.featured && <span className="product-card__featured">FEATURED</span>}
          <span className="product-card__label">{product.badge}</span>
          <span className="product-card__index">38 / 0{index + 1}</span>
          {product.inventory && <span className="product-card__stock">{Object.values(product.inventory).reduce((total, quantity) => total + quantity, 0) === 0 ? "SOLD OUT" : "LIMITED STOCK"}</span>}
        </div>
        <div className="product-card__meta">
          <div><h3 className="product-card__name">{product.title}</h3><p className="product-card__detail">{product.printMethod ?? product.category} / {product.sizes.join(" · ")}</p></div>
          <span className="product-card__price">${(product.priceCents / 100).toFixed(2)}</span>
        </div>
      </Link>
    </article>
  );
}