import { FamilyChartPerson } from '../context/types';
import { readGedcom } from 'read-gedcom';

function parseName(raw: string): { first: string; last: string } {
  const match = raw.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (match) {
    return { first: (match[1] + match[3]).trim(), last: match[2].trim() };
  }
  return { first: raw.trim(), last: '' };
}

function str(val: (string | null)[] | undefined): string {
  return val?.[0] ?? '';
}

function present(val: string | undefined): string | undefined {
  return val && val.trim() ? val.trim() : undefined;
}

function normalizeId(pointer: string): string {
  return pointer.replace(/@/g, '');
}

export async function gedcomToFamilyChart(buffer: Buffer): Promise<FamilyChartPerson[]> {
  const gedcom = await readGedcom(buffer as unknown as ArrayBuffer);
  const persons = new Map<string, FamilyChartPerson>();

  // ── Pass 1: individuals ────────────────────────────────────────────────────
  const indArray = gedcom.getIndividualRecord().arraySelect();

  for (let i = 0; i < indArray.length; i++) {
    const ind = indArray[i];
    const pointer = ind.pointer()[0];
    if (!pointer) continue;
    const id = normalizeId(pointer);

    // Name
    const nameNode = ind.getName();
    const nameRaw = str(nameNode.value());
    const { first, last } = parseName(nameRaw);
    const nickname = present(str(nameNode.getNickname().value()));
    const prefix   = present(str(nameNode.getPrefixName().value()));
    const suffix   = present(str(nameNode.getNameSuffix().value()));

    // Sex
    const sexRaw = str(ind.getSex().value());
    const gender: 'M' | 'F' | '' = sexRaw === 'M' ? 'M' : sexRaw === 'F' ? 'F' : '';

    // Birth
    const birth = ind.getEventBirth();
    const birthday   = present(str(birth.getDate().value()));
    const birthPlace = present(str(birth.getPlace().value()));

    // Death
    const death = ind.getEventDeath();
    const deathDate  = present(str(death.getDate().value()));
    const deathPlace = present(str(death.getPlace().value()));
    const deathCause = present(str(death.getCause().value()));

    // Burial
    const burial = ind.getEventBurial();
    const burialDate  = present(str(burial.getDate().value()));
    const burialPlace = present(str(burial.getPlace().value()));

    // Christening
    const chr = ind.getEventChristening();
    const christeningDate  = present(str(chr.getDate().value()));
    const christeningPlace = present(str(chr.getPlace().value()));

    // Attributes
    const occupation  = present(str(ind.getAttributeOccupation().value()));
    const nationality = present(str(ind.getAttributeNationality().value()));
    const religion    = present(str(ind.getAttributeReligiousAffiliation().value()));
    const education   = present(str(ind.getAttributeScholasticAchievement().value()));
    const title       = present(str(ind.getAttributeNobilityTitle().value()));

    // Residence — can have multiple entries; take the first non-empty value
    const residence = present(str(ind.getAttributeResidence().value()));

    // Emigration / Immigration
    const emig = ind.getEventEmigration();
    const emigrationDate  = present(str(emig.getDate().value()));
    const emigrationPlace = present(str(emig.getPlace().value()));

    const immig = ind.getEventImmigration();
    const immigrationDate  = present(str(immig.getDate().value()));
    const immigrationPlace = present(str(immig.getPlace().value()));

    persons.set(id, {
      id,
      data: {
        gender,
        'first name': first,
        'last name': last,
        ...(nickname && { nickname }),
        ...(prefix   && { prefix }),
        ...(suffix   && { suffix }),
        birthday:  birthday  ?? '',
        ...(birthPlace && { birthPlace }),
        death:     deathDate ?? '',
        ...(deathPlace && { deathPlace }),
        ...(deathCause && { deathCause }),
        ...(burialDate  && { burialDate }),
        ...(burialPlace && { burialPlace }),
        ...(christeningDate  && { christeningDate }),
        ...(christeningPlace && { christeningPlace }),
        ...(occupation  && { occupation }),
        ...(nationality && { nationality }),
        ...(religion    && { religion }),
        ...(education   && { education }),
        ...(title       && { title }),
        ...(residence   && { residence }),
        ...(emigrationDate  && { emigrationDate }),
        ...(emigrationPlace && { emigrationPlace }),
        ...(immigrationDate  && { immigrationDate }),
        ...(immigrationPlace && { immigrationPlace }),
      },
      rels: {},
    });
  }

  // ── Pass 2: families ───────────────────────────────────────────────────────
  const famArray = gedcom.getFamilyRecord().arraySelect();

  for (let i = 0; i < famArray.length; i++) {
    const fam = famArray[i];

    const husbPtr = fam.getHusband().value()[0] ?? null;
    const wifePtr = fam.getWife().value()[0] ?? null;
    const childPtrs = fam.getChild().value().filter((v): v is string => v !== null);

    const husbId = husbPtr ? normalizeId(husbPtr) : null;
    const wifeId = wifePtr ? normalizeId(wifePtr) : null;
    const childIds = childPtrs.map(normalizeId);

    // Marriage / divorce details
    const marr = fam.getEventMarriage();
    const marriageDate  = present(str(marr.getDate().value()));
    const marriagePlace = present(str(marr.getPlace().value()));

    const div = fam.getEventDivorce();
    const divorceDate = present(str(div.getDate().value()));

    // Attach spouse relationships + marriage data
    if (husbId && wifeId) {
      const husb = persons.get(husbId);
      const wife = persons.get(wifeId);

      if (husb) {
        husb.rels.spouses = husb.rels.spouses ?? [];
        if (!husb.rels.spouses.includes(wifeId)) husb.rels.spouses.push(wifeId);
        husb.data.marriages = husb.data.marriages ?? [];
        husb.data.marriages.push({
          spouseId: wifeId,
          ...(marriageDate  && { date: marriageDate }),
          ...(marriagePlace && { place: marriagePlace }),
          ...(divorceDate   && { divorceDate }),
        });
      }
      if (wife) {
        wife.rels.spouses = wife.rels.spouses ?? [];
        if (!wife.rels.spouses.includes(husbId)) wife.rels.spouses.push(husbId);
        wife.data.marriages = wife.data.marriages ?? [];
        wife.data.marriages.push({
          spouseId: husbId,
          ...(marriageDate  && { date: marriageDate }),
          ...(marriagePlace && { place: marriagePlace }),
          ...(divorceDate   && { divorceDate }),
        });
      }
    }

    // Children
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
      if (child && !child.rels.parents) {
        child.rels.parents = [];
        if (husbId) child.rels.parents.push(husbId);
        if (wifeId) child.rels.parents.push(wifeId);
      }
    }
  }

  return Array.from(persons.values());
}
