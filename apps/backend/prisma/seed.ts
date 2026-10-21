import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { seedReferenceData } from './seed-reference.js';

const prisma = new PrismaClient();

// `src/common/crypto/password.ts`dagi `hashPassword` bilan AYNAN bir xil format (`scrypt$salt$hash`).
// Production image'da `src/` yo'q, shuning uchun import qilib bo'lmaydi — o'zgartirsangiz ikkalasini birga.
function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

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

type DistrictSeed = { nameUz: string; nameRu: string };

const districtsByRegionCode: Record<string, DistrictSeed[]> = {
  TAS: [
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
    { nameUz: 'Yangihayot tumani', nameRu: 'Янгихаётский район' },
  ],
  TAS_V: [
    { nameUz: 'Angren shahri', nameRu: 'г. Ангрен' },
    { nameUz: 'Bekobod shahri', nameRu: 'г. Бекабад' },
    { nameUz: 'Chirchiq shahri', nameRu: 'г. Чирчик' },
    { nameUz: 'Nurafshon shahri', nameRu: 'г. Нурафшан' },
    { nameUz: 'Olmaliq shahri', nameRu: 'г. Алмалык' },
    { nameUz: 'Ohangaron shahri', nameRu: 'г. Ахангаран' },
    { nameUz: "Yangiyo'l shahri", nameRu: 'г. Янгиюль' },
    { nameUz: 'Bekobod tumani', nameRu: 'Бекабадский район' },
    { nameUz: "Bo'stonliq tumani", nameRu: 'Бостанлыкский район' },
    { nameUz: "Bo'ka tumani", nameRu: 'Букинский район' },
    { nameUz: 'Chinoz tumani', nameRu: 'Чиназский район' },
    { nameUz: 'Qibray tumani', nameRu: 'Кибрайский район' },
    { nameUz: 'Ohangaron tumani', nameRu: 'Ахангаранский район' },
    { nameUz: "Oqqo'rg'on tumani", nameRu: 'Аккурганский район' },
    { nameUz: 'Parkent tumani', nameRu: 'Паркентский район' },
    { nameUz: 'Piskent tumani', nameRu: 'Пскентский район' },
    { nameUz: 'Quyi Chirchiq tumani', nameRu: 'Куйичирчикский район' },
    { nameUz: "O'rta Chirchiq tumani", nameRu: 'Уртачирчикский район' },
    { nameUz: 'Toshkent tumani', nameRu: 'Ташкентский район' },
    { nameUz: "Yangiyo'l tumani", nameRu: 'Янгиюльский район' },
    { nameUz: 'Yuqori Chirchiq tumani', nameRu: 'Юкоричирчикский район' },
    { nameUz: 'Zangiota tumani', nameRu: 'Зангиатинский район' },
  ],
  AND: [
    { nameUz: 'Andijon shahri', nameRu: 'г. Андижан' },
    { nameUz: 'Xonobod shahri', nameRu: 'г. Ханабад' },
    { nameUz: 'Andijon tumani', nameRu: 'Андижанский район' },
    { nameUz: 'Asaka tumani', nameRu: 'Асакинский район' },
    { nameUz: 'Baliqchi tumani', nameRu: 'Балыкчинский район' },
    { nameUz: "Bo'ston tumani", nameRu: 'Бозский район' },
    { nameUz: 'Buloqboshi tumani', nameRu: 'Булакбашинский район' },
    { nameUz: 'Izboskan tumani', nameRu: 'Избасканский район' },
    { nameUz: 'Jalaquduq tumani', nameRu: 'Джалакудукский район' },
    { nameUz: 'Marhamat tumani', nameRu: 'Мархаматский район' },
    { nameUz: "Oltinko'l tumani", nameRu: 'Алтынкульский район' },
    { nameUz: 'Paxtaobod tumani', nameRu: 'Пахтаабадский район' },
    { nameUz: "Qo'rg'ontepa tumani", nameRu: 'Кургантепинский район' },
    { nameUz: 'Shahrixon tumani', nameRu: 'Шахриханский район' },
    { nameUz: "Ulug'nor tumani", nameRu: 'Улугнорский район' },
    { nameUz: "Xo'jaobod tumani", nameRu: 'Ходжаабадский район' },
  ],
  FAR: [
    { nameUz: "Farg'ona shahri", nameRu: 'г. Фергана' },
    { nameUz: "Marg'ilon shahri", nameRu: 'г. Маргилан' },
    { nameUz: "Qo'qon shahri", nameRu: 'г. Коканд' },
    { nameUz: 'Quvasoy shahri', nameRu: 'г. Кувасай' },
    { nameUz: 'Beshariq tumani', nameRu: 'Бешарыкский район' },
    { nameUz: "Bog'dod tumani", nameRu: 'Багдадский район' },
    { nameUz: 'Buvayda tumani', nameRu: 'Бувайдинский район' },
    { nameUz: "Dang'ara tumani", nameRu: 'Дангаринский район' },
    { nameUz: "Farg'ona tumani", nameRu: 'Ферганский район' },
    { nameUz: 'Furqat tumani', nameRu: 'Фуркатский район' },
    { nameUz: 'Oltiariq tumani', nameRu: 'Алтыарыкский район' },
    { nameUz: "Qo'shtepa tumani", nameRu: 'Куштепинский район' },
    { nameUz: 'Quva tumani', nameRu: 'Кувинский район' },
    { nameUz: 'Rishton tumani', nameRu: 'Риштанский район' },
    { nameUz: "So'x tumani", nameRu: 'Сохский район' },
    { nameUz: 'Toshloq tumani', nameRu: 'Ташлакский район' },
    { nameUz: "Uchko'prik tumani", nameRu: 'Учкуприкский район' },
    { nameUz: "O'zbekiston tumani", nameRu: 'Узбекистанский район' },
    { nameUz: 'Yozyovon tumani', nameRu: 'Язъяванский район' },
  ],
  NAM: [
    { nameUz: 'Namangan shahri', nameRu: 'г. Наманган' },
    { nameUz: 'Chortoq tumani', nameRu: 'Чартакский район' },
    { nameUz: 'Chust tumani', nameRu: 'Чустский район' },
    { nameUz: 'Davlatobod tumani', nameRu: 'Давлатабадский район' },
    { nameUz: 'Kosonsoy tumani', nameRu: 'Касансайский район' },
    { nameUz: 'Mingbuloq tumani', nameRu: 'Мингбулакский район' },
    { nameUz: 'Namangan tumani', nameRu: 'Наманганский район' },
    { nameUz: 'Norin tumani', nameRu: 'Нарынский район' },
    { nameUz: 'Pop tumani', nameRu: 'Папский район' },
    { nameUz: "To'raqo'rg'on tumani", nameRu: 'Туракурганский район' },
    { nameUz: "Uchqo'rg'on tumani", nameRu: 'Учкурганский район' },
    { nameUz: 'Uychi tumani', nameRu: 'Уйчинский район' },
    { nameUz: 'Yangi Namangan tumani', nameRu: 'Янги Наманганский район' },
    { nameUz: "Yangiqo'rg'on tumani", nameRu: 'Янгикурганский район' },
  ],
  SAM: [
    { nameUz: 'Samarqand shahri', nameRu: 'г. Самарканд' },
    { nameUz: "Kattaqo'rg'on shahri", nameRu: 'г. Каттакурган' },
    { nameUz: "Bulung'ur tumani", nameRu: 'Булунгурский район' },
    { nameUz: 'Ishtixon tumani', nameRu: 'Иштыханский район' },
    { nameUz: 'Jomboy tumani', nameRu: 'Джамбайский район' },
    { nameUz: "Kattaqo'rg'on tumani", nameRu: 'Каттакурганский район' },
    { nameUz: 'Narpay tumani', nameRu: 'Нарпайский район' },
    { nameUz: 'Nurobod tumani', nameRu: 'Нурабадский район' },
    { nameUz: 'Oqdaryo tumani', nameRu: 'Акдарьинский район' },
    { nameUz: "Pastdarg'om tumani", nameRu: 'Пастдаргомский район' },
    { nameUz: 'Paxtachi tumani', nameRu: 'Пахтачийский район' },
    { nameUz: 'Payariq tumani', nameRu: 'Пайарыкский район' },
    { nameUz: "Qo'shrabot tumani", nameRu: 'Кошрабадский район' },
    { nameUz: 'Samarqand tumani', nameRu: 'Самаркандский район' },
    { nameUz: 'Toyloq tumani', nameRu: 'Тайлакский район' },
    { nameUz: 'Urgut tumani', nameRu: 'Ургутский район' },
  ],
  BUX: [
    { nameUz: 'Buxoro shahri', nameRu: 'г. Бухара' },
    { nameUz: 'Kogon shahri', nameRu: 'г. Каган' },
    { nameUz: 'Buxoro tumani', nameRu: 'Бухарский район' },
    { nameUz: "G'ijduvon tumani", nameRu: 'Гиждуванский район' },
    { nameUz: 'Jondor tumani', nameRu: 'Жондорский район' },
    { nameUz: 'Kogon tumani', nameRu: 'Каганский район' },
    { nameUz: "Qorako'l tumani", nameRu: 'Каракульский район' },
    { nameUz: 'Qorovulbozor tumani', nameRu: 'Караулбазарский район' },
    { nameUz: 'Olot tumani', nameRu: 'Алатский район' },
    { nameUz: 'Peshku tumani', nameRu: 'Пешкунский район' },
    { nameUz: 'Romitan tumani', nameRu: 'Ромитанский район' },
    { nameUz: 'Shofirkon tumani', nameRu: 'Шафирканский район' },
    { nameUz: 'Vobkent tumani', nameRu: 'Вабкентский район' },
  ],
  XOR: [
    { nameUz: 'Urganch shahri', nameRu: 'г. Ургенч' },
    { nameUz: 'Xiva shahri', nameRu: 'г. Хива' },
    { nameUz: "Bog'ot tumani", nameRu: 'Багатский район' },
    { nameUz: 'Gurlan tumani', nameRu: 'Гурленский район' },
    { nameUz: 'Hazorasp tumani', nameRu: 'Хазараспский район' },
    { nameUz: "Qo'shko'pir tumani", nameRu: 'Кошкупырский район' },
    { nameUz: 'Shovot tumani', nameRu: 'Шаватский район' },
    { nameUz: "Tuproqqal'a tumani", nameRu: 'Тупраккалинский район' },
    { nameUz: 'Urganch tumani', nameRu: 'Ургенчский район' },
    { nameUz: 'Xiva tumani', nameRu: 'Хивинский район' },
    { nameUz: 'Xonqa tumani', nameRu: 'Ханкинский район' },
    { nameUz: 'Yangiariq tumani', nameRu: 'Янгиарыкский район' },
    { nameUz: 'Yangibozor tumani', nameRu: 'Янгибазарский район' },
  ],
  QAS: [
    { nameUz: 'Qarshi shahri', nameRu: 'г. Карши' },
    { nameUz: 'Shahrisabz shahri', nameRu: 'г. Шахрисабз' },
    { nameUz: 'Chiroqchi tumani', nameRu: 'Чиракчинский район' },
    { nameUz: 'Dehqonobod tumani', nameRu: 'Дехканабадский район' },
    { nameUz: "G'uzor tumani", nameRu: 'Гузарский район' },
    { nameUz: 'Kasbi tumani', nameRu: 'Касбинский район' },
    { nameUz: 'Kitob tumani', nameRu: 'Китабский район' },
    { nameUz: 'Koson tumani', nameRu: 'Касанский район' },
    { nameUz: "Ko'kdala tumani", nameRu: 'Кукдалинский район' },
    { nameUz: 'Mirishkor tumani', nameRu: 'Миришкорский район' },
    { nameUz: 'Muborak tumani', nameRu: 'Мубарекский район' },
    { nameUz: 'Nishon tumani', nameRu: 'Нишанский район' },
    { nameUz: 'Qamashi tumani', nameRu: 'Камашинский район' },
    { nameUz: 'Qarshi tumani', nameRu: 'Каршинский район' },
    { nameUz: 'Shahrisabz tumani', nameRu: 'Шахрисабзский район' },
    { nameUz: "Yakkabog' tumani", nameRu: 'Яккабагский район' },
  ],
  SUR: [
    { nameUz: 'Termiz shahri', nameRu: 'г. Термез' },
    { nameUz: 'Angor tumani', nameRu: 'Ангорский район' },
    { nameUz: 'Bandixon tumani', nameRu: 'Бандиханский район' },
    { nameUz: 'Boysun tumani', nameRu: 'Байсунский район' },
    { nameUz: 'Denov tumani', nameRu: 'Денауский район' },
    { nameUz: "Jarqo'rg'on tumani", nameRu: 'Джаркурганский район' },
    { nameUz: 'Muzrabot tumani', nameRu: 'Музрабадский район' },
    { nameUz: 'Oltinsoy tumani', nameRu: 'Алтынсайский район' },
    { nameUz: 'Qiziriq tumani', nameRu: 'Кизирикский район' },
    { nameUz: "Qumqo'rg'on tumani", nameRu: 'Кумкурганский район' },
    { nameUz: 'Sariosiyo tumani', nameRu: 'Сариасийский район' },
    { nameUz: 'Sherobod tumani', nameRu: 'Шерабадский район' },
    { nameUz: "Sho'rchi tumani", nameRu: 'Шурчинский район' },
    { nameUz: 'Termiz tumani', nameRu: 'Термезский район' },
    { nameUz: 'Uzun tumani', nameRu: 'Узунский район' },
  ],
  NAV: [
    { nameUz: 'Navoiy shahri', nameRu: 'г. Навои' },
    { nameUz: 'Zarafshon shahri', nameRu: 'г. Зарафшан' },
    { nameUz: 'Karmana tumani', nameRu: 'Карманинский район' },
    { nameUz: 'Konimex tumani', nameRu: 'Канимехский район' },
    { nameUz: 'Navbahor tumani', nameRu: 'Навбахорский район' },
    { nameUz: 'Nurota tumani', nameRu: 'Нуратинский район' },
    { nameUz: 'Qiziltepa tumani', nameRu: 'Кызылтепинский район' },
    { nameUz: 'Tomdi tumani', nameRu: 'Тамдынский район' },
    { nameUz: 'Uchquduq tumani', nameRu: 'Учкудукский район' },
    { nameUz: 'Xatirchi tumani', nameRu: 'Хатырчинский район' },
  ],
  JIZ: [
    { nameUz: 'Jizzax shahri', nameRu: 'г. Джизак' },
    { nameUz: 'Arnasoy tumani', nameRu: 'Арнасайский район' },
    { nameUz: 'Baxmal tumani', nameRu: 'Бахмальский район' },
    { nameUz: "Do'stlik tumani", nameRu: 'Дустликский район' },
    { nameUz: 'Forish tumani', nameRu: 'Фаришский район' },
    { nameUz: "G'allaorol tumani", nameRu: 'Галляаральский район' },
    { nameUz: "Mirzacho'l tumani", nameRu: 'Мирзачульский район' },
    { nameUz: 'Paxtakor tumani', nameRu: 'Пахтакорский район' },
    { nameUz: 'Sharof Rashidov tumani', nameRu: 'Шароф-Рашидовский район' },
    { nameUz: 'Yangiobod tumani', nameRu: 'Янгиабадский район' },
    { nameUz: 'Zafarobod tumani', nameRu: 'Зафарабадский район' },
    { nameUz: 'Zarbdor tumani', nameRu: 'Зарбдарский район' },
    { nameUz: 'Zomin tumani', nameRu: 'Зааминский район' },
  ],
  SIR: [
    { nameUz: 'Guliston shahri', nameRu: 'г. Гулистан' },
    { nameUz: 'Shirin shahri', nameRu: 'г. Ширин' },
    { nameUz: 'Yangiyer shahri', nameRu: 'г. Янгиер' },
    { nameUz: 'Boyovut tumani', nameRu: 'Баяутский район' },
    { nameUz: 'Guliston tumani', nameRu: 'Гулистанский район' },
    { nameUz: 'Mirzaobod tumani', nameRu: 'Мирзаабадский район' },
    { nameUz: 'Oqoltin tumani', nameRu: 'Акалтынский район' },
    { nameUz: 'Sardoba tumani', nameRu: 'Сардобинский район' },
    { nameUz: 'Sayxunobod tumani', nameRu: 'Сайхунабадский район' },
    { nameUz: 'Sirdaryo tumani', nameRu: 'Сырдарьинская область' },
    { nameUz: 'Xovos tumani', nameRu: 'Хавастский район' },
  ],
  QOR: [
    { nameUz: 'Nukus shahri', nameRu: 'г. Нукус' },
    { nameUz: 'Amudaryo tumani', nameRu: 'Амударьинский район' },
    { nameUz: 'Beruniy tumani', nameRu: 'Берунийский район' },
    { nameUz: "Bo'zatov tumani", nameRu: 'Бозатауский район' },
    { nameUz: 'Chimboy tumani', nameRu: 'Чимбайский район' },
    { nameUz: "Ellikqal'a tumani", nameRu: 'Элликкалинский район' },
    { nameUz: 'Kegeyli tumani', nameRu: 'Кегейлийский район' },
    { nameUz: "Mo'ynoq tumani", nameRu: 'Муйнакский район' },
    { nameUz: 'Nukus tumani', nameRu: 'Нукусский район' },
    { nameUz: "Qanliko'l tumani", nameRu: 'Канлыкульский район' },
    { nameUz: "Qo'ng'irot tumani", nameRu: 'Кунградский район' },
    { nameUz: "Qorao'zak tumani", nameRu: 'Караузякский район' },
    { nameUz: 'Shumanay tumani', nameRu: 'Шуманайский район' },
    { nameUz: "Taxtako'pir tumani", nameRu: 'Тахтакупырский район' },
    { nameUz: 'Taxiatosh tumani', nameRu: 'Тахиаташский район' },
    { nameUz: "To'rtko'l tumani", nameRu: 'Турткульский район' },
    { nameUz: "Xo'jayli tumani", nameRu: 'Ходжейлийский район' },
  ],
};

const categories = [
  {
    slug: 'electrician',
    nameUz: 'Elektrik xizmati',
    nameRu: 'Услуги электрика',
    icon: 'flash-outline',
    description: 'Elektr montaj, rozetka va qisqa tutashuvlarni tuzatish',
  },
  {
    slug: 'plumber',
    nameUz: 'Santexnik xizmati',
    nameRu: 'Услуги сантехника',
    icon: 'water-outline',
    description: "Suv, kanalizatsiya va isitish tizimlarini o'rnatish/ta'mirlash",
  },
  {
    slug: 'appliance-repair',
    nameUz: "Maishiy texnika ta'miri",
    nameRu: 'Ремонт бытовой техники',
    icon: 'build-outline',
    description: "Muzlatgich, kir yuvish mashinasi va boshqa texnikalarni ta'mirlash",
  },
  {
    slug: 'construction',
    nameUz: "Qurilish va ta'mirlash",
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
    description: 'Uy va ofislarni professional tozalash',
  },
  {
    slug: 'furniture',
    nameUz: "Mebel yig'ish va ta'mirlash",
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
  // Ma'lumotnomalar faqat bo'sh bazada yaratiladi (prisma/seed-reference.ts) — admin tahrirlari saqlanadi.
  const reference = await seedReferenceData(prisma, { regions, districtsByRegionCode, categories });
  console.log(`Reference data: regions+districts ${reference.regions}, categories ${reference.categories}.`);

  // ADMIN rolini ochiq ro'yxatdan o'tish orqali olib bo'lmaydi (docs/TZ.md §4.1) — faqat shu yerda beriladi.
  // Admin panelga ADMIN_LOGIN + ADMIN_PASSWORD bilan kiradi; ADMIN_PHONE — akkauntning (majburiy, unikal)
  // telefon maydoni uchun, u bilan kirib bo'lmaydi. Qayta ishga tushirilsa parol yangilanadi.
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    const adminLogin = (process.env.ADMIN_LOGIN ?? '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD ?? '';
    const minPasswordLength = process.env.NODE_ENV === 'production' ? 12 : 8;

    if (!/^\+998\d{9}$/.test(adminPhone)) {
      throw new Error('ADMIN_PHONE +998XXXXXXXXX formatida bo\'lishi kerak');
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(adminLogin)) {
      throw new Error('ADMIN_LOGIN majburiy: 3–32 belgi (lotin harflari, raqam, nuqta, chiziqcha)');
    }
    if (adminPassword.length < minPasswordLength || adminPassword.length > 128) {
      throw new Error(`ADMIN_PASSWORD majburiy: ${minPasswordLength}–128 belgi`);
    }

    console.log(`Seeding admin user "${adminLogin}" (${adminPhone})...`);
    const passwordHash = hashAdminPassword(adminPassword);
    await prisma.user.upsert({
      where: { phone: adminPhone },
      update: { role: 'ADMIN', isBlocked: false, login: adminLogin, passwordHash },
      create: {
        phone: adminPhone,
        name: 'Administrator',
        role: 'ADMIN',
        isPhoneVerified: true,
        login: adminLogin,
        passwordHash,
      },
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
