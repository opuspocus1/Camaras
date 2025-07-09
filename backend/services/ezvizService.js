const axios = require('axios');
const cron = require('node-cron');
const qs = require('qs');

class EzvizService {
  constructor() {
    this.accessToken = process.env.EZVIZ_ACCESS_TOKEN;
    // Usar dominio de Sudamérica por defecto
    this.areaDomain = process.env.EZVIZ_AREA_DOMAIN || 'https://isaopen.ezvizlife.com';
  }

  // Get current access token
  getAccessTokenSync() {
    if (!this.accessToken) {
      throw new Error('EZVIZ access token not available');
    }
    return this.accessToken;
  }

  // Get area domain
  getAreaDomain() {
    return this.areaDomain;
  }

  // Get live stream URL
  async getLiveStreamUrl(deviceSerial, channelNo = 1, protocol = 2) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/get`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&protocol=${protocol}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return {
          url: response.data.data.url,
          id: response.data.data.id,
          expireTime: response.data.data.expireTime
        };
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Get playback stream URL
  async getPlaybackStreamUrl(deviceSerial, startTime, endTime, channelNo = 1, protocol = 2) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/get`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&protocol=${protocol}&type=2&startTime=${startTime}&endTime=${endTime}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return {
          url: response.data.data.url,
          id: response.data.data.id,
          expireTime: response.data.data.expireTime
        };
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Query local video records
  async queryLocalVideoRecords(deviceSerial, startTime, endTime, channelNo = 1) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/v3/das/device/local/video/query`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&startTime=${startTime}&endTime=${endTime}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.meta?.code === 200) {
        return response.data.data;
      } else {
        throw new Error(`EZVIZ API error: ${response.data.meta?.message || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.meta?.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Disable stream URL
  async disableStreamUrl(deviceSerial, urlId, channelNo = 1) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/disable`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&urlId=${urlId}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return true;
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }
}

// Create singleton instance
const ezvizService = new EzvizService();

// Export functions for external use
const getLiveStreamUrl = (deviceSerial, channelNo, protocol) => ezvizService.getLiveStreamUrl(deviceSerial, channelNo, protocol);
const getPlaybackStreamUrl = (deviceSerial, startTime, endTime, channelNo, protocol) => ezvizService.getPlaybackStreamUrl(deviceSerial, startTime, endTime, channelNo, protocol);
const queryLocalVideoRecords = (deviceSerial, startTime, endTime, channelNo) => ezvizService.queryLocalVideoRecords(deviceSerial, startTime, endTime, channelNo);
const disableStreamUrl = (deviceSerial, urlId, channelNo) => ezvizService.disableStreamUrl(deviceSerial, urlId, channelNo);

module.exports = {
  getLiveStreamUrl,
  getPlaybackStreamUrl,
  queryLocalVideoRecords,
  disableStreamUrl,
  ezvizService
}; 