import {
    normalizePlateAlphabet,
    normalizePlateAlphabets,
    parseNumberPlate,
    PLATE_ALPHABETS,
    toEnglishDigits,
    type PlateData,
} from '../../../utils/licensePlate'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'

const onlyDigits = (value = '') =>
    toEnglishDigits(value).replace(/\D/g, '')

type LicensePlateProps = Partial<PlateData> & {
    onChange?: (value: Partial<PlateData>) => void
    alphabets?: string[]
    readOnly?: boolean
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
        if (alphabet && selectedAlphabet !== alphabet && !readOnly) {
            onChange({ alphabet: selectedAlphabet })
            return
        }

        if (!selectedAlphabet && !readOnly) {
            onChange({ alphabet: plateAlphabets[0] })
        }
    }, [
        alphabet,
        selectedAlphabet,
        onChange,
        plateAlphabets,
        readOnly,
    ])

    const updateDigits =
        (
            field: keyof Pick<
                PlateData,
                'part1' | 'part2' | 'regionCode'
            >,
            maxLength: number,
        ) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            onChange({
                [field]: onlyDigits(event.target.value).slice(
                    0,
                    maxLength,
                ),
            })
        }

    return (
        <div
            className="flex max-w-full items-center justify-end overflow-x-auto pb-1"
            dir="ltr"
        >
            <div className="flex h-14 shrink-0 items-center overflow-hidden rounded-md border border-gray-700 bg-gray-300 text-gray-800 shadow-inner select-none sm:h-16">

                {/* نوار آبی سمت چپ */}
                <div className="flex h-full w-7 flex-col items-center justify-between bg-blue-800 py-1.5 font-sans text-[8px] text-white sm:w-8 sm:py-2 sm:text-[9px]">
                    <div className="my-0.5 w-6">
                        <img
                            src="/images/flags/iran.webp"
                            alt="flag"
                            className="h-auto w-full"
                        />
                    </div>

                    <div className="scale-120 text-left leading-none tracking-tighter">
                        <div>.I.R</div>
                        <div>IRAN</div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-1.5 sm:gap-2 sm:px-2">
                    <input
                        type="text"
                        maxLength={2}
                        className="w-7 bg-transparent text-center text-lg! font-bold! outline-none disabled:text-gray-800 sm:w-8 sm:text-xl!"
                        value={part1}
                        onChange={updateDigits('part1', 2)}
                        disabled={readOnly}
                        inputMode="numeric"
                    />

                    {/* حرف پلاک */}
                    <select
                        className="w-12 bg-transparent text-center text-xl! font-bold! outline-none disabled:text-gray-600 sm:w-14 sm:text-2xl!"
                        value={selectedAlphabet}
                        onChange={(event) =>
                            onChange({
                                alphabet: normalizePlateAlphabet(
                                    event.target.value,
                                ),
                            })
                        }
                        disabled={readOnly}
                        dir="rtl"
                    >
                        {plateAlphabets.map((char) => (
                            <option key={char} value={char}>
                                {char}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        maxLength={3}
                        className="w-11 bg-transparent text-center text-lg! font-bold! outline-none disabled:text-gray-800 sm:w-12 sm:text-xl!"
                        value={part2}
                        onChange={updateDigits('part2', 3)}
                        disabled={readOnly}
                        inputMode="numeric"
                    />
                </div>

                <div className="flex w-11 flex-col items-center justify-center border-l border-gray-700 sm:w-12">
                    <span className="text-sm">
                        ایران
                    </span>

                    <input
                        type="text"
                        maxLength={2}
                        className="w-11 bg-transparent text-center text-lg! font-bold! outline-none disabled:text-gray-800 sm:w-12 sm:text-xl!"
                        value={regionCode}
                        onChange={updateDigits('regionCode', 2)}
                        disabled={readOnly}
                        inputMode="numeric"
                    />
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
    const [plateData, setPlateData] =
        useState<PlateData | null>(null)

    useEffect(() => {
        setPlateData(
            parseNumberPlate(numberplate) as PlateData | null,
        )
    }, [numberplate])

    if (!plateData) {
        return numberplate ? (
            <span dir="ltr">{numberplate}</span>
        ) : (
            <span>-</span>
        )
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