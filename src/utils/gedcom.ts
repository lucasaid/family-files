import { FamilyChartPerson } from '../context/types';
import { readGedcom } from 'read-gedcom';

function parseName(raw: string): { first: string; last: string } {
  const match = raw.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (match) {
    const first = (match[1] + match[3]).trim();
    const last = match[2].trim();
    return { first, last };
  }
  return { first: raw.trim(), last: '' };
}

function normalizeId(pointer: string): string {
  return pointer.replace(/@/g, '');
}

export async function gedcomToFamilyChart(buffer: Buffer): Promise<FamilyChartPerson[]> {
  const gedcom = await readGedcom(buffer as unknown as ArrayBuffer);

  const persons = new Map<string, FamilyChartPerson>();

  const indArray = gedcom.getIndividualRecord().arraySelect();

  for (let i = 0; i < indArray.length; i++) {
    const ind = indArray[i];
    const pointer = ind.pointer()[0];
    if (!pointer) continue;

    const id = normalizeId(pointer);

    const nameRaw = ind.getName().value()[0] ?? '';
    const { first, last } = parseName(nameRaw);

    const sexRaw = ind.getSex().value()[0] ?? '';
    const gender: 'M' | 'F' | '' = sexRaw === 'M' ? 'M' : sexRaw === 'F' ? 'F' : '';

    const birthDate = ind.getEventBirth().getDate().value()[0] ?? '';
    const deathDate = ind.getEventDeath().getDate().value()[0] ?? '';

    persons.set(id, {
      id,
      data: {
        gender,
        'first name': first,
        'last name': last,
        birthday: birthDate,
        death: deathDate,
      },
      rels: {},
    });
  }

  const famArray = gedcom.getFamilyRecord().arraySelect();

  for (let i = 0; i < famArray.length; i++) {
    const fam = famArray[i];

    const husbPtr = fam.getHusband().value()[0] ?? null;
    const wifePtr = fam.getWife().value()[0] ?? null;
    const childPtrs = fam.getChild().value().filter((v): v is string => v !== null);

    const husbId = husbPtr ? normalizeId(husbPtr) : null;
    const wifeId = wifePtr ? normalizeId(wifePtr) : null;
    const childIds = childPtrs.map(normalizeId);

    if (husbId && wifeId) {
      const husb = persons.get(husbId);
      const wife = persons.get(wifeId);
      if (husb) {
        husb.rels.spouses = husb.rels.spouses ?? [];
        if (!husb.rels.spouses.includes(wifeId)) husb.rels.spouses.push(wifeId);
      }
      if (wife) {
        wife.rels.spouses = wife.rels.spouses ?? [];
        if (!wife.rels.spouses.includes(husbId)) wife.rels.spouses.push(husbId);
      }
    }

    for (let j = 0; j < childIds.length; j++) {
      const childId = childIds[j];
      const child = persons.get(childId);

      if (husbId) {
        const husb = persons.get(husbId);
        if (husb) {
          husb.rels.children = husb.rels.children ?? [];
          if (!husb.rels.children.includes(childId)) husb.rels.children.push(childId);
        }
      }

      if (wifeId) {
        const wife = persons.get(wifeId);
        if (wife) {
          wife.rels.children = wife.rels.children ?? [];
          if (!wife.rels.children.includes(childId)) wife.rels.children.push(childId);
        }
      }

      // Only set parents if this child hasn't been assigned parents yet (first family wins)
      if (child && !child.rels.parents) {
        child.rels.parents = [];
        if (husbId) child.rels.parents.push(husbId);
        if (wifeId) child.rels.parents.push(wifeId);
      }
    }
  }

  return Array.from(persons.values());
}
