import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('packager', Path(__file__).with_name('package-starters.py'))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)


class PackagingSafetyTests(unittest.TestCase):
    def test_common_credential_forms_are_rejected(self):
        examples = [
            'sk-' + 'a' * 32,
            'sk-ant-' + 'b' * 32,
            'sk-proj-' + 'c' * 32,
            'AIza' + 'd' * 35,
            'ghp_' + 'e' * 36,
            'github_pat_' + 'f' * 36,
            'npm_' + 'g' * 36,
            'clientSecret = "' + 'h' * 40 + '"',
            'postgres://user:' + 'p' * 20 + '@db.invalid/test',
        ]
        for example in examples:
            with self.subTest(example_type=example[:5]):
                with self.assertRaises(packager.PackageError):
                    packager.validate_source_content('streaming-chat', [('app/test.ts', example.encode())])

    def test_later_validation_failure_preserves_existing_downloads_and_manifest(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / 'downloads'
            output.mkdir()
            archive = output / 'previous-existing.zip'
            archive.write_bytes(b'original-download')
            manifest = root / 'manifest.ts'
            manifest.write_text('original-manifest')
            actual_collect = packager.collect_files

            def fail_second(slug):
                if slug == 'docs-assistant':
                    raise packager.PackageError('deliberate invalid source fixture')
                return actual_collect(slug)

            with patch.object(packager, 'OUTPUT_ROOT', output), patch.object(packager, 'MANIFEST_PATH', manifest), patch.object(packager, 'collect_files', side_effect=fail_second):
                with self.assertRaises(packager.PackageError):
                    packager.package_all()
            self.assertEqual(archive.read_bytes(), b'original-download')
            self.assertEqual(manifest.read_text(), 'original-manifest')
            self.assertEqual(list(output.iterdir()), [archive])

    def test_actual_sources_validate_and_zip_bytes_are_reproducible(self):
        for slug in packager.SLUGS:
            files, _ = packager.collect_files(slug)
            packager.validate_source_content(slug, files)
            self.assertEqual(packager.archive_bytes(slug, files), packager.archive_bytes(slug, files))


if __name__ == '__main__':
    unittest.main()
