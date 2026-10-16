export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  updatedAt: string; // YYYY-MM-DD
  intro: string;
  sections: LegalSection[];
}

// `true` ekan, sahifalar tepasida "Loyiha" ogohlantirishi ko'rinadi. Matn yurist / platforma egasi tomonidan
// tekshirilib, [KVADRAT QAVS] ichidagi joylar to'ldirilgach `false` qilinadi (TASKS.md C-03).
export const LEGAL_DRAFT = true;
