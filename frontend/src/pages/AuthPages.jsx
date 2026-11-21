import { SignIn, SignUp } from "@clerk/react";
import { Bookmark } from "lucide-react";
import { useApp } from "@/context/AppContext";

function Shell({ children }) {
  const { t } = useApp();
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="hidden flex-col justify-center rounded-[2rem] bg-[#0B0B0C] p-10 text-white lg:flex">
        <Bookmark className="h-8 w-8 text-[#C6F432]" aria-hidden />
        <p className="mt-6 font-display text-3xl font-semibold leading-tight">{t("common.appName")}</p>
        <p className="mt-4 text-white/70">{t("auth.side")}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-center text-sm text-[#52525B] lg:hidden">{t("auth.side")}</p>
        {children}
      </div>
    </div>
  );
}

export const SignInPage = () => <Shell><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></Shell>;
export const SignUpPage = () => <Shell><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></Shell>;
