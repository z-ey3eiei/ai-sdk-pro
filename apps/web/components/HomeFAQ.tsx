"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "What do I need installed?",
    answer:
      "Node.js 22 and pnpm 10.18.0 for local development. For self-hosting, use Docker Engine and Compose. To use the live chat, bring an API key from Anthropic, OpenAI, or Google. Provider API usage is billed to your own account.",
  },
  {
    question: "Is this an official Vercel product?",
    answer:
      "No. ai-sdk.pro is an independent platform built using Vercel AI SDK 6, Next.js, and Fumadocs. You can self-host it without using Vercel hosting.",
  },
  {
    question: "Where do my model keys live?",
    answer:
      "Your entered key stays in this page's memory, then travels over HTTPS to our server and your chosen provider for each request. It is not saved in browser storage, cookies, our database, logs, or messages. Use Forget key or close the page to clear it. We never lend out an owner key.",
  },
  {
    question: "Can I deploy to my own VPS?",
    answer:
      "Yes. The repository includes a standalone Docker image, Compose configuration, Caddy HTTPS proxy, and GitHub Actions example. You must configure your own server, domain, credentials, and registry before deployment. No VPS is connected automatically.",
  },
  {
    question: "Can it import, build, and deploy other repositories?",
    answer:
      "Sign in to Workspace to import authorized read-only repository snapshots. Learn offers downloadable starters and practical guides. Deploy buttons open DevStack for you to select and review the source; they do not upload keys or claim a completed deployment. In-app visitor build/deploy is not enabled.",
  },
];

export default function HomeFAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="faq-list">
      {faqs.map((faq, index) => (
        <div className="faq-item" key={faq.question}>
          <button
            aria-expanded={openFaq === index}
            aria-controls={`faq-${index}`}
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
          >
            <span>{faq.question}</span>
            <Plus
              size={20}
              className={openFaq === index ? "rotated" : ""}
            />
          </button>
          {openFaq === index && (
            <div id={`faq-${index}`} className="faq-answer">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
