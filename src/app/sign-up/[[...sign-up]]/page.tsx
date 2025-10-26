
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center h-screen">
      <SignUp
        appearance={{
          elements: {
            card: "bg-transparent shadow-none border-none",
            headerTitle: "text-white",
            headerSubtitle: "text-white/90",
            socialButtonsBlockButtonText: "text-white",
            dividerLine: "bg-white/50",
            dividerText: "text-white/90"
          },
        }}
      />
    </div>
  );
}
