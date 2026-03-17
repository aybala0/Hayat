import type { SplitOption } from "../types";

type Props = {
  myName: string;
  otherName: string;
  selected: SplitOption;
  onSelect: (option: SplitOption) => void;
};

const OPTION_LABELS = (_myName: string, otherName: string) => [
  { value: "50/50-me" as SplitOption, label: `50/50 — I paid` },
  { value: "50/50-them" as SplitOption, label: `50/50 — ${otherName} paid` },
  {
    value: "full-me" as SplitOption,
    label: `I paid — ${otherName} owes the full amount`,
  },
  {
    value: "full-them" as SplitOption,
    label: `${otherName} paid — I owe the full amount`,
  },
  { value: "custom" as SplitOption, label: "Custom %" },
] satisfies { value: SplitOption; label: string }[];

export function SplitOptions({ myName, otherName, selected, onSelect }: Props) {
  const options = OPTION_LABELS(myName, otherName);

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
            selected === opt.value
              ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
