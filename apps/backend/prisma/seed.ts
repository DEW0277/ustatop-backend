import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const regions = [
  { code: 'TAS', nameUz: 'Toshkent shahri', nameRu: 'г. Ташкент' },
  { code: 'TAS_V', nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область' },
  { code: 'AND', nameUz: 'Andijon viloyati', nameRu: 'Андижанская область' },
  { code: 'FAR', nameUz: "Farg'ona viloyati", nameRu: 'Ферганская область' },
  { code: 'NAM', nameUz: 'Namangan viloyati', nameRu: 'Наманганская область' },
  { code: 'SAM', nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область' },
  { code: 'BUX', nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область' },
  { code: 'XOR', nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область' },
  { code: 'QAS', nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область' },
  { code: 'SUR', nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область' },
  { code: 'NAV', nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область' },
  { code: 'JIZ', nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область' },
  { code: 'SIR', nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область' },
  { code: 'QOR', nameUz: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан' },
] as const;

// To'liq tuman ro'yxati hozircha faqat Toshkent shahri uchun kiritilgan (namuna sifatida).
// Qolgan 13 viloyatning tumanlarini to'ldirish — Gemini uchun keyingi vazifa (docs/TZ.md §7.1).
const tashkentCityDistricts = [
  { nameUz: 'Bektemir tumani', nameRu: 'Бектемирский район' },
  { nameUz: 'Chilonzor tumani', nameRu: 'Чиланзарский район' },
  { nameUz: "Mirzo Ulug'bek tumani", nameRu: 'Мирзо-Улугбекский район' },
  { nameUz: 'Mirobod tumani', nameRu: 'Мирабадский район' },
  { nameUz: 'Olmazor tumani', nameRu: 'Алмазарский район' },
  { nameUz: 'Sergeli tumani', nameRu: 'Сергелийский район' },
  { nameUz: 'Shayxontohur tumani', nameRu: 'Шайхантахурский район' },
  { nameUz: 'Uchtepa tumani', nameRu: 'Учтепинский район' },
  { nameUz: 'Yakkasaroy tumani', nameRu: 'Яккасарайский район' },
  { nameUz: 'Yashnobod tumani', nameRu: 'Яшнабадский район' },
  { nameUz: 'Yunusobod tumani', nameRu: 'Юнусабадский район' },
];

const categories = [
  {
    slug: 'electrician',
    nameUz: 'Elektrik xizmati',
    nameRu: 'Услуги электрика',
    icon: 'flash-outline',
    description: "Elektr montaj, rozetka va qisqa tutashuvlarni tuzatish",
  },
  {
    slug: 'plumber',
    nameUz: 'Santexnik xizmati',
    nameRu: 'Услуги сантехника',
    icon: 'water-outline',
    description: 'Suv, kanalizatsiya va isitish tizimlarini o\'rnatish/ta\'mirlash',
  },
  {
    slug: 'appliance-repair',
    nameUz: 'Maishiy texnika ta\'miri',
    nameRu: 'Ремонт бытовой техники',
    icon: 'build-outline',
    description: 'Muzlatgich, kir yuvish mashinasi va boshqa texnikalarni ta\'mirlash',
  },
  {
    slug: 'construction',
    nameUz: 'Qurilish va ta\'mirlash',
    nameRu: 'Строительство и ремонт',
    icon: 'construct-outline',
    description: "Ta'mirlash, pardozlash va qurilish ishlari",
  },
  {
    slug: 'auto-mechanic',
    nameUz: 'Avtousta xizmati',
    nameRu: 'Услуги автомеханика',
    icon: 'car-outline',
    description: "Avtomobillarni diagnostika qilish va ta'mirlash",
  },
  {
    slug: 'cleaning',
    nameUz: 'Tozalash xizmati',
    nameRu: 'Клининговые услуги',
    icon: 'sparkles-outline',
    description: "Uy va ofislarni professional tozalash",
  },
  {
    slug: 'furniture',
    nameUz: 'Mebel yig\'ish va ta\'mirlash',
    nameRu: 'Сборка и ремонт мебели',
    icon: 'hammer-outline',
    description: "Mebellarni yig'ish, ta'mirlash va o'rnatish",
  },
  {
    slug: 'ac-repair',
    nameUz: 'Konditsioner ustasi',
    nameRu: 'Мастер по кондиционерам',
    icon: 'snow-outline',
    description: "Konditsionerlarni o'rnatish, tozalash va ta'mirlash",
  },
];

async function main() {
  console.log('Seeding regions...');
  const tashkentCity = await prisma.region.upsert({
    where: { code: regions[0].code },
    update: {},
    create: regions[0],
  });

  for (const region of regions.slice(1)) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    });
  }

  console.log('Seeding Toshkent shahri districts...');
  for (const district of tashkentCityDistricts) {
    const existing = await prisma.district.findFirst({
      where: { regionId: tashkentCity.id, nameUz: district.nameUz },
    });
    if (!existing) {
      await prisma.district.create({
        data: { ...district, regionId: tashkentCity.id },
      });
    }
  }

  console.log('Seeding categories...');
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
