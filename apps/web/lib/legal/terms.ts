import type { LegalDocument } from './types';

// LOYIHA matni — platformaning haqiqiy ishlashiga (docs/TZ.md) asoslangan, lekin yuridik tekshiruvdan o'tmagan.
export const termsOfUse: LegalDocument = {
  title: 'Foydalanish shartlari',
  updatedAt: '2026-10-16',
  intro:
    "Ushbu shartlar UstaTop mobil ilovasi va xizmatidan (\"Platforma\") foydalanish qoidalarini belgilaydi. Platformadan foydalanib, siz ushbu shartlarga va Maxfiylik siyosatiga rozilik bildirasiz. Platforma operatori: [TASHKILOT NOMI, STIR, MANZIL].",
  sections: [
    {
      heading: '1. Platforma nima',
      paragraphs: [
        "Platforma mijozlarni mustaqil ustalar (mutaxassislar) bilan bog'laydigan vositachi xizmatdir. Platforma ishlarni o'zi bajarmaydi va ustalarning ish beruvchisi emas.",
        "Xizmat sifati, muddati va narxi bo'yicha kelishuv mijoz va usta o'rtasida tuziladi; ular uchun javobgarlik ushbu tomonlarda.",
      ],
    },
    {
      heading: '2. Akkaunt',
      items: [
        "Kirish telefon raqami va SMS-kod orqali amalga oshiriladi. Akkauntingiz xavfsizligi (telefoningiz) uchun o'zingiz javobgarsiz.",
        "Faqat o'zingizga tegishli telefon raqamidan foydalaning va to'g'ri ma'lumot kiriting.",
        "Akkauntni istalgan vaqtda ilovaning o'zida o'chirishingiz mumkin (Profil → \"Akkauntni o'chirish\").",
      ],
    },
    {
      heading: '3. Ustalar',
      items: [
        "Usta profili faqat Platforma administratori tomonidan, tekshiruvdan keyin yaratiladi.",
        "Usta profilidagi ma'lumotlar (tajriba, xizmatlar, narxlar, portfolio) to'g'ri va o'ziga tegishli bo'lishi shart.",
        "Usta qabul qilgan buyurtmani kelishilgan shartlarda bajarishi yoki o'z vaqtida rad etishi kerak.",
      ],
    },
    {
      heading: "4. Buyurtmalar va to'lov",
      items: [
        "Buyurtma Platforma orqali beriladi; usta uni qabul qiladi yoki rad etadi. Mijoz buyurtmani usta qabul qilgunga qadar bekor qilishi mumkin.",
        "Ilovadagi narxlar usta tomonidan ko'rsatilgan taxminiy narxlardir; yakuniy narx ish hajmiga qarab usta bilan kelishiladi.",
        "Platforma hozircha to'lovlarni qabul qilmaydi — to'lov bevosita mijoz va usta o'rtasida amalga oshiriladi.",
      ],
    },
    {
      heading: '5. Sharhlar',
      items: [
        "Sharhni faqat shu ustadan tugallangan buyurtmasi bo'lgan mijoz qoldira oladi; har bir mijoz bitta ustaga bitta sharh qoldiradi (keyin uni yangilashi mumkin).",
        "Sharh haqqoniy bo'lishi kerak. Haqoratli, yolg'on, reklama yoki shaxsiy ma'lumotlarni oshkor qiluvchi sharhlar o'chiriladi.",
      ],
    },
    {
      heading: "6. Taqiqlangan harakatlar",
      items: [
        "Boshqa shaxs nomidan ro'yxatdan o'tish yoki yolg'on ma'lumot berish.",
        "Firibgarlik, aldov, tahdid, haqorat va qonunga zid xizmatlarni taklif qilish.",
        "Spam, soxta buyurtma yoki sharh, reytingni sun'iy oshirish/tushirish.",
        "Platformaning ishlashiga xalaqit berish, avtomatlashtirilgan vositalar bilan ma'lumot yig'ish.",
      ],
    },
    {
      heading: '7. Bloklash',
      paragraphs: [
        "Shartlar buzilganda Platforma akkauntni ogohlantirishsiz bloklash, profilni ro'yxatdan olib tashlash yoki kontentni o'chirish huquqiga ega.",
      ],
    },
    {
      heading: '8. Javobgarlikni cheklash',
      paragraphs: [
        "Platforma \"boricha\" taqdim etiladi. Qonunchilik ruxsat bergan doirada Platforma ustalar bajargan ishning sifati, mijoz va usta o'rtasidagi kelishmovchiliklar hamda xizmatdagi vaqtinchalik uzilishlar uchun javobgar emas.",
      ],
    },
    {
      heading: "9. O'zgarishlar va qonunchilik",
      paragraphs: [
        "Shartlarni yangilashimiz mumkin; muhim o'zgarishlar haqida ilova orqali xabar beramiz.",
        "Ushbu shartlar O'zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.",
      ],
    },
    {
      heading: '10. Aloqa',
      paragraphs: ["Telegram @ustatopofficial, [EMAIL], [TELEFON]."],
    },
  ],
};
