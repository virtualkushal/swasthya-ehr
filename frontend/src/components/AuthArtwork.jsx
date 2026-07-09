import { Stethoscope, ShieldCheck, Star, MessageCircle } from "lucide-react";
import BrandMark from "./BrandMark";

// The decorative right-hand panel of the auth screens. Fully self-contained
// (gradient + inline SVG doctor illustration + floating accent cards) so there
// are no external image dependencies. Hidden on small screens.
export default function AuthArtwork() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-500 via-sky-500 to-blue-700 p-10 text-white">
      {/* soft decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10">
        <BrandMark variant="light" />
      </div>

      {/* center illustration */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative">
          <div className="flex h-56 w-56 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Stethoscope className="h-28 w-28 text-white" strokeWidth={1.5} />
          </div>

          {/* floating accent cards */}
          <div className="absolute -left-16 top-6 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-700 shadow-lg">
            <div className="rounded-lg bg-teal-100 p-1.5">
              <MessageCircle className="h-4 w-4 text-teal-600" />
            </div>
            <span className="text-sm font-medium">Connect with a Doctor</span>
          </div>

          <div className="absolute -right-12 bottom-8 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-700 shadow-lg">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold">4.9</span>
            <span className="text-xs text-slate-400">rating</span>
          </div>

          <div className="absolute -bottom-6 left-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-slate-700 shadow-lg">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium">Allergy-safe prescriptions</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-sm">
        <h2 className="text-2xl font-bold leading-snug">
          Care that follows the patient.
        </h2>
        <p className="mt-2 text-white/80">
          A FHIR-enabled hospital record system with built-in pharmacy safety
          checks — built for Nepal's clinics.
        </p>
      </div>
    </div>
  );
}
