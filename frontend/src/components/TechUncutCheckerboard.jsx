import React from 'react';

export const Checkerboard = ({ className = '', position = 'top-left' }) => {
  // 4 columns x 3 rows grid
  const cols = 4;
  const rows = 3;

  return (
    <div className={`grid grid-cols-4 w-20 h-10 gap-0 overflow-hidden ${className}`}>
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const isBlue = (row + col) % 2 === 0;
        return (
          <div
            key={idx}
            className={`${isBlue ? 'bg-[#0866FF]' : 'bg-transparent'}`}
          />
        );
      })}
    </div>
  );
};

export default Checkerboard;
