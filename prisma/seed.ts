import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { addDays, startOfDay } from "date-fns";

const adapter = new PrismaPg({
  connectionString: "postgresql://dheerajsingh@localhost:5432/happybusride",
});
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Cities
  const cities = await Promise.all([
    prisma.city.upsert({ where: { name: "New Delhi" }, update: {}, create: { name: "New Delhi", state: "Delhi", code: "DEL" } }),
    prisma.city.upsert({ where: { name: "Mumbai" }, update: {}, create: { name: "Mumbai", state: "Maharashtra", code: "MUM" } }),
    prisma.city.upsert({ where: { name: "Bengaluru" }, update: {}, create: { name: "Bengaluru", state: "Karnataka", code: "BLR" } }),
    prisma.city.upsert({ where: { name: "Chennai" }, update: {}, create: { name: "Chennai", state: "Tamil Nadu", code: "CHE" } }),
    prisma.city.upsert({ where: { name: "Hyderabad" }, update: {}, create: { name: "Hyderabad", state: "Telangana", code: "HYD" } }),
    prisma.city.upsert({ where: { name: "Pune" }, update: {}, create: { name: "Pune", state: "Maharashtra", code: "PNE" } }),
    prisma.city.upsert({ where: { name: "Jaipur" }, update: {}, create: { name: "Jaipur", state: "Rajasthan", code: "JAI" } }),
    prisma.city.upsert({ where: { name: "Ahmedabad" }, update: {}, create: { name: "Ahmedabad", state: "Gujarat", code: "AMD" } }),
    prisma.city.upsert({ where: { name: "Kolkata" }, update: {}, create: { name: "Kolkata", state: "West Bengal", code: "CCU" } }),
    prisma.city.upsert({ where: { name: "Surat" }, update: {}, create: { name: "Surat", state: "Gujarat", code: "SRT" } }),
  ]);

  const [delhi, mumbai, bengaluru, chennai, hyderabad, pune, jaipur, ahmedabad] = cities;
  console.log("✅ Cities created");

  // 2. Admin user
  const adminPwd = await hash("Admin1234!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin User",
      passwordHash: adminPwd,
      role: "ADMIN",
      admin: { create: { permissions: ["manage_operators", "manage_refunds", "view_analytics", "manage_disputes"] } },
    },
  });
  console.log("✅ Admin created");

  // 3. Commission rule
  await prisma.commissionRule.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "Default Commission", defaultRate: 10, minCommission: 5, maxCommission: 15, gstRate: 18 },
  });

  // 4. Operator user
  const opPwd = await hash("Demo1234!", 10);
  const operatorUser = await prisma.user.upsert({
    where: { email: "operator@demo.com" },
    update: {},
    create: {
      email: "operator@demo.com",
      name: "Demo Travels",
      passwordHash: opPwd,
      role: "OPERATOR",
    },
  });

  const operator = await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {},
    create: {
      userId: operatorUser.id,
      companyName: "Demo Travels Pvt. Ltd.",
      gstNumber: "27AABCU9603R1ZP",
      panNumber: "AABCU9603R",
      registrationNo: "MH-DEMO-2024",
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: adminUser.id,
      commissionRate: 10,
      bankName: "HDFC Bank",
      bankAccountNo: "1234567890",
      bankIfsc: "HDFC0001234",
      bankAccountName: "Demo Travels Pvt Ltd",
    },
  });
  console.log("✅ Operator created");

  // 5. Driver user
  const drvPwd = await hash("Demo1234!", 10);
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@demo.com" },
    update: {},
    create: {
      email: "driver@demo.com",
      name: "Rajesh Kumar",
      passwordHash: drvPwd,
      role: "DRIVER",
    },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      operatorId: operator.id,
      licenseNumber: "DL-01-20190012345",
      licenseExpiry: new Date("2028-12-31"),
    },
  });
  console.log("✅ Driver created");

  // 6. Buses
  const seaterLayout = {
    rows: 10,
    columns: ["A", "B", "_", "C", "D"],
    deck: "lower",
  };

  const sleeperLayout = {
    rows: 9,
    columns: ["A", "_", "B"],
    decks: ["lower", "upper"],
  };

  const bus1 = await prisma.bus.upsert({
    where: { registrationNo: "MH-12-AB-1234" },
    update: {},
    create: {
      operatorId: operator.id,
      name: "Volvo B9R AC Seater",
      registrationNo: "MH-12-AB-1234",
      busType: "AC_SEATER",
      totalSeats: 40,
      amenities: ["wifi", "charging", "water", "ac"],
      layoutConfig: seaterLayout,
      imageUrls: [],
    },
  });

  const bus2 = await prisma.bus.upsert({
    where: { registrationNo: "MH-12-CD-5678" },
    update: {},
    create: {
      operatorId: operator.id,
      name: "Scania AC Sleeper",
      registrationNo: "MH-12-CD-5678",
      busType: "AC_SLEEPER",
      totalSeats: 36,
      amenities: ["wifi", "charging", "blanket", "water", "ac"],
      layoutConfig: sleeperLayout,
      imageUrls: [],
    },
  });

  const bus3 = await prisma.bus.upsert({
    where: { registrationNo: "KA-01-EF-9012" },
    update: {},
    create: {
      operatorId: operator.id,
      name: "Bharat Benz AC Seater",
      registrationNo: "KA-01-EF-9012",
      busType: "AC_SEATER",
      totalSeats: 40,
      amenities: ["charging", "water", "ac"],
      layoutConfig: seaterLayout,
      imageUrls: [],
    },
  });

  console.log("✅ Buses created");

  // 7. Generate seats for each bus
  async function generateSeats(bus: any, layout: any) {
    const existingCount = await prisma.seat.count({ where: { busId: bus.id } });
    if (existingCount > 0) return; // already seeded

    const columns = layout.columns.filter((c: string) => c !== "_");
    const decks = layout.decks ?? ["lower"];

    for (const deck of decks) {
      for (let row = 1; row <= layout.rows; row++) {
        for (const col of columns) {
          const seatNum = decks.length > 1
            ? `${deck === "upper" ? "U" : "L"}${row}${col}`
            : `${row}${col}`;

          const seatType = bus.busType.includes("SLEEPER")
            ? (deck === "upper" ? "UPPER" : "LOWER")
            : "SEATER";

          await prisma.seat.create({
            data: {
              busId: bus.id,
              seatNumber: seatNum,
              seatType,
              row,
              column: col,
              deck,
            },
          });
        }
      }
    }
  }

  await generateSeats(bus1, seaterLayout);
  await generateSeats(bus2, sleeperLayout);
  await generateSeats(bus3, seaterLayout);
  console.log("✅ Seats generated");

  // 8. Routes
  const route1 = await prisma.route.upsert({
    where: { id: "route-del-mum" },
    update: {},
    create: {
      id: "route-del-mum",
      operatorId: operator.id,
      fromCityId: delhi.id,
      toCityId: mumbai.id,
      name: "Delhi - Mumbai Express",
      distanceKm: 1450,
      durationMins: 1020, // 17h
      stops: {
        create: [
          { cityId: delhi.id, stopOrder: 1, stopName: "Kashmere Gate ISBT, New Delhi" },
          { cityId: jaipur.id, stopOrder: 2, stopName: "Sindhi Camp Bus Stand, Jaipur", arrivalOffset: 270, departureOffset: 285 },
          { cityId: ahmedabad.id, stopOrder: 3, stopName: "Geeta Mandir Bus Stand, Ahmedabad", arrivalOffset: 690, departureOffset: 705 },
          { cityId: mumbai.id, stopOrder: 4, stopName: "Mumbai Central, Mumbai", arrivalOffset: 1020 },
        ],
      },
    },
  });

  const route2 = await prisma.route.upsert({
    where: { id: "route-blr-che" },
    update: {},
    create: {
      id: "route-blr-che",
      operatorId: operator.id,
      fromCityId: bengaluru.id,
      toCityId: chennai.id,
      name: "Bengaluru - Chennai Express",
      distanceKm: 346,
      durationMins: 360, // 6h
      stops: {
        create: [
          { cityId: bengaluru.id, stopOrder: 1, stopName: "Majestic Bus Stand, Bengaluru" },
          { cityId: chennai.id, stopOrder: 2, stopName: "Chennai CMBT, Chennai", arrivalOffset: 360 },
        ],
      },
    },
  });

  const route3 = await prisma.route.upsert({
    where: { id: "route-hyd-pne" },
    update: {},
    create: {
      id: "route-hyd-pne",
      operatorId: operator.id,
      fromCityId: hyderabad.id,
      toCityId: pune.id,
      name: "Hyderabad - Pune Express",
      distanceKm: 560,
      durationMins: 480, // 8h
      stops: {
        create: [
          { cityId: hyderabad.id, stopOrder: 1, stopName: "Mahatma Gandhi Bus Station, Hyderabad" },
          { cityId: pune.id, stopOrder: 2, stopName: "Swargate Bus Stand, Pune", arrivalOffset: 480 },
        ],
      },
    },
  });

  console.log("✅ Routes created");

  // 9. Schedules
  const tomorrow8am = new Date();
  tomorrow8am.setDate(tomorrow8am.getDate() + 1);
  tomorrow8am.setHours(8, 0, 0, 0);

  const tomorrow10pm = new Date();
  tomorrow10pm.setDate(tomorrow10pm.getDate() + 1);
  tomorrow10pm.setHours(22, 0, 0, 0);

  const schedule1 = await prisma.schedule.upsert({
    where: { id: "sch-del-mum-morning" },
    update: {},
    create: {
      id: "sch-del-mum-morning",
      routeId: route1.id,
      busId: bus1.id,
      departureTime: tomorrow8am,
      arrivalTime: new Date(tomorrow8am.getTime() + 17 * 60 * 60 * 1000),
      recurrence: "DAILY",
      baseFare: 850,
      fareRules: { create: [{ seatType: "SEATER", price: 850 }] },
    },
  });

  const schedule2 = await prisma.schedule.upsert({
    where: { id: "sch-del-mum-night" },
    update: {},
    create: {
      id: "sch-del-mum-night",
      routeId: route1.id,
      busId: bus2.id,
      departureTime: tomorrow10pm,
      arrivalTime: new Date(tomorrow10pm.getTime() + 17 * 60 * 60 * 1000),
      recurrence: "DAILY",
      baseFare: 1200,
      fareRules: {
        create: [
          { seatType: "LOWER", price: 1200 },
          { seatType: "UPPER", price: 1000 },
        ],
      },
    },
  });

  const blrCheTime = new Date();
  blrCheTime.setDate(blrCheTime.getDate() + 1);
  blrCheTime.setHours(6, 0, 0, 0);

  const schedule3 = await prisma.schedule.upsert({
    where: { id: "sch-blr-che" },
    update: {},
    create: {
      id: "sch-blr-che",
      routeId: route2.id,
      busId: bus3.id,
      departureTime: blrCheTime,
      arrivalTime: new Date(blrCheTime.getTime() + 6 * 60 * 60 * 1000),
      recurrence: "DAILY",
      baseFare: 650,
      fareRules: { create: [{ seatType: "SEATER", price: 650 }] },
    },
  });

  const hydPneTime = new Date();
  hydPneTime.setDate(hydPneTime.getDate() + 1);
  hydPneTime.setHours(20, 0, 0, 0);

  const schedule4 = await prisma.schedule.upsert({
    where: { id: "sch-hyd-pne" },
    update: {},
    create: {
      id: "sch-hyd-pne",
      routeId: route3.id,
      busId: bus1.id,
      departureTime: hydPneTime,
      arrivalTime: new Date(hydPneTime.getTime() + 8 * 60 * 60 * 1000),
      recurrence: "DAILY",
      baseFare: 750,
      fareRules: { create: [{ seatType: "SEATER", price: 750 }] },
    },
  });

  console.log("✅ Schedules created");

  // 10. Generate trips for next 30 days
  const schedules = [schedule1, schedule2, schedule3, schedule4];
  for (const sched of schedules) {
    for (let d = 0; d <= 30; d++) {
      const travelDate = startOfDay(addDays(new Date(), d));
      try {
        await prisma.trip.upsert({
          where: { scheduleId_travelDate: { scheduleId: sched.id, travelDate } },
          update: {},
          create: {
            scheduleId: sched.id,
            travelDate,
            status: "SCHEDULED",
            driverId: driver.id,
          },
        });
      } catch {
        // ignore duplicates
      }
    }
  }
  console.log("✅ Trips generated (30 days)");

  // 11. Demo passenger
  const passengerUser = await prisma.user.upsert({
    where: { phone: "9999900001" },
    update: {},
    create: {
      phone: "9999900001",
      name: "Demo Passenger",
      role: "PASSENGER",
      phoneVerified: new Date(),
      walletBalance: 500,
    },
  });
  console.log("✅ Demo passenger created");

  console.log("\n🎉 Seed complete!\n");
  console.log("Demo accounts:");
  console.log("  Passenger: phone 9999900001, OTP: 123456");
  console.log("  Operator:  operator@demo.com / Demo1234!");
  console.log("  Driver:    driver@demo.com / Demo1234!");
  console.log("  Admin:     admin@demo.com / Admin1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
