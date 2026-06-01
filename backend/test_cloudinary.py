import cloudinary
import cloudinary.uploader
from cloudinary import api

cloudinary.config(
    cloud_name="your_cloud_name",
    api_key="your_api_key",
    api_secret="your_api_secret"
)

result = cloudinary.uploader.upload(
    "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    public_id="ito_test"
)
print(f"Uploaded: {result['secure_url']}")
