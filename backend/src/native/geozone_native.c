#include <math.h>
#include <stddef.h>

static int point_on_segment(
    double px,
    double py,
    double x1,
    double y1,
    double x2,
    double y2,
    double eps
) {
    double cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
    if (fabs(cross) > eps) {
        return 0;
    }

    double min_x = x1 < x2 ? x1 : x2;
    double max_x = x1 > x2 ? x1 : x2;
    double min_y = y1 < y2 ? y1 : y2;
    double max_y = y1 > y2 ? y1 : y2;

    return (px >= (min_x - eps) && px <= (max_x + eps) &&
            py >= (min_y - eps) && py <= (max_y + eps));
}

static int point_in_ring(
    double lon,
    double lat,
    const double *points,
    int start,
    int end,
    double eps
) {
    int ring_size = end - start;
    if (ring_size < 3) {
        return 0;
    }

    int inside = 0;
    int prev = end - 1;

    for (int curr = start; curr < end; curr++) {
        double curr_lon = points[curr * 2];
        double curr_lat = points[curr * 2 + 1];
        double prev_lon = points[prev * 2];
        double prev_lat = points[prev * 2 + 1];

        if (point_on_segment(
                lon,
                lat,
                prev_lon,
                prev_lat,
                curr_lon,
                curr_lat,
                eps
            )) {
            return 1;
        }

        if ((curr_lat > lat) != (prev_lat > lat)) {
            double lon_intersection = ((prev_lon - curr_lon) * (lat - curr_lat) /
                                       (prev_lat - curr_lat)) + curr_lon;
            if (lon < lon_intersection) {
                inside = !inside;
            }
        }

        prev = curr;
    }

    return inside;
}

static int point_in_shape_parts(
    double lon,
    double lat,
    const double *points,
    int points_count,
    const int *parts,
    int parts_count,
    double eps
) {
    if (points == NULL || parts == NULL || points_count <= 0 || parts_count <= 0) {
        return 0;
    }

    int inside = 0;
    for (int idx = 0; idx < parts_count; idx++) {
        int start = parts[idx];
        int end = (idx + 1 < parts_count) ? parts[idx + 1] : points_count;

        if (start < 0 || end > points_count || start >= end) {
            continue;
        }

        if (point_in_ring(lon, lat, points, start, end, eps)) {
            inside = !inside;
        }
    }

    return inside;
}

int point_in_shape(
    double lon,
    double lat,
    const double *points,
    int points_count,
    const int *parts,
    int parts_count,
    double eps
) {
    return point_in_shape_parts(lon, lat, points, points_count, parts, parts_count, eps);
}

int find_first_polygon_index(
    double lon,
    double lat,
    const double *bboxes,
    int polygons_count,
    const int *point_starts,
    const int *point_counts,
    const int *part_starts,
    const int *part_counts,
    const double *points_flat,
    const int *parts_flat,
    double eps
) {
    if (polygons_count <= 0 ||
        bboxes == NULL ||
        point_starts == NULL ||
        point_counts == NULL ||
        part_starts == NULL ||
        part_counts == NULL ||
        points_flat == NULL ||
        parts_flat == NULL) {
        return -1;
    }

    for (int poly_idx = 0; poly_idx < polygons_count; poly_idx++) {
        const double min_lon = bboxes[poly_idx * 4];
        const double min_lat = bboxes[poly_idx * 4 + 1];
        const double max_lon = bboxes[poly_idx * 4 + 2];
        const double max_lat = bboxes[poly_idx * 4 + 3];
        if (!(min_lon <= lon && lon <= max_lon && min_lat <= lat && lat <= max_lat)) {
            continue;
        }

        const int point_start = point_starts[poly_idx];
        const int point_count = point_counts[poly_idx];
        const int part_start = part_starts[poly_idx];
        const int part_count = part_counts[poly_idx];
        if (point_count <= 0 || part_count <= 0) {
            continue;
        }

        const double *poly_points = points_flat + (point_start * 2);
        const int *poly_parts_abs = parts_flat + part_start;

        int inside = 0;
        for (int part_idx = 0; part_idx < part_count; part_idx++) {
            int ring_start = poly_parts_abs[part_idx] - point_start;
            int ring_end = (part_idx + 1 < part_count)
                ? (poly_parts_abs[part_idx + 1] - point_start)
                : point_count;

            if (ring_start < 0 || ring_end > point_count || ring_start >= ring_end) {
                continue;
            }
            if (point_in_ring(lon, lat, poly_points, ring_start, ring_end, eps)) {
                inside = !inside;
            }
        }

        if (inside) {
            return poly_idx;
        }
    }

    return -1;
}

void find_first_polygon_index_batch(
    const double *lons,
    const double *lats,
    int points_count,
    const double *bboxes,
    int polygons_count,
    const int *point_starts,
    const int *point_counts,
    const int *part_starts,
    const int *part_counts,
    const double *points_flat,
    const int *parts_flat,
    double eps,
    int *out_indexes
) {
    if (lons == NULL || lats == NULL || out_indexes == NULL || points_count <= 0) {
        return;
    }
    for (int idx = 0; idx < points_count; idx++) {
        out_indexes[idx] = find_first_polygon_index(
            lons[idx],
            lats[idx],
            bboxes,
            polygons_count,
            point_starts,
            point_counts,
            part_starts,
            part_counts,
            points_flat,
            parts_flat,
            eps
        );
    }
}
