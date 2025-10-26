
import { SignUp } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex justify-center items-center h-screen">
       <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create an account</CardTitle>
          <CardDescription>to continue to QuantumDock</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignUp routing="hash" />
        </CardContent>
      </Card>
    </div>
  );
}
