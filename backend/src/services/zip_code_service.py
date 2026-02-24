from dataclasses import dataclass
from pathlib import Path

import shapefile


@dataclass(frozen=True)
class _ZipPolygon:
    zip_code: str
    bbox: tuple[float, float, float, float]
    points: tuple[tuple[float, float], ...]
    parts: tuple[int, ...]


class ZipCodeByCoordinatesService:
    def __init__(self, shp_path: Path | None = None) -> None:
        base_dir = Path(__file__).resolve().parent.parent
        self._shp_path = shp_path or (base_dir / "static" / "ny_postcodes.shp")
        if not self._shp_path.exists():
            raise FileNotFoundError(f"Shapefile not found: {self._shp_path}")

        self._polygons = self._load_polygons()

    def get_zip_code(self, lat: float, lon: float) -> str | None:
        self._validate_coordinates(lat=lat, lon=lon)

        for polygon in self._polygons:
            min_lon, min_lat, max_lon, max_lat = polygon.bbox
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                continue
            if self._point_in_shape(lon=lon, lat=lat, polygon=polygon):
                return polygon.zip_code
        return None

    def _load_polygons(self) -> tuple[_ZipPolygon, ...]:
        polygons: list[_ZipPolygon] = []
        reader = shapefile.Reader(str(self._shp_path))
        try:
            for shape_record in reader.iterShapeRecords():
                zip_code = str(shape_record.record["ZCTA5CE20"]).strip().zfill(5)
                shape = shape_record.shape
                polygons.append(
                    _ZipPolygon(
                        zip_code=zip_code,
                        bbox=tuple(shape.bbox),
                        points=tuple((float(x), float(y)) for x, y in shape.points),
                        parts=tuple(int(part) for part in shape.parts),
                    )
                )
        finally:
            reader.close()
        return tuple(polygons)

    @staticmethod
    def _validate_coordinates(lat: float, lon: float) -> None:
        if not (-90 <= lat <= 90):
            raise ValueError("Latitude must be between -90 and 90.")
        if not (-180 <= lon <= 180):
            raise ValueError("Longitude must be between -180 and 180.")

    @classmethod
    def _point_in_shape(cls, lon: float, lat: float, polygon: _ZipPolygon) -> bool:
        if not polygon.parts:
            return False

        boundaries = [*polygon.parts, len(polygon.points)]
        inside = False
        for idx in range(len(polygon.parts)):
            ring = polygon.points[boundaries[idx] : boundaries[idx + 1]]
            if cls._point_in_ring(lon=lon, lat=lat, ring=ring):
                inside = not inside
        return inside

    @classmethod
    def _point_in_ring(
        cls, lon: float, lat: float, ring: tuple[tuple[float, float], ...]
    ) -> bool:
        if len(ring) < 3:
            return False

        inside = False
        prev_lon, prev_lat = ring[-1]
        for curr_lon, curr_lat in ring:
            if cls._point_on_segment(
                px=lon,
                py=lat,
                x1=prev_lon,
                y1=prev_lat,
                x2=curr_lon,
                y2=curr_lat,
            ):
                return True

            if (curr_lat > lat) != (prev_lat > lat):
                lon_intersection = (
                    (prev_lon - curr_lon) * (lat - curr_lat) / (prev_lat - curr_lat)
                ) + curr_lon
                if lon < lon_intersection:
                    inside = not inside
            prev_lon, prev_lat = curr_lon, curr_lat

        return inside

    @staticmethod
    def _point_on_segment(
        px: float, py: float, x1: float, y1: float, x2: float, y2: float
    ) -> bool:
        eps = 1e-12
        cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1)
        if abs(cross) > eps:
            return False

        min_x, max_x = sorted((x1, x2))
        min_y, max_y = sorted((y1, y2))
        return (min_x - eps) <= px <= (max_x + eps) and (min_y - eps) <= py <= (
            max_y + eps
        )

