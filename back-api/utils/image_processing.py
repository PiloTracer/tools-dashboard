"""Image processing utilities for profile pictures."""

from PIL import Image
from io import BytesIO
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Process images for profile pictures."""

    # Maximum file size in bytes (100KB)
    MAX_FILE_SIZE = 100 * 1024

    # Thumbnail size
    THUMBNAIL_SIZE = (120, 120)

    # Original max size (to maintain aspect ratio while reducing file size)
    ORIGINAL_MAX_SIZE = (512, 512)

    @staticmethod
    def convert_to_jpg(image: Image.Image) -> Image.Image:
        """Convert image to RGB mode for JPG format.

        Args:
            image: PIL Image object

        Returns:
            RGB PIL Image object
        """
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            return background
        elif image.mode != 'RGB':
            return image.convert('RGB')
        return image

    @staticmethod
    def resize_image(image: Image.Image, max_size: Tuple[int, int]) -> Image.Image:
        """Resize image maintaining aspect ratio.

        Args:
            image: PIL Image object
            max_size: Maximum (width, height)

        Returns:
            Resized PIL Image object
        """
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        return image

    @classmethod
    def optimize_quality(cls, image: Image.Image, target_size: int = MAX_FILE_SIZE) -> bytes:
        """Optimize JPG quality to meet target file size.

        Args:
            image: PIL Image object (must be RGB)
            target_size: Target file size in bytes

        Returns:
            Optimized image as bytes
        """
        quality = 85
        min_quality = 60

        while quality >= min_quality:
            buffer = BytesIO()
            image.save(buffer, format='JPEG', quality=quality, optimize=True)
            size = buffer.tell()

            if size <= target_size or quality == min_quality:
                buffer.seek(0)
                return buffer.read()

            # Reduce quality by 5 for next iteration
            quality -= 5

        # If still too large, return the minimum quality version
        buffer.seek(0)
        return buffer.read()

    @classmethod
    def process_profile_picture(cls, image_data: bytes) -> Tuple[bytes, bytes]:
        """Process profile picture: create optimized original and thumbnail.

        Args:
            image_data: Original image bytes

        Returns:
            Tuple of (optimized_original_bytes, thumbnail_bytes)

        Raises:
            ValueError: If image cannot be processed
        """
        try:
            # Load image
            image = Image.open(BytesIO(image_data))

            # Convert to JPG (RGB mode)
            image_rgb = cls.convert_to_jpg(image)

            # Create optimized original (max 512x512, under 100KB)
            original = image_rgb.copy()
            original = cls.resize_image(original, cls.ORIGINAL_MAX_SIZE)
            original_bytes = cls.optimize_quality(original, cls.MAX_FILE_SIZE)

            # Create thumbnail (120x120, optimized)
            thumbnail = image_rgb.copy()
            thumbnail = cls.resize_image(thumbnail, cls.THUMBNAIL_SIZE)
            thumbnail_buffer = BytesIO()
            thumbnail.save(thumbnail_buffer, format='JPEG', quality=80, optimize=True)
            thumbnail_buffer.seek(0)
            thumbnail_bytes = thumbnail_buffer.read()

            logger.info(
                f"Processed image: original={len(original_bytes)} bytes, "
                f"thumbnail={len(thumbnail_bytes)} bytes"
            )

            return original_bytes, thumbnail_bytes

        except Exception as e:
            logger.error(f"Failed to process image: {e}")
            raise ValueError(f"Invalid image file: {e}")

    @staticmethod
    def validate_image_format(content_type: str) -> bool:
        """Validate that content type is PNG or JPG.

        Args:
            content_type: MIME type

        Returns:
            True if valid, False otherwise
        """
        return content_type in ('image/png', 'image/jpeg', 'image/jpg')
