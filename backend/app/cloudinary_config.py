import cloudinary
import cloudinary.uploader
from cloudinary import api
from typing import Optional
from .config import settings


def configure_cloudinary():
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET
        )
        return True
    return False


def upload_image(file, folder: str = "ito") -> Optional[dict]:
    if not configure_cloudinary():
        return None
    
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="auto"
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"]
        }
    except Exception as e:
        print(f"Error uploading to Cloudinary: {e}")
        return None


def delete_image(public_id: str) -> bool:
    if not configure_cloudinary():
        return False
    
    try:
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception as e:
        print(f"Error deleting from Cloudinary: {e}")
        return False
