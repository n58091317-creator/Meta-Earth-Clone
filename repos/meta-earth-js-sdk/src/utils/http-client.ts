/**
 * HTTP Client Utility
 * HTTP client utility class - Handles all API requests
 */

import type { Layer } from '../types'
import type { INetwork } from '../config/define'

export interface HttpRequestConfig {
  /** Request URL */
  url?: string
  /** Request method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** Request headers */
  headers?: Record<string, string>
  /** URL query parameters */
  params?: Record<string, any>
  /** Request body data */
  data?: any
  /** Timeout (ms) */
  timeout?: number
  /** Base URL */
  baseURL?: string
  /** Target layer (hub | rollup) */
  layer?: Layer
  /** URL type (rest | rpc | grpc) - default rest */
  urlType?: 'rest' | 'rpc' | 'grpc'
}

export interface HttpResponse<T = any> {
  /** Response data */
  data: T
  /** HTTP status code */
  status: number
  /** HTTP status text */
  statusText: string
  /** Response headers */
  headers: Record<string, string>
  /** Request configuration */
  config: HttpRequestConfig
}

/**
 * HTTP Error Class
 */
export class HttpError extends Error {
  public status: number
  public statusText: string
  public data?: any
  public config: HttpRequestConfig

  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: any,
    config?: HttpRequestConfig,
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.statusText = statusText
    this.data = data
    this.config = config || {}
  }
}

/**
 * HTTP Client Class
 */
export class HttpClient {
  private baseURL: string
  private timeout: number
  private defaultHeaders: Record<string, string>
  private networkConfig?: INetwork
  private currentLayer: Layer = 'hub'

  /**
   * Create HttpClient instance
   * @param baseURL Base URL
   * @param timeout Timeout (default 60s)
   * @param networkConfig Network configuration
   */
  constructor(baseURL: string = '', timeout: number = 60000, networkConfig?: INetwork) {
    this.baseURL = baseURL.replace(/\/$/, '') // Remove trailing slash
    this.timeout = timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    this.networkConfig = networkConfig
  }

  /**
   * Set base URL
   * @param baseURL Base URL
   */
  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL.replace(/\/$/, '')
  }

  /**
   * Set timeout
   * @param timeout Timeout (ms)
   */
  public setTimeout(timeout: number): void {
    this.timeout = timeout
  }

  /**
   * Set network configuration
   * @param networkConfig Network configuration object
   */
  public setNetworkConfig(networkConfig: INetwork): void {
    this.networkConfig = networkConfig
  }

  /**
   * Get current network configuration
   * @returns INetwork | undefined
   */
  public getNetworkConfig(): INetwork | undefined {
    return this.networkConfig
  }

  /**
   * Set current layer (hub or rollup)
   * Used to determine the base URL for requests
   * @param layer Target layer
   */
  public setLayer(layer: Layer): void {
    this.currentLayer = layer
  }

  /**
   * Get current layer
   * @returns Layer
   */
  public getLayer(): Layer {
    return this.currentLayer
  }

  /**
   * Get base URL by layer and type
   */
  private getBaseURLByLayer(layer?: Layer, urlType: 'rest' | 'rpc' | 'grpc' = 'rest'): string {
    // If layer parameter is provided, use it; otherwise use currentLayer
    const targetLayer = layer || this.currentLayer

    // If network config exists, get corresponding URL from network config
    if (this.networkConfig) {
      const config = targetLayer === 'hub' ? this.networkConfig.hub : this.networkConfig.rollup

      switch (urlType) {
        case 'rpc':
          return config.rpcUrl
        case 'grpc':
          return config.grpcUrl
        case 'rest':
        default:
          return config.restfulUrl
      }
    }

    // If no network config or layer is not hub/rollup, use default baseURL
    return this.baseURL
  }

  /**
   * Set default headers
   * @param headers Headers object
   */
  public setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers }
  }

  /**
   * Add single header
   * @param key Header key
   * @param value Header value
   */
  public addHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }

  /**
   * Remove single header
   * @param key Header key
   */
  public removeHeader(key: string): void {
    delete this.defaultHeaders[key]
  }

  /**
   * Build full URL
   */
  private buildURL(
    url: string,
    params?: Record<string, any>,
    layer?: Layer,
    urlType?: 'rest' | 'rpc' | 'grpc',
  ): string {
    // Get base URL based on layer and urlType
    const baseURL = this.getBaseURLByLayer(layer, urlType)
    let fullURL = url.startsWith('http') ? url : `${baseURL}/${url.replace(/^\//, '')}`

    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString()
      fullURL += `?${queryString}`
    }

    return fullURL
  }

  /**
   * Build request configuration
   */
  private buildRequestConfig(config: HttpRequestConfig): RequestInit {
    const { method = 'GET', headers = {}, data } = config

    const requestConfig: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      signal: AbortSignal.timeout(this.timeout),
    }

    if (data && method !== 'GET') {
      if (typeof data === 'object' && !(data instanceof FormData)) {
        requestConfig.body = JSON.stringify(data)
      } else {
        requestConfig.body = data
      }
    }

    return requestConfig
  }

  /**
   * Handle response
   */
  private async handleResponse<T>(
    response: Response,
    config: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    const { status, statusText, headers } = response

    // Get response headers
    const responseHeaders: Record<string, string> = {}
    headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    let data: T

    // Handle empty response
    if (status === 204 || response.headers.get('content-length') === '0') {
      data = null as T
    } else {
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else if (contentType.includes('text/')) {
        data = (await response.text()) as T
      } else {
        data = (await response.blob()) as T
      }
    }

    return {
      data,
      status,
      statusText,
      headers: responseHeaders,
      config,
    }
  }

  /**
   * Send request
   */
  private async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url = '', layer, urlType } = config
    const fullURL = this.buildURL(url, config.params, layer, urlType)
    const requestConfig = this.buildRequestConfig(config)

    try {
      const response = await fetch(fullURL, requestConfig)

      // Check response status
      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = await response.text()
        }

        throw new HttpError(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          errorData,
          config,
        )
      }

      return await this.handleResponse<T>(response, config)
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      // Network error or other errors
      throw new HttpError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'Network Error',
        undefined,
        config,
      )
    }
  }

  /**
   * Send GET request
   * @param url Request URL
   * @param config Request configuration
   * @returns Promise<HttpResponse<T>>
   */
  public async get<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, 'method' | 'url'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  /**
   * Send POST request
   * @param url Request URL
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise<HttpResponse<T>>
   */
  public async post<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'method' | 'url' | 'data'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  /**
   * Send PUT request
   * @param url Request URL
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise<HttpResponse<T>>
   */
  public async put<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'method' | 'url' | 'data'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  /**
   * Send DELETE request
   * @param url Request URL
   * @param config Request configuration
   * @returns Promise<HttpResponse<T>>
   */
  public async delete<T = any>(
    url: string,
    config?: Omit<HttpRequestConfig, 'method' | 'url'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  /**
   * Send PATCH request
   * @param url Request URL
   * @param data Request body data
   * @param config Request configuration
   * @returns Promise<HttpResponse<T>>
   */
  public async patch<T = any>(
    url: string,
    data?: any,
    config?: Omit<HttpRequestConfig, 'method' | 'url' | 'data'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }
}

/**
 * Default HTTP client instance
 */
export const httpClient = new HttpClient()

/**
 * Create new HTTP client instance
 */
export function createHttpClient(
  baseURL?: string,
  timeout?: number,
  networkConfig?: INetwork,
): HttpClient {
  return new HttpClient(baseURL, timeout, networkConfig)
}

/**
 * Create HTTP client instance with network configuration
 */
export function createHttpClientWithNetwork(networkConfig: INetwork, timeout?: number): HttpClient {
  const client = new HttpClient('', timeout, networkConfig)
  // Default set to hub layer
  client.setLayer('hub')
  return client
}
