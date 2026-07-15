
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";

export function ToolbarSearchInput({ value, onChange, placeholder = "جستجو..." }: { value: string, onChange: (val: string) => void, placeholder?: string }) {
  return (
    <div className="relative">
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7D7D7D]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#D9D9D9] bg-white pr-10 pl-3 text-right text-sm outline-none transition focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC]"
      />
    </div>
  );
}
