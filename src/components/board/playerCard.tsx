interface PlayerCardProps {
    playerName: string;
    score: number;
    legsWon: number;
    dartsThrown: number;
    average: number;
    checkoutSuggestion: string | null;
    isCurrentPlayer: boolean;
    inputScore: string;
    isDoubleAttempt: boolean;
    doubleHit: boolean;
    onDoubleAttemptChange: (checked: boolean) => void;
    onDoubleHitChange: (checked: boolean) => void;
  }
  
 export default function PlayerCard({
    playerName,
    score,
    legsWon,
    dartsThrown,
    average,
    checkoutSuggestion,
    isCurrentPlayer,
  }: PlayerCardProps) {
    return (
      <div
        className={`p-2 md:p-6 rounded-lg shadow-lg ${
          isCurrentPlayer ? "bg-primary/10 border-4 border-primary" : "bg-base-100"
        }`}
      >
        <div className="flex flex-col md:flex-row  md:items-start sm:items-center gap-1">
          <div className="flex flex-col items-center w-full md:w-1/2">
            <h3 className="text-2xl md:text-4xl w-full font-bold text-gray-800 sm:text-start md:text-center">{playerName}</h3>
            <span className="text-[4rem] md:text-[7rem] font-bold text-gray-900">{score}</span>
          </div>
          <div className="flex sm:flex-row md:flex-col gap-1 items-center sm:justify-evenly md:items-end w-full md:w-1/2">
            <span className="text-lg md:text-xl font-bold text-gray-600">Legek: {legsWon}</span>
            <span className="text-lg md:text-xl text-gray-600">Átlag: {average.toFixed(2)}</span>
            <span className="text-lg md:text-xl text-gray-600">Dobások: {dartsThrown}</span>
            
          </div>
          {checkoutSuggestion && (
              <div className="bg-green-100 p-2 md:p-4 rounded-md mt-2 md:mt-4 w-full md:w-auto">
                <p className="text-xl md:text-2xl font-medium text-green-800 text-center md:text-right">
                  Checkout: <b>{checkoutSuggestion}</b>
                </p>
              </div>
            )}
        </div>
        {/* Double Attempt és Double Hit mezők (ha szükségesek) */}
      </div>
    );
  }