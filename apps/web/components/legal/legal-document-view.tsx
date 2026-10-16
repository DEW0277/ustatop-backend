import { formatDate } from '@/lib/format';
import { LEGAL_DRAFT, type LegalDocument } from '@/lib/legal/types';

// Ommaviy huquqiy sahifa (auth'siz) — mobil ilova va do'kon sahifalari shu URL'larga havola qiladi.
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {LEGAL_DRAFT && (
        <p
          role="note"
          className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          Loyiha matni — yuridik tekshiruvdan o&apos;tmagan. Kvadrat qavs ichidagi joylar to&apos;ldirilishi kerak.
        </p>
      )}

      <p className="text-sm font-semibold text-indigo-600">UstaTop</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{document.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Oxirgi yangilanish: {formatDate(`${document.updatedAt}T12:00:00+05:00`)}
      </p>

      <p className="mt-6 leading-7">{document.intro}</p>

      {document.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 leading-7">
              {paragraph}
            </p>
          ))}
          {section.items && (
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
