const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayDateOnlyUTC() {
  const wib = new Date(Date.now() + WIB_OFFSET_MS);
  return new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate())
  );
}

function addDaysUTC(base, days) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function atWib(startDateOnlyUTC, hour, minute = 0) {
  const d = new Date(startDateOnlyUTC);
  d.setUTCHours(hour - 7, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding database...");

  await prisma.mosqueSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      mosqueName: "Masjid Pondok Tahfizh Plus Abu Dzar",
      address: "Rumpin, Kabupaten Bogor, Jawa Barat",
      latitude: -6.442126,
      longitude: 106.640654,
      timezone: "Asia/Jakarta",
      mapUrl: "https://maps.app.goo.gl/aLWZpi1UhasHeHEP7",
      prayerCalculationMethod: "MWL",
      asrMethod: "STANDARD",
    },
  });

  await prisma.displaySetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      slideIntervalSeconds: 10,
      autoRotateEnabled: true,
      tickerSpeed: 50,
      tickerEnabled: true,
      showHijriDate: true,
    },
  });

  const iqamahSettings = [
    { prayerName: "Subuh", mode: "DELAY_MINUTES", delayMinutes: 20 },
    { prayerName: "Zuhur", mode: "DELAY_MINUTES", delayMinutes: 15 },
    { prayerName: "Asar", mode: "DELAY_MINUTES", delayMinutes: 15 },
    { prayerName: "Magrib", mode: "DELAY_MINUTES", delayMinutes: 5 },
    { prayerName: "Isya", mode: "DELAY_MINUTES", delayMinutes: 15 },
  ];

  for (const setting of iqamahSettings) {
    await prisma.iqamahSetting.upsert({
      where: { prayerName: setting.prayerName },
      update: {},
      create: setting,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "fauzi@abudzar.sch.id";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "masjidabudzar";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    // Jangan menimpa akun yang sudah ada. Seed hanya membuat akun awal;
    // reset password harus dilakukan lewat panel admin.
    update: {},
    create: {
      name: "Fauzi",
      email: adminEmail,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  if ((await prisma.runningText.count()) === 0) {
    const runningTexts = [
      "Selamat datang di Masjid Pondok Tahfizh Plus Abu Dzar - Rumpin, Bogor",
      "Mohon matikan atau senyapkan handphone saat shalat dan khutbah berlangsung",
      "Infak dan sedekah dapat disalurkan melalui kotak amal masjid",
    ];
    for (let i = 0; i < runningTexts.length; i++) {
      await prisma.runningText.create({
        data: { content: runningTexts[i], displayOrder: i, isActive: true },
      });
    }
  }

  if ((await prisma.islamicAdvice.count()) === 0) {
    const advice = [
      {
        content:
          "Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.",
        sourceReference: "QS. Al-Ankabut: 45",
        verificationStatus: "VERIFIED",
      },
      {
        content:
          "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.",
        sourceReference: "HR. Thabrani",
        verificationStatus: "UNVERIFIED",
      },
    ];
    for (let i = 0; i < advice.length; i++) {
      await prisma.islamicAdvice.create({
        data: { ...advice[i], displayOrder: i, isActive: true },
      });
    }
  }

  console.log("Seeding completed!");
  console.log("Default admin: fauzi@abudzar.sch.id");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
