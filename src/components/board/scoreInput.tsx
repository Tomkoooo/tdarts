import toast from "react-hot-toast";

interface ScoreInputProps {
  inputScore: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onClear: () => void;
  onThrow: () => void;
  onRevert: () => void;
  scribeName: string;
}

export default function ScoreInput({
  inputScore,
  loading,
  onInputChange,
  onClear,
  onThrow,
  onRevert,
  scribeName,
}: ScoreInputProps) {
  const handleNumpad = (num: string) => {
    const newScore = inputScore + num;
    if (parseInt(newScore) <= 180) {
      onInputChange(newScore);
    } else {
      toast.error("A pontszám nem lehet nagyobb, mint 180");
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="">
        <div className="input input-bordered sm:18 md:h-22 w-full flex items-center justify-between py-4 px-6 text-3xl bg-white border-gray-300 rounded-lg">
          <span>{inputScore || "0"}</span>
          <button
            className="btn btn-ghost text-2xl"
            onClick={onClear}
            disabled={loading || !inputScore}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-3">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            className="btn btn-outline sm:h-18 md:h-22 text-2xl bg-white text-gray-800 hover:bg-gray-100 transition-colors duration-200"
            onClick={() => handleNumpad(num.toString())}
            disabled={loading}
          >
            {num}
          </button>
        ))}
        <button
          className="btn btn-warning sm:h-18 md:h-22 text-2xl bg-yellow-500 text-white hover:bg-yellow-600 transition-colors duration-200"
          onClick={() => onInputChange(inputScore.slice(0, -1))}
          disabled={loading || !inputScore}
        >
          ⌫
        </button>
        <button
          className="btn btn-outline sm:h-18 md:h-22 text-2xl bg-white text-gray-800 hover:bg-gray-100 transition-colors duration-200"
          onClick={() => handleNumpad("0")}
          disabled={loading || inputScore.length >= 3}
        >
          0
        </button>
        <button
          className="btn btn-primary sm:h-18 md:h-22 text-2xl bg-primary text-white hover:bg-primary-dark transition-colors duration-200"
          onClick={onThrow}
          disabled={loading || !inputScore}
        >
          {loading ? <span className="loading loading-spinner"></span> : "Dobás"}
        </button>
      </div>
      <div className="">
        <button
          className="btn btn-error sm:h-14 md:h-18 w-full text-2xl bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
          onClick={onRevert}
          disabled={loading}
        >
          Visszavonás
        </button>
      </div>
      <p className="text-center text-lg text-gray-600">Eredményíró: {scribeName}</p>
    </div>
  );
}