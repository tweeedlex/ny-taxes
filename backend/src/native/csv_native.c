#include <ctype.h>
#include <stddef.h>
#include <stdlib.h>

static void trim_bounds(const char *line, int *start, int *end) {
    while (*start < *end && isspace((unsigned char)line[*start])) {
        (*start)++;
    }
    while (*end > *start && isspace((unsigned char)line[*end - 1])) {
        (*end)--;
    }
    if ((*end - *start) >= 2 && line[*start] == '"' && line[*end - 1] == '"') {
        (*start)++;
        (*end)--;
    }
}

static int parse_double_range(
    const char *line,
    int start,
    int end,
    double *out_value
) {
    int len = end - start;
    if (len <= 0 || len >= 256) {
        return 0;
    }

    char tmp[256];
    for (int i = 0; i < len; i++) {
        tmp[i] = line[start + i];
    }
    tmp[len] = '\0';

    char *parse_end = NULL;
    double value = strtod(tmp, &parse_end);
    if (parse_end == tmp || *parse_end != '\0') {
        return 0;
    }
    *out_value = value;
    return 1;
}

int parse_csv_line_required(
    const char *line,
    int line_len,
    int lon_idx,
    int lat_idx,
    int ts_idx,
    int subtotal_idx,
    double *out_lon,
    double *out_lat,
    int *out_ts_start,
    int *out_ts_len,
    int *out_subtotal_start,
    int *out_subtotal_len
) {
    if (line == NULL || line_len <= 0 ||
        out_lon == NULL || out_lat == NULL ||
        out_ts_start == NULL || out_ts_len == NULL ||
        out_subtotal_start == NULL || out_subtotal_len == NULL) {
        return 0;
    }

    while (line_len > 0 && (line[line_len - 1] == '\n' || line[line_len - 1] == '\r')) {
        line_len--;
    }
    if (line_len <= 0) {
        return 0;
    }

    int wanted[4] = {lon_idx, lat_idx, ts_idx, subtotal_idx};
    int starts[4] = {-1, -1, -1, -1};
    int ends[4] = {-1, -1, -1, -1};

    int field_idx = 0;
    int field_start = 0;
    int in_quotes = 0;

    for (int i = 0; i <= line_len; i++) {
        char c = (i < line_len) ? line[i] : ',';

        if (i < line_len && c == '"') {
            if (in_quotes && (i + 1) < line_len && line[i + 1] == '"') {
                i++;
                continue;
            }
            in_quotes = !in_quotes;
            continue;
        }

        if (i == line_len || (!in_quotes && c == ',')) {
            int start = field_start;
            int end = i;
            trim_bounds(line, &start, &end);

            for (int w = 0; w < 4; w++) {
                if (field_idx == wanted[w]) {
                    starts[w] = start;
                    ends[w] = end;
                }
            }

            field_idx++;
            field_start = i + 1;
        }
    }

    for (int w = 0; w < 4; w++) {
        if (starts[w] < 0 || ends[w] < starts[w]) {
            return 0;
        }
    }

    if (!parse_double_range(line, starts[0], ends[0], out_lon)) {
        return 0;
    }
    if (!parse_double_range(line, starts[1], ends[1], out_lat)) {
        return 0;
    }

    *out_ts_start = starts[2];
    *out_ts_len = ends[2] - starts[2];
    *out_subtotal_start = starts[3];
    *out_subtotal_len = ends[3] - starts[3];
    return 1;
}
