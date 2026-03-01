import ctypes
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

_NATIVE_DIR = Path(__file__).resolve().parent
_NATIVE_SRC = _NATIVE_DIR / "csv_native.c"
_NATIVE_LIB = _NATIVE_DIR / "csv_native.so"


class CsvNativeParser:
    _lib: ctypes.CDLL | None = None
    _load_attempted = False
    _enabled = False

    @classmethod
    def is_enabled(cls) -> bool:
        if not cls._load_attempted:
            cls._load_library()
        return cls._enabled

    @classmethod
    def parse_required_fields(
        cls,
        line: str,
        lon_idx: int,
        lat_idx: int,
        ts_idx: int,
        subtotal_idx: int,
    ) -> tuple[float, float, str, str] | None:
        if not cls.is_enabled() or cls._lib is None:
            return None
        if not line:
            return None

        line_bytes = line.encode("utf-8")
        line_buf = ctypes.create_string_buffer(line_bytes)

        out_lon = ctypes.c_double()
        out_lat = ctypes.c_double()
        out_ts_start = ctypes.c_int()
        out_ts_len = ctypes.c_int()
        out_subtotal_start = ctypes.c_int()
        out_subtotal_len = ctypes.c_int()

        ok = cls._lib.parse_csv_line_required(
            line_buf,
            ctypes.c_int(len(line_bytes)),
            ctypes.c_int(lon_idx),
            ctypes.c_int(lat_idx),
            ctypes.c_int(ts_idx),
            ctypes.c_int(subtotal_idx),
            ctypes.byref(out_lon),
            ctypes.byref(out_lat),
            ctypes.byref(out_ts_start),
            ctypes.byref(out_ts_len),
            ctypes.byref(out_subtotal_start),
            ctypes.byref(out_subtotal_len),
        )
        if not ok:
            return None

        ts_start = int(out_ts_start.value)
        ts_end = ts_start + int(out_ts_len.value)
        subtotal_start = int(out_subtotal_start.value)
        subtotal_end = subtotal_start + int(out_subtotal_len.value)

        timestamp_raw = line_bytes[ts_start:ts_end].decode("utf-8").strip()
        subtotal_raw = line_bytes[subtotal_start:subtotal_end].decode("utf-8").strip()
        return (
            float(out_lat.value),
            float(out_lon.value),
            timestamp_raw,
            subtotal_raw,
        )

    @classmethod
    def _compile_library(cls) -> bool:
        if not _NATIVE_SRC.exists():
            logger.warning("Native CSV source not found: %s", _NATIVE_SRC)
            return False

        cmd = [
            "gcc",
            "-O3",
            "-fPIC",
            "-shared",
            str(_NATIVE_SRC),
            "-o",
            str(_NATIVE_LIB),
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            return True
        except Exception as exc:
            logger.warning("Failed to compile native CSV parser: %s", exc)
            return False

    @classmethod
    def _needs_recompile(cls) -> bool:
        if not _NATIVE_LIB.exists():
            return True
        try:
            return _NATIVE_SRC.stat().st_mtime > _NATIVE_LIB.stat().st_mtime
        except FileNotFoundError:
            return True

    @classmethod
    def _load_library(cls) -> None:
        cls._load_attempted = True
        if cls._needs_recompile() and not cls._compile_library():
            cls._enabled = False
            return

        try:
            cls._lib = ctypes.CDLL(str(_NATIVE_LIB))
            cls._lib.parse_csv_line_required.argtypes = [
                ctypes.c_char_p,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_double),
                ctypes.POINTER(ctypes.c_double),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
            ]
            cls._lib.parse_csv_line_required.restype = ctypes.c_int
            cls._enabled = True
            logger.info("Native CSV parser is enabled.")
        except Exception as exc:
            logger.warning("Failed to load native CSV parser: %s", exc)
            if cls._compile_library():
                try:
                    cls._lib = ctypes.CDLL(str(_NATIVE_LIB))
                    cls._lib.parse_csv_line_required.argtypes = [
                        ctypes.c_char_p,
                        ctypes.c_int,
                        ctypes.c_int,
                        ctypes.c_int,
                        ctypes.c_int,
                        ctypes.c_int,
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                    ]
                    cls._lib.parse_csv_line_required.restype = ctypes.c_int
                    cls._enabled = True
                    logger.info("Native CSV parser is enabled.")
                    return
                except Exception as retry_exc:
                    logger.warning("Failed to load native CSV parser after rebuild: %s", retry_exc)
            cls._enabled = False
