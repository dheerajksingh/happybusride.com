import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { addDays, startOfDay } from "date-fns";

// TEMPORARY: One-time prod seeding endpoint. Remove immediately after use.
export async function POST(_req: NextRequest) {

  const results: string[] = [];

  // 1. Admin
  const adminPwd = await hash("Admin1234!", 10);
  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com", name: "Admin User", passwordHash: adminPwd, role: "ADMIN",
      admin: { create: { permissions: ["manage_operators", "manage_refunds", "view_analytics", "manage_disputes"] } },
    },
  });
  results.push("admin@demo.com");

  // 2. Commission rule
  await prisma.commissionRule.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "Default Commission", defaultRate: 10, minCommission: 5, maxCommission: 15, gstRate: 18 },
  });

  // 3. Operator
  const opPwd = await hash("Demo1234!", 10);
  const operatorUser = await prisma.user.upsert({
    where: { email: "operator@demo.com" },
    update: {},
    create: { email: "operator@demo.com", name: "Demo Travels", passwordHash: opPwd, role: "OPERATOR" },
  });
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@demo.com" } });
  const operator = await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {},
    create: {
      userId: operatorUser.id, companyName: "Demo Travels Pvt. Ltd.",
      gstNumber: "27AABCU9603R1ZP", panNumber: "AABCU9603R",
      registrationNo: "MH-DEMO-2024", status: "APPROVED",
      approvedAt: new Date(), approvedBy: adminUser!.id, commissionRate: 10,
      bankName: "HDFC Bank", bankAccountNo: "1234567890",
      bankIfsc: "HDFC0001234", bankAccountName: "Demo Travels Pvt Ltd",
    },
  });
  results.push("operator@demo.com");

  // 4. Driver
  const drvPwd = await hash("Demo1234!", 10);
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@demo.com" },
    update: {},
    create: { email: "driver@demo.com", name: "Rajesh Kumar", passwordHash: drvPwd, role: "DRIVER" },
  });
  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: { userId: driverUser.id, operatorId: operator.id, licenseNumber: "DL-01-20190012345", licenseExpiry: new Date("2028-12-31") },
  });
  results.push("driver@demo.com");

  // 5. Buses
  const seaterLayout = { rows: 10, columns: ["A", "B", "_", "C", "D"], deck: "lower" };
  const sleeperLayout = { rows: 9, columns: ["A", "_", "B"], decks: ["lower", "upper"] };

  const bus1 = await prisma.bus.upsert({
    where: { registrationNo: "MH-12-AB-1234" }, update: {},
    create: { operatorId: operator.id, name: "Volvo B9R AC Seater", registrationNo: "MH-12-AB-1234", busType: "AC_SEATER", totalSeats: 40, amenities: ["wifi", "charging", "water", "ac"], layoutConfig: seaterLayout, imageUrls: [] },
  });
  const bus2 = await prisma.bus.upsert({
    where: { registrationNo: "MH-12-CD-5678" }, update: {},
    create: { operatorId: operator.id, name: "Scania AC Sleeper", registrationNo: "MH-12-CD-5678", busType: "AC_SLEEPER", totalSeats: 36, amenities: ["wifi", "charging", "blanket", "water", "ac"], layoutConfig: sleeperLayout, imageUrls: [] },
  });
  const bus3 = await prisma.bus.upsert({
    where: { registrationNo: "KA-01-EF-9012" }, update: {},
    create: { operatorId: operator.id, name: "Bharat Benz AC Seater", registrationNo: "KA-01-EF-9012", busType: "AC_SEATER", totalSeats: 40, amenities: ["charging", "water", "ac"], layoutConfig: seaterLayout, imageUrls: [] },
  });
  results.push("3 buses");

  // 6. Seats
  async function generateSeats(bus: { id: string; busType: string }, layout: { rows: number; columns: string[]; deck?: string; decks?: string[] }) {
    const existingCount = await prisma.seat.count({ where: { busId: bus.id } });
    if (existingCount > 0) return;
    const columns = layout.columns.filter((c) => c !== "_");
    const decks = layout.decks ?? ["lower"];
    for (const deck of decks) {
      for (let row = 1; row <= layout.rows; row++) {
        for (const col of columns) {
          const seatNum = decks.length > 1 ? `${deck === "upper" ? "U" : "L"}${row}${col}` : `${row}${col}`;
          const seatType = bus.busType.includes("SLEEPER") ? (deck === "upper" ? "UPPER" : "LOWER") : "SEATER";
          await prisma.seat.create({ data: { busId: bus.id, seatNumber: seatNum, seatType: seatType as any, row, column: col, deck } });
        }
      }
    }
  }
  await generateSeats(bus1, seaterLayout);
  await generateSeats(bus2, sleeperLayout);
  await generateSeats(bus3, seaterLayout);
  results.push("seats generated");

  // 7. Routes + schedules + trips (only if cities exist)
  const [delhi, mumbai, bengaluru, chennai, hyderabad, pune, jaipur, ahmedabad] = await Promise.all([
    prisma.city.findUnique({ where: { name_state: { name: "New Delhi", state: "Delhi" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Mumbai", state: "Maharashtra" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Bengaluru", state: "Karnataka" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Chennai", state: "Tamil Nadu" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Hyderabad", state: "Telangana" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Pune", state: "Maharashtra" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Jaipur", state: "Rajasthan" } } }),
    prisma.city.findUnique({ where: { name_state: { name: "Ahmedabad", state: "Gujarat" } } }),
  ]);

  if (!delhi || !mumbai || !bengaluru || !chennai || !hyderabad || !pune || !jaipur || !ahmedabad) {
    results.push("⚠️ Routes/schedules/trips skipped — upload cities CSV first, then re-run seed");
  } else {
    const route1 = await prisma.route.upsert({ where: { id: "route-del-mum" }, update: {}, create: { id: "route-del-mum", operatorId: operator.id, fromCityId: delhi.id, toCityId: mumbai.id, name: "Delhi - Mumbai Express", distanceKm: 1450, durationMins: 1020, stops: { create: [{ cityId: delhi.id, stopOrder: 1, stopName: "Kashmere Gate ISBT, New Delhi" }, { cityId: jaipur.id, stopOrder: 2, stopName: "Sindhi Camp Bus Stand, Jaipur", arrivalOffset: 270, departureOffset: 285 }, { cityId: ahmedabad.id, stopOrder: 3, stopName: "Geeta Mandir Bus Stand, Ahmedabad", arrivalOffset: 690, departureOffset: 705 }, { cityId: mumbai.id, stopOrder: 4, stopName: "Mumbai Central, Mumbai", arrivalOffset: 1020 }] } } });
    const route2 = await prisma.route.upsert({ where: { id: "route-blr-che" }, update: {}, create: { id: "route-blr-che", operatorId: operator.id, fromCityId: bengaluru.id, toCityId: chennai.id, name: "Bengaluru - Chennai Express", distanceKm: 346, durationMins: 360, stops: { create: [{ cityId: bengaluru.id, stopOrder: 1, stopName: "Majestic Bus Stand, Bengaluru" }, { cityId: chennai.id, stopOrder: 2, stopName: "Chennai CMBT, Chennai", arrivalOffset: 360 }] } } });
    const route3 = await prisma.route.upsert({ where: { id: "route-hyd-pne" }, update: {}, create: { id: "route-hyd-pne", operatorId: operator.id, fromCityId: hyderabad.id, toCityId: pune.id, name: "Hyderabad - Pune Express", distanceKm: 560, durationMins: 480, stops: { create: [{ cityId: hyderabad.id, stopOrder: 1, stopName: "Mahatma Gandhi Bus Station, Hyderabad" }, { cityId: pune.id, stopOrder: 2, stopName: "Swargate Bus Stand, Pune", arrivalOffset: 480 }] } } });
    results.push("3 routes");

    const t8am = new Date(); t8am.setDate(t8am.getDate() + 1); t8am.setHours(8, 0, 0, 0);
    const t10pm = new Date(); t10pm.setDate(t10pm.getDate() + 1); t10pm.setHours(22, 0, 0, 0);
    const t6am  = new Date(); t6am.setDate(t6am.getDate() + 1);   t6am.setHours(6, 0, 0, 0);
    const t8pm  = new Date(); t8pm.setDate(t8pm.getDate() + 1);   t8pm.setHours(20, 0, 0, 0);

    const sch1 = await prisma.schedule.upsert({ where: { id: "sch-del-mum-morning" }, update: {}, create: { id: "sch-del-mum-morning", routeId: route1.id, busId: bus1.id, departureTime: t8am, arrivalTime: new Date(t8am.getTime() + 17 * 3600000), recurrence: "DAILY", baseFare: 850, fareRules: { create: [{ seatType: "SEATER", price: 850 }] } } });
    const sch2 = await prisma.schedule.upsert({ where: { id: "sch-del-mum-night" }, update: {}, create: { id: "sch-del-mum-night", routeId: route1.id, busId: bus2.id, departureTime: t10pm, arrivalTime: new Date(t10pm.getTime() + 17 * 3600000), recurrence: "DAILY", baseFare: 1200, fareRules: { create: [{ seatType: "LOWER", price: 1200 }, { seatType: "UPPER", price: 1000 }] } } });
    const sch3 = await prisma.schedule.upsert({ where: { id: "sch-blr-che" }, update: {}, create: { id: "sch-blr-che", routeId: route2.id, busId: bus3.id, departureTime: t6am, arrivalTime: new Date(t6am.getTime() + 6 * 3600000), recurrence: "DAILY", baseFare: 650, fareRules: { create: [{ seatType: "SEATER", price: 650 }] } } });
    const sch4 = await prisma.schedule.upsert({ where: { id: "sch-hyd-pne" }, update: {}, create: { id: "sch-hyd-pne", routeId: route3.id, busId: bus1.id, departureTime: t8pm, arrivalTime: new Date(t8pm.getTime() + 8 * 3600000), recurrence: "DAILY", baseFare: 750, fareRules: { create: [{ seatType: "SEATER", price: 750 }] } } });
    results.push("4 schedules");

    for (const sched of [sch1, sch2, sch3, sch4]) {
      for (let d = 0; d <= 30; d++) {
        const travelDate = startOfDay(addDays(new Date(), d));
        await prisma.trip.upsert({
          where: { scheduleId_travelDate: { scheduleId: sched.id, travelDate } },
          update: {},
          create: { scheduleId: sched.id, travelDate, status: "SCHEDULED", driverId: driver.id },
        }).catch(() => {});
      }
    }
    results.push("trips for 30 days");
  }

  // 8. Demo passenger
  await prisma.user.upsert({
    where: { phone: "9999900001" }, update: {},
    create: { phone: "9999900001", name: "Demo Passenger", role: "PASSENGER", phoneVerified: new Date(), walletBalance: 500 },
  });
  results.push("passenger 9999900001");

  return NextResponse.json({ seeded: results });
}
