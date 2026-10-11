import Script from "next/script";

export default function GoogleTag() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-18507081661"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-18507081661');
          gtag('config', 'G-MTSJWE7Y7');
        `}
      </Script>
    </>
  );
}
