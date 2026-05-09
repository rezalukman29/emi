'use client';

import { useState, useEffect } from 'react';

const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize(); // set initial size setelah mount
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
};

export default useWindowDimensions;