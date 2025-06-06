export interface CheckoutPromptProps {
  checkoutDartsInput: string;
  doubleAttemptsInput: string;
  loading: boolean;
  onCheckoutDartsChange: (value: string) => void;
  onDoubleAttemptsChange: (value: string) => void;
  onSubmit: () => void;
  onRevert: () => void;
}

export default function CheckoutPrompt({
  checkoutDartsInput,
  doubleAttemptsInput,
  loading,
  onCheckoutDartsChange,
  onDoubleAttemptsChange,
  onSubmit,
  onRevert,
}: CheckoutPromptProps) {
  onDoubleAttemptsChange("1"); // Default to 1 double attempt on mount
  onCheckoutDartsChange("1"); // Default to 1 dart on mount
  return (
    <div className="mt-6 w-full max-w-md bg-base-100 p-6 rounded-lg shadow-lg ">
      <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">Megerősítés</h3>
      <div className="space-y-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className=" font-medium text-2xl">
            Megerősiti hogy véget ért a leg, és a követekző leg indulhat:
          </span>
          <span className="italic text-lg">
            Megerősítés után már nem lehet visszalépni!
          </span>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-success h-12 flex-1 text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
            onClick={onSubmit}
            disabled={loading || !checkoutDartsInput || !doubleAttemptsInput}
          >
            {loading ? <span className="loading loading-spinner"></span> : "Megerősítés"}
          </button>
          <button
            className="btn btn-error h-12 flex-1 text-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
            onClick={onRevert}
            disabled={loading}
          >
            Mégse
          </button>
        </div>
      </div>
    </div>
  );
}