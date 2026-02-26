from dataclasses import dataclass
from pathlib import Path

import shapefile
from pyproj import Transformer


@dataclass(frozen=True)
class _RegionPolygon:
    reporting_code: str
    bbox: tuple[float, float, float, float]
    points: tuple[tuple[float, float], ...]
    parts: tuple[int, ...]


class ReportingCodeByCoordinatesService:
    def __init__(
        self,
        cities_shp_path: Path | None = None,
        counties_shp_path: Path | None = None,
        source_crs: str = "EPSG:4326",
        target_crs: str = "EPSG:26918",
    ) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        static_dir = base_dir / "static" / "shapefiles"
        self._cities_shp_path = cities_shp_path or (static_dir / "Cities.shp")
        self._counties_shp_path = counties_shp_path or (static_dir / "Counties.shp")
        if not self._cities_shp_path.exists():
            raise FileNotFoundError(f"Cities shapefile not found: {self._cities_shp_path}")
        if not self._counties_shp_path.exists():
            raise FileNotFoundError(
                f"Counties shapefile not found: {self._counties_shp_path}"
            )

        self._transformer = Transformer.from_crs(
            crs_from=source_crs,
            crs_to=target_crs,
            always_xy=True,
        )
        self._city_polygons = self._load_polygons(self._cities_shp_path)
        self._county_polygons = self._load_polygons(self._counties_shp_path)

    def get_reporting_code(self, lat: float, lon: float) -> str | None:
        self._validate_coordinates(lat=lat, lon=lon)
        projected_lon, projected_lat = self._transformer.transform(lon, lat)

        city_code = self._find_reporting_code(
            polygons=self._city_polygons,
            lat=projected_lat,
            lon=projected_lon,
        )
        if city_code is not None:
            return city_code

        county_code = self._find_reporting_code(
            polygons=self._county_polygons,
            lat=projected_lat,
            lon=projected_lon,
        )
        if county_code is not None:
            return county_code

        return None

    def _load_polygons(self, shp_path: Path) -> tuple[_RegionPolygon, ...]:
        polygons: list[_RegionPolygon] = []
        reader = shapefile.Reader(str(shp_path))
        try:
            for shape_record in reader.iterShapeRecords():
                raw_code = str(shape_record.record["REP_CODE"]).strip()
                if not raw_code:
                    continue

                reporting_code = self._normalize_reporting_code(raw_code)
                shape = shape_record.shape
                polygons.append(
                    _RegionPolygon(
                        reporting_code=reporting_code,
                        bbox=tuple(shape.bbox),
                        points=tuple((float(x), float(y)) for x, y in shape.points),
                        parts=tuple(int(part) for part in shape.parts),
                    )
                )
        finally:
            reader.close()
        return tuple(polygons)

    def _find_reporting_code(
        self,
        polygons: tuple[_RegionPolygon, ...],
        lat: float,
        lon: float,
    ) -> str | None:
        for polygon in polygons:
            min_lon, min_lat, max_lon, max_lat = polygon.bbox
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                continue
            if self._point_in_shape(lon=lon, lat=lat, polygon=polygon):
                return polygon.reporting_code
        return None

    @staticmethod
    def _validate_coordinates(lat: float, lon: float) -> None:
        if not (-90 <= lat <= 90):
            raise ValueError("Latitude must be between -90 and 90.")
        if not (-180 <= lon <= 180):
            raise ValueError("Longitude must be between -180 and 180.")

    @staticmethod
    def _normalize_reporting_code(raw_code: str) -> str:
        value = raw_code.strip()
        if value.isdigit() and len(value) <= 4:
            return value.zfill(4)
        return value

    @classmethod
    def _point_in_shape(cls, lon: float, lat: float, polygon: _RegionPolygon) -> bool:
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
