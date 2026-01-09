import axios, { AxiosInstance } from 'axios';
import { DigitalTwinSearchRequest, PointDataLatestRequest, ApiResponse } from './types.js';

export class BuildingOSClient {
  private hotApi: AxiosInstance;

  constructor() {
    const hotApiUrl = process.env.HOT_API_URL || 'https://hot-api.building-os.example.com';
    
    this.hotApi = axios.create({
      baseURL: hotApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor if token is available
    this.hotApi.interceptors.request.use((config) => {
      const token = process.env.ACCESS_TOKEN;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async searchDigitalTwin(request: DigitalTwinSearchRequest): Promise<ApiResponse> {
    try {
      const response = await this.hotApi.post('/digital-twin/search', request);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getLatestData(request: PointDataLatestRequest): Promise<ApiResponse> {
    try {
      const response = await this.hotApi.post('/point-data/latest', request);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}