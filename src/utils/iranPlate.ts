export type IranPlateParts = {
  part1?: string;
  alphabet?: string;
  part2?: string;
  regionCode?: string;
};

export const PLATE_ALPHABETS = [
  'الف',
  'ب',
  'پ',
  'ت',
  'ث',
  'ج',
  'چ',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'ژ',
  'س',
  'ش',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ک',
  'گ',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
];

export const toEnglishDigits = (value = '') =>
  String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export const onlyPlateDigits = (value = '') => toEnglishDigits(value).replace(/\D/g, '');

export const repairPlateMojibake = (value = '') => {
  const text = String(value);

  if (!/[ØÙÛÚ]/.test(text) || typeof TextDecoder === 'undefined') {
    return text;
  }

  try {
    const bytes = Uint8Array.from(
      Array.from(text, (char) => char.charCodeAt(0) & 255),
    );

    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return text;
  }
};

export const normalizePlateAlphabet = (value = '') => {
  const alphabet = repairPlateMojibake(value)
    .trim()
    .replace(/[\s\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');

  if (alphabet === 'ك') return 'ک';
  if (alphabet === 'ي') return 'ی';
  if (alphabet === 'الف') return 'الف';

  return PLATE_ALPHABETS.includes(alphabet) ? alphabet : alphabet;
};

export const normalizePlateAlphabets = (alphabets = PLATE_ALPHABETS) => {
  const normalized = alphabets
    .map(normalizePlateAlphabet)
    .filter((alphabet) => PLATE_ALPHABETS.includes(alphabet));

  return normalized.length ? [...new Set(normalized)] : PLATE_ALPHABETS;
};

export const formatNumberPlate = ({
  part1 = '',
  alphabet = '',
  part2 = '',
  regionCode = '',
}: IranPlateParts = {}) =>
  `${onlyPlateDigits(part1).slice(0, 2)}-${normalizePlateAlphabet(alphabet)}-${onlyPlateDigits(part2).slice(0, 3)}|${onlyPlateDigits(regionCode).slice(0, 2)}`;

export const parseNumberPlate = (plateString?: string | null): IranPlateParts | null => {
  if (!plateString) return null;

  const cleaned = repairPlateMojibake(plateString).trim();
  const [mainPart = '', regionPart = ''] = cleaned.split('|');
  const segments = mainPart.split('-').map((part) => part.trim());

  if (segments.length === 3) {
    const [first, alphabet, third] = segments;
    const firstDigits = onlyPlateDigits(first);
    const thirdDigits = onlyPlateDigits(third);

    if (firstDigits.length > 2 && thirdDigits.length <= 2) {
      return {
        part1: thirdDigits.slice(0, 2),
        alphabet: normalizePlateAlphabet(alphabet),
        part2: firstDigits.slice(0, 3),
        regionCode: onlyPlateDigits(regionPart).slice(0, 2),
      };
    }

    return {
      part1: firstDigits.slice(0, 2),
      alphabet: normalizePlateAlphabet(alphabet),
      part2: thirdDigits.slice(0, 3),
      regionCode: onlyPlateDigits(regionPart).slice(0, 2),
    };
  }

  const compact = cleaned.replace(/[|\-\s]/g, '');
  const match = compact.match(/^(\d{2})([^\d]+)(\d{3})(\d{2})?$/);

  if (!match) return null;

  return {
    part1: match[1],
    alphabet: normalizePlateAlphabet(match[2]),
    part2: match[3],
    regionCode: match[4] || '',
  };
};

export const isCompleteIranPlate = (value?: string | null) => {
  const parsed = parseNumberPlate(value);
  return Boolean(
    parsed &&
      onlyPlateDigits(parsed.part1).length === 2 &&
      PLATE_ALPHABETS.includes(normalizePlateAlphabet(parsed.alphabet || '')) &&
      onlyPlateDigits(parsed.part2).length === 3 &&
      onlyPlateDigits(parsed.regionCode).length === 2,
  );
};

export const formatPlateForDisplay = (value?: string | null) => {
  const parsed = parseNumberPlate(value);
  if (!parsed) return repairPlateMojibake(value || '').trim();
  return formatNumberPlate(parsed);
};

export const formatPlateForStorage = (value?: string | null) => {
  const parsed = parseNumberPlate(value);
  if (parsed) return formatNumberPlate(parsed);
  return repairPlateMojibake(value || '').trim();
};
