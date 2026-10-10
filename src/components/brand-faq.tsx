const questions = [
  {
    question: "What sizes does 38 RICHES offer?",
    answer: "Available sizes vary by product. Check the size options on each product page before adding it to your bag.",
  },
  {
    question: "Does 38 RICHES ship outside Ghana?",
    answer: "Checkout currently accepts delivery addresses in Ghana. Contact 38 RICHES through the website support chat to ask whether an international order can be arranged.",
  },
  {
    question: "How does the 38 RICHES Fit Builder work?",
    answer: "Choose an available top and bottom, select a size for each, review the combined price, then add both pieces to your bag together.",
  },
  {
    question: "What material are 38 RICHES T-shirts made of?",
    answer: "Fabric varies by design. Product pages list each piece's material; selected tees use heavyweight 280 GSM cotton.",
  },
  {
    question: "How do I qualify for free shipping?",
    answer: "Ghana delivery is free when your discounted order subtotal is GH₵100 or more. Orders below that threshold have an GH₵8 shipping fee.",
  },
];

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: questions.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
}).replace(/</g, "\\u003c");

export default function BrandFaq() {
  return (
    <section className="brand-faq page-shell" aria-labelledby="brand-faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <div className="brand-faq__heading">
        <p className="eyebrow">THE DETAILS</p>
        <h2 id="brand-faq-title">Good to know.</h2>
      </div>
      <div className="brand-faq__list">
        {questions.map(({ question, answer }) => (
          <details key={question} className="brand-faq__item">
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
