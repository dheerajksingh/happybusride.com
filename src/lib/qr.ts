import QRCode from "qrcode";

export async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function buildTicketQRData(booking: {
  id: string;
  pnr: string;
  qrToken: string;
}): string {
  return JSON.stringify({
    pnr: booking.pnr,
    token: booking.qrToken,
    v: 1,
  });
}
