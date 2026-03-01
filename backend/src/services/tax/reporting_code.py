from dataclasses import dataclass
from typing import Iterable

from pyproj import Transformer

from src.core.reporting_code import normalize_reporting_code
from src.native import GeoZoneNative, NativePolygonDataset, NativeShapeBuffers


@dataclass(frozen=True)
class _RegionPolygon:
    reporting_code: str
    bbox: tuple[float, float, float, float]
    points: tuple[tuple[float, float], ...]
    parts: tuple[int, ...]
    native_buffers: NativeShapeBuffers | None


class ReportingCodeByCoordinatesService:
    def __init__(
        self,
        city_polygons: tuple[_RegionPolygon, ...],
        county_polygons: tuple[_RegionPolygon, ...],
        source_crs: str = "EPSG:4326",
        target_crs: str = "EPSG:26918",
    ) -> None:
        self._transformer = Transformer.from_crs(
            crs_from=source_crs,
            crs_to=target_crs,
            always_xy=True,
        )
        self._city_polygons = city_polygons
        self._county_polygons = county_polygons
        self._city_codes = tuple(polygon.reporting_code for polygon in city_polygons)
        self._county_codes = tuple(polygon.reporting_code for polygon in county_polygons)
        self._city_native_dataset = self._build_native_dataset(city_polygons)
        self._county_native_dataset = self._build_native_dataset(county_polygons)

    @classmethod
    def from_rows(
        cls,
        city_rows: Iterable[dict],
        county_rows: Iterable[dict],
        source_crs: str = "EPSG:4326",
        target_crs: str = "EPSG:26918",
    ) -> "ReportingCodeByCoordinatesService":
        return cls(
            city_polygons=tuple(cls._to_polygon(row) for row in city_rows),
            county_polygons=tuple(cls._to_polygon(row) for row in county_rows),
            source_crs=source_crs,
            target_crs=target_crs,
        )

    def get_reporting_code(self, lat: float, lon: float) -> str | None:
        self._validate_coordinates(lat=lat, lon=lon)
        projected_lon, projected_lat = self._transformer.transform(lon, lat)

        city_code = self._find_reporting_code(
            polygons=self._city_polygons,
            codes=self._city_codes,
            native_dataset=self._city_native_dataset,
            lat=projected_lat,
            lon=projected_lon,
        )
        if city_code is not None:
            return city_code

        county_code = self._find_reporting_code(
            polygons=self._county_polygons,
            codes=self._county_codes,
            native_dataset=self._county_native_dataset,
            lat=projected_lat,
            lon=projected_lon,
        )
        if county_code is not None:
            return county_code

        return None

    def get_reporting_codes_batch(
        self,
        coordinates: list[tuple[float, float]],
    ) -> list[str | None]:
        if not coordinates:
            return []

        lats = [float(lat) for lat, _ in coordinates]
        lons = [float(lon) for _, lon in coordinates]
        for lat, lon in coordinates:
            self._validate_coordinates(lat=lat, lon=lon)

        projected_lons, projected_lats = self._transformer.transform(lons, lats)

        city_indexes = self._find_reporting_code_indexes_batch(
            polygons=self._city_polygons,
            native_dataset=self._city_native_dataset,
            lats=projected_lats,
            lons=projected_lons,
        )
        result: list[str | None] = [None] * len(coordinates)
        unresolved_positions: list[int] = []
        unresolved_lats: list[float] = []
        unresolved_lons: list[float] = []

        for idx, city_index in enumerate(city_indexes):
            if city_index >= 0:
                result[idx] = self._city_codes[city_index]
            else:
                unresolved_positions.append(idx)
                unresolved_lats.append(projected_lats[idx])
                unresolved_lons.append(projected_lons[idx])

        if not unresolved_positions:
            return result

        county_indexes = self._find_reporting_code_indexes_batch(
            polygons=self._county_polygons,
            native_dataset=self._county_native_dataset,
            lats=unresolved_lats,
            lons=unresolved_lons,
        )

        for unresolved_idx, county_index in enumerate(county_indexes):
            if county_index >= 0:
                original_idx = unresolved_positions[unresolved_idx]
                result[original_idx] = self._county_codes[county_index]

        return result

    @classmethod
    def _to_polygon(cls, row: dict) -> _RegionPolygon:
        points_raw = row.get("points") or []
        parts_raw = row.get("parts") or []
        points = tuple((float(x), float(y)) for x, y in points_raw)
        parts = tuple(int(part) for part in parts_raw)
        return _RegionPolygon(
            reporting_code=normalize_reporting_code(str(row.get("reporting_code", ""))),
            bbox=(
                float(row["bbox_min_lon"]),
                float(row["bbox_min_lat"]),
                float(row["bbox_max_lon"]),
                float(row["bbox_max_lat"]),
            ),
            points=points,
            parts=parts,
            native_buffers=GeoZoneNative.build_shape_buffers(
                points=points,
                parts=parts,
            ),
        )

    def _find_reporting_code(
        self,
        polygons: tuple[_RegionPolygon, ...],
        codes: tuple[str, ...],
        native_dataset: NativePolygonDataset | None,
        lat: float,
        lon: float,
    ) -> str | None:
        if native_dataset is not None:
            polygon_idx = GeoZoneNative.find_first_polygon_index(
                lon=lon,
                lat=lat,
                dataset=native_dataset,
            )
            if polygon_idx >= 0:
                return codes[polygon_idx]

        for polygon in polygons:
            min_lon, min_lat, max_lon, max_lat = polygon.bbox
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                continue
            if self._point_in_shape(lon=lon, lat=lat, polygon=polygon):
                return polygon.reporting_code
        return None

    def _find_reporting_code_indexes_batch(
        self,
        polygons: tuple[_RegionPolygon, ...],
        native_dataset: NativePolygonDataset | None,
        lats: list[float],
        lons: list[float],
    ) -> list[int]:
        if not lats:
            return []

        if native_dataset is not None:
            return GeoZoneNative.find_first_polygon_index_batch(
                lons=lons,
                lats=lats,
                dataset=native_dataset,
            )

        result: list[int] = []
        for lat, lon in zip(lats, lons, strict=False):
            match_idx = -1
            for idx, polygon in enumerate(polygons):
                min_lon, min_lat, max_lon, max_lat = polygon.bbox
                if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                    continue
                if self._point_in_shape(lon=lon, lat=lat, polygon=polygon):
                    match_idx = idx
                    break
            result.append(match_idx)
        return result

    @staticmethod
    def _build_native_dataset(
        polygons: tuple[_RegionPolygon, ...],
    ) -> NativePolygonDataset | None:
        if not polygons:
            return None
        return GeoZoneNative.build_polygon_dataset(
            [
                {
                    "bbox": polygon.bbox,
                    "points": polygon.points,
                    "parts": polygon.parts,
                }
                for polygon in polygons
            ]
        )

    @staticmethod
    def _validate_coordinates(lat: float, lon: float) -> None:
        if not (-90 <= lat <= 90):
            raise ValueError("Latitude must be between -90 and 90.")
        if not (-180 <= lon <= 180):
            raise ValueError("Longitude must be between -180 and 180.")

    @classmethod
    def _point_in_shape(cls, lon: float, lat: float, polygon: _RegionPolygon) -> bool:
        if not polygon.parts:
            return False
        if polygon.native_buffers is not None:
            return GeoZoneNative.point_in_shape(
                lon=lon,
                lat=lat,
                buffers=polygon.native_buffers,
            )

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
