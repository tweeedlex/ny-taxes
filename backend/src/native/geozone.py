import ctypes
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

_NATIVE_DIR = Path(__file__).resolve().parent
_NATIVE_SRC = _NATIVE_DIR / "geozone_native.c"
_NATIVE_LIB = _NATIVE_DIR / "geozone_native.so"


@dataclass(slots=True)
class NativeShapeBuffers:
    points: ctypes.Array
    points_count: int
    parts: ctypes.Array
    parts_count: int


@dataclass(slots=True)
class NativePolygonDataset:
    bboxes: ctypes.Array
    point_starts: ctypes.Array
    point_counts: ctypes.Array
    part_starts: ctypes.Array
    part_counts: ctypes.Array
    points_flat: ctypes.Array
    parts_flat: ctypes.Array
    polygons_count: int


class GeoZoneNative:
    _lib: ctypes.CDLL | None = None
    _load_attempted = False
    _enabled = False

    @classmethod
    def is_enabled(cls) -> bool:
        if not cls._load_attempted:
            cls._load_library()
        return cls._enabled

    @classmethod
    def build_shape_buffers(
        cls,
        points: tuple[tuple[float, float], ...],
        parts: tuple[int, ...],
    ) -> NativeShapeBuffers | None:
        if not cls.is_enabled():
            return None
        if not points or not parts:
            return None

        flat_points: list[float] = []
        for lon, lat in points:
            flat_points.append(float(lon))
            flat_points.append(float(lat))

        points_arr = (ctypes.c_double * len(flat_points))(*flat_points)
        parts_arr = (ctypes.c_int * len(parts))(*parts)
        return NativeShapeBuffers(
            points=points_arr,
            points_count=len(points),
            parts=parts_arr,
            parts_count=len(parts),
        )

    @classmethod
    def build_polygon_dataset(
        cls,
        polygons: list[dict],
    ) -> NativePolygonDataset | None:
        if not cls.is_enabled():
            return None
        if not polygons:
            return None

        bboxes: list[float] = []
        point_starts: list[int] = []
        point_counts: list[int] = []
        part_starts: list[int] = []
        part_counts: list[int] = []
        points_flat: list[float] = []
        parts_flat: list[int] = []

        current_point_start = 0
        current_part_start = 0

        for polygon in polygons:
            bbox = polygon["bbox"]
            points = polygon["points"]
            parts = polygon["parts"]

            bboxes.extend(
                [
                    float(bbox[0]),
                    float(bbox[1]),
                    float(bbox[2]),
                    float(bbox[3]),
                ]
            )
            point_starts.append(current_point_start)
            point_counts.append(len(points))
            part_starts.append(current_part_start)
            part_counts.append(len(parts))

            for lon, lat in points:
                points_flat.append(float(lon))
                points_flat.append(float(lat))
            for part in parts:
                parts_flat.append(current_point_start + int(part))

            current_point_start += len(points)
            current_part_start += len(parts)

        return NativePolygonDataset(
            bboxes=(ctypes.c_double * len(bboxes))(*bboxes),
            point_starts=(ctypes.c_int * len(point_starts))(*point_starts),
            point_counts=(ctypes.c_int * len(point_counts))(*point_counts),
            part_starts=(ctypes.c_int * len(part_starts))(*part_starts),
            part_counts=(ctypes.c_int * len(part_counts))(*part_counts),
            points_flat=(ctypes.c_double * len(points_flat))(*points_flat),
            parts_flat=(ctypes.c_int * len(parts_flat))(*parts_flat),
            polygons_count=len(polygons),
        )

    @classmethod
    def point_in_shape(
        cls,
        lon: float,
        lat: float,
        buffers: NativeShapeBuffers,
        eps: float = 1e-12,
    ) -> bool:
        if not cls.is_enabled() or cls._lib is None:
            return False

        result = cls._lib.point_in_shape(
            ctypes.c_double(lon),
            ctypes.c_double(lat),
            buffers.points,
            ctypes.c_int(buffers.points_count),
            buffers.parts,
            ctypes.c_int(buffers.parts_count),
            ctypes.c_double(eps),
        )
        return bool(result)

    @classmethod
    def find_first_polygon_index(
        cls,
        lon: float,
        lat: float,
        dataset: NativePolygonDataset,
        eps: float = 1e-12,
    ) -> int:
        if not cls.is_enabled() or cls._lib is None:
            return -1
        return int(
            cls._lib.find_first_polygon_index(
                ctypes.c_double(lon),
                ctypes.c_double(lat),
                dataset.bboxes,
                ctypes.c_int(dataset.polygons_count),
                dataset.point_starts,
                dataset.point_counts,
                dataset.part_starts,
                dataset.part_counts,
                dataset.points_flat,
                dataset.parts_flat,
                ctypes.c_double(eps),
            )
        )

    @classmethod
    def find_first_polygon_index_batch(
        cls,
        lons: list[float],
        lats: list[float],
        dataset: NativePolygonDataset,
        eps: float = 1e-12,
    ) -> list[int]:
        if not cls.is_enabled() or cls._lib is None:
            return [-1] * len(lons)
        if len(lons) != len(lats):
            raise ValueError("lons and lats length mismatch")
        if not lons:
            return []

        lons_arr = (ctypes.c_double * len(lons))(*[float(v) for v in lons])
        lats_arr = (ctypes.c_double * len(lats))(*[float(v) for v in lats])
        out_arr = (ctypes.c_int * len(lons))()

        cls._lib.find_first_polygon_index_batch(
            lons_arr,
            lats_arr,
            ctypes.c_int(len(lons)),
            dataset.bboxes,
            ctypes.c_int(dataset.polygons_count),
            dataset.point_starts,
            dataset.point_counts,
            dataset.part_starts,
            dataset.part_counts,
            dataset.points_flat,
            dataset.parts_flat,
            ctypes.c_double(eps),
            out_arr,
        )
        return [int(out_arr[idx]) for idx in range(len(lons))]

    @classmethod
    def _compile_library(cls) -> bool:
        if not _NATIVE_SRC.exists():
            logger.warning("Native geozone source not found: %s", _NATIVE_SRC)
            return False

        cmd = [
            "gcc",
            "-O3",
            "-fPIC",
            "-shared",
            str(_NATIVE_SRC),
            "-o",
            str(_NATIVE_LIB),
            "-lm",
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            return True
        except Exception as exc:
            logger.warning("Failed to compile native geozone library: %s", exc)
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
            cls._lib.point_in_shape.argtypes = [
                ctypes.c_double,
                ctypes.c_double,
                ctypes.POINTER(ctypes.c_double),
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_int),
                ctypes.c_int,
                ctypes.c_double,
            ]
            cls._lib.point_in_shape.restype = ctypes.c_int

            cls._lib.find_first_polygon_index.argtypes = [
                ctypes.c_double,
                ctypes.c_double,
                ctypes.POINTER(ctypes.c_double),
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_double),
                ctypes.POINTER(ctypes.c_int),
                ctypes.c_double,
            ]
            cls._lib.find_first_polygon_index.restype = ctypes.c_int

            cls._lib.find_first_polygon_index_batch.argtypes = [
                ctypes.POINTER(ctypes.c_double),
                ctypes.POINTER(ctypes.c_double),
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_double),
                ctypes.c_int,
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_int),
                ctypes.POINTER(ctypes.c_double),
                ctypes.POINTER(ctypes.c_int),
                ctypes.c_double,
                ctypes.POINTER(ctypes.c_int),
            ]
            cls._lib.find_first_polygon_index_batch.restype = None

            cls._enabled = True
            logger.info("Native geozone acceleration is enabled.")
        except Exception as exc:
            logger.warning("Failed to load native geozone library: %s", exc)
            if cls._compile_library():
                try:
                    cls._lib = ctypes.CDLL(str(_NATIVE_LIB))
                    cls._lib.point_in_shape.argtypes = [
                        ctypes.c_double,
                        ctypes.c_double,
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.c_int,
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.c_int,
                        ctypes.c_double,
                    ]
                    cls._lib.point_in_shape.restype = ctypes.c_int
                    cls._lib.find_first_polygon_index.argtypes = [
                        ctypes.c_double,
                        ctypes.c_double,
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.c_int,
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.c_double,
                    ]
                    cls._lib.find_first_polygon_index.restype = ctypes.c_int
                    cls._lib.find_first_polygon_index_batch.argtypes = [
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.c_int,
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.c_int,
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.POINTER(ctypes.c_double),
                        ctypes.POINTER(ctypes.c_int),
                        ctypes.c_double,
                        ctypes.POINTER(ctypes.c_int),
                    ]
                    cls._lib.find_first_polygon_index_batch.restype = None
                    cls._enabled = True
                    logger.info("Native geozone acceleration is enabled.")
                    return
                except Exception as retry_exc:
                    logger.warning("Failed to load native geozone library after rebuild: %s", retry_exc)
            cls._enabled = False
