import { ImageWithFallback } from './figma/ImageWithFallback';

interface ImageGridProps {
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  onImageClick?: (index: number) => void;
}

export function ImageGrid({ images, onImageClick }: ImageGridProps) {
  if (images.length === 0) return null;

  // Single image - full width
  if (images.length === 1) {
    return (
      <div
        className="w-full cursor-pointer"
        onClick={() => onImageClick?.(0)}
      >
        <ImageWithFallback
          src={images[0].url}
          alt={images[0].alt || 'Post image'}
          className="w-full object-cover max-h-[600px] rounded"
        />
      </div>
    );
  }

  // Two images - side by side
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative cursor-pointer overflow-hidden rounded aspect-square"
            onClick={() => onImageClick?.(index)}
          >
            <ImageWithFallback
              src={image.url}
              alt={image.alt || `Post image ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    );
  }

  // Three images - large left + 2 stacked right
  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 h-[400px]">
        {/* First image - large on left */}
        <div
          className="relative cursor-pointer overflow-hidden rounded row-span-2"
          onClick={() => onImageClick?.(0)}
        >
          <ImageWithFallback
            src={images[0].url}
            alt={images[0].alt || 'Post image 1'}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Second and third images - stacked on right */}
        {images.slice(1).map((image, index) => (
          <div
            key={index + 1}
            className="relative cursor-pointer overflow-hidden rounded"
            onClick={() => onImageClick?.(index + 1)}
          >
            <ImageWithFallback
              src={image.url}
              alt={image.alt || `Post image ${index + 2}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    );
  }

  // Four images - 2x2 grid
  if (images.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative cursor-pointer overflow-hidden rounded aspect-square"
            onClick={() => onImageClick?.(index)}
          >
            <ImageWithFallback
              src={image.url}
              alt={image.alt || `Post image ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    );
  }

  // Five or more images - 2x2 grid + overlay on 4th
  if (images.length >= 5) {
    const firstFour = images.slice(0, 4);
    const remaining = images.length - 4;

    return (
      <div className="grid grid-cols-2 gap-1">
        {firstFour.map((image, index) => (
          <div
            key={index}
            className="relative cursor-pointer overflow-hidden rounded aspect-square group"
            onClick={() => onImageClick?.(index)}
          >
            <ImageWithFallback
              src={image.url}
              alt={image.alt || `Post image ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />

            {/* Overlay on the 4th image showing "+N more" */}
            {index === 3 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] group-hover:bg-black/70 transition-colors">
                <span className="text-white text-2xl font-bold">
                  +{remaining}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
