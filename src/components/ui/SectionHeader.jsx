/* Section title with a leading icon, used across the tabs. */
export default function SectionHeader({ id, icon, className = "", children }) {
  return (
    <h3 className={`section-header ${className}`.trim()} id={id}>
      {icon}
      {children}
    </h3>
  );
}
