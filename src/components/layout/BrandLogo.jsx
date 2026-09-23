import logoUrl from "../../assets/gctu-logo.png";

/* GCTU crest. A real image file (rather than a base64 string in the
   component) is cached by the browser and the service worker. */
export default function BrandLogo() {
  return (
    <img
      src={logoUrl}
      alt="GCTU Logo"
      className="brand-logo-img"
      width="36"
      height="36"
      decoding="async"
    />
  );
}
