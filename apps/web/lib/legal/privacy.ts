import type { LegalDocument } from './types';

// LOYIHA matni — platformaning haqiqiy ishlashiga (docs/TZ.md) asoslangan, lekin yuridik tekshiruvdan o'tmagan.
export const privacyPolicy: LegalDocument = {
  title: 'Maxfiylik siyosati',
  updatedAt: '2026-10-16',
  intro:
    "Ushbu siyosat UstaTop mobil ilovasi va xizmatidan (keyingi o'rinlarda — \"Platforma\") foydalanganingizda qanday shaxsiy ma'lumotlar yig'ilishi, nima uchun ishlatilishi va ular ustidan qanday huquqlaringiz borligini tushuntiradi. Platforma operatori: [TASHKILOT NOMI, STIR, MANZIL].",
  sections: [
    {
      heading: "1. Qanday ma'lumotlarni yig'amiz",
      items: [
        "Akkaunt: telefon raqamingiz (SMS-kod orqali kirish uchun), ismingiz, profil rasmingiz (ixtiyoriy).",
        "Usta profili (faqat ustalar uchun, administrator tomonidan yaratiladi): ism-familiya, telefon, Telegram (ixtiyoriy), o'zingiz haqingizda matn, tajriba, viloyat/tuman va manzil, ish vaqti, mutaxassislik, xizmatlar va narxlar, portfolio rasmlari.",
        "Buyurtmalar: buyurtmachining ismi, telefoni, manzili, qulay sana/vaqt va izohi, tanlangan xizmat va narx, buyurtma holati.",
        "Sharhlar va baholar, sevimli ustalar ro'yxati.",
        "Bildirishnomalar uchun qurilma tokeni (push token).",
        "Texnik ma'lumotlar: IP manzil va so'rovlar jurnali — xavfsizlik, suiiste'mol va ortiqcha so'rovlarning oldini olish uchun.",
      ],
    },
    {
      heading: "2. Ma'lumotlardan nima uchun foydalanamiz",
      items: [
        "Akkauntingizni yaratish va tizimga kirishingizni tasdiqlash.",
        "Mijozlarni ustalar bilan bog'lash: buyurtma berish, uni usta tomonidan qabul qilish va bajarish.",
        "Buyurtma holati va boshqa muhim o'zgarishlar haqida bildirishnoma yuborish.",
        "Usta reytingini sharhlar asosida hisoblash va ko'rsatish.",
        "Platforma xavfsizligini ta'minlash, qoidabuzarlik va firibgarlikka qarshi kurashish, kontentni moderatsiya qilish.",
      ],
    },
    {
      heading: "3. Ma'lumotlaringizni kim ko'radi",
      items: [
        "Usta profili (ism, rasm, tavsif, hudud, xizmatlar, portfolio, reyting, sharhlar) — Platformaning barcha foydalanuvchilariga ochiq.",
        "Siz buyurtma bergan usta — buyurtmani bajarishi uchun ismingiz, telefoningiz va manzilingizni ko'radi.",
        "Siz qoldirgan sharh — ismingiz va rasmingiz bilan ochiq ko'rinadi.",
        "Platforma administratorlari — moderatsiya va yordam ko'rsatish uchun.",
        "Ma'lumotlaringizni sotmaymiz va reklama maqsadida uchinchi shaxslarga bermaymiz.",
      ],
    },
    {
      heading: '4. Uchinchi tomon xizmatlari',
      paragraphs: [
        "Xizmatni ko'rsatish uchun quyidagi provayderlardan foydalanamiz; ular ma'lumotlarni faqat shu maqsadda oladi:",
      ],
      items: [
        "SMS provayderi ([PROVAYDER NOMI, masalan Eskiz.uz]) — telefon raqamingiz va tasdiqlash kodi.",
        "Google Firebase Cloud Messaging — bildirishnoma yuborish uchun qurilma tokeni.",
        "Server (hosting) provayderi — [PROVAYDER NOMI VA SERVERLAR JOYLASHGAN DAVLAT].",
      ],
    },
    {
      heading: "5. Ma'lumotlar qayerda va qancha saqlanadi",
      paragraphs: [
        "Ma'lumotlar [DAVLAT]dagi serverlarda saqlanadi. [ESLATMA: O'zbekiston Respublikasi fuqarolarining shaxsiy ma'lumotlari O'zbekiston hududidagi serverlarda saqlanishi talabini yurist bilan tekshiring.]",
        "Akkauntingiz faol ekan, ma'lumotlaringiz saqlanadi. Akkauntni o'chirganingizda shaxsiy ma'lumotlaringiz darhol anonimlashtiriladi; zaxira nusxalarida ular ko'pi bilan 14 kun qoladi.",
        "Akkaunt o'chirilganda buyurtmalar va sharhlar ikkinchi tomon (usta yoki mijoz) uchun ismingiz va kontaktlaringizsiz saqlanib qoladi.",
      ],
    },
    {
      heading: '6. Sizning huquqlaringiz',
      items: [
        "Ma'lumotlaringizni ko'rish va tuzatish — ilovadagi Profil bo'limida.",
        "Akkauntni o'chirish — ilovada: Profil → \"Akkauntni o'chirish\". Bu amalni qaytarib bo'lmaydi.",
        "Bildirishnomalarni o'chirish — telefon sozlamalarida.",
        "Boshqa so'rovlar uchun quyidagi manzil orqali murojaat qiling.",
      ],
    },
    {
      heading: '7. Bolalar',
      paragraphs: [
        "Platforma [16] yoshga to'lmagan shaxslar uchun mo'ljallanmagan. Bunday foydalanuvchi akkaunt ochganini bilib qolsak, uni o'chiramiz.",
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
      paragraphs: ["Savollar va so'rovlar uchun: Telegram @ustatopofficial, [EMAIL], [TELEFON]."],
    },
  ],
};
