import { Injectable } from "@nestjs/common";

const durationBuckets = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

type HttpSeries = {
  method: string;
  route: string;
  statusClass: string;
  requests: number;
  durationCount: number;
  durationSum: number;
  buckets: number[];
};

@Injectable()
export class MetricsService {
  private readonly http = new Map<string, HttpSeries>();
  private inFlight = 0;
  private rateLimitFallbacks = 0;

  beginRequest() {
    this.inFlight += 1;
  }

  finishRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    if (route === "/api/metrics" || route === "/metrics") return;

    const safeMethod = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ].includes(method)
      ? method
      : "OTHER";
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const key = JSON.stringify([safeMethod, route, statusClass]);
    let series = this.http.get(key);
    if (!series) {
      series = {
        method: safeMethod,
        route,
        statusClass,
        requests: 0,
        durationCount: 0,
        durationSum: 0,
        buckets: Array(durationBuckets.length + 1).fill(0) as number[],
      };
      this.http.set(key, series);
    }
    series.requests += 1;
    series.durationCount += 1;
    series.durationSum += durationSeconds;
    const bucket = durationBuckets.findIndex(
      (limit) => durationSeconds <= limit,
    );
    series.buckets[bucket === -1 ? durationBuckets.length : bucket] += 1;
  }

  recordRateLimitFallback() {
    this.rateLimitFallbacks += 1;
  }

  renderPrometheus(): string {
    const lines = [
      "# HELP tpservicos_http_requests_total Total de requisições HTTP finalizadas.",
      "# TYPE tpservicos_http_requests_total counter",
    ];
    for (const series of this.http.values()) {
      lines.push(
        `tpservicos_http_requests_total{method="${this.label(series.method)}",route="${this.label(series.route)}",status_class="${series.statusClass}"} ${series.requests}`,
      );
    }

    lines.push(
      "# HELP tpservicos_http_request_duration_seconds Duração das requisições HTTP em segundos.",
      "# TYPE tpservicos_http_request_duration_seconds histogram",
    );
    for (const series of this.http.values()) {
      const labels = `method="${this.label(series.method)}",route="${this.label(series.route)}",status_class="${series.statusClass}"`;
      let cumulative = 0;
      for (let index = 0; index < durationBuckets.length; index += 1) {
        cumulative += series.buckets[index];
        lines.push(
          `tpservicos_http_request_duration_seconds_bucket{${labels},le="${durationBuckets[index]}"} ${cumulative}`,
        );
      }
      cumulative += series.buckets[durationBuckets.length];
      lines.push(
        `tpservicos_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${cumulative}`,
        `tpservicos_http_request_duration_seconds_sum{${labels}} ${series.durationSum}`,
        `tpservicos_http_request_duration_seconds_count{${labels}} ${series.durationCount}`,
      );
    }

    lines.push(
      "# HELP tpservicos_http_requests_in_flight Requisições HTTP ainda em andamento neste processo.",
      "# TYPE tpservicos_http_requests_in_flight gauge",
      `tpservicos_http_requests_in_flight ${this.inFlight}`,
      "# HELP tpservicos_rate_limit_fallback_total Requisições limitadas localmente quando o Redis está indisponível.",
      "# TYPE tpservicos_rate_limit_fallback_total counter",
      `tpservicos_rate_limit_fallback_total ${this.rateLimitFallbacks}`,
      "# HELP tpservicos_process_uptime_seconds Tempo de atividade do processo da API.",
      "# TYPE tpservicos_process_uptime_seconds gauge",
      `tpservicos_process_uptime_seconds ${process.uptime()}`,
      "",
    );
    return lines.join("\n");
  }

  private label(value: string) {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
  }
}
