export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function isPlainObject(value) {
  return value !== null
    && typeof value === "object"
    && Object.getPrototypeOf(value) === Object.prototype;
}

// Проверяет baseUrl и возвращает его без завершающих "/".
function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch (error) {
    throw new TypeError(`baseUrl должен быть абсолютным адресом: ${baseUrl}`, { cause: error });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`Поддерживаются только http и https, получено ${parsed.protocol}`);
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new TypeError("baseUrl не должен содержать query и hash.");
  }

  return parsed.href.replace(/\/+$/, "");
}

// Создаёт URL относительно baseUrl и добавляет непустые параметры query.
// Значения кодируются средствами URL и URLSearchParams, а не вручную.
export function buildUrl(baseUrl, path, query = {}) {
  const base = normalizeBaseUrl(baseUrl);

  if (typeof path !== "string") {
    throw new TypeError("path должен быть строкой.");
  }
  const cleanPath = path.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (cleanPath === "") {
    throw new TypeError("path не должен быть пустым.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleanPath)) {
    throw new TypeError("path должен быть относительным.");
  }

  if (!isPlainObject(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  const url = new URL(`${base}/${cleanPath}`);
  for (const [name, value] of Object.entries(query)) {
    // false и 0 — содержательные значения, пропускаем только «пустоту».
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(name, String(value));
  }
  return url.href;
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function checkTimeout(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} должен быть положительным целым числом миллисекунд.`);
  }
}

// fetchFn передаётся явно, чтобы модуль можно было проверить без реальной сети.
// Возвращаемый объект: { requestJson(path, { method, query, body, signal, timeoutMs } = {}) }.
// Поддерживаются GET, POST, PATCH и DELETE; ответ 204 преобразуется в null.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  const base = normalizeBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  checkTimeout(timeoutMs, "timeoutMs");
  const defaultTimeoutMs = timeoutMs;

  async function requestJson(path, {
    method = "GET",
    query = {},
    body,
    signal,
    timeoutMs: requestTimeoutMs = defaultTimeoutMs,
  } = {}) {
    if (typeof method !== "string" || !ALLOWED_METHODS.has(method.toUpperCase())) {
      throw new TypeError(`Метод ${String(method)} не поддерживается.`);
    }
    const httpMethod = method.toUpperCase();
    if (httpMethod === "GET" && body !== undefined) {
      throw new TypeError("У GET-запроса не может быть тела.");
    }

    const url = buildUrl(base, path, query);
    checkTimeout(requestTimeoutMs, "timeoutMs");
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть AbortSignal.");
    }

    // Тайм-аут и внешняя отмена объединяются в один сигнал для fetch.
    const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
    const combinedSignal = signal === undefined
      ? timeoutSignal
      : AbortSignal.any([signal, timeoutSignal]);

    // Content-Type добавляется только когда тело действительно есть.
    const headers = { Accept: "application/json" };
    const init = { method: httpMethod, headers, signal: combinedSignal };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    // Этап 1: только получение Response. Здесь возможны network/timeout/aborted.
    let response;
    try {
      response = await fetchFn(url, init);
    } catch (error) {
      if (signal?.aborted) {
        throw new ApiError("Запрос отменён вызывающим кодом.", { kind: "aborted", url, cause: error });
      }
      if (timeoutSignal.aborted) {
        throw new ApiError(`Превышено время ожидания ответа (${requestTimeoutMs} мс).`, {
          kind: "timeout",
          url,
          cause: error,
        });
      }
      throw new ApiError("Сервер недоступен: ответ не получен.", { kind: "network", url, cause: error });
    }

    // Этап 2: обработка полученного ответа. Его ошибки уже не сетевые.
    if (!(response instanceof Response)) {
      throw new ApiError("fetchFn вернул значение, не являющееся Response.", {
        kind: "invalid-response",
        url,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.toLowerCase().includes("application/json");

    if (!response.ok) {
      let payload = null;
      if (isJson) {
        try {
          payload = await response.json();
        } catch {
          payload = null; // тело ошибки повреждено — достаточно статуса
        }
      }
      const apiError = payload?.error;
      throw new ApiError(
        typeof apiError?.message === "string" ? apiError.message : `HTTP ${response.status}`,
        {
          kind: "http",
          status: response.status,
          code: typeof apiError?.code === "string" ? apiError.code : null,
          details: apiError?.details ?? null,
          url,
        },
      );
    }

    if (response.status === 204) {
      return null;
    }

    if (!isJson) {
      throw new ApiError(`Ожидался JSON, получен Content-Type "${contentType || "нет"}".`, {
        kind: "invalid-response",
        url,
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError("Сервер вернул повреждённый JSON.", {
        kind: "invalid-response",
        url,
        cause: error,
      });
    }
  }

  return { requestJson };
}
