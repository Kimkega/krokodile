import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type CertificateCard = {
  code: string;
  serial?: string | null;
  productName?: string | null;
  issuedTo?: string | null;
};

const COCOA: [number, number, number] = [43, 29, 18];
const GOLD: [number, number, number] = [201, 162, 39];
const CREAM: [number, number, number] = [246, 243, 238];

/** A4 page fits 2 x 3 cards at 85 x 85 mm. */
const CARD_W = 85;
const CARD_H = 85;
const MARGIN_X = 18;
const MARGIN_Y = 22;
const GAP = 6;

async function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 512,
    color: { dark: "#2B1D12", light: "#F6F3EE" },
  });
}

function drawCard(
  doc: jsPDF,
  card: CertificateCard,
  qr: string,
  x: number,
  y: number,
  brand: string,
  verifyBase: string,
) {
  doc.setFillColor(...COCOA);
  doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(x + 3, y + 3, CARD_W - 6, CARD_H - 6, 2, 2, "S");

  doc.setTextColor(...GOLD);
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text(brand.toUpperCase(), x + CARD_W / 2, y + 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...CREAM);
  doc.text("CERTIFICATE OF AUTHENTICITY", x + CARD_W / 2, y + 18.5, { align: "center" });

  doc.addImage(qr, "PNG", x + CARD_W / 2 - 17, y + 22, 34, 34);

  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(card.code, x + CARD_W / 2, y + 62, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...CREAM);
  let line = y + 67;
  if (card.productName) {
    doc.text(String(card.productName).slice(0, 40), x + CARD_W / 2, line, { align: "center" });
    line += 4;
  }
  if (card.serial) {
    doc.text(`Serial ${card.serial}`, x + CARD_W / 2, line, { align: "center" });
    line += 4;
  }

  doc.setFontSize(6);
  doc.setTextColor(190, 175, 150);
  doc.text(`Scan or verify at ${verifyBase}/verify`, x + CARD_W / 2, y + CARD_H - 6, { align: "center" });
}

export async function buildCertificatePdf(
  cards: CertificateCard[],
  opts: { brand: string; origin: string },
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const perRow = 2;
  const perPage = 6;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    if (i > 0 && i % perPage === 0) doc.addPage();
    const idx = i % perPage;
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);
    const x = MARGIN_X + col * (CARD_W + GAP);
    const y = MARGIN_Y + row * (CARD_H + GAP);
    const qr = await qrDataUrl(`${opts.origin}/verify?code=${card.code}`);
    drawCard(doc, card, qr, x, y, opts.brand, opts.origin.replace(/^https?:\/\//, ""));
  }
  return doc;
}

export async function downloadCertificatePdf(
  cards: CertificateCard[],
  opts: { brand: string; origin: string; filename?: string },
) {
  const doc = await buildCertificatePdf(cards, opts);
  doc.save(opts.filename ?? (cards.length === 1 ? `${cards[0]!.code}.pdf` : `authenticity-cards-${cards.length}.pdf`));
}
