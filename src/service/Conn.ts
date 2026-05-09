import axios from './axios';

export default class Conn {
  url: string;
  constructor(url: string) {
    this.url = url;
  }

  async getResource(): Promise<any> {
    const res = await axios.get(`${this.url}`);
    return res.data;
  }

  async get(action?: any): Promise<any> {
    let res;
    if (action) {
      res = await axios.get(`${this.url}/${action}`);
    } else {
      res = await axios.get(`${this.url}`);
    }

    return res.data;
  }

  async getByParams(payload: any): Promise<any> {
    const res = await axios.get(`${this.url}/${payload}`);
    return res.data;
  }

  async post(payload: any, action?: string): Promise<any> {
    let res;
    if (action) {
      res = await axios.post(`${this.url}/${action}`, payload);
    } else {
      res = await axios.post(this.url, payload);
    }

    return res.data;
  }

  async getWithBody(payload: any): Promise<any> {
    let res;
    res = await axios.get(`${this.url}`, payload);
    return res.data;
  }
}
