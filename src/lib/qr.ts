import QRCode from "qrcode";

export async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 512,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Ticket QR payload (v2) — self-describing so any QR reader shows the ticket
 * details, while `token` lets the driver app verify authenticity server-side
 * (the token is secret; a forged QR with the right PNR but wrong token fails).
 * v1 payloads ({ pnr, token, v: 1 }) remain scannable — the driver app only
 * needs pnr + token.
 */
export function buildTicketQRData(booking: {
  pnr: string;
  qrToken: string;
  travellerName: string;
  travelDate: string;   // YYYY-MM-DD
  from: string;         // boarding stop / city
  to: string;           // disembarking stop / city
  seats: string;        // "12, 14"
  routeName: string;
  operatorName: string;
}): string {
  return JSON.stringify({
    v: 2,
    pnr: booking.pnr,
    token: booking.qrToken,
    name: booking.travellerName,
    date: booking.travelDate,
    from: booking.from,
    to: booking.to,
    seats: booking.seats,
    route: booking.routeName,
    operator: booking.operatorName,
  });
}
