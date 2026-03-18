import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const Seat = ({ seat, status, onSelect }) => {
  const statusClasses = {
    available: 'bg-white/20 text-white/70 hover:bg-white/40 cursor-pointer',
    selected: 'bg-purple-600 text-white cursor-pointer shadow-lg shadow-purple-600/50',
    taken: 'bg-gray-500/50 text-white/50 cursor-not-allowed',
  };

  return (
    <motion.button
      whileHover={{ scale: status !== 'taken' ? 1.1 : 1 }}
      whileTap={{ scale: status !== 'taken' ? 0.9 : 1 }}
      onClick={() => status !== 'taken' && onSelect(seat)}
      disabled={status === 'taken'}
      className={cn(
        'w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-200',
        statusClasses[status]
      )}
      aria-label={`Seat ${seat.id}`}
    >
      {seat.id}
    </motion.button>
  );
};

const SeatPicker = ({ seats, seating, selectedSeats, onSelectSeat }) => {
  if (!seats || !seating) return null;

  const seatGrid = [];
  for (let i = 0; i < seating.rows; i++) {
    seatGrid.push(seats.slice(i * seating.cols, (i + 1) * seating.cols));
  }

  const getStatus = (seat) => {
    if (seat.status === 'taken') return 'taken';
    if (selectedSeats.some(s => s.id === seat.id)) return 'selected';
    return 'available';
  };

  return (
    <div className="w-full">
      <div className="p-4 bg-black/20 rounded-t-lg flex justify-center items-center flex-col">
        <div className="w-2/3 h-2 bg-white/30 rounded-full mb-2"></div>
        <div className="text-white/80 font-semibold tracking-widest text-sm">STAGE</div>
      </div>
      <div className="p-4 md:p-8 bg-black/10 rounded-b-lg flex flex-col items-center gap-3 overflow-x-auto">
        {seatGrid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 md:gap-3">
            {row.map(seat => (
              <Seat
                key={seat.id}
                seat={seat}
                status={getStatus(seat)}
                onSelect={onSelectSeat}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-white text-sm">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/20"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-600"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-500/50"></div>
          <span>Taken</span>
        </div>
      </div>
    </div>
  );
};

export default SeatPicker;