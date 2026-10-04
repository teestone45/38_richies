import Link from "next/link";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const products = await getProducts();

  return (
    <main className="journal-page page-shell">
      <header className="journal-page__heading">
        <p className="eyebrow">38 RICHES / THE ARCHIVE</p>
        <h1>THE DROP<br />JOURNAL.</h1>
        <p>Pieces, print notes, and the ideas behind what we make. Browse the archive one piece at a time.</p>
      </header>
      {products.length ? <div className="journal-grid">
        {products.map((product, index) => (
          <article className="journal-entry" key={product.slug}>
            <Link className="journal-entry__image" href={`/product/${product.slug}`} aria-label={`Read about ${product.title}`} style={{ backgroundImage: `url("${product.image}")` }}>
              {index === 0 && <span>RECENT PIECE</span>}
            </Link>
            <div className="journal-entry__meta"><span>{product.dropName ?? product.badge}</span><span>{product.createdAt ? new Date(product.createdAt).getFullYear() : "38R / ARCHIVE"}</span></div>
            <h2><Link href={`/product/${product.slug}`}>{product.storyTitle ?? product.title}</Link></h2>
            <p>{product.story ?? product.description}</p>
            {product.stylingNotes && <p className="journal-entry__styling">STYLE NOTE / {product.stylingNotes}</p>}
            <Link className="journal-entry__link" href={`/product/${product.slug}`}>View the piece <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div> : <p className="journal-page__empty">The journal is being prepared. Check back for the next drop.</p>}
      <Link className="button button--lime journal-page__shop" href="/#shop">Shop the current rotation <span aria-hidden="true">↗</span></Link>
    </main>
  );
}
