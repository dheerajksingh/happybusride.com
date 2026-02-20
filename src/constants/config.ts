export const APP_NAME = "HappyBusRide";
export const DEFAULT_COMMISSION_RATE = 10; // 10%
export const GST_RATE_PERCENT = 5; // 5% GST on bus fare
export const GST_ON_COMMISSION_PERCENT = 18; // 18% GST on commission
export const CONVENIENCE_FEE = 30; // ₹30 per booking
export const SEAT_LOCK_MINUTES = 5;
export const OTP_EXPIRY_MINUTES = 10;
export const MAX_SEATS_PER_BOOKING = 6;

export const BUS_TYPE_LABELS: Record<string, string> = {
  AC_SEATER: "AC Seater",
  NON_AC_SEATER: "Non-AC Seater",
  AC_SLEEPER: "AC Sleeper",
  NON_AC_SLEEPER: "Non-AC Sleeper",
  AC_SEMI_SLEEPER: "AC Semi-Sleeper",
  LUXURY: "Luxury",
};

export const AMENITY_ICONS: Record<string, string> = {
  wifi: "Wifi",
  charging: "Zap",
  blanket: "Layers",
  water: "Droplets",
  tv: "Monitor",
  ac: "Wind",
  toilet: "Building",
};
