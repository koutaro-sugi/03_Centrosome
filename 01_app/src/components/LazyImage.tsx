/**
 * 遅延読み込み画像コンポーネント
 * Intersection Observer APIを使用して画像を遅延読み込み
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Skeleton } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  threshold?: number;
  placeholder?: React.ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  style,
  className,
  threshold = 0.1,
  placeholder
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <Box
      ref={imgRef}
      sx={{
        width: width || '100%',
        height: height || 'auto',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {!isLoaded && (
        placeholder || (
          <Skeleton 
            variant="rectangular" 
            width={width || '100%'} 
            height={height || 200} 
            animation="wave"
          />
        )
      )}
      
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          style={{
            ...style,
            width: width || '100%',
            height: height || 'auto',
            display: isLoaded ? 'block' : 'none',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          className={className}
        />
      )}
    </Box>
  );
};

export default LazyImage;