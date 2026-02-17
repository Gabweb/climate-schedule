import type { ReactNode } from "react";

export type CardModeOption = {
  value: string;
  label: string;
};

export type CardScheduleItem = {
  key: string;
  left: string;
  right: string;
  active?: boolean;
};

type EntityCardProps = {
  title: string;
  titleBadge?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
};

export function EntityCard({ title, titleBadge, headerRight, children }: EntityCardProps) {
  return (
    <article className="entity-card">
      <header className="entity-card-header">
        <div className="entity-card-heading">
          {titleBadge}
          <strong>{title}</strong>
        </div>
        {headerRight}
      </header>
      {children}
    </article>
  );
}

type CardModeSelectProps = {
  id: string;
  ariaLabel: string;
  value: string;
  options: CardModeOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function CardModeSelect({
  id,
  ariaLabel,
  value,
  options,
  disabled = false,
  onChange
}: CardModeSelectProps) {
  return (
    <div className="inline-field entity-card-mode">
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type CardScheduleListProps = {
  items: CardScheduleItem[];
  emptyText: string;
};

export function CardScheduleList({ items, emptyText }: CardScheduleListProps) {
  if (items.length === 0) {
    return <p className="muted-text">{emptyText}</p>;
  }

  return (
    <ul className="schedule-list entity-schedule-list">
      {items.map((item) => (
        <li key={item.key} className={item.active ? "schedule-active" : undefined}>
          <span>{item.left}</span>
          <span>{item.right}</span>
        </li>
      ))}
    </ul>
  );
}
