type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

/**
 * Page title with a short staged entrance. Plain CSS (enter-* classes in globals.css), so it plays
 * from the first paint and the app never downloads an animation library for a heading.
 */
export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="max-w-3xl">
      <div className="enter-fade flex items-center gap-3">
        <span className="epic-rule" />
        <p className="type-eyebrow text-accent">{eyebrow}</p>
      </div>
      <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
        <span className="enter-slide-up block" style={{ animationDelay: "0.08s" }}>
          {title}
        </span>
      </h1>
      {description ? (
        <p className="enter-fade mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: "0.25s" }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
