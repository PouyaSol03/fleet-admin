import {
  normalizePlateAlphabet,
  normalizePlateAlphabets,
  parseNumberPlate,
  PLATE_ALPHABETS,
  toEnglishDigits,
  type PlateData,
} from '../../../utils/licensePlate'
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react'

const onlyDigits = (value = '') => toEnglishDigits(value).replace(/\D/g, '')
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

const toPersianDigits = (value = '') =>
  onlyDigits(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit)

type LicensePlateProps = Partial<PlateData> & {
  onChange?: (value: Partial<PlateData>) => void
  alphabets?: string[]
  readOnly?: boolean
}

const PLATE_FONT_FAMILY = '"iransans", Tahoma, Arial, sans-serif'

const plateTextStyle: CSSProperties = {
  fontFamily: PLATE_FONT_FAMILY,
  fontFeatureSettings: '"ss02", "tnum"',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
}

const plateEditableTextStyle: CSSProperties = {
  ...plateTextStyle,
  WebkitTextFillColor: '#1f2937',
  opacity: 1,
  caretColor: '#1f2937',
}

export const LicensePlate = ({
  part1 = '',
  part2 = '',
  alphabet = '',
  regionCode = '',
  onChange = () => {},
  alphabets = PLATE_ALPHABETS,
  readOnly = false,
}: LicensePlateProps) => {
  const plateAlphabets = useMemo(
    () => normalizePlateAlphabets(alphabets),
    [alphabets],
  )
  const selectedAlphabet = normalizePlateAlphabet(alphabet)

  useEffect(() => {
    if (readOnly) return

    if (alphabet && selectedAlphabet !== alphabet) {
      onChange({ alphabet: selectedAlphabet })
      return
    }

    if (!selectedAlphabet && plateAlphabets[0]) {
      onChange({ alphabet: plateAlphabets[0] })
    }
  }, [alphabet, selectedAlphabet, onChange, plateAlphabets, readOnly])

  const updateDigits =
    (
      field: keyof Pick<PlateData, 'part1' | 'part2' | 'regionCode'>,
      maxLength: number,
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ [field]: onlyDigits(event.target.value).slice(0, maxLength) })
    }

  const renderDigits = (
    field: keyof Pick<PlateData, 'part1' | 'part2' | 'regionCode'>,
    value: string,
    maxLength: number,
    widthClass: string,
    placeholder: string,
    fontSizeClass = 'text-[22px]',
  ) => {
    const displayValue = toPersianDigits(value)

    if (readOnly) {
      return (
        <span
          className={`flex h-full ${widthClass} items-center justify-center text-center ${fontSizeClass} font-bold leading-none text-[#1f2937]`}
          style={plateTextStyle}
          dir="rtl"
        >
          {displayValue || placeholder}
        </span>
      )
    }

    return (
      <div className={`relative flex h-full ${widthClass} shrink-0 items-center justify-center`}>
        {/*
          Render editable digits with the exact same text layer as read-only
          plates. The real input is transparent and exists only to capture
          keyboard/touch input, so native form-control font rendering can
          never change the plate typography.
        */}
        <span
          className={`pointer-events-none flex h-full w-full items-center justify-center text-center ${fontSizeClass} font-bold leading-none ${displayValue ? 'text-[#1f2937]' : 'text-[#94a3b8]'}`}
          style={plateTextStyle}
          dir="rtl"
          aria-hidden="true"
        >
          {displayValue || placeholder}
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={maxLength}
          value={displayValue}
          onChange={updateDigits(field, maxLength)}
          className="absolute inset-0 h-full w-full cursor-text appearance-none border-0 bg-transparent p-0 text-center text-transparent outline-none focus:ring-0"
          style={{
            ...plateEditableTextStyle,
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            caretColor: 'transparent',
          }}
          dir="rtl"
          aria-label={field}
        />
      </div>
    )
  }

  const renderAlphabet = () => {
    if (readOnly) {
      return (
        <span
          className="flex h-full w-[54px] items-center justify-center text-center text-[28px] font-bold leading-none text-[#475569]"
          style={plateTextStyle}
          dir="rtl"
        >
          {selectedAlphabet || '-'}
        </span>
      )
    }

    return (
      <div className="relative flex h-full w-[54px] shrink-0 items-center justify-center">
        {/*
          Keep the visible alphabet on the same IranSans text layer used by
          read-only plates. The native select remains transparent on top so
          the field stays fully keyboard/mouse accessible without letting the
          browser swap the plate font.
        */}
        <span
          className="pointer-events-none flex h-full w-full items-center justify-center pr-[2px] text-center text-[28px] leading-none text-[#475569]"
          style={plateTextStyle}
          dir="rtl"
          aria-hidden="true"
        >
          {selectedAlphabet || '-'}
        </span>
        <span
          className="pointer-events-none absolute left-[1px] top-1/2 -translate-y-1/2 text-[13px] leading-none text-[#64748b]"
          aria-hidden="true"
        >
         ⌄
        </span>
        <select
          value={selectedAlphabet}
          onChange={(event) =>
            onChange({ alphabet: normalizePlateAlphabet(event.target.value) })
          }
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent outline-none focus:ring-0"
          style={{
            fontFamily: PLATE_FONT_FAMILY,
            fontFeatureSettings: '"ss02", "tnum"',
            fontWeight: 700,
          }}
          dir="rtl"
          aria-label="حرف پلاک"
        >
          {plateAlphabets.map((char) => (
            <option
              key={char}
              value={char}
              style={{ fontFamily: PLATE_FONT_FAMILY, fontWeight: 700, color: '#1f2937' }}
            >
              {char}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex max-w-full items-center justify-center overflow-x-auto py-1" dir="ltr" style={{ direction: 'ltr' }}>
      <div
        className="flex h-16 w-[250px] shrink-0 overflow-hidden rounded-[6px] border border-[#475569] bg-[#d1d5db] text-[#1f2937] select-none"
        dir="ltr"
      >
        {/* Blue IR strip */}
        <div className="flex h-full w-8 shrink-0 flex-col items-center bg-[#1747b5] px-[3px] py-[6px] text-white">
          <img
            src="/images/flags/iran.webp"
            alt="پرچم ایران"
            className="h-auto w-[26px] object-contain"
            draggable={false}
          />
          <div className="mt-auto w-full text-center font-sans text-[9px] font-semibold leading-[10px] tracking-[-0.2px]">
            <div>IR</div>
            <div>IRAN</div>
          </div>
        </div>

        {/* Main plate number */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 px-[5px]">
          {renderDigits('part1', part1, 2, 'w-9', '۱۲')}
          {renderAlphabet()}
          {renderDigits('part2', part2, 3, 'w-[54px]', '۱۲۳')}
        </div>

        {/* Iran / region box */}
        <div className="flex h-full w-[47px] shrink-0 flex-col items-center justify-center border-l border-[#475569] px-1 py-[5px] text-[#1f2937]">
          <span
            className="mb-[1px] text-center text-[13px] font-medium leading-[16px]"
            style={plateTextStyle}
            dir="rtl"
          >
            ایران
          </span>
          {renderDigits('regionCode', regionCode, 2, 'w-full', '۱۱', 'text-[20px]')}
        </div>
      </div>
    </div>
  )
}

const LicensePlateWithData = ({
  numberplate,
  alphabets = PLATE_ALPHABETS,
  readOnly = false,
}: {
  numberplate?: string
  alphabets?: string[]
  readOnly?: boolean
}) => {
  const [plateData, setPlateData] = useState<PlateData | null>(null)

  useEffect(() => {
    setPlateData(parseNumberPlate(numberplate) as PlateData | null)
  }, [numberplate])

  if (!plateData) {
    return numberplate ? <span dir="ltr">{numberplate}</span> : <span>-</span>
  }

  return (
    <LicensePlate
      part1={plateData.part1}
      part2={plateData.part2}
      alphabet={plateData.alphabet}
      regionCode={plateData.regionCode}
      alphabets={alphabets}
      readOnly={readOnly}
      onChange={() => {}}
    />
  )
}

export default LicensePlateWithData
