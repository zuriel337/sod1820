import React from "react";

// The real sign-in marks of the identity providers, as the providers publish them (Google "G" in its four colours, Facebook "f" in its blue disc).
// A brand mark keeps its own colours in every theme; it is decoration only (aria-hidden): the button's text names the provider.
export function ProviderMark2029({ id, size = 22 }) {
  if (id === "google") return <svg className="sod29-provider-mark" data-provider-mark="google" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>;
  if (id === "facebook") return <svg className="sod29-provider-mark" data-provider-mark="facebook" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="24" fill="#1877F2" />
    <path fill="#FFFFFF" d="M33.34 30.9 34.4 24h-6.62v-4.48c0-1.89.92-3.73 3.89-3.73h3.01V9.92s-2.73-.47-5.34-.47c-5.45 0-9.01 3.3-9.01 9.29V24h-6.06v6.9h6.06v16.68a24.1 24.1 0 0 0 7.46 0V30.9h5.55z" />
  </svg>;
  return null;
}
