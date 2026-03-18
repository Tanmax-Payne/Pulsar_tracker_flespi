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
    // Include telemetry in the devices call to save requests
    const res = await fetch(`${this.baseUrl}/devices/all?fields=id,name,connected,telemetry`, {
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

  static async getDeviceMessages(token: string, deviceId: number, limit = 100, from?: number, to?: number): Promise<FlespiMessage[]> {
    let url = `${this.baseUrl}/devices/${deviceId}/messages?limit=${limit}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    
    const res = await fetch(url, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to fetch messages (Status: ${res.status})`);
    }
    const data = await res.json();
    return data.result;
  }

  static async createDevice(token: string, name: string, deviceTypeId: number, ident: string): Promise<FlespiDevice> {
    const res = await fetch(`${this.baseUrl}/devices`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify([{ name, device_type_id: deviceTypeId, ident }]),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to create device (Status: ${res.status})`);
    }
    const data = await res.json();
    return data.result[0];
  }

  static async updateDevice(token: string, deviceId: number, data: Partial<FlespiDevice>): Promise<FlespiDevice> {
    const res = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify([data]),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to update device (Status: ${res.status})`);
    }
    const dataRes = await res.json();
    return dataRes.result[0];
  }

  static async deleteDevice(token: string, deviceId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.errors?.[0]?.reason || `Failed to delete device (Status: ${res.status})`);
    }
  }
}
