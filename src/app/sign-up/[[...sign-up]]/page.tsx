
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex justify-center items-center h-screen">
      <SignUp
        appearance={{
          elements: {
            card: "bg-transparent shadow-none border-none",
          },
        }}
      />
    </div>
  );
}
