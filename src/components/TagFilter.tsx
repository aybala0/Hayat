import { TAGS } from "../config";

type Props = {
  selected: string | null;
  onChange: (tag: string | null) => void;
};

export function TagFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={`flex-none text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
          selected === null
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
      >
        All
      </button>
      {TAGS.map((tag) => {
        const value = `${tag.emoji} ${tag.label}`;
        const active = selected === value;
        return (
          <button
            key={value}
            onClick={() => onChange(active ? null : value)}
            className={`flex-none text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              active
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {tag.emoji} {tag.label}
          </button>
        );
      })}
    </div>
  );
}
