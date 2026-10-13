interface SectionHeadingProps {
  as?: "h2" | "h3";
  title: string;
  description?: string;
  id?: string;
  className?: string;
  align?: "left" | "center";
}

/**
 * SectionHeading — judul section seragam.
 * Rata kiri secara default. Tanpa label ALL-CAPS di atas.
 */
export function SectionHeading({
  as: Tag = "h2",
  title,
  description,
  id,
  className = "",
  align = "left",
}: SectionHeadingProps) {
  return (
    <div id={id} className={`${align === "center" ? "text-center" : ""} ${className}`}>
      <Tag
        className="font-display font-bold text-[--text] tracking-tight leading-tight"
        style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
      >
        {title}
      </Tag>
      {description && (
        <p className="mt-3 text-[--text-2] leading-relaxed" style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}>
          {description}
        </p>
      )}
    </div>
  );
}
