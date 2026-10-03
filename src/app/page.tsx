import Link from "next/link";
import ProductCollection from "@/components/product-collection";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__image" role="img" aria-label="Streetwear campaign portrait" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow hero__eyebrow">38 RICHES / INDEPENDENT UNIFORM</p>
          <h1 id="hero-title">BUILT<br />DIFFERENT<span>.</span></h1>
          <div className="hero__bottom">
            <p>Heavyweight essentials.<br />No permission needed.</p>
            <Link className="button button--lime" href="#shop">Shop the drop <span aria-hidden="true">↘</span></Link>
          </div>
        </div>
        <p className="hero__index">DROP 001 / 2026</p>
      </section>

      <section className="ticker" aria-label="Brand statement">
        <div className="ticker__track">
          <span>MADE FOR THE ONES WHO MOVE DIFFERENT</span><i>✳</i><span>38 RICHES / NO SHORTCUTS</span><i>✳</i><span>MADE FOR THE ONES WHO MOVE DIFFERENT</span><i>✳</i>
        </div>
      </section>

      <section className="shop-section page-shell" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow">THE FIRST DROP / 001</p><h2>THE ROTATION</h2></div>
          <p className="section-heading__note">Small run. Heavy feel.<br />Find your uniform.</p>
        </div>
        <ProductCollection products={products} />
      </section>

      <section className="manifesto" id="story">
        <div className="manifesto__mark">38</div>
        <div className="manifesto__copy">
          <p className="eyebrow">A DIFFERENT KIND OF RICH</p>
          <h2>RICH IN<br /><span>THE WAY</span><br />YOU MOVE.</h2>
        </div>
        <p className="manifesto__aside">Not a flex. A feeling.<br />38 RICHES is for the ones<br />building their own lane.</p>
        <span className="manifesto__stamp">EST. 2026<br />MADE TO LAST</span>
      </section>

      <section className="details-strip page-shell" aria-label="Product details">
        <div><span>01</span><p>Heavyweight<br />280 GSM cotton</p></div>
        <div><span>02</span><p>Built to wear<br />Oversized fit</p></div>
        <div><span>03</span><p>Small-batch<br />Made with intent</p></div>
        <Link href="#shop">Find your piece <span aria-hidden="true">↗</span></Link>
      </section>
      <footer className="site-footer">
        <Link className="wordmark" href="/">38<span>R</span></Link>
        <p>© 2026 38 RICHES. MOVE DIFFERENT.</p>
        <Link href="/track">TRACK ORDER</Link>
        <Link href="/admin">ADMIN</Link>
        <a href="mailto:hello@38riches.com">CONTACT ↗</a>
      </footer>
    </main>
  );
}
