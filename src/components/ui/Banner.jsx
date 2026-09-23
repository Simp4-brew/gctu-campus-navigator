/* Inline status message. `success` and `error` get their own colours
   (light and dark theme) via .banner-success / .banner-error. */
export default function Banner({ variant = "info", id, className = "", children }) {
  return (
    <div
      id={id}
      className={`simulation-banner banner-${variant} ${className}`.trim()}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
