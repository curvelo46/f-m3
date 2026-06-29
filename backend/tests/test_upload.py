import os
import tempfile
import unittest
from io import BytesIO

from PIL import Image

from blueprints.upload import build_image_filename, save_image_as_png


class UploadImageTests(unittest.TestCase):
    def test_build_image_filename_uses_png_extension(self):
        filename = build_image_filename("foto.jpg", "Mi Foto")
        self.assertEqual(filename, "mi-foto.png")

    def test_save_image_as_png_writes_png_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "result.png")
            image_bytes = BytesIO()
            Image.new("RGB", (2, 2), (255, 0, 0)).save(image_bytes, format="JPEG")
            image_bytes.seek(0)

            save_image_as_png(image_bytes, output_path)

            with Image.open(output_path) as saved_image:
                self.assertEqual(saved_image.format, "PNG")


if __name__ == "__main__":
    unittest.main()
