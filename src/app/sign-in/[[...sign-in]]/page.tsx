
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex justify-center items-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              card: "bg-transparent shadow-none border-none",
              headerTitle: "text-white",
              headerSubtitle: "text-white/90",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-white/50",
              dividerText: "text-white/90",
              formFieldLabel: "text-white",
              footerActionText: "text-white/90",
              footerActionLink: "text-white font-medium hover:text-white/80"
            },
          }}
        />
      </div>
    </main>
  );
}
