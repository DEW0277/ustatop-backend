# Rejalar

Har bir issue uchun `architect` (Claude Fable 5.1) shu papkaga `issue-<N>.md` yozadi.
Rejada: maqsad, tekshiriladigan qabul mezonlari (AC), vazifalar (har birida `route: gemini | sonnet`,
fayllar, avval yoziladigan testlar) va verifier ishga tushiradigan buyruqlar bo'ladi.
Verifier (Claude Opus 5.5) faqat shu reja, diff va testlarga qarab PASS/FAIL beradi.
