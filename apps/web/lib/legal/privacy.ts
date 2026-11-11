import type { LegalDocument } from './types';

// Platformaning haqiqiy ishlashiga (docs/TZ.md) va mobil ilovaning joriy holatiga (v1.0 — faqat katalog,
// ACCOUNTS_ENABLED = false) asoslangan. Akkauntlar yoqilganda 1-band 2-qismi va 4-band amal qila boshlaydi.
export const privacyPolicy: LegalDocument = {
  title: 'Maxfiylik siyosati',
  updatedAt: '2026-11-12',
  intro:
    "Ushbu siyosat Aka Uka mobil ilovasi va xizmatidan (keyingi o'rinlarda — \"Platforma\") foydalanganingizda qanday ma'lumotlar yig'ilishi, nima uchun ishlatilishi va ular ustidan qanday huquqlaringiz borligini tushuntiradi. Platforma operatori: Jaloliddin Abdurahmonov (jismoniy shaxs), O'zbekiston Respublikasi. Aloqa: jaloliddina98@gmail.com.",
  sections: [
    {
      heading: "1. Qanday ma'lumotlarni yig'amiz",
      paragraphs: [
        "Ilovaning joriy versiyasi ro'yxatdan o'tishsiz ishlaydi: siz ustalar katalogini ko'rasiz va ular bilan telefon yoki Telegram orqali o'zingiz bog'lanasiz. Bu versiya sizdan ism, telefon raqami, joylashuv yoki boshqa shaxsiy ma'lumot so'ramaydi va yig'maydi. Qurilmadan serverga faqat katalog so'rovlari (viloyat, tuman, xizmat turi, qidiruv so'zi) yuboriladi; ularda sizni aniqlaydigan ma'lumot yo'q. Qo'ng'iroq va Telegram telefoningizning o'z ilovalarida ochiladi — Platforma ularning mazmunini ko'rmaydi.",
        "Kelgusida akkaunt funksiyalari (buyurtma berish, sharh yozish, usta kabineti) yoqilsa, quyidagilar yig'iladi:",
      ],
      items: [
        "Akkaunt: telefon raqamingiz (SMS-kod orqali kirish uchun), ismingiz, profil rasmingiz (ixtiyoriy).",
        "Buyurtmalar: buyurtmachining ismi, telefoni, manzili, qulay sana/vaqt va izohi, tanlangan xizmat va narx, buyurtma holati.",
        "Sharhlar va baholar, sevimli ustalar ro'yxati, bildirishnomalar uchun qurilma tokeni.",
        "Texnik ma'lumotlar: IP manzil va so'rovlar jurnali — xavfsizlik va suiiste'molning oldini olish uchun.",
      ],
    },
    {
      heading: "2. Ustalar katalogidagi ma'lumotlar",
      paragraphs: [
        "Katalogda ustalar va avtoservislarning ochiq e'lon qilingan ish ma'lumotlari ko'rsatiladi: ism, yo'nalish, ish telefoni, ish vaqti, hudud va manzil. Bu ma'lumotlar ustalarning o'zlari yoki ochiq manbalar (jumladan Aka-Uka YUKSALISH katalogi) orqali taqdim etilgan va xizmatga buyurtmachi topish maqsadida e'lon qilinadi.",
        "O'zingiz haqingizdagi yozuvni tuzatish yoki katalogdan olib tashlashni xohlasangiz, jaloliddina98@gmail.com manziliga yozing — so'rov 7 kun ichida bajariladi.",
      ],
    },
    {
      heading: "3. Ma'lumotlardan nima uchun foydalanamiz",
      items: [
        "Katalogni ko'rsatish: siz tanlagan hudud va xizmat turi bo'yicha ustalarni topish.",
        "Akkaunt funksiyalari yoqilganda: akkauntni yaratish, buyurtmani ustaga yetkazish, holat haqida bildirishnoma yuborish, reytingni hisoblash.",
        "Platforma xavfsizligini ta'minlash, qoidabuzarlik va firibgarlikka qarshi kurashish.",
        "Ma'lumotlarni sotmaymiz va reklama maqsadida uchinchi shaxslarga bermaymiz. Ilovada reklama yo'q.",
      ],
    },
    {
      heading: '4. Uchinchi tomon xizmatlari',
      paragraphs: ["Xizmatni ko'rsatish uchun quyidagi provayderlardan foydalanamiz; ular ma'lumotlarni faqat shu maqsadda oladi:"],
      items: [
        "Server (hosting) provayderi — Contabo GmbH: katalog va akkaunt ma'lumotlari shu provayder ijaraga beradigan serverda saqlanadi.",
        "SMS provayderi — akkaunt funksiyalari yoqilganda: telefon raqamingiz va tasdiqlash kodi.",
        "Google Firebase Cloud Messaging — bildirishnomalar yoqilganda: qurilma tokeni.",
      ],
    },
    {
      heading: "5. Ma'lumotlar qancha saqlanadi",
      paragraphs: [
        "Akkauntingiz faol ekan, ma'lumotlaringiz saqlanadi. Akkauntni o'chirganingizda shaxsiy ma'lumotlaringiz darhol anonimlashtiriladi; zaxira nusxalarida ular ko'pi bilan 14 kun qoladi.",
        "Akkaunt o'chirilganda buyurtmalar va sharhlar ikkinchi tomon uchun ismingiz va kontaktlaringizsiz saqlanib qoladi.",
      ],
    },
    {
      heading: '6. Sizning huquqlaringiz',
      items: [
        "Ma'lumotlaringizni ko'rish, tuzatish yoki o'chirishni so'rash — jaloliddina98@gmail.com orqali.",
        "Akkaunt funksiyalari yoqilganda: ilovadagi Profil → \"Akkauntni o'chirish\" (qaytarib bo'lmaydi) yoki https://7acts.uz/delete-account sahifasidagi yo'riqnoma.",
        "Bildirishnomalarni o'chirish — telefon sozlamalarida.",
      ],
    },
    {
      heading: '7. Bolalar',
      paragraphs: [
        "Platforma 18 yoshga to'lmagan shaxslar uchun mo'ljallanmagan. Bunday foydalanuvchi akkaunt ochganini bilib qolsak, uni o'chiramiz.",
      ],
    },
    {
      heading: "8. O'zgarishlar",
      paragraphs: [
        "Siyosatni yangilashimiz mumkin. Muhim o'zgarishlar haqida ilova orqali xabar beramiz; yangilangan sana sahifa boshida ko'rsatiladi.",
      ],
    },
    {
      heading: '9. Aloqa',
      paragraphs: ["Savollar va so'rovlar uchun: jaloliddina98@gmail.com."],
    },
  ],
};
