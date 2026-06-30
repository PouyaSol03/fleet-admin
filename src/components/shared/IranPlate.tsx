import { useMemo } from 'react';
import {
  formatNumberPlate,
  formatPlateForDisplay,
  normalizePlateAlphabet,
  normalizePlateAlphabets,
  onlyPlateDigits,
  parseNumberPlate,
  PLATE_ALPHABETS,
  type IranPlateParts,
} from '../../utils/iranPlate';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const PLATE_FONT_STACK = '"iransans", "B Nazanin", "B Titr", Tahoma, Arial, sans-serif';
type IranPlateVehicleType = 'car' | 'motorbike';

type IranPlateInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  alphabets?: string[];
  vehicleType?: IranPlateVehicleType;
};

type IranPlateDisplayProps = {
  value?: string | null;
  empty?: string;
  vehicleType?: IranPlateVehicleType;
};

type IranPlateVisualProps = {
  part1?: string;
  alphabet?: string;
  part2?: string;
  regionCode?: string;
  plateAlphabets?: string[];
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  vehicleType?: IranPlateVehicleType;
  onChangePart?: (field: keyof IranPlateParts, value: string) => void;
};

function buildPlateValue(parts: IranPlateParts) {
  const hasAnyValue =
    onlyPlateDigits(parts.part1).length > 0 ||
    Boolean(normalizePlateAlphabet(parts.alphabet || '')) ||
    onlyPlateDigits(parts.part2).length > 0 ||
    onlyPlateDigits(parts.regionCode).length > 0;

  return hasAnyValue ? formatNumberPlate(parts) : '';
}

function toPersianPlateDigits(value = '') {
  return onlyPlateDigits(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] || digit);
}

function IranFlagMark() {
  return (
    <div className="flex w-5 flex-col overflow-hidden rounded-[2px] border border-white/30">
      <span className="h-1 bg-emerald-500" />
      <span className="h-1 bg-white" />
      <span className="h-1 bg-red-500" />
    </div>
  );
}

function IranPlateVisual({
  part1 = '',
  alphabet = '',
  part2 = '',
  regionCode = '',
  plateAlphabets = PLATE_ALPHABETS,
  required = false,
  disabled = false,
  readOnly = false,
  vehicleType = 'car',
  onChangePart,
}: IranPlateVisualProps) {
  const plateTextStyle = {
    fontFamily: PLATE_FONT_STACK,
    fontFeatureSettings: '"ss02", "tnum"',
  };
  const baseInputClass = 'h-full rounded-[6px] border border-black/15 bg-white px-1 text-center text-[15px] font-black leading-none text-[#111827] outline-none disabled:text-[#111827]';
  const textBoxClass = 'flex h-full items-center justify-center px-1 text-[15px] font-black leading-none text-[#111827]';

  const renderDigits = (field: keyof IranPlateParts, value: string, maxLength: number, widthClass: string, placeholder: string) => {
    const displayValue = toPersianPlateDigits(value);

    if (readOnly) {
      return <span className={`${textBoxClass} ${widthClass}`} style={plateTextStyle}>{displayValue || placeholder}</span>;
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        maxLength={maxLength}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={(event) => onChangePart?.(field, onlyPlateDigits(event.target.value).slice(0, maxLength))}
        className={`${baseInputClass} ${widthClass} placeholder:text-slate-300`}
        style={plateTextStyle}
        dir="ltr"
      />
    );
  };

  const renderAlphabet = () => {
    if (readOnly) {
      return <span className={`${textBoxClass} w-14`} style={plateTextStyle}>{alphabet || '-'}</span>;
    }

    return (
      <select
        value={alphabet}
        disabled={disabled}
        required={required}
        onChange={(event) => onChangePart?.('alphabet', normalizePlateAlphabet(event.target.value))}
        className={`${baseInputClass} w-14 cursor-pointer appearance-none text-center`}
        style={plateTextStyle}
        dir="rtl"
      >
        {plateAlphabets.map((char) => (
          <option key={char} value={char}>
            {char}
          </option>
        ))}
      </select>
    );
  };

  if (vehicleType === 'motorbike') {
    return (
      <div className="flex w-full justify-center" dir="ltr" style={{ direction: 'ltr' }}>
        <div className="flex h-20 w-[112px] max-w-full flex-col gap-0.5 overflow-hidden rounded-md border border-black/20 bg-black/5 p-0 text-[#111827] shadow-inner">
          <div className="flex min-h-0 flex-1 gap-0.5">
            <div className="flex w-6 shrink-0 flex-col items-center justify-between bg-[#002F9C] px-1 py-1 text-white">
              <IranFlagMark />
              <div className="text-left font-sans text-[6px] font-bold leading-[7px]">
                <div>.I.R</div>
                <div>IRAN</div>
              </div>
            </div>
            <div className="min-w-0 flex-1 p-0.5 pb-0">
              {renderDigits('part1', `${part1}${part2}`.slice(0, 3), 3, 'w-full', '۱۲۳')}
            </div>
          </div>
          <div className="min-h-0 flex-1 p-0.5 pt-0">
            {renderDigits('regionCode', `${part2}${regionCode}`.slice(0, 5), 5, 'w-full', '۱۲۳۴۵')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center" dir="ltr" style={{ direction: 'ltr' }}>
      <div className="flex h-12 w-[260px] max-w-full overflow-hidden rounded-md border border-black/20 bg-black/5 text-[#111827] shadow-inner">
        <div className="flex w-6 shrink-0 flex-col items-center justify-between bg-[#002F9C] px-1 py-1 text-white">
          <IranFlagMark />
          <div className="text-left font-sans text-[6px] font-bold leading-[7px]">
            <div>.I.R</div>
            <div>IRAN</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch justify-center gap-1 p-1">
          {renderDigits('part1', part1, 2, 'w-10', '۱۲')}
          {renderAlphabet()}
          {renderDigits('part2', part2, 3, 'w-12', '۱۲۳')}
        </div>

        <div className="flex w-12 shrink-0 flex-col items-stretch justify-between border-l border-black/15 p-1">
          <span className="text-center text-[10px] font-black leading-3 text-black/70" style={plateTextStyle}>ایران</span>
          {renderDigits('regionCode', regionCode, 2, 'w-full', '۱۱')}
        </div>
      </div>
    </div>
  );
}

export function IranPlateInput({
  value = '',
  onChange,
  required = false,
  disabled = false,
  alphabets = PLATE_ALPHABETS,
  vehicleType = 'car',
}: IranPlateInputProps) {
  const plateAlphabets = useMemo(() => normalizePlateAlphabets(alphabets), [alphabets]);
  const parsed = parseNumberPlate(value) || {};
  const currentAlphabet = plateAlphabets.includes(normalizePlateAlphabet(parsed.alphabet || ''))
    ? normalizePlateAlphabet(parsed.alphabet || '')
    : plateAlphabets[0] || '';

  const updatePart = (field: keyof IranPlateParts, nextValue: string) => {
    const nextParts: IranPlateParts = {
      part1: onlyPlateDigits(parsed.part1).slice(0, 2),
      alphabet: currentAlphabet,
      part2: onlyPlateDigits(parsed.part2).slice(0, 3),
      regionCode: onlyPlateDigits(parsed.regionCode).slice(0, 2),
      [field]: field === 'alphabet' ? normalizePlateAlphabet(nextValue) : nextValue,
    };

    if (!nextParts.alphabet && field !== 'alphabet') {
      nextParts.alphabet = plateAlphabets[0] || '';
    }

    onChange?.(buildPlateValue(nextParts));
  };

  return (
    <IranPlateVisual
      part1={onlyPlateDigits(parsed.part1).slice(0, 2)}
      alphabet={currentAlphabet}
      part2={onlyPlateDigits(parsed.part2).slice(0, 3)}
      regionCode={onlyPlateDigits(parsed.regionCode).slice(0, 2)}
      plateAlphabets={plateAlphabets}
      required={required}
      disabled={disabled}
      vehicleType={vehicleType}
      onChangePart={updatePart}
    />
  );
}

export function IranPlateDisplay({ value, empty = '-', vehicleType = 'car' }: IranPlateDisplayProps) {
  const parsed = parseNumberPlate(value);

  if (!parsed) {
    const plate = formatPlateForDisplay(value);
    return <span dir="ltr">{plate || empty}</span>;
  }

  return (
    <IranPlateVisual
      part1={onlyPlateDigits(parsed.part1).slice(0, 2)}
      alphabet={normalizePlateAlphabet(parsed.alphabet || '')}
      part2={onlyPlateDigits(parsed.part2).slice(0, 3)}
      regionCode={onlyPlateDigits(parsed.regionCode).slice(0, 2)}
      vehicleType={vehicleType}
      readOnly
    />
  );
}
