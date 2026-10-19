import type { LegalDocument } from './types';

// Google Play "Data safety" bo'limi ilovadan tashqari ochiladigan akkauntni o'chirish sahifasini talab qiladi.
// Matn `DELETE /auth/me` xatti-harakatiga (docs/TZ.md §4.3) mos — o'zgarsa shu yerni ham yangilang.
export const deleteAccountInfo: LegalDocument = {
  title: "Akkauntni o'chirish",
  updatedAt: '2026-10-17',
  intro:
    "UstaTop ilovasidagi akkauntingizni va unga bog'liq shaxsiy ma'lumotlaringizni istalgan vaqtda o'chirishingiz mumkin. Bu amalni qaytarib bo'lmaydi.",
  sections: [
    {
      heading: "1. Ilova orqali o'chirish",
      items: [
        "UstaTop ilovasini oching va telefon raqamingiz bilan tizimga kiring.",
        "Pastki menyudan \"Profil\" bo'limiga o'ting.",
        "Sahifa oxiridagi \"Akkauntni o'chirish\" tugmasini bosing va amalni tasdiqlang.",
        "Akkaunt darhol o'chiriladi va ilova mehmon rejimiga o'tadi.",
      ],
    },
    {
      heading: "2. Ilovaga kira olmasangiz",
      paragraphs: [
        "Akkaunt ochilgan telefon raqamingizni ko'rsatib, Telegram @ustatopofficial orqali yoki [EMAIL] manziliga murojaat qiling. Raqam sizga tegishli ekanini tasdiqlaganimizdan so'ng akkaunt 7 kun ichida o'chiriladi.",
      ],
    },
    {
      heading: "3. Nimalar o'chiriladi",
      items: [
        "Telefon raqamingiz, ismingiz va profil rasmingiz.",
        "Sevimli ustalar ro'yxatingiz va bildirishnomalar uchun qurilma tokeni.",
        "Usta bo'lsangiz: profil ma'lumotlari (ism, telefon, Telegram, tavsif, manzil), xizmatlar, mutaxassisliklar va portfolio rasmlari. Profilingiz qidiruvda ko'rinmay qoladi.",
        "Buyurtmalardagi kontakt ma'lumotlaringiz: ism, telefon, manzil va izoh.",
        "Kutilayotgan va bajarilayotgan buyurtmalaringiz bekor qilinadi.",
      ],
    },
    {
      heading: '4. Nimalar saqlanib qoladi',
      items: [
        "Bajarilgan buyurtmalar va qoldirgan sharhlaringiz — ikkinchi tomon tarixi va usta reytingi buzilmasligi uchun, lekin ismingiz va kontaktlaringizsiz (\"O'chirilgan foydalanuvchi\" sifatida).",
        "Zaxira nusxalarida ma'lumotlar ko'pi bilan 14 kun saqlanadi, so'ng butunlay o'chadi.",
      ],
    },
    {
      heading: '5. Aloqa',
      paragraphs: ["Savollar uchun: Telegram @ustatopofficial, [EMAIL]."],
    },
  ],
};
