export interface FlespiDevice {
  id: number;
  name: string;
  connected: boolean;
  telemetry?: Record<string, any>;
}

export interface FlespiTelemetry {
  [key: string]: {
    value: any;
    ts: number;
  };
}

export interface FlespiMessage {
  timestamp: number;
  [key: string]: any;
}

export class FlespiService {
  private static baseUrl = 'https://flespi.io/gw';

  private static getHeaders(token: string) {
    return {
      'Authorization': `FlespiToken ${token}`,
      'Accept': 'application/json',
    };
  }

  static async getDevices(token: string): Promise<FlespiDevice[]> {
    const res = await fetch(`${this.baseUrl}/devices/all`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to fetch devices (Status: ${res.status})`);
    }
    const data = await res.json();
    return data.result;
  }

  static async getDeviceTelemetry(token: string, deviceId: number): Promise<FlespiTelemetry> {
    const res = await fetch(`${this.baseUrl}/devices/${deviceId}/telemetry`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to fetch telemetry (Status: ${res.status})`);
    }
    const data = await res.json();
    return data.result[0]?.telemetry || {};
  }

  static async getDeviceMessages(token: string, deviceId: number, limit = 100): Promise<FlespiMessage[]> {
    const res = await fetch(`${this.baseUrl}/devices/${deviceId}/messages?limit=${limit}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to fetch messages (Status: ${res.status})`);
    }
    const data = await res.json();
    return data.result;
  }
}
